import { createHandler, HttpError } from '../lib/http.js';
import { generateText } from '../lib/anthropic.js';

export const handler = createHandler('parse-resume', async ({ resumeText }) => {
  if (!resumeText?.trim()) throw new HttpError(400, 'Resume text is required.');

  const text = await generateText(`Parse this resume and extract all work experiences. Return ONLY a JSON array with no additional text, markdown, or explanation.

RESUME TEXT:
${resumeText}

CRITICAL: Your response must be ONLY a valid JSON array starting with [ and ending with ]. Do not include any text before or after the JSON. Do not wrap it in markdown code blocks.

Return a JSON array of objects with this exact structure:
[
  {
    "company": "Company Name",
    "job_title": "Job Title",
    "start_date": "YYYY-MM-DD or null",
    "end_date": "YYYY-MM-DD or null",
    "is_current": true or false,
    "responsibilities": [
      "First bullet point or responsibility",
      "Second bullet point or responsibility"
    ]
  }
]

Rules:
- Extract ALL work experiences from the resume
- For dates, use YYYY-MM-DD format if available, otherwise use null (not the string "null")
- If "present" or "current", set is_current to true and end_date to null
- Include all bullet points/responsibilities for each role
- Return ONLY the JSON array, absolutely no other text before or after`, { maxTokens: 4000 });

  return { text };
});
