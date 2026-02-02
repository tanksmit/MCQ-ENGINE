
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testFullName() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const modelsToTest = ['models/gemini-2.5-flash', 'gemini-2.5-flash', 'models/gemini-1.5-flash', 'gemini-1.5-flash'];

    for (const modelName of modelsToTest) {
        try {
            console.log(`Testing model: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent('ping');
            console.log(`✅ ${modelName} works!`);
        } catch (error) {
            console.log(`❌ ${modelName} failed: ${error.message}`);
        }
    }
}

testFullName();
