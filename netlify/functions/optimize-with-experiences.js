export const handler = async (event) => {
  console.log('optimize-with-experiences function called!');
  
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
    const { experiences, skills, jobText } = JSON.parse(event.body);
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error('API key not configured');
    }

    console.log('Processing experiences:', experiences?.length);
    console.log('Processing skills:', skills?.length);

    // Format experiences for the prompt
    const formattedExperiences = experiences.map(exp => {
      const responsibilities = exp.responsibilities?.map(r => r.description).join('\n  - ') || '';
      return `
**${exp.job_title}** at **${exp.company}**
${exp.start_date || 'N/A'} - ${exp.is_current ? 'Present' : (exp.end_date || 'N/A')}
Responsibilities:
  - ${responsibilities}
`;
    }).join('\n\n');

    // Format skills
    const formattedSkills = skills?.map(s => `${s.skill_name} (${s.proficiency_level})`).join(', ') || 'None provided';

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
          content: `You are a professional resume optimization expert. Using the candidate's complete work history and skills, create an optimized resume tailored to this specific job posting.

JOB POSTING:
${jobText}

CANDIDATE'S COMPLETE WORK HISTORY:
${formattedExperiences}

CANDIDATE'S SKILLS:
${formattedSkills}

Please provide:

1. SELECTED EXPERIENCES: Choose the 2-4 most relevant experiences from the candidate's history that best match this job posting. Explain why each was selected.

2. KEYWORD ALIGNMENT: Identify important keywords from the job posting and show how they map to the candidate's experiences.

3. OPTIMIZED BULLET POINTS: For each selected experience, write 3-5 optimized bullet points that:
   - Highlight achievements and responsibilities most relevant to the job posting
   - Use strong action verbs and keywords from the job posting
   - Quantify achievements where possible
   - Are ready to copy and paste directly into a resume

4. SKILLS TO EMPHASIZE: List which of the candidate's skills should be prominently featured for this role.

5. ADDITIONAL RECOMMENDATIONS: Suggest any improvements or adjustments to better position the candidate for this role.

Format your response with clear sections and make the bullet points easy to copy.`
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error:', errorText);
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('Optimization complete, response type:', data.type);
    
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