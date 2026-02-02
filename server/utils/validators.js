// Input Validators and Sanitizers
// Security and validation utilities

// Validate MCQ count
function validateMCQCount(count) {
    const num = parseInt(count);
    if (isNaN(num) || num < 0 || num > 1000) {
        throw new Error('MCQ count must be between 0 and 1000');
    }
    return num;
}

// Validate difficulty level
function validateDifficulty(difficulty) {
    const validLevels = ['Easy', 'Medium', 'Hard', 'Mixed'];
    if (!validLevels.includes(difficulty)) {
        throw new Error('Difficulty must be Easy, Medium, Hard, or Mixed');
    }
    return difficulty;
}

// Validate text input size
function validateTextLength(text, maxLength = 100000) {
    if (!text || typeof text !== 'string') {
        throw new Error('Invalid text input');
    }

    const trimmed = text.trim();

    if (trimmed.length === 0) {
        throw new Error('Text input cannot be empty');
    }

    if (trimmed.length > maxLength) {
        // Just truncate or warn instead of throwing? No, let's just keep it large.
        return trimmed.substring(0, maxLength);
    }

    return trimmed;
}

// Sanitize text input (basic XSS prevention)
function sanitizeText(text) {
    if (typeof text !== 'string') {
        return '';
    }

    // Remove potentially dangerous HTML/script tags
    return text
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
}

// Validate boolean
function validateBoolean(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value === 'true';
    return Boolean(value);
}

// Validate generation request
function validateGenerationRequest(body, isFileUpload = false) {
    const errors = [];

    // If no file is uploaded, material is required
    if (!isFileUpload) {
        try {
            validateTextLength(body.studyMaterial, 50000);
        } catch (error) {
            errors.push(`Study Material: ${error.message}`);
        }
    } else if (body.studyMaterial && body.studyMaterial.trim().length > 100000) {
        // Warning instead of error
        console.warn('Study Material: Text input is very long');
    }

    try {
        validateMCQCount(body.easyCount || 0);
        validateMCQCount(body.mediumCount || 0);
        validateMCQCount(body.hardCount || 0);

        const total = parseInt(body.easyCount || 0) + parseInt(body.mediumCount || 0) + parseInt(body.hardCount || 0);
        if (total < 1 || total > 1000) {
            throw new Error('Total MCQ count must be between 1 and 1000');
        }
    } catch (error) {
        errors.push(`MCQ Counts: ${error.message}`);
    }

    // Difficulty validation removed as it's now granular counts

    if (errors.length > 0) {
        throw new Error(errors.join('; '));
    }

    return {
        studyMaterial: body.studyMaterial ? sanitizeText(body.studyMaterial) : '',
        easyCount: parseInt(body.easyCount || 0),
        mediumCount: parseInt(body.mediumCount || 0),
        hardCount: parseInt(body.hardCount || 0),
        includeExplanation: validateBoolean(body.includeExplanation)
    };
}

// Validate solving request
function validateSolvingRequest(body, isFileUpload = false) {
    const errors = [];

    if (!isFileUpload) {
        try {
            validateTextLength(body.mcqText, 50000);
        } catch (error) {
            errors.push(`MCQ Text: ${error.message}`);
        }
    } else if (body.mcqText && body.mcqText.trim().length > 50000) {
        errors.push('MCQ Text: Text input exceeds maximum length of 50000 characters');
    }

    if (errors.length > 0) {
        throw new Error(errors.join('; '));
    }

    return {
        mcqText: body.mcqText ? sanitizeText(body.mcqText) : '',
        includeExplanation: validateBoolean(body.includeExplanation)
    };
}

module.exports = {
    validateMCQCount,
    validateDifficulty,
    validateTextLength,
    sanitizeText,
    validateBoolean,
    validateGenerationRequest,
    validateSolvingRequest
};
