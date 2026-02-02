# 🚀 Quick Setup Guide

## Step 1: Wait for npm install to complete
The dependencies are currently being installed. This may take 5-10 minutes as Puppeteer downloads Chromium (~300MB).

You can check the terminal to see when it's done.

## Step 2: Get Your Gemini API Key

1. Visit: https://makersuite.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key

## Step 3: Add API Key to .env file

1. Open the `.env` file in this directory
2. Replace `your_gemini_api_key_here` with your actual API key:

```
GEMINI_API_KEY=AIzaSy...your_actual_key_here
```

3. Save the file

## Step 4: Start the Server

Once npm install is complete, run:

```bash
npm start
```

Or for development mode with auto-reload:

```bash
npm run dev
```

## Step 5: Open in Browser

Navigate to: http://localhost:3000

## 🎉 You're Ready!

- Click "Generate MCQ" to create questions from study material
- Click "Solve MCQ" to get answers for existing questions
- Download PDFs of your results

## Need Help?

Check the README.md file for detailed documentation and troubleshooting.
