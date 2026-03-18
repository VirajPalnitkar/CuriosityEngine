from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import json
import uuid
import os
from io import BytesIO
from pypdf import PdfReader
import httpx
import requests


load_dotenv(encoding="utf-8")
OPENROUTER_API_KEY=os.getenv("OPENROUTER_API_KEY")
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
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

class TopicRequest(BaseModel):
    topic: str

# ---------- Claude helper ----------




GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "llama-3.3-70b-versatile"

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

def ask_groq_text(system: str, user: str, max_tokens: int = 2048) -> str:
    """Call Groq and return plain text."""

    response = requests.post(
        GROQ_URL,
        headers={
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": MODEL,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user}
            ],
            "max_tokens": max_tokens
        },
        timeout=30
    )

    response.raise_for_status()
    data = response.json()

    return data["choices"][0]["message"]["content"].strip()

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Extract text from PDF locally using pypdf.
    """

    reader = PdfReader(BytesIO(file_bytes))
    text = []

    for page in reader.pages:
        content = page.extract_text()
        if content:
            text.append(content)

    return "\n".join(text)

def search_web(topic: str) -> list[dict]:

    if not TAVILY_API_KEY:
        return []

    payload = {
        "api_key": TAVILY_API_KEY,
        "query": topic,
        "max_results": 5,
        "search_depth": "advanced",
        "include_answer": False,
        "include_raw_content": False
    }

    resp = httpx.post(
        "https://api.tavily.com/search",
        json=payload,
        timeout=12
    )

    resp.raise_for_status()

    results = resp.json().get("results", [])

    cleaned = []

    for r in results:

        content = r.get("content", "") or ""

        # prevent token explosion
        if len(content) > 1200:
            content = content[:1200]

        cleaned.append({
            "title": r.get("title", ""),
            "url": r.get("url", ""),
            "snippet": content
        })

    return cleaned

def synthesise_topic(topic: str, search_results: list[dict]) -> str:
    system = "You are an expert educational content writer."
    if search_results:
        snippets = "\n\n".join(
            f"Source: {r['title']}\n{r['snippet']}"
            for r in search_results
        )
        user = (
            f"Topic: {topic}\n\n"
            f"Here are recent web snippets about this topic:\n\n{snippets}\n\n"
            "Write a clear, well-structured educational summary (400-600 words) a student can study from. "
            "Cover key concepts, important relationships, and real-world relevance. "
            "Plain prose paragraphs only — no bullet points, no headers."
        )
    else:
        user = (
            f"Topic: {topic}\n\n"
            "Write a clear, well-structured educational summary (400-600 words) a student can study from. "
            "Cover key concepts, important relationships, and real-world relevance. "
            "Plain prose paragraphs only — no bullet points, no headers."
        )
    return ask_groq_text(system, user)

# ---------- Endpoints ----------


# ---------- New endpoints ----------

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Accept a .txt or .pdf file and return its extracted plain text.
    PDF extraction is handled natively by Claude — no third-party pdf library.
    """
    filename = file.filename or ""
    content_type = file.content_type or ""

    if filename.endswith(".txt") or "text/plain" in content_type:
        raw = await file.read()
        try:
            text = raw.decode("utf-8")
        except UnicodeDecodeError:
            text = raw.decode("latin-1")
        return {"content": text.strip(), "source": filename}

    elif filename.endswith(".pdf") or "pdf" in content_type:
        raw = await file.read()
        text = extract_text_from_pdf(raw)
        return {"content": text, "source": filename}

    else:
        raise HTTPException(
            status_code=415,
            detail="Unsupported file type. Please upload a .txt or .pdf file.",
        )


@app.post("/topic")
def fetch_topic(req: TopicRequest):
    """
    Given a topic string:
    1. Try to fetch live web snippets via Brave Search (requires BRAVE_API_KEY in .env).
    2. Ask Claude to synthesise an educational summary from those snippets.
    3. If no API key is set, Claude answers from its own knowledge.
    Returns the summary text plus any web sources found.
    """
    if not req.topic.strip():
        raise HTTPException(status_code=400, detail="Topic cannot be empty.")

    search_results = []
    used_web = False

    try:
        search_results = search_web(req.topic)
        used_web = bool(search_results)
    except Exception:
        pass  # silently fall back to Claude knowledge

    summary = synthesise_topic(req.topic, search_results)
    sources = [{"title": r["title"], "url": r["url"]} for r in search_results]

    return {"content": summary, "sources": sources, "used_web": used_web}


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
