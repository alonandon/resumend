import { createHandler, HttpError } from '../lib/http.js';
import { generateText } from '../lib/anthropic.js';

export const handler = createHandler('optimize-with-experiences', async ({ experiences, skills, jobText }) => {
  if (!jobText?.trim()) throw new HttpError(400, 'Job posting text is required.');
  if (!experiences?.length) throw new HttpError(400, 'Add at least one experience to your library first.');

  // Truncate very long job postings to 6000 chars (keeps most content)
  const truncatedJobText = jobText.length > 6000
    ? jobText.substring(0, 6000) + '\n\n[Note: Job posting was long and has been truncated for processing]'
    : jobText;

  const formattedExperiences = experiences.map(exp => {
    const responsibilities = exp.responsibilities?.map(r => r.description).join('\n  - ') || '';
    return `
**${exp.job_title}** at **${exp.company}**
${exp.start_date || 'N/A'} - ${exp.is_current ? 'Present' : (exp.end_date || 'N/A')}
Responsibilities:
  - ${responsibilities}
`;
  }).join('\n\n');

  // Limit skills to 20 and keep proficiency level
  const formattedSkills = skills?.slice(0, 20).map(s => `${s.skill_name} (${s.proficiency_level || 'Intermediate'})`).join(', ') || 'None provided';

  const text = await generateText(`You are a professional resume optimization expert. Your PRIMARY GOAL is to tailor the candidate's resume to match the specific job posting below. Every recommendation must directly align with the job posting requirements.

JOB POSTING (THIS IS WHAT YOU MUST OPTIMIZE FOR):
${truncatedJobText}

CANDIDATE'S COMPLETE WORK HISTORY:
${formattedExperiences}

CANDIDATE'S SKILLS:
${formattedSkills}

CRITICAL INSTRUCTIONS:
- Read the job posting carefully and identify key requirements, responsibilities, and desired qualifications
- Use language and keywords from the job posting throughout your response
- Prioritize experiences that demonstrate the exact skills mentioned in the job posting
- Mirror the tone and terminology used in the job posting

Please provide:

1. JOB POSTING ANALYSIS: Briefly identify the 5-7 most important requirements/qualifications from the job posting.

2. SELECTED EXPERIENCES: Choose the 2-4 most relevant experiences from the candidate's history that best match this job posting. For each selection, explicitly state which job posting requirements it addresses.

3. KEYWORD ALIGNMENT: Create a table showing:
   - Job Posting Keywords/Requirements (left column)
   - How Candidate's Experience Matches (right column)

4. OPTIMIZED BULLET POINTS: For each selected experience, write 3-5 optimized bullet points that:
   - Use exact keywords and phrases from the job posting
   - Highlight achievements and responsibilities that directly match the job posting requirements
   - Start with strong action verbs similar to those in the job posting
   - Quantify achievements where possible
   - Are ready to copy and paste directly into a resume

Format these as:
### [Job Title] - [Company]
* Bullet point 1
* Bullet point 2
* Bullet point 3

5. SKILLS TO EMPHASIZE: From the candidate's skills list, identify which skills are mentioned or implied in the job posting and should be featured prominently.

6. ADDITIONAL RECOMMENDATIONS: Suggest specific improvements to better position the candidate for THIS SPECIFIC ROLE, referencing the job posting requirements.

Format your response with clear markdown headers (##) for each section. Make the bullet points easy to copy.`, { maxTokens: 3000 });

  return { text };
});
