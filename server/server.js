require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

console.log("API Key:", process.env.OPENAI_API_KEY ? "Loaded" : "Missing");

app.use(cors());
app.use(express.json());

// Proxy endpoint for OpenAI
app.post('/api/openai-proxy', async (req, res) => {
    try {
        const { prompt } = req.body;
        const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 10,
                temperature: 0
            })
        });

        if (!openaiResponse.ok) {
            const errorData = await openaiResponse.json();
            console.error("OpenAI Error:", errorData);
            return res.status(openaiResponse.status).json(errorData);
        }

        const data = await openaiResponse.json();
        res.json(data); // Forward the exact OpenAI response
    } catch (error) {
        console.error("Proxy Error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});