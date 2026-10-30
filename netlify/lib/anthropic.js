// Single place for every Claude call: model choice, retries, timeouts, and error mapping.
import Anthropic from '@anthropic-ai/sdk';
import { HttpError } from './http.js';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
// Lower effort keeps responses fast enough for synchronous Netlify functions.
const EFFORT = process.env.ANTHROPIC_EFFORT || 'low';
// Keep below the Netlify function timeout so we return a clear error instead of a platform 502.
const TIMEOUT_MS = Number(process.env.ANTHROPIC_TIMEOUT_MS) || 25000;

let client;

const getClient = () => {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new HttpError(500, 'The AI service is not configured.');
  }
  // maxRetries retries 408/409/429/5xx and connection errors with backoff
  client ??= new Anthropic({ timeout: TIMEOUT_MS, maxRetries: 2 });
  return client;
};

const toHttpError = (err) => {
  if (err instanceof Anthropic.APIConnectionTimeoutError) {
    return new HttpError(504, 'The AI took too long to respond. Please try again.');
  }
  if (err instanceof Anthropic.RateLimitError || err?.status === 529) {
    return new HttpError(503, 'The AI service is busy right now. Please try again in a minute.');
  }
  if (err instanceof Anthropic.BadRequestError) {
    return new HttpError(400, 'The AI service could not process this input.');
  }
  if (err instanceof Anthropic.APIError) {
    return new HttpError(502, 'The AI service had a problem. Please try again.');
  }
  return err;
};

// Sends one user message and returns the response text.
export const generateText = async (content, { maxTokens }) => {
  let response;
  try {
    response = await getClient().beta.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      output_config: { effort: EFFORT },
      // On a safety decline, the API retries on a fallback model in the same call
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      messages: [{ role: 'user', content }],
    });
  } catch (err) {
    throw toHttpError(err);
  }

  if (response.stop_reason === 'refusal') {
    throw new HttpError(422, 'The AI could not process this request. Please review the content and try again.');
  }
  if (response.stop_reason === 'max_tokens') {
    console.warn(`Response hit max_tokens (${maxTokens}); output may be cut off`);
  }

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');

  if (!text) {
    throw new HttpError(502, 'The AI returned an empty response. Please try again.');
  }
  return text;
};
