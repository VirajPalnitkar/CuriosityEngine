import { useState } from "react";
import ContentViewer from "./ContentViewer";
import QuestionPanel from "./QuestionPanel";
import FeedbackCard from "./FeedbackCard";
import "./App.css";

const API = "https://curiosityengine.onrender.com";

export default function App() {
  const [content, setContent] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [followups, setFollowups] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState({ generate: false, evaluate: false, followup: false });
  const [error, setError] = useState(null);

  const setLoadingKey = (key, val) =>
    setLoading((prev) => ({ ...prev, [key]: val }));

  async function handleGenerate() {
    if (!content.trim()) return;
    setLoadingKey("generate", true);
    setError(null);
    setQuestions([]);
    setFeedback(null);
    setFollowups([]);
    try {
      const res = await fetch(`${API}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, session_id: sessionId }),
      });
      const data = await res.json();
      setSessionId(data.session_id);
      setQuestions(data.questions);
    } catch {
      setError("Could not reach the backend. Is it running?");
    } finally {
      setLoadingKey("generate", false);
    }
  }

  async function handleEvaluate(studentQuestion) {
    setLoadingKey("evaluate", true);
    setError(null);
    setFeedback(null);
    setFollowups([]);
    try {
      const res = await fetch(`${API}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_question: studentQuestion, content, session_id: sessionId }),
      });
      const data = await res.json();
      setSessionId(data.session_id);
      setFeedback(data);
      setHistory((prev) => [studentQuestion, ...prev]);
    } catch {
      setError("Evaluation failed. Check the backend.");
    } finally {
      setLoadingKey("evaluate", false);
    }
  }

  async function handleFollowup(question, answer) {
    setLoadingKey("followup", true);
    setError(null);
    try {
      const res = await fetch(`${API}/followup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, answer, content }),
      });
      const data = await res.json();
      setFollowups(data.followups);
    } catch {
      setError("Follow-up generation failed.");
    } finally {
      setLoadingKey("followup", false);
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <span className="logo-mark">◎</span>
        <h1>Curiosity Engine</h1>
        <p className="tagline">Think deeper. Ask better.</p>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <main className="app-body">
        <section className="col-left">
          <ContentViewer
            content={content}
            onChange={setContent}
            onGenerate={handleGenerate}
            loading={loading.generate}
          />
          {history.length > 0 && (
            <div className="history-box">
              <p className="section-label">Your questions this session</p>
              <ul>
                {history.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="col-right">
          <QuestionPanel
            questions={questions}
            onEvaluate={handleEvaluate}
            loading={loading.evaluate}
          />
          {feedback && (
            <FeedbackCard
              feedback={feedback}
              onFollowup={handleFollowup}
              followups={followups}
              loading={loading.followup}
            />
          )}
        </section>
      </main>
    </div>
  );
}
