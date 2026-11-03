import { createHandler } from '../lib/http.js';
import { generateJSON } from '../lib/anthropic.js';
import { requireText, requireExperiences } from '../lib/validate.js';
import { STYLE_RULES, polishBullets, fixDashes } from '../lib/style.js';
import { OPTIMIZE_SCHEMA, buildOptimizeMarkdown } from '../lib/reports.js';
import { LIMITS } from '../../shared/limits.js';

// Skip the style rewrite pass if the first call ran long, to stay inside the function timeout
const REWRITE_DEADLINE_MS = 12000;

export const handler = createHandler('optimize-with-experiences', async ({ experiences, skills, jobText }) => {
  requireText(jobText, 'Job posting', LIMITS.jobChars);
  requireExperiences(experiences);
  const startedAt = Date.now();

  const experiencesById = new Map(experiences.map((exp) => [String(exp.id), exp]));

  const formattedExperiences = experiences.map(exp => {
    const responsibilities = exp.responsibilities?.map(r => r.description).join('\n  - ') || '';
    return `
[experience_id: ${exp.id}]
**${exp.job_title}** at **${exp.company}**
${exp.start_date || 'N/A'} - ${exp.is_current ? 'Present' : (exp.end_date || 'N/A')}
Responsibilities:
  - ${responsibilities}
`;
  }).join('\n\n');

  // Limit skills to 20 and keep proficiency level
  const formattedSkills = skills?.slice(0, 20).map(s => `${s.skill_name} (${s.proficiency_level || 'Intermediate'})`).join(', ') || 'None provided';

  const sourceText = experiences
    .flatMap((exp) => [exp.job_title, exp.company, ...(exp.responsibilities ?? []).map((r) => r.description)])
    .join('\n');

  const result = await generateJSON(`You are a resume coach. Your goal is to tailor the candidate's resume to this specific job posting. Every recommendation must tie back to the posting.

JOB POSTING (THIS IS WHAT YOU MUST OPTIMIZE FOR):
${jobText}

CANDIDATE'S COMPLETE WORK HISTORY:
${formattedExperiences}

CANDIDATE'S SKILLS:
${formattedSkills}

Fill in each field:
- job_requirements: the 5-7 most important requirements or qualifications in the posting.
- selected_experiences: the 2-4 experiences that best match the posting. Use the experience_id shown in brackets, and give the reason naming which requirements it covers.
- keyword_matches: posting keywords or requirements, each with the evidence from the candidate's history that matches it.
- optimized_experiences: for each selected experience (same experience_id), 3-5 bullets that use the posting's keywords and highlight the most relevant work. Only use facts from that experience's responsibilities.
- skills_to_emphasize: skills from the candidate's list that the posting asks for or implies.
- recommendations: specific ways to better position the candidate for this role.

Write each item as one or two plain sentences.

${STYLE_RULES}`, { schema: OPTIMIZE_SCHEMA, maxTokens: 8000 });

  // Ignore any experience id the AI made up
  result.selected_experiences = result.selected_experiences.filter((s) => experiencesById.has(s.experience_id));
  result.optimized_experiences = result.optimized_experiences.filter((o) => experiencesById.has(o.experience_id));

  await polishBullets(
    result.optimized_experiences.flatMap((o) => o.bullets),
    { allowedText: `${jobText}\n${sourceText}`, sourceText },
    { canRewrite: () => Date.now() - startedAt < REWRITE_DEADLINE_MS }
  );

  result.job_requirements = result.job_requirements.map(fixDashes);
  result.skills_to_emphasize = result.skills_to_emphasize.map(fixDashes);
  result.recommendations = result.recommendations.map(fixDashes);
  for (const s of result.selected_experiences) s.reason = fixDashes(s.reason);
  for (const m of result.keyword_matches) m.evidence = fixDashes(m.evidence);

  // Bullets keyed by experience id, which is what the resume PDF generator looks up
  const bullets = Object.fromEntries(
    result.optimized_experiences.map((o) => [o.experience_id, o.bullets.map((b) => b.text)])
  );

  return { text: buildOptimizeMarkdown(result, experiencesById), bullets };
});
