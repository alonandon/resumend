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
    console.log('Job text received:', jobText ? `${jobText.substring(0, 100)}...` : 'EMPTY OR UNDEFINED');
    console.log('Job text length:', jobText?.length || 0);

    // Validate inputs
    if (!jobText || jobText.trim().length === 0) {
      throw new Error('Job posting text is required but was not provided');
    }

    if (!experiences || experiences.length === 0) {
      throw new Error('No experiences provided');
    }

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
          content: `You are a professional resume optimization expert. Your PRIMARY GOAL is to tailor the candidate's resume to match the specific job posting below. Every recommendation must directly align with the job posting requirements.

JOB POSTING (THIS IS WHAT YOU MUST OPTIMIZE FOR):
${jobText}

CANDIDATE'S COMPLETE WORK HISTORY:
${formattedExperiences}

CANDIDATE'S SKILLS:
${formattedSkills}

CRITICAL INSTRUCTIONS:
- Read the job posting carefully and identify key requirements, responsibilities, and desired qualifications
- Use language and keywords from the job posting throughout your response
- Prioritize experiences that demonstrate the exact skills mentioned in the job posting
- Mirror the tone and terminology used in the job posting

Please provide:

1. JOB POSTING ANALYSIS: Briefly identify the 5-7 most important requirements/qualifications from the job posting.

2. SELECTED EXPERIENCES: Choose the 2-4 most relevant experiences from the candidate's history that best match this job posting. For each selection, explicitly state which job posting requirements it addresses.

3. KEYWORD ALIGNMENT: Create a table showing:
   - Job Posting Keywords/Requirements (left column)
   - How Candidate's Experience Matches (right column)

4. OPTIMIZED BULLET POINTS: For each selected experience, write 3-5 optimized bullet points that:
   - Use exact keywords and phrases from the job posting
   - Highlight achievements and responsibilities that directly match the job posting requirements
   - Start with strong action verbs similar to those in the job posting
   - Quantify achievements where possible
   - Are ready to copy and paste directly into a resume

5. SKILLS TO EMPHASIZE: From the candidate's skills list, identify which skills are mentioned or implied in the job posting and should be featured prominently.

6. ADDITIONAL RECOMMENDATIONS: Suggest specific improvements to better position the candidate for THIS SPECIFIC ROLE, referencing the job posting requirements.

Format your response with clear markdown headers (##) for each section. Make the bullet points easy to copy.`
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