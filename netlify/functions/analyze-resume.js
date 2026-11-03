import { createHandler } from '../lib/http.js';
import { generateJSON } from '../lib/anthropic.js';
import { requireText } from '../lib/validate.js';
import { STYLE_RULES, polishBullets, fixDashes } from '../lib/style.js';
import { ANALYZE_SCHEMA, buildAnalyzeMarkdown } from '../lib/reports.js';
import { LIMITS } from '../../shared/limits.js';

// Skip the style rewrite pass if the first call ran long, to stay inside the function timeout
const REWRITE_DEADLINE_MS = 12000;

export const handler = createHandler('analyze-resume', async ({ resumeText, jobText }) => {
  requireText(resumeText, 'Resume text', LIMITS.resumeChars);
  requireText(jobText, 'Job posting', LIMITS.jobChars);
  const startedAt = Date.now();

  const result = await generateJSON(`You are a resume coach. Compare the candidate's resume to the job posting and give specific, practical recommendations.

RESUME:
${resumeText}

JOB POSTING:
${jobText}

Fill in each field:
- keyword_alignment: important keywords and phrases from the posting that should appear in the resume. Point out synonym mismatches (for example the resume says "managed" but the posting says "led") and say exactly which word to swap.
- content_improvements: specific improvements to the resume's content, structure, and formatting.
- missing_qualifications: qualifications or skills from the posting that are missing or understated in the resume.
- strengths: parts of the resume that already match the posting well.
- roles: for each role on the resume, its job_title, company, and its bullets rewritten to align with this posting.

RULES FOR REWRITTEN BULLETS:
- Do not invent responsibilities, achievements, or metrics that are not in the original resume.
- Only swap in keywords from the posting, reorder to put the most relevant part first, or lightly reword for clarity while keeping the same meaning.
- Keep the same number of bullets as the original for each role.
- Keep every number, metric, technology, and fact from the original exactly as written.
- If a bullet already matches well, keep it nearly identical.

Write each recommendation as one or two plain sentences.

${STYLE_RULES}`, { schema: ANALYZE_SCHEMA, maxTokens: 8000 });

  await polishBullets(
    result.roles.flatMap((role) => role.bullets),
    { allowedText: `${jobText}\n${resumeText}`, sourceText: resumeText },
    { canRewrite: () => Date.now() - startedAt < REWRITE_DEADLINE_MS }
  );

  for (const key of ['keyword_alignment', 'content_improvements', 'missing_qualifications', 'strengths']) {
    result[key] = result[key].map(fixDashes);
  }

  return { text: buildAnalyzeMarkdown(result) };
});
