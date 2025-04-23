const axios = require('axios');

exports.handler = async (event) => {
    // 1. Validate HTTP method
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        // 2. Parse and validate input
        const { userResponse, expectations } = JSON.parse(event.body);
        if (!userResponse?.trim() || !expectations?.trim()) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
        }

        // 3. Generate precise prompt
        const prompt = `Evaluate this response on a 0-10 scale for Ubuntu principles and relevance of response to the question asked using the expectation as a guide:
        Expectations: ${expectations}
        Response: "${userResponse}"

        Do not penalise bad spellings or bad grammar, focus on meaning. Give 0 for off topic responses, what does not make sense and irrelevant answers to the question asked.

        RETURN ONLY THE NUMBER BETWEEN 0-10:`;
        
        // 4. Call OpenAI API
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are an Ubuntu values scoring tool. Return ONLY a number from 0-10."
                    },
                    { role: "user", content: prompt }
                ],
                temperature: 0.2,
                max_tokens: 3
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 5000
            }
        );

      // Extract and validate score
      const scoreText = response.data.choices[0]?.message?.content?.trim();
      let score = parseFloat(scoreText);
      
      // Handle parsing failures and clamp to 0-10 range
      score = isNaN(score) ? 5 : Math.min(10, Math.max(0, Math.round(score)));

      return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ score })
      };

  } catch (error) {
      console.error('Proxy Error:', error);
      return {
          statusCode: 500,
          body: JSON.stringify({
              score: 5,  // Mid-point fallback
              error: 'Evaluation service unavailable'
          })
      };
  }
};