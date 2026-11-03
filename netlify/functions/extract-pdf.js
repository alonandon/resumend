import { createHandler } from '../lib/http.js';
import { generateText } from '../lib/anthropic.js';
import { requirePdfData } from '../lib/validate.js';

export const handler = createHandler('extract-pdf', async ({ pdfData }) => {
  requirePdfData(pdfData);

  const text = await generateText([
    {
      type: 'document',
      source: {
        type: 'base64',
        media_type: 'application/pdf',
        data: pdfData
      }
    },
    {
      type: 'text',
      text: 'Extract all text from this PDF document. Return only the text content, no commentary.'
    }
  ], { maxTokens: 4000 });

  return { text };
});
