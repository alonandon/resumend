// Calls a Netlify function and always returns parsed JSON or throws an Error with a user-friendly message.

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8888/.netlify/functions'
  : '/.netlify/functions';

const DEFAULT_TIMEOUT_MS = 90000;

const messageForStatus = (status) => {
  if (status === 413) return 'That file is too large. Please upload a smaller PDF.';
  if (status === 429 || status === 503) return 'ResuMend is busy right now. Please try again in a minute.';
  if (status === 502 || status === 504) return 'This took too long to process. Please try again.';
  return 'Something went wrong. Please try again.';
};

export const callFunction = async (name, payload, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(`${API_BASE}/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('This took too long to process. Please try again.');
    }
    throw new Error("Couldn't reach ResuMend. Check your internet connection and try again.");
  } finally {
    clearTimeout(timer);
  }

  // Platform errors (timeouts, payload limits) can return HTML instead of JSON
  let data = null;
  try {
    data = await response.json();
  } catch {
    // fall through to status-based message
  }

  if (!response.ok || !data) {
    const error = new Error(data?.error || messageForStatus(response.status));
    error.status = response.status;
    throw error;
  }

  return data;
};
