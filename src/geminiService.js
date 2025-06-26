const axios = require('axios');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-1.5-flash';

if (!GEMINI_API_KEY) {
    console.error("❌ Error: GEMINI_API_KEY tidak ditemukan di file .env. Pastikan Anda telah mengaturnya.");
    process.exit(1);
}

async function sendToGemini(prompt) {
    try {
        const res = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
            { contents: [{ parts: [{ text: prompt }] }] },
            {
                headers: { 'Content-Type': 'application/json' },
                params: { key: GEMINI_API_KEY }
            }
        );
        return res.data.candidates[0].content.parts[0].text;
    } catch (err) {
        console.error('❌ Gemini Error:', err.response?.data?.error || err.message);
        if (err.response?.data) {
            console.error('Gemini Error Details:', JSON.stringify(err.response.data, null, 2));
        }
        return 'Maaf, saya sedang mengalami kendala teknis saat ini. Mohon coba lagi nanti.';
    }
}

module.exports = { sendToGemini };