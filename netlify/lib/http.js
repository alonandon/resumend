// Shared request/response handling for Netlify functions.

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (statusCode, body) => ({
  statusCode,
  headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

// Wraps a POST handler: handles CORS preflight, method checks, JSON parsing,
// and turns thrown errors into JSON responses the client can always parse.
export const createHandler = (name, handle) => async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method Not Allowed' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid request body' });
  }

  try {
    return json(200, await handle(body));
  } catch (err) {
    if (err instanceof HttpError) {
      console.error(`${name}: ${err.status} ${err.message}`);
      return json(err.status, { error: err.message });
    }
    console.error(`${name}: unexpected error`, err);
    return json(500, { error: 'Something went wrong. Please try again.' });
  }
};
