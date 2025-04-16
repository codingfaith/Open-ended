const axios = require('axios');

exports.handler = async (event) => {
    // 1. Validate HTTP method
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        // 2. Parse and validate input
        const { userResponse, expectedAnswers } = JSON.parse(event.body);
        if (!userResponse || !expectedAnswers?.length) {
            return { statusCode: 400, body: 'Missing/invalid parameters' };
        }

        // 3. Generate precise prompt
        const prompt = `STRICTLY RETURN ONLY A NUMBER BETWEEN 0-5. 
        Rate how well this response matches the ideals:\n\n"${userResponse}"\n\n` +
        `Scoring Rubric:\n${
            expectedAnswers.map(a => `• ${a.score}: ${a.text}`).join('\n')
        }`;

        // 4. Call OpenAI API
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are a precise scoring tool. Return ONLY a number from 0-5."
                    },
                    { role: "user", content: prompt }
                ],
                temperature: 0.1,
                max_tokens: 2
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 3000
            }
        );

        // 5. Extract and validate score
        const scoreText = response.data.choices[0]?.message?.content?.trim();
        const score = Math.min(5, Math.max(0, parseFloat(scoreText) || 0));

        return {
            statusCode: 200,
            body: JSON.stringify({ score })
        };

    } catch (error) {
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