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
        const prompt = `You are a scoring tool. Evaluate the following response on a 0-10 scale,Expectations: ${expectations}
            Response: "${userResponse} based on:

            Alignment with Ubuntu principles (such as compassion, community, dignity, respect, and interconnectedness), and

            Relevance and directness in answering the specific question asked (i.e., does it respond meaningfully and specifically to what was asked?).

            A perfect score (10) should only be given if the response clearly reflects Ubuntu values and directly answers the question with specific, relevant content.

            Positive tone or good intentions alone should not increase the score if the response is off-topic or vague.

            Assign a 0 if the response is nonsensical, entirely irrelevant, or does not address the question at all.

            Also use the expectations to determine high score answers.

            RETURN ONLY A NUMBER BETWEEN 0 AND 10`

        // 4. Call OpenAI API
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are a scoring tool. Return ONLY a number from 0-10."
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