// Express Server - Main entry point
// MCQ Generator & Solver Backend

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');

// Import routes
const mcqRoutes = require('./routes/mcq');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Validate environment variables
if (!process.env.GEMINI_API_KEY) {
    console.error('ERROR: GEMINI_API_KEY is not set in environment variables');
    console.error('Please create a .env file with your Gemini API key');
    console.error('Example: GEMINI_API_KEY=your_api_key_here');
    process.exit(1);
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting - 10 requests per minute per IP
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // Increased from 10 to 100
    message: {
        success: false,
        error: 'Too many requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Apply rate limiting to API routes
app.use('/api/', limiter);

// Serve static files (frontend)
app.use(express.static(path.join(__dirname, '..')));

// API Routes
app.use('/api', mcqRoutes);

// Serve index.html for root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found'
    });
});

// Start server
// function to find available port and start server
const startServer = (port) => {
    const server = app.listen(port, () => {
        console.log('='.repeat(50));
        console.log('🚀 MCQ Generator & Solver Server');
        console.log('='.repeat(50));
        console.log(`✓ Server running on http://localhost:${port}`);
        console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`✓ API Key configured: ${process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here' ? 'Yes' : 'No (Check .env)'}`);
        console.log('='.repeat(50));
        console.log('\nAvailable endpoints:');
        console.log(`  GET  http://localhost:${port}/`);
        console.log(`  POST http://localhost:${port}/api/generate-mcq`);
        console.log(`  POST http://localhost:${port}/api/solve-mcq`);
        console.log(`  POST http://localhost:${port}/api/download-pdf`);
        console.log(`  GET  http://localhost:${port}/api/health`);
        console.log('='.repeat(50));
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`⚠️  Port ${port} is busy, trying ${port + 1}...`);
            startServer(port + 1);
        } else {
            console.error('Server Error:', err);
        }
    });

    // Handle graceful shutdown for this specific server instance
    const shutdown = () => {
        console.log('\n🛑 Closing HTTP server...');
        server.close(() => {
            console.log('Server closed.');
            process.exit(0);
        });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
};

// Start the server if running directly (Local)
if (require.main === module) {
    startServer(PORT);
}

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('\n🛑 SIGTERM signal received: closing HTTP server');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n🛑 SIGINT signal received: closing HTTP server');
    process.exit(0);
});

// Export the app for Vercel
module.exports = app;
