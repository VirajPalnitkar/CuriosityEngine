# Curiosity Engine

A minimal tool that helps students think critically by generating questions, evaluating student questions, and guiding deeper inquiry.

## Project structure

```
curiosity-engine/
├── backend/
│   ├── main.py           ← entire FastAPI backend (5 endpoints)
│   ├── requirements.txt
│   └── .env              
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

# Create .env file and add your API keys
touch .env
```

Add the following to `.env`:

```
GROQ_API_KEY=your_groq_api_key
TAVILY_API_KEY=your_tavily_api_key
```

Run the backend:

```bash
uvicorn main:app --reload
```

Backend runs at:

```
http://localhost:8000
```

Interactive API docs:

```
http://localhost:8000/docs
```

---

### 2. Frontend

```bash
cd frontend

npm install
npm run dev
```

Frontend runs at:

```
http://localhost:5173
```

Make sure the frontend API URL points to the backend:

```javascript
const API = "http://localhost:8000";
```

For deployment replace it with:

```javascript
const API = "https://curiosityengine.onrender.com";
```

---

## How it works

| Endpoint            | What it does                                                                         |
| ------------------- | ------------------------------------------------------------------------------------ |
| `POST /upload`      | Upload a `.txt` or `.pdf` file and extract its text                                  |
| `POST /topic`       | Generates a 400–600 word educational summary using Tavily web search + Groq          |
| `POST /generate`    | Sends your content to the LLM and returns 5 questions|
| `POST /evaluate`    | Scores a student's question on depth and relevance and suggests a stronger rewrite   |
| `POST /followup`    | Takes a student's answer and generates 2 deeper follow-up questions                  |
| `GET /session/{id}` | Returns the list of questions asked in the current session                           |

Session state is stored in memory using a Python dictionary — no database required.

---

## Usage flow

1. Provide learning material by:

   * Pasting text
   * Uploading a `.pdf` or `.txt`
   * Entering a topic

2. Click **Generate Questions** to produce 5 Socratic questions across Bloom’s taxonomy levels.

3. Select a generated question or write your own.

4. Click **Evaluate My Question** to receive:

   * Depth score
   * Relevance score
   * Explanation
   * A stronger rewritten question
   * Bloom's taxonomy level

5. Answer the improved question and click **Go Deeper** to generate follow-up questions that push your reasoning further.

