from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from anthropic import Anthropic
from dotenv import load_dotenv
import json
import uuid
import os

load_dotenv(encoding="utf-8")
OPENROUTER_API_KEY=os.getenv("OPENROUTER_API_KEY")

app = FastAPI()
client = Anthropic()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session store: session_id -> list of question strings
sessions: dict[str, list[str]] = {}


# ---------- Request models ----------

class GenerateRequest(BaseModel):
    content: str
    session_id: str | None = None

class EvaluateRequest(BaseModel):
    student_question: str
    content: str
    session_id: str | None = None

class FollowupRequest(BaseModel):
    question: str
    answer: str
    content: str


# ---------- Claude helper ----------


import requests
import json

import requests
import json
import os

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

def ask_llm(system: str, user: str) -> dict:
    response = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user}
            ],
            "max_tokens": 1024
        }
    )

    data = response.json()
    raw = data["choices"][0]["message"]["content"].strip()

    # Strip markdown fences if present
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1]
        raw = raw.rsplit("```", 1)[0]

    return json.loads(raw)

# ---------- Endpoints ----------

@app.post("/generate")
def generate_questions(req: GenerateRequest):
    if not req.content.strip():
        raise HTTPException(status_code=400, detail="Content cannot be empty.")

    session_id = req.session_id or str(uuid.uuid4())
    if session_id not in sessions:
        sessions[session_id] = []

    system = """You are a Socratic tutor helping students think critically.
Given educational content, generate exactly 5 thought-provoking questions — one at each Bloom's Taxonomy level:
1. recall       — basic factual retrieval
2. understanding — explain in own words
3. application  — use knowledge in a new situation
4. analysis     — break down relationships and patterns
5. evaluation   — make a judgement and defend it

Return ONLY a valid JSON array. No explanation, no markdown, no extra text.
Schema: [{"question": "...", "level": "recall|understanding|application|analysis|evaluation", "hint": "one sentence nudge to help the student start"}]"""

    user = f"Content:\n\n{req.content}"
    result = ask_llm(system, user)
    return {"session_id": session_id, "questions": result}


@app.post("/evaluate")
def evaluate_question(req: EvaluateRequest):
    if not req.student_question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    session_id = req.session_id or str(uuid.uuid4())
    if session_id not in sessions:
        sessions[session_id] = []
    sessions[session_id].append(req.student_question)

    system = """You are a Socratic tutor evaluating the quality of a student's question.
Score the question on two dimensions:
- depth (1-5): Does it go beyond surface facts? Does it invite thinking?
- relevance (1-5): Is it clearly connected to the content?

Also provide:
- reason: one sentence explaining the combined score
- rewrite: a stronger version of the same question at a higher thinking level
- bloom_level: which Bloom's level the student's question sits at

Return ONLY valid JSON. No explanation, no markdown.
Schema: {"depth": 1-5, "relevance": 1-5, "reason": "...", "rewrite": "...", "bloom_level": "..."}"""

    user = f"Content:\n{req.content}\n\nStudent's question:\n{req.student_question}"
    result = ask_llm(system, user)
    return {"session_id": session_id, **result}


@app.post("/followup")
def followup_questions(req: FollowupRequest):
    system = """You are a Socratic tutor deepening a student's inquiry.
Given a question and the student's answer, generate exactly 2 follow-up questions that:
- push the student one level deeper in Bloom's Taxonomy
- challenge an assumption or explore a consequence
- are specific to what the student actually wrote

Return ONLY valid JSON. No explanation, no markdown.
Schema: {"followups": ["...", "..."]}"""

    user = f"Original question: {req.question}\n\nStudent's answer: {req.answer}\n\nContent context:\n{req.content}"
    result = ask_llm(system, user)
    return result


@app.get("/session/{session_id}")
def get_session(session_id: str):
    history = sessions.get(session_id, [])
    return {"session_id": session_id, "history": history, "count": len(history)}
