
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function checkModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.models) {
            const names = data.models.map(m => m.name);
            const targets = ['models/gemini-2.5-flash', 'models/gemini-2.5-pro', 'models/gemini-2.0-flash', 'models/gemini-1.5-flash', 'models/gemini-1.5-pro'];
            targets.forEach(t => {
                console.log(`${t}: ${names.includes(t) ? 'Found' : 'NOT FOUND'}`);
            });
            console.log('--- All Models ---');
            names.forEach(n => console.log(n));
        } else {
            console.log('Error:', data);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

checkModels();
