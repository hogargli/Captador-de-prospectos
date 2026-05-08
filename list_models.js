const axios = require('axios');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const LIST_URL = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`;

async function listModels() {
    try {
        const response = await axios.get(LIST_URL);
        console.log('Available models:');
        response.data.models.forEach(m => console.log(` - ${m.name}`));
    } catch (e) {
        console.error('❌ Error listing models:', e.message);
    }
}

listModels();
