// AI Service - Gemini API Integration
// Handles MCQ generation and solving using Google's Generative AI
// Supports text, PDF, Images, and PPTX

const { GoogleGenerativeAI } = require('@google/generative-ai');
const officeTextExtractor = require('office-text-extractor');
const crypto = require('crypto');

// In-memory cache
const resultCache = new Map();
const CACHE_LIMIT = 500; // Limit memory usage

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// System Instruction for MCQ Generation
const GENERATION_SYSTEM_INSTRUCTION = `You are an expert academic assessment generator. Your goal is to create high-quality, pedagogically sound multiple-choice questions.

CORE PRINCIPLES:
1. ACCURACY: Every question must have one clearly correct answer derived strictly from the provided material.
2. CLARITY: Use precise, professional academic language. Avoid ambiguity.
3. QUALITY DISTRACTORS: Options B, C, and D must be plausible but definitively incorrect. Avoid "obviously wrong" options.
4. INDEPENDENCE: Each question should be independent; do not rely on previous questions for answers.
5. CONSTRAINTS: 
   - Avoid "All of the above" or "None of the above" unless absolutely necessary.
   - Do not include questions with "refer to figure/image" unless the content is provided.
   - Ensure a balanced distribution of topics from the material.

OUTPUT FORMAT:
Return ONLY a valid JSON array of MCQ objects. Each object MUST have: "question", "options" (with A, B, C, D), "correctAnswer" (just the letter), and "explanation".
Avoid excessive escaping; let the JSON string handles standard characters. For LaTeX, use single backslashes if not using specific JSON mode. No markdown, no filler.`;

// System Instruction for MCQ Solving
const SOLVING_SYSTEM_INSTRUCTION = `You are an expert academic evaluator. Your task is to solve multiple-choice questions accurately.

CORE PRINCIPLES:
1. PRECISION: Identify the single most correct answer based on logical reasoning and academic facts.
2. FULL STRUCTURE: You MUST return the full MCQ object for each question, including the original question text and all options (A, B, C, D), even if only the answer was requested.
3. EXPLANATION: If requested, provide a clear, logical explanation for why the chosen answer is correct.

OUTPUT FORMAT:
Return ONLY a valid JSON array of MCQ objects. Each object MUST have: "question", "options" (with A, B, C, D), "correctAnswer" (just the letter), and "explanation".
Be brief. No markdown, no filler.`;

// Examples for "Few-Shot" Prompting
const FEW_SHOT_EXAMPLES = `
EXAMPLE INPUT: "The solar system consists of the Sun and everything that orbits it, including eight planets. Jupiter is the largest planet."
EXAMPLE OUTPUT (2 MCQs, Easy):
[
  {
    "question": "Which celestial body is at the center of our solar system?",
    "options": {
      "A": "The Moon",
      "B": "The Sun",
      "C": "Jupiter",
      "D": "Mars"
    },
    "correctAnswer": "B",
    "explanation": "The text states the solar system consists of the Sun and everything that orbits it."
  },
  {
    "question": "What is the largest planet in our solar system?",
    "options": {
      "A": "Earth",
      "B": "Saturn",
      "C": "Jupiter",
      "D": "Neptune"
    },
    "correctAnswer": "C",
    "explanation": "The material explicitly mentions that Jupiter is the largest planet."
  }
]
`;

// Master Prompt for MCQ Generation
function getGenerationPrompt(mcqCount, difficulty, includeExplanation) {
    return `TASK: Generate exactly ${mcqCount} MCQs.
DIFFICULTY: ${difficulty}
INSTRUCTIONS:
1. Base questions strictly on the provided material.
2. Ensure specific difficulty:
   - Easy: Direct recall of facts.
   - Medium: Understanding and application.
   - Hard/Tricky: Analysis and synthesis of multiple concepts.
3. ${includeExplanation ? 'Include a detailed explanation for each answer.' : 'Do NOT include explanations.'}

${FEW_SHOT_EXAMPLES}

PROVIDED MATERIAL:
`;
}

// Master Prompt for MCQ Solving
function getSolvingPrompt(includeExplanation) {
    return `TASK: Identify the correct answers for the following MCQs and return the complete MCQ objects.
INSTRUCTIONS:
1. For each question provided, determine the correct option.
2. You MUST return the FULL MCQ structure for every question: question text, all options, the correct answer letter, and an explanation.
3. ${includeExplanation ? 'Include detailed explanations.' : 'Keep explanations brief.'}

OUTPUT FORMAT: Return ONLY the JSON array matching the structure shown in the examples above.`;
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const MODELS = [
    'gemini-1.5-flash-latest',
    'gemini-flash-lite-latest',
    'gemini-flash-latest',
    'gemini-2.0-flash-exp',
    'gemini-2.0-flash-lite',
    'gemini-1.5-pro-latest',
    'gemini-2.0-pro-exp'
];

/**
 * Extracts text from PPTX buffer
 */
async function extractTextFromPPT(buffer) {
    try {
        const extractor = officeTextExtractor.getTextExtractor();
        const text = await extractor.extractText({ input: buffer, type: 'buffer' });
        return text;
    } catch (error) {
        console.error('PPT Extraction Error:', error);
        throw new Error('Failed to extract text from PPT file');
    }
}

/**
 * Formats file for Gemini SDK
 */
function fileToGenerativePart(buffer, mimeType) {
    return {
        inlineData: {
            data: buffer.toString('base64'),
            mimeType
        }
    };
}

/**
 * Sanitizes AI response to ensure valid JSON
 */
function cleanJSONResponse(text) {
    if (!text) return "";

    // 1. Remove markdown code blocks
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    // 2. Fix unescaped backslashes (LaTeX, etc.)
    // We only do this if it's NOT already valid JSON (handles edge cases where AI fails to escape)
    try {
        JSON.parse(text);
        return text; // It's valid, don't mess with it
    } catch (e) {
        // Not valid, try to fix backslashes
        text = text.replace(/\\(?![bfnrtu"\/]|u[0-9a-fA-F]{4})/g, '\\\\');
    }

    // 3. Handle potential truncated JSON
    if (!text.endsWith(']') && !text.endsWith('}')) {
        console.log('Attempting to repair truncated JSON...');
        // Close string if open
        const lastQuote = text.lastIndexOf('"');
        const lastColon = text.lastIndexOf(':');
        if (lastQuote > lastColon) {
            text += '"';
        }

        // Close braces and brackets
        let openBraces = (text.match(/{/g) || []).length - (text.match(/}/g) || []).length;
        let openBrackets = (text.match(/\[/g) || []).length - (text.match(/\]/g) || []).length;

        for (let i = 0; i < openBraces; i++) text += '}';
        for (let i = 0; i < openBrackets; i++) text += ']';
    }

    return text;
}

async function generateWithFallback(prompt, fileData = null, systemInstruction = GENERATION_SYSTEM_INSTRUCTION) {
    let lastError = null;

    for (const modelName of MODELS) {
        try {
            console.log(`Attempting to generate with model: ${modelName}`);
            const model = genAI.getGenerativeModel({
                model: modelName,
                systemInstruction: systemInstruction,
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 8192,
                    responseMimeType: "application/json"
                }
            });

            // Try up to 3 times per model for transient errors
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    const parts = [prompt];
                    if (fileData) {
                        parts.push(fileData);
                    }

                    const result = await model.generateContent(parts);
                    return result;
                } catch (error) {
                    const isQuotaError = error.message.includes('429') || (error.response && error.response.status === 429);
                    const isOverloaded = error.message.includes('503') || error.message.includes('overloaded');

                    if ((isQuotaError || isOverloaded) && attempt < 3) {
                        let waitTime = 2000 * Math.pow(2, attempt - 1);

                        // Try to extract exact wait time from Google RPC error if available
                        const match = error.message.match(/Please retry in ([0-9.]+)s/);
                        if (match && match[1]) {
                            waitTime = Math.ceil(parseFloat(match[1]) * 1000) + 1000;
                        } else if (error.response && error.response.headers) {
                            // Some environments might provide x-retry-after
                            const retryAfter = error.response.headers.get('retry-after');
                            if (retryAfter) waitTime = parseInt(retryAfter) * 1000 + 1000;
                        }

                        // Honoring long waits for free tier stability
                        if (waitTime > 30000 && attempt === 1) {
                            console.log(`Model ${modelName} requires long wait (${waitTime}ms). Waiting to remain stable...`);
                        }

                        console.log(`Model ${modelName} hit limit. Waiting ${waitTime}ms... (Attempt ${attempt}/3)`);
                        await sleep(waitTime);
                        continue;
                    }
                    throw error;
                }
            }
        } catch (error) {
            console.error(`Failed with model ${modelName}:`, error.message);
            lastError = error;
            continue;
        }
    }

    throw new Error(`All models failed. Last error: ${lastError ? lastError.message : 'Unknown error'}`);
}

// Generate MCQs
async function generateMCQs(studyMaterial, difficultyCounts, includeExplanation, file = null) {
    try {
        const { easyCount = 0, mediumCount = 0, hardCount = 0 } = difficultyCounts;
        const totalCount = easyCount + mediumCount + hardCount;

        // Check Cache first (if no file)
        const cacheKey = !file ? crypto.createHash('sha256').update(`${studyMaterial}|${easyCount}|${mediumCount}|${hardCount}|${includeExplanation}`).digest('hex') : null;
        if (cacheKey && resultCache.has(cacheKey)) {
            console.log('Serving from cache:', cacheKey.substring(0, 8));
            return resultCache.get(cacheKey);
        }

        let contentPrompt = `TASK: Generate exactly ${totalCount} MCQs from the provided material.
        DISTRIBUTION:
        - Easy: ${easyCount} questions (Direct recall)
        - Medium: ${mediumCount} questions (Application)
        - Hard: ${hardCount} questions (Complex reasoning)

        INSTRUCTIONS:
        1. Base questions strictly on the provided material.
        2. ${includeExplanation ? 'Include a detailed explanation for each answer.' : 'Do NOT include explanations.'}

        ${FEW_SHOT_EXAMPLES}

        PROVIDED MATERIAL:
        `;
        let fileData = null;

        if (file) {
            if (file.mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
                const text = await extractTextFromPPT(file.buffer);
                contentPrompt = `STUDY MATERIAL EXTRACTED FROM PPT:\n${text}\n\n${contentPrompt}`;
            } else {
                // Image or PDF (Native support in Gemini)
                fileData = fileToGenerativePart(file.buffer, file.mimetype);
                contentPrompt = `GENERATE MCQS BASED ON THE ATTACHED FILE CONTENT.\n\n${contentPrompt}`;
            }
        } else {
            contentPrompt = `STUDY MATERIAL:\n${studyMaterial}\n\n${contentPrompt}`;
        }

        const result = await generateWithFallback(contentPrompt, fileData);
        const response = await result.response;
        let text = response.text();

        text = cleanJSONResponse(text);
        const mcqs = JSON.parse(text);

        // Filter out only completely broken objects
        const validMcqs = mcqs.filter((mcq, index) => {
            const isValid = mcq && typeof mcq === 'object';
            if (!isValid) {
                console.warn(`Empty MCQ skipped at index ${index}`);
            }
            return isValid;
        });

        if (validMcqs.length === 0 && mcqs.length > 0) {
            throw new Error('All generated MCQs were malformed. Please try again or refine your material.');
        }

        // Save to cache
        if (cacheKey && validMcqs.length > 0) {
            if (resultCache.size >= CACHE_LIMIT) {
                const firstKey = resultCache.keys().next().value;
                resultCache.delete(firstKey);
            }
            resultCache.set(cacheKey, validMcqs);
        }

        return validMcqs;

    } catch (error) {
        console.error('Error generating MCQs:', error);
        throw new Error(`Failed to generate MCQs: ${error.message}`);
    }
}

// Normalize MCQ options to ensure {A, B, C, D} format
function normalizeOptions(options) {
    if (!options) return { A: '', B: '', C: '', D: '' };

    // If already in correct format
    if (options.A !== undefined && options.B !== undefined) {
        return {
            A: options.A || options.a || '',
            B: options.B || options.b || '',
            C: options.C || options.c || '',
            D: options.D || options.d || ''
        };
    }

    // If options is an array
    if (Array.isArray(options)) {
        return {
            A: options[0] || '',
            B: options[1] || '',
            C: options[2] || '',
            D: options[3] || ''
        };
    }

    // Handle lowercase keys
    if (options.a !== undefined || options.b !== undefined) {
        return {
            A: options.a || '',
            B: options.b || '',
            C: options.c || '',
            D: options.d || ''
        };
    }

    return { A: '', B: '', C: '', D: '' };
}

// Normalize MCQ structure
function normalizeMCQ(mcq) {
    if (!mcq || typeof mcq !== 'object') return null;

    // Handle different property names for the answer
    const answer = (
        mcq.correctAnswer ||
        mcq.correct_answer ||
        mcq.answer ||
        mcq.Answer ||
        mcq.correct_option ||
        mcq.selected_option ||
        'A'
    ).toString().trim();

    // Extract just the letter if it's "A) Something" or "A. Something"
    const answerLetter = answer.match(/^[A-DA-d]/) ? answer[0].toUpperCase() : 'A';

    return {
        question: mcq.question || mcq.Question || mcq.text || 'No question provided',
        options: normalizeOptions(mcq.options || mcq.Options || mcq.choices),
        correctAnswer: answerLetter,
        explanation: mcq.explanation || mcq.Explanation || mcq.reasoning || ''
    };
}

// Solve MCQs
async function solveMCQs(mcqText, includeExplanation, file = null) {
    try {
        let contentPrompt = getSolvingPrompt(includeExplanation);
        let fileData = null;

        if (file) {
            if (file.mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
                const text = await extractTextFromPPT(file.buffer);
                contentPrompt = `MCQ QUESTIONS EXTRACTED FROM PPT:\n${text}\n\n${contentPrompt}`;
            } else {
                fileData = fileToGenerativePart(file.buffer, file.mimetype);
                contentPrompt = `SOLVE THE MCQS IN THE ATTACHED FILE.\n\n${contentPrompt}`;
            }
        } else {
            contentPrompt = `MCQ QUESTIONS:\n${mcqText}\n\n${contentPrompt}`;
        }

        const result = await generateWithFallback(contentPrompt, fileData, SOLVING_SYSTEM_INSTRUCTION);
        const response = await result.response;
        let text = response.text();

        console.log('Raw AI response for solving:', text.substring(0, 500));

        text = cleanJSONResponse(text);

        let mcqs;
        try {
            mcqs = JSON.parse(text);
        } catch (parseError) {
            console.error('JSON parse error:', parseError.message);
            console.error('Raw text that failed to parse:', text.substring(0, 1000));
            throw new Error('Failed to parse AI response as JSON. The AI may have returned an invalid format.');
        }

        if (!Array.isArray(mcqs)) {
            // Try to extract array if wrapped in an object
            if (mcqs && typeof mcqs === 'object') {
                const possibleArrays = ['mcqs', 'questions', 'answers', 'results'];
                for (const key of possibleArrays) {
                    if (Array.isArray(mcqs[key])) {
                        mcqs = mcqs[key];
                        break;
                    }
                }
            }

            if (!Array.isArray(mcqs)) {
                console.error('AI response is not an array and no common keys found:', mcqs);
                throw new Error('Invalid response format: expected array of MCQs');
            }
        }

        // Normalize and filter MCQs
        const validMcqs = mcqs
            .map((mcq, index) => {
                const normalized = normalizeMCQ(mcq);
                if (!normalized) {
                    console.warn(`Empty/invalid MCQ skipped at index ${index}`);
                }
                return normalized;
            })
            .filter(mcq => mcq !== null);

        if (validMcqs.length === 0) {
            throw new Error('No valid MCQs could be extracted from the AI response');
        }

        console.log(`Successfully solved ${validMcqs.length} MCQs`);
        return validMcqs;

    } catch (error) {
        console.error('Error solving MCQs:', error);
        throw new Error(`Failed to solve MCQs: ${error.message}`);
    }
}

module.exports = {
    generateMCQs,
    solveMCQs
};

