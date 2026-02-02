
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    try {
        console.log('Fetching models...');
        // The SDK doesn't have a direct "listModels" in the core generative-ai package that is easy to use for listing.
        // But we can try to call each model with a simple prompt.
        const models = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];

        for (const modelName of models) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent('ping');
                console.log(`✅ Model ${modelName} is available.`);
            } catch (error) {
                console.log(`❌ Model ${modelName} failed: ${error.message}`);
            }
        }
    } catch (error) {
        console.error('Error listing models:', error);
    }
}

listModels();
