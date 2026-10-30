import { createHandler, HttpError } from '../lib/http.js';
import { generateText } from '../lib/anthropic.js';

export const handler = createHandler('analyze-resume', async ({ resumeText, jobText }) => {
  if (!resumeText?.trim()) throw new HttpError(400, 'Resume text is required.');
  if (!jobText?.trim()) throw new HttpError(400, 'Job posting text is required.');

  const text = await generateText(`You are a professional resume optimization expert with knowledge of the latest 2025 ATS and resume best practices. Analyze the following resume against the job posting and provide detailed recommendations.

RESUME:
${resumeText}

JOB POSTING:
${jobText}

Please provide:

1. KEYWORD ALIGNMENT: Identify important keywords and phrases from the job posting that should appear in the resume. Look for synonym mismatches (e.g., "spearhead" vs "lead", "manage" vs "oversee") and suggest exact keyword replacements to improve ATS matching.

2. CONTENT IMPROVEMENTS: Based on the latest best practices, suggest specific improvements to the resume content, structure, and formatting.

3. MISSING QUALIFICATIONS: Identify key qualifications or skills from the job posting that are missing or understated in the resume.

4. STRENGTH HIGHLIGHTS: Point out resume elements that strongly match the job requirements.

5. READY-TO-USE BULLET POINTS: For each major experience/role on the resume, rewrite the existing bullet points to better align with this job posting. 

**CRITICAL INSTRUCTIONS FOR BULLET POINTS:**
- DO NOT invent or add responsibilities, achievements, or metrics that are not already present in the original resume
- ONLY modify the existing bullet points by:
  * Replacing synonyms with keywords from the job posting (e.g., change "managed" to "led" if the job posting uses "led")
  * Reordering information to emphasize aspects most relevant to the job posting
  * Slightly rewording for clarity or impact while maintaining the same core meaning
- Keep the same number of bullet points as the original resume for each role
- Preserve all specific numbers, metrics, technologies, and facts from the original resume exactly as written
- If a bullet point already matches well, keep it nearly identical with only minor keyword adjustments
- Do NOT add new accomplishments, projects, or responsibilities that weren't in the original resume

Format the bullet points clearly under each role name so they can be easily copied.

Format your response with clear sections and actionable recommendations.`, { maxTokens: 4000 });

  return { text };
});
