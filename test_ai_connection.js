const axios = require('axios');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${GEMINI_API_KEY}`;

async function testAI() {
    try {
        const payload = {
            contents: [{
                parts: [{ text: "Hola, responde con un JSON: {\"test\": \"ok\"}" }]
            }]
        };
        const response = await axios.post(GEMINI_URL, payload);
        console.log('✅ AI Success:', response.data.candidates[0].content.parts[0].text);
    } catch (e) {
        console.error('❌ AI Error:', e.message);
        if (e.response) console.error('Data:', e.response.data);
    }
}

testAI();
