// MCQ Routes - API endpoints for generation and solving
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { generateMCQs, solveMCQs } = require('../services/ai-service');
const { generatePDF } = require('../services/pdf-service');
const { validateGenerationRequest, validateSolvingRequest } = require('../utils/validators');

// Multer setup for file uploads (in-memory)
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// POST /api/generate-mcq
// Generate MCQs from study material (Streaming)
router.post('/generate-mcq', upload.single('file'), async (req, res) => {
    try {
        // Handle both Form Data (for files) and JSON (for text)
        const body = req.file ? req.body : req.body;

        // If it's a file, we might not have studyMaterial text, so we skip that validation part or adapt
        const validatedData = validateGenerationRequest(body, req.file ? true : false);
        const isPrefetch = body.isPrefetch === true;
        const totalCount = validatedData.easyCount + validatedData.mediumCount + validatedData.hardCount;
        const BATCH_SIZE = 2; // Reduced from 10 for faster feedback

        // Set headers for streaming
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');

        const batches = [];
        let remainingEasy = validatedData.easyCount;
        let remainingMedium = validatedData.mediumCount;
        let remainingHard = validatedData.hardCount;

        while (remainingEasy > 0 || remainingMedium > 0 || remainingHard > 0) {
            const batchEasy = Math.min(remainingEasy, BATCH_SIZE);
            remainingEasy -= batchEasy;

            const batchMedium = Math.min(remainingMedium, Math.max(0, BATCH_SIZE - batchEasy));
            remainingMedium -= batchMedium;

            const batchHard = Math.min(remainingHard, Math.max(0, BATCH_SIZE - (batchEasy + batchMedium)));
            remainingHard -= batchHard;

            if (batchEasy + batchMedium + batchHard > 0) {
                batches.push({
                    easyCount: batchEasy,
                    mediumCount: batchMedium,
                    hardCount: batchHard
                });
            }
        }

        let completedInRequest = 0;
        const CONCURRENCY_LIMIT = 1; // Sequential for stability

        // Process batches
        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];

            if (i > 0) {
                await new Promise(r => setTimeout(r, 1000)); // 1s spacing between batches
            }

            try {
                const mcqs = await generateMCQs(
                    validatedData.studyMaterial,
                    batch,
                    validatedData.includeExplanation,
                    req.file
                );

                completedInRequest += mcqs.length;

                // Send chunk immediately as it arrives
                const chunk = {
                    mcqs: mcqs,
                    completed: false,
                    total: totalCount,
                    current: completedInRequest
                };
                res.write(JSON.stringify(chunk) + '\n--CHUNK--\n');
            } catch (err) {
                console.error("Batch generation error:", err);
            }
        }

        // Send final completion message
        res.write(JSON.stringify({ completed: true }) + '\n--CHUNK--\n');
        res.end();

    } catch (error) {
        console.error('Error in /generate-mcq:', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to generate MCQs'
            });
        } else {
            res.end();
        }
    }
});

// Solve existing MCQs (Streaming)
router.post('/solve-mcq', upload.single('file'), async (req, res) => {
    try {
        const validatedData = validateSolvingRequest(req.body, req.file ? true : false);
        const isPrefetch = req.body.isPrefetch === true;

        // Set headers for streaming
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');

        // Solve MCQs using AI (pass file if exists)
        // Note: For now, we solve all at once but return as a streamed chunk
        // To truly stream "one-by-one" for solving past text, we'd need to parse it first.
        const mcqs = await solveMCQs(
            validatedData.mcqText,
            validatedData.includeExplanation,
            req.file
        );

        // Send chunk
        const chunk = {
            mcqs: mcqs,
            completed: false,
            total: mcqs.length,
            current: mcqs.length
        };
        res.write(JSON.stringify(chunk) + '\n--CHUNK--\n');

        // Send final completion message
        res.write(JSON.stringify({ completed: true }) + '\n--CHUNK--\n');
        res.end();

    } catch (error) {
        console.error('Error in /solve-mcq:', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to solve MCQs'
            });
        } else {
            res.end();
        }
    }
});

// POST /api/download-pdf
// Generate and download PDF
router.post('/download-pdf', async (req, res) => {
    try {
        let { mcqs, includeExplanation, difficulty } = req.body;

        if (!mcqs || !Array.isArray(mcqs) || mcqs.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid MCQ data'
            });
        }

        // Safety filter before PDF generation
        // Relaxed filter: allow anything that looks like an MCQ to try PDF generation
        const validMcqs = mcqs.filter(m => m && typeof m === 'object');
        if (validMcqs.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid data provided for PDF generation.'
            });
        }

        const title = difficulty
            ? `MCQ Assessment - ${difficulty} Level`
            : 'Solved MCQ Assessment';

        const pdfBuffer = await generatePDF(validMcqs, title, includeExplanation);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="MCQs_${Date.now()}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.send(pdfBuffer);

    } catch (error) {
        console.error('Error in /download-pdf:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate PDF'
        });
    }
});

module.exports = router;

