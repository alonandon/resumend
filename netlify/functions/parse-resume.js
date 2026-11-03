import { createHandler } from '../lib/http.js';
import { generateJSON } from '../lib/anthropic.js';
import { requireText } from '../lib/validate.js';
import { PARSE_RESUME_SCHEMA, normalizeDate } from '../lib/reports.js';
import { LIMITS } from '../../shared/limits.js';

export const handler = createHandler('parse-resume', async ({ resumeText }) => {
  requireText(resumeText, 'Resume text', LIMITS.resumeChars);

  const { experiences } = await generateJSON(`Extract every work experience from this resume.

RESUME TEXT:
${resumeText}

Rules:
- Include every role, with all of its bullet points or responsibilities.
- Copy each bullet exactly as written. Do not rewrite, summarize, or fix it.
- Dates: use YYYY-MM-DD when the day is known, YYYY-MM when only the month is known, YYYY when only the year is known, and null when there is no date.
- If the role is "present" or "current", set is_current to true and end_date to null.`, { schema: PARSE_RESUME_SCHEMA, maxTokens: 8000 });

  return {
    experiences: experiences.map((exp) => ({
      company: exp.company.trim(),
      job_title: exp.job_title.trim(),
      start_date: normalizeDate(exp.start_date),
      end_date: exp.is_current ? null : normalizeDate(exp.end_date),
      is_current: exp.is_current,
      responsibilities: exp.responsibilities.map((r) => r.trim()).filter(Boolean),
    })),
  };
});
