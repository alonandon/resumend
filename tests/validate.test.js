import { describe, it, expect } from 'vitest';
import { requireText, requirePdfData, requireExperiences } from '../netlify/lib/validate.js';
import { LIMITS, MAX_PDF_BASE64_CHARS, checkPdfFile } from '../shared/limits.js';

const statusOf = (fn) => { try { fn(); } catch (err) { return err.status; } return null; };

describe('server validation', () => {
  it('rejects missing and oversized text', () => {
    expect(statusOf(() => requireText('  ', 'Resume text', 10))).toBe(400);
    expect(statusOf(() => requireText('x'.repeat(11), 'Resume text', 10))).toBe(413);
    expect(requireText('ok', 'Resume text', 10)).toBe('ok');
  });

  it('rejects PDFs over the size limit', () => {
    expect(statusOf(() => requirePdfData(''))).toBe(400);
    expect(statusOf(() => requirePdfData('A'.repeat(MAX_PDF_BASE64_CHARS + 1)))).toBe(413);
    expect(statusOf(() => requirePdfData('A'.repeat(100)))).toBe(null);
  });

  it('rejects empty or oversized experience lists', () => {
    expect(statusOf(() => requireExperiences([]))).toBe(400);
    expect(statusOf(() => requireExperiences(Array(LIMITS.experiences + 1).fill({})))).toBe(413);
    const huge = [{ job_title: 'PM', company: 'Acme', responsibilities: [{ description: 'x'.repeat(LIMITS.experiencesChars) }] }];
    expect(statusOf(() => requireExperiences(huge))).toBe(413);
  });
});

describe('checkPdfFile', () => {
  it('accepts a normal PDF', () => {
    expect(checkPdfFile({ name: 'resume.pdf', type: 'application/pdf', size: 200_000 })).toBe(null);
  });

  it('rejects other file types and large files with a clear message', () => {
    expect(checkPdfFile({ name: 'resume.docx', type: 'application/msword', size: 100 })).toBe('Please upload a PDF file.');
    expect(checkPdfFile({ name: 'resume.pdf', type: 'application/pdf', size: 9 * 1024 * 1024 })).toMatch(/9\.0 MB.*limit is 4 MB/);
  });
});
