const axios = require('axios');

exports.handler = async (event) => {
  try {
    const { userResponse, expectedAnswers } = JSON.parse(event.body);
    
    const prompt = `Rate the similarity of the following response to the given answer set. Assign a score between 0 and 5.\n\nUser Response: \"${userResponse}\"\nReference Answers: ${expectedAnswers.map(a => `\"${a.text}\" (Score: ${a.score})`).join(", ")}\n\nReturn only the score.`;

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    return {
      statusCode: 200,
      body: JSON.stringify(response.data)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};