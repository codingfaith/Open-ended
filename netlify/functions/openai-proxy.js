const axios = require('axios');

// Enhanced OpenAI request with retries and better error handling
const makeOpenAIRequest = async (content, isReport = false) => {
    const model = isReport ? "gpt-4-1106-preview" : "gpt-3.5-turbo";
    const maxTokens = isReport ? 1000 : 3;
    const temperature = isReport ? 0.7 : 0.2;
    const timeout = isReport ? 30000 : 5000;

    const requestData = {
        model,
        messages: [
            {
                role: "system",
                content: isReport 
                    ? "Generate concise markdown report with ## Headers and - bullet points. Focus on Ubuntu principles." 
                    : "Return ONLY a number 0-10 based on Ubuntu values alignment."
            },
            { 
                role: "user", 
                content: isReport 
                    ? content.substring(0, 6000) // Ensure under token limit
                    : content
            }
        ],
        temperature,
        max_tokens: maxTokens
    };

    const config = {
        headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
        },
        timeout
    };

    // Retry logic for rate limits
    let retries = 3;
    while (retries > 0) {
        try {
            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                requestData,
                config
            );
            return response.data;
        } catch (error) {
            if (error.response?.status === 429 && retries > 0) {
                retries--;
                await new Promise(resolve => setTimeout(resolve, 2000));
                continue;
            }
            throw error;
        }
    }
};

// Enhanced handler with better error differentiation
exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    try {
        const body = JSON.parse(event.body);
        let result;

        if (body.prompt) {
            // Report generation
            const response = await makeOpenAIRequest(body.prompt, true);
            result = { 
                report: response.choices[0]?.message?.content || "No report generated"
            };
        } 
        else if (body.userResponse && body.expectations) {
            // Scoring request
            const prompt = `Evaluate (0-10):\nExpectations: ${body.expectations}\nResponse: ${body.userResponse}\n\nCriteria:
            - Ubuntu principles alignment
            - Relevance to question
            - Specificity\nONLY RETURN NUMBER`;

            const response = await makeOpenAIRequest(prompt);
            const scoreText = response.choices[0]?.message?.content?.trim();
            let score = parseFloat(scoreText);
            score = isNaN(score) ? 5 : Math.min(10, Math.max(0, Math.round(score)));
            result = { score };
        } 
        else {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing required fields' })
            };
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(result)
        };

    } catch (error) {
        console.error('API Error:', {
            message: error.message,
            response: error.response?.data,
            stack: error.stack
        });

        const statusCode = error.response?.status || 500;
        const errorType = statusCode === 429 ? 'rate_limit' : 
                        statusCode === 400 ? 'invalid_request' : 
                        'server_error';

        return {
            statusCode,
            body: JSON.stringify({
                error: 'API request failed',
                type: errorType,
                details: error.response?.data?.error?.message || error.message,
                model: body?.prompt ? 'gpt-4' : 'gpt-3.5'
            })
        };
    }
};