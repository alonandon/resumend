export const handler = async (event) => {
  console.log('analyze-resume function called!');
  console.log('Method:', event.httpMethod);
  
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
    const { resumeText, jobText } = JSON.parse(event.body);
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error('API key not configured');
    }

    console.log('Received resume length:', resumeText?.length);
    console.log('Received job text length:', jobText?.length);

    const requestBody = {
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [{
        role: "user",
        content: `You are a professional resume optimization expert with knowledge of the latest 2025 ATS and resume best practices. Analyze the following resume against the job posting and provide detailed recommendations.

RESUME:
${resumeText}

JOB POSTING:
${jobText}

Please provide:

1. KEYWORD ALIGNMENT: Identify important keywords and phrases from the job posting that should appear in the resume. Look for synonym mismatches (e.g., "spearhead" vs "lead", "manage" vs "oversee") and suggest exact keyword replacements to improve ATS matching.

2. CONTENT IMPROVEMENTS: Based on the latest best practices, suggest specific improvements to the resume content, structure, and formatting.

3. MISSING QUALIFICATIONS: Identify key qualifications or skills from the job posting that are missing or understated in the resume.

4. STRENGTH HIGHLIGHTS: Point out resume elements that strongly match the job requirements.

5. READY-TO-USE BULLET POINTS: For each major experience/role on the resume, write 3 optimized bullet points that are tailored to this specific job posting. These should be ready to copy and paste directly into the resume. Use strong action verbs, quantify achievements where possible, and incorporate relevant keywords from the job posting. Format them clearly so they can be easily copied.

Format your response with clear sections and actionable recommendations.`
      }]
    };

    console.log('Calling Anthropic API...');
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error:', errorText);
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Analysis complete, response type:', data.type);
    
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