// Input limits shared by the browser and the Netlify functions.

export const LIMITS = {
  // Netlify rejects request bodies over ~6 MB, and base64 adds a third
  pdfBytes: 4 * 1024 * 1024,
  resumeChars: 30000,
  jobChars: 15000,
  experiences: 50,
  // Total characters across all saved experiences and bullets sent for optimizing
  experiencesChars: 60000,
};

export const MAX_PDF_BASE64_CHARS = Math.ceil(LIMITS.pdfBytes / 3) * 4;

// Returns a user-facing error message, or null when the file is fine.
export const checkPdfFile = (file) => {
  if (!file) return 'Please choose a PDF file.';
  const isPdf = file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf');
  if (!isPdf) return 'Please upload a PDF file.';
  if (file.size > LIMITS.pdfBytes) {
    return `That PDF is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${LIMITS.pdfBytes / 1024 / 1024} MB. Try exporting it again or pasting the text instead.`;
  }
  return null;
};

// Returns a user-facing error message, or null when the text is within the limit.
export const checkTextLength = (text, label, max) =>
  text.length > max
    ? `${label} is ${text.length.toLocaleString()} characters. The limit is ${max.toLocaleString()}. Please shorten it and try again.`
    : null;
