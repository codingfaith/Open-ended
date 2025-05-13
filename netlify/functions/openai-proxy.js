// In openai-proxy.js
exports.handler = async (event) => {
  const { userResponse, expectations, prompt } = JSON.parse(event.body);
  const isReport = !!prompt;

  try {
    const model = isReport ? "gpt-4-1106-preview" : "gpt-3.5-turbo";
    const maxTokens = isReport ? 1000 : 3;
    const temperature = isReport ? 0.7 : 0.2;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model,
        messages: [{
          role: "system",
          content: isReport 
            ? "Generate concise markdown report with ## Headers and - bullet points" 
            : "Return ONLY a number 0-10"
        },{
          role: "user",
          content: isReport 
            ? prompt.substring(0, 6000) // Ensure under token limit
            : `Score 0-10: ${userResponse}\nCriteria: ${expectations}`
        }],
        max_tokens: maxTokens,
        temperature
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: isReport ? 30000 : 5000
      }
    );

    return {
      statusCode: 200,
      body: JSON.stringify(isReport 
        ? { report: response.data.choices[0].message.content }
        : { score: parseInt(response.data.choices[0].message.content) || 5 }
      )
    };
  } catch (error) {
    console.error(`GPT-${isReport ? '4' : '3.5'} Error:`, error.response?.data || error.message);
    return {
      statusCode: error.response?.status || 500,
      body: JSON.stringify({
        error: isReport 
          ? "GPT-4 report generation failed" 
          : "Scoring failed",
        details: error.response?.data?.error?.message || error.message
      })
    };
  }
};