// Request validation for Netlify functions. Throws HttpError(400/413) with a user-facing message.
import { HttpError } from './http.js';
import { LIMITS, MAX_PDF_BASE64_CHARS, checkTextLength } from '../../shared/limits.js';

export const requireText = (value, label, max) => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(400, `${label} is required.`);
  }
  const tooLong = checkTextLength(value, label, max);
  if (tooLong) throw new HttpError(413, tooLong);
  return value;
};

export const requirePdfData = (value) => {
  if (typeof value !== 'string' || !value) {
    throw new HttpError(400, 'PDF data is required.');
  }
  if (value.length > MAX_PDF_BASE64_CHARS) {
    throw new HttpError(413, `That PDF is too large. The limit is ${LIMITS.pdfBytes / 1024 / 1024} MB.`);
  }
  return value;
};

export const requireExperiences = (experiences) => {
  if (!Array.isArray(experiences) || experiences.length === 0) {
    throw new HttpError(400, 'Add at least one experience to your library first.');
  }
  if (experiences.length > LIMITS.experiences) {
    throw new HttpError(413, `You have ${experiences.length} experiences. The limit is ${LIMITS.experiences} per analysis.`);
  }
  const totalChars = experiences.reduce((sum, exp) =>
    sum + `${exp.job_title ?? ''}${exp.company ?? ''}`.length +
    (exp.responsibilities ?? []).reduce((s, r) => s + (r.description ?? '').length, 0), 0);
  if (totalChars > LIMITS.experiencesChars) {
    throw new HttpError(413, 'Your experience library is too long to analyze at once. Try removing older or less relevant experiences.');
  }
  return experiences;
};
