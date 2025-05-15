const axios = require('axios');

// Common OpenAI request configuration
const makeOpenAIRequest = async (prompt, isReport = false) => {
    return axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: isReport 
                        ? "You are an Ubuntu principles analyst. Provide detailed feedback in markdown format." 
                        : "You are a scoring tool. Return ONLY a number from 0-10."
                },
                { role: "user", content: prompt }
            ],
            temperature: isReport ? 0.5 : 0.2,
            max_tokens: isReport ? 500 : 3
        },
        {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: isReport ? 10000 : 5000
        }
    );
};

// Scoring endpoint
exports.handler = async (event) => {
    // Handle both scoring and report generation based on path
    const path = event.path.split('/').pop();
    
    if (path === 'openai-proxy' && event.httpMethod === 'POST') {
        try {
            const body = JSON.parse(event.body);
            
            if (body.prompt) {
                // This is a report generation request
                const response = await makeOpenAIRequest(body.prompt, true);
                const report = response.data.choices[0]?.message?.content;
                
                return {
                    statusCode: 200,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ report })
                };
            } else if (body.userResponse && body.expectations) {
                // This is a scoring request
                const prompt = `Evaluate this response on a 0-10 scale. Expectations: ${body.expectations}\nResponse: ${body.userResponse}\n\nScore based on:
                • Alignment with Ubuntu principles (empathy, respect, dignity, communal responsibility, originality)
                • Relevance to the question
                • Specificity of response
                RETURN ONLY A NUMBER BETWEEN 0 AND 10`;

                const response = await makeOpenAIRequest(prompt);
                const scoreText = response.data.choices[0]?.message?.content?.trim();
                let score = parseFloat(scoreText);
                score = isNaN(score) ? 5 : Math.min(10, Math.max(0, Math.round(score)));

                return {
                    statusCode: 200,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ score })
                };
            } else {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: 'Invalid request format' })
                };
            }
        } catch (error) {
            console.error('Error:', error);
            return {
                statusCode: 500,
                body: JSON.stringify({
                    error: 'Internal server error',
                    details: error.message
                })
            };
        }
    }

    return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Not found' })
    };
};