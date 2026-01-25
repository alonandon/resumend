export const handler = async (event) => {
  console.log('fetch-job function called!');
  
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const { url } = JSON.parse(event.body);
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error('API key not configured');
    }

    console.log('Fetching job posting from URL:', url);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        messages: [{
          role: "user",
          content: `Search for and extract the complete job posting from this URL: ${url}

Please provide the full job posting content including:
- Job title
- Company name
- Location
- Complete job description
- All responsibilities and duties
- Required qualifications
- Preferred qualifications
- Benefits (if mentioned)
- Salary range (if mentioned)
- Any other relevant details

Be thorough and extract all the job-related content. Focus only on the actual job posting information.`
        }],
        tools: [{
          type: "web_search_20250305",
          name: "web_search"
        }]
      })
    });

    const data = await response.json();
    console.log('Job fetch response type:', data.type);
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: error.message,
        details: 'Failed to fetch job posting. The URL may be inaccessible or require authentication.'
      })
    };
  }
};