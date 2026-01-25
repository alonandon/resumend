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

    // Strategy: Try web_fetch first, fallback to web_search if needed
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
          content: `Please fetch the job posting from this URL: ${url}

Extract and return the complete job posting content including:
- Job title
- Company name
- Location
- Job description/summary
- Responsibilities and duties
- Required qualifications
- Preferred qualifications
- Benefits (if mentioned)
- Salary range (if mentioned)
- Any other relevant details

Provide a thorough extraction of the job posting content. Exclude navigation menus, footers, ads, and other unrelated page elements.`
        }],
        tools: [
          {
            type: "web_fetch_20250305",
            name: "web_fetch"
          },
          {
            type: "web_search_20250305",
            name: "web_search"
          }
        ]
      })
    });

    const data = await response.json();
    console.log('API Response:', {
      type: data.type,
      stop_reason: data.stop_reason,
      content_blocks: data.content?.length,
      has_error: !!data.error
    });

    // Check for API errors
    if (data.error) {
      throw new Error(data.error.message || 'API returned an error');
    }

    // Extract text content from the response
    let extractedText = '';
    let hasToolUse = false;
    
    if (data.content) {
      for (const block of data.content) {
        if (block.type === 'text') {
          extractedText += block.text + '\n';
        } else if (block.type === 'tool_use') {
          hasToolUse = true;
          console.log('Tool used:', block.name);
        }
      }
    }

    // If we got content, return it
    if (extractedText.trim()) {
      console.log('Successfully extracted job posting content');
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      };
    }

    // If no content extracted but tools were used, there might be an issue
    if (hasToolUse && !extractedText.trim()) {
      console.warn('Tools were used but no text content was extracted');
    }

    // Return the data regardless - let the frontend handle it
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