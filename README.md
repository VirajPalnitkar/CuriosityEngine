# Curiosity Engine

A minimal tool that helps students think critically by generating questions, evaluating student questions, and guiding deeper inquiry.

## Project structure

```
curiosity-engine/
├── backend/
│   ├── main.py           ← entire FastAPI backend (3 endpoints)
│   ├── requirements.txt
│   └── .env              ← you create this (see below)
└── frontend/
    └── src/
        ├── main.jsx
        ├── App.jsx        ← all state lives here
        ├── App.css
        ├── ContentViewer.jsx
        ├── QuestionPanel.jsx
        └── FeedbackCard.jsx
```

## Setup

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file
echo "GROQ_API_KEY=your_key_here" > .env

uvicorn main:app --reload
# Running at http://localhost:8000
```

### 2. Frontend

```bash
# From the project root — scaffold once with Vite
npm create vite@latest frontend -- --template react
cd frontend

# Replace the generated src/ folder with the provided src/ files, then:
npm install
npm run dev
# Running at http://localhost:5173
```

## How it works

| Endpoint | What it does |
|---|---|
| `POST /generate` | Sends your content to Groqe, returns 5 questions across Bloom's levels |
| `POST /evaluate` | Scores your question on depth + relevance, returns a stronger rewrite |
| `POST /followup` | Takes your answer, returns 2 deeper follow-up questions |
| `GET /session/:id` | Returns the list of questions you've asked this session |

All session state is stored in a Python dict in memory — no database needed.

## Usage flow

1. Paste a lesson or article into the content box
2. Click **Generate questions** — LLM produces 5 questions from recall to evaluation level
3. Click any question to copy it into the input, or write your own
4. Click **Evaluate my question** — LLM scores it and shows a stronger version
5. Write your answer to the stronger question, then click **Go deeper** for follow-up prompts
