const axios = require('axios');

// Enhanced OpenAI request configuration with better error handling
const makeOpenAIRequest = async (prompt, isReport = false) => {
    try {
        const response = await axios.post(
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
                    'Content-Type': 'application/json',
                    'Accept': 'application/json' // Explicitly accept JSON
                },
                timeout: isReport ? 15000 : 8000, // Increased timeouts
                // Add axios-retry options here if needed
            }
        );
        
        return response;
    } catch (error) {
        console.error('OpenAI API Error:', {
            message: error.message,
            code: error.code,
            response: error.response?.data,
            stack: error.stack
        });
        throw error; // Re-throw for the handler to process
    }
};

// Enhanced handler with better iPhone support
exports.handler = async (event) => {
    // Set CORS headers for all responses
    const baseHeaders = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // Handle OPTIONS request for CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,
            headers: baseHeaders,
            body: ''
        };
    }

    try {
        const path = event.path.split('/').pop();
        
        if (path === 'openai-proxy' && event.httpMethod === 'POST') {
            // Parse body safely
            let body;
            try {
                body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
            } catch (e) {
                return {
                    statusCode: 400,
                    headers: baseHeaders,
                    body: JSON.stringify({ error: 'Invalid JSON format' })
                };
            }

            if (body.prompt) {
                // Report generation request
                const response = await makeOpenAIRequest(body.prompt, true);
                const report = response.data.choices[0]?.message?.content;
                
                return {
                    statusCode: 200,
                    headers: baseHeaders,
                    body: JSON.stringify({ report })
                };
            } else if (body.userResponse && body.expectations) {
                // Scoring request
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
                    headers: baseHeaders,
                    body: JSON.stringify({ score })
                };
            } else {
                return {
                    statusCode: 400,
                    headers: baseHeaders,
                    body: JSON.stringify({ error: 'Invalid request format' })
                };
            }
        }

        return {
            statusCode: 404,
            headers: baseHeaders,
            body: JSON.stringify({ error: 'Not found' })
        };
    } catch (error) {
        console.error('Handler Error:', {
            error: error.message,
            stack: error.stack,
            event: {
                path: event.path,
                method: event.httpMethod,
                headers: event.headers
            }
        });

        // Return more detailed error information
        return {
            statusCode: error.response?.status || 500,
            headers: baseHeaders,
            body: JSON.stringify({
                error: 'Internal server error',
                message: error.message,
                ...(process.env.NODE_ENV === 'development' && {
                    stack: error.stack,
                    details: error.response?.data
                })
            })
        };
    }
};