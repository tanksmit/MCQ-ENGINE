# MCQ Generator & Solver

AI-powered multiple-choice question generator and solver with professional PDF export capabilities. Built with modern web technologies and featuring a stunning glassmorphism UI.

## 🌟 Features

- **Smart MCQ Generation**: Generate high-quality MCQs from study material with AI
- **Intelligent Solving**: Validate and solve existing MCQs with correct answers
- **Customizable Difficulty**: Choose between Easy, Medium, and Hard levels
- **Optional Explanations**: Include detailed explanations for each answer
- **PDF Export**: Download professionally formatted PDFs
- **Modern UI**: Beautiful glassmorphism design with smooth animations
- **Secure**: Input validation, sanitization, and rate limiting

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

### Installation

1. **Clone or navigate to the project directory**
   ```bash
   cd "c:\Users\tanks\OneDrive\Desktop\mcq genarater"
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```bash
   copy .env.example .env
   ```
   
   Edit `.env` and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_actual_api_key_here
   PORT=3000
   NODE_ENV=development
   ```

4. **Start the server**
   ```bash
   npm start
   ```
   
   For development with auto-reload:
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to: `http://localhost:3000`

## 📖 Usage

### Generate MCQs

1. Go to **Generate MCQ** page
2. Paste your study material (minimum 50 characters)
3. Select number of questions (1-50)
4. Choose difficulty level
5. Toggle explanations on/off
6. Click **Generate MCQs**
7. Preview and download PDF

### Solve MCQs

1. Go to **Solve MCQ** page
2. Paste your MCQ questions
3. Toggle explanations if needed
4. Click **Solve MCQs**
5. Review correct answers
6. Download solved MCQs as PDF

## 🔧 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Endpoints

#### 1. Generate MCQs
```http
POST /api/generate-mcq
Content-Type: application/json

{
  "studyMaterial": "Your study content here...",
  "mcqCount": 5,
  "difficulty": "Medium",
  "includeExplanation": true
}
```

**Response:**
```json
{
  "success": true,
  "mcqs": [
    {
      "question": "Question text",
      "options": {
        "A": "Option A",
        "B": "Option B",
        "C": "Option C",
        "D": "Option D"
      },
      "correctAnswer": "A",
      "explanation": "Explanation text"
    }
  ],
  "count": 5,
  "difficulty": "Medium",
  "includeExplanation": true
}
```

#### 2. Solve MCQs
```http
POST /api/solve-mcq
Content-Type: application/json

{
  "mcqText": "Q1. Question?\nA. Option A\nB. Option B...",
  "includeExplanation": true
}
```

#### 3. Download PDF
```http
POST /api/download-pdf
Content-Type: application/json

{
  "mcqs": [...],
  "includeExplanation": true,
  "difficulty": "Medium"
}
```

**Response:** PDF file download

#### 4. Health Check
```http
GET /api/health
```

## 🏗️ Project Structure

```
mcq genarater/
├── css/
│   └── style.css              # Glassmorphism design system
├── js/
│   └── main.js                # Frontend JavaScript
├── server/
│   ├── routes/
│   │   └── mcq.js             # API routes
│   ├── services/
│   │   ├── ai-service.js      # Gemini AI integration
│   │   └── pdf-service.js     # PDF generation
│   ├── utils/
│   │   └── validators.js      # Input validation
│   └── server.js              # Express server
├── index.html                 # Home page
├── generate.html              # MCQ generator page
├── solve.html                 # MCQ solver page
├── package.json               # Dependencies
├── .env.example               # Environment template
└── README.md                  # This file
```

## 🔒 Security Features

- Input sanitization and validation
- XSS prevention
- Rate limiting (10 requests/minute)
- Maximum input size limits
- Secure API key handling via environment variables

## 🎨 Technology Stack

**Frontend:**
- HTML5
- CSS3 (Glassmorphism design)
- Vanilla JavaScript

**Backend:**
- Node.js
- Express.js
- Gemini AI API
- Puppeteer (PDF generation)

**Security:**
- express-rate-limit
- Input validators

## 📝 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Your Gemini API key | Yes |
| `PORT` | Server port (default: 3000) | No |
| `NODE_ENV` | Environment (development/production) | No |

## 🚢 Deployment

### Frontend (Vercel/Netlify)

1. Deploy static files (HTML, CSS, JS)
2. Update API endpoint URLs in frontend code
3. Configure CORS on backend

### Backend (Render/Railway)

1. Push code to GitHub
2. Connect repository to hosting platform
3. Set environment variables
4. Deploy

## 🐛 Troubleshooting

**Server won't start:**
- Check if `.env` file exists with valid `GEMINI_API_KEY`
- Ensure port 3000 is not in use
- Run `npm install` to install dependencies

**PDF generation fails:**
- Puppeteer requires additional dependencies on some systems
- On Windows, ensure Visual C++ Redistributable is installed

**API errors:**
- Verify Gemini API key is valid
- Check rate limits (10 requests/minute)
- Ensure input meets validation requirements

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🤝 Contributing

Contributions are welcome! Feel free to submit issues or pull requests.

## 📧 Support

For issues or questions, please open an issue on the repository.

---

**Made with ❤️ using AI technology**
