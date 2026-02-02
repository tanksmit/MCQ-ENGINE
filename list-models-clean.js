
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();
const fs = require('fs');

async function listAllModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        let output = 'Available Models:\n';
        if (data.models) {
            data.models.forEach(m => {
                output += `- ${m.name}\n`;
            });
        } else {
            output += 'No models found or error: ' + JSON.stringify(data);
        }
        fs.writeFileSync('available_models_clean.txt', output);
        console.log('Results written to available_models_clean.txt');
    } catch (error) {
        console.error('Error fetching models:', error);
    }
}

listAllModels();
