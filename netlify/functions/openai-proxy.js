const axios = require('axios');

exports.handler = async (event) => {
  // 1. Input Validation
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // 2. Parse and validate request
    const { userResponse, expectedAnswers } = JSON.parse(event.body);
    
    if (!userResponse || !expectedAnswers) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // 3. Construct prompt
    const prompt = `Rate the similarity of this response to the reference answers. 
    Return ONLY a number between 0-5.\n\nResponse: "${userResponse}"\n\nReferences:\n${
      expectedAnswers.map(a => `- "${a.text}" (target score: ${a.score})`).join('\n')
    }`;

    // 4. Call OpenAI API
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: "gpt-3.5-turbo",
      messages: [{
        role: "system",
        content: "You are a scoring assistant. Return ONLY a number between 0-5."
      }, {
        role: "user", 
        content: prompt
      }],
      temperature: 0.2,  // Lower for more consistent scoring
      max_tokens: 3      // Limit to number-only response
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 5000      // 5-second timeout
    });

    // 5. Validate and format response
    const scoreText = response.data.choices[0]?.message?.content?.trim();
    const score = Math.min(5, Math.max(0, parseFloat(scoreText) || 0)); // Clamp to 0-5

    return {
      statusCode: 200,
      body: JSON.stringify({ score })  // Simplified response
    };

  } catch (error) {
    // 6. Enhanced error handling
    console.error('Proxy Error:', error);
    
    return {
      statusCode: error.response?.status || 500,
      body: JSON.stringify({ 
        error: error.message,
        details: error.response?.data 
      })
    };
  }
};