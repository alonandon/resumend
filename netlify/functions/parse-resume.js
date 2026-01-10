export const handler = async (event) => {
  console.log('parse-resume function called!');
  
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
    const { resumeText } = JSON.parse(event.body);
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error('API key not configured');
    }

    console.log('Parsing resume text length:', resumeText?.length);

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
          content: `Parse this resume and extract all work experiences. Return ONLY a JSON array with no additional text, markdown, or explanation.

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
- Return ONLY the JSON array, absolutely no other text before or after`
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error:', errorText);
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response type:', data.type);
    console.log('AI response content:', data.content[0].text.substring(0, 200));
    
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
      body: JSON.stringify({ error: error.message })
    };
  }
};