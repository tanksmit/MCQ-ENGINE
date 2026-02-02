
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();
const fs = require('fs');

async function listAllModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        let output = 'Available Models List:\n';
        if (data.models) {
            data.models.forEach(m => {
                output += m.name + '\n';
            });
        } else {
            output += 'ERROR: ' + JSON.stringify(data);
        }
        fs.writeFileSync('final_model_list.txt', output, 'utf8');
        console.log('Saved to final_model_list.txt');
    } catch (error) {
        fs.writeFileSync('final_model_list.txt', 'FETCH ERROR: ' + error.message, 'utf8');
    }
}

listAllModels();
