import { useState } from "react";
import ContentViewer from "./ContentViewer";
import QuestionPanel from "./QuestionPanel";
import FeedbackCard from "./FeedbackCard";
import "./App.css";

const API = "http://localhost:8000";

export default function App() {
  const [content, setContent]             = useState("");
  const [sessionId, setSessionId]         = useState(null);
  const [questions, setQuestions]         = useState([]);
  const [feedback, setFeedback]           = useState(null);
  const [followups, setFollowups]         = useState([]);
  const [followupWarning, setFollowupWarning] = useState(null);
  const [history, setHistory]             = useState([]);
  const [rightTab, setRightTab]           = useState("questions");
  const [loading, setLoading]             = useState({ generate: false, evaluate: false, followup: false });
  const [error, setError]                 = useState(null);

  const setLoadingKey = (key, val) =>
    setLoading((prev) => ({ ...prev, [key]: val }));

  async function handleGenerate() {
    if (!content.trim()) return;
    setLoadingKey("generate", true);
    setError(null);
    setQuestions([]);
    setFeedback(null);
    setFollowups([]);
    setFollowupWarning(null);
    setRightTab("questions");
    try {
      const res  = await fetch(`${API}/generate`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ content, session_id: sessionId }),
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
    setFollowupWarning(null);
    try {
      const res  = await fetch(`${API}/evaluate`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ student_question: studentQuestion, content, session_id: sessionId }),
      });
      const data = await res.json();
      setSessionId(data.session_id);
      setFeedback(data);
      setHistory((prev) => [studentQuestion, ...prev]);
      setRightTab("feedback");
    } catch {
      setError("Evaluation failed. Check the backend.");
    } finally {
      setLoadingKey("evaluate", false);
    }
  }

  async function handleFollowup(question, answer) {
    setLoadingKey("followup", true);
    setError(null);
    setFollowups([]);
    setFollowupWarning(null);
    try {
      const res  = await fetch(`${API}/followup`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ question, answer, content }),
      });
      const data = await res.json();
      if (res.status === 422) {
        setFollowupWarning(data.detail);
        return;
      }
      if (!res.ok) throw new Error(data.detail || "Follow-up generation failed.");
      setFollowups(data.followups);
    } catch {
      setError("Follow-up generation failed.");
    } finally {
      setLoadingKey("followup", false);
    }
  }

  return (
    <div className="shell">

      <header className="topbar">
        <div className="topbar-brand">
          <span className="logo-mark">◎</span>
          <span className="logo-name">Curiosity Engine</span>
        </div>
        {error && (
          <div className="topbar-error" onClick={() => setError(null)}>
            {error} <span className="error-dismiss">×</span>
          </div>
        )}
        <p className="tagline">Think deeper. Ask better.</p>
      </header>

      <div className="workspace">

        <div className="pane pane-left">
          <ContentViewer
            content={content}
            onChange={setContent}
            onGenerate={handleGenerate}
            loading={loading.generate}
          />
        </div>

        <div className="pane pane-mid">
          <QuestionPanel
            questions={questions}
            onEvaluate={handleEvaluate}
            loading={loading.evaluate}
          />
        </div>

        <div className="pane pane-right">
          <div className="pane-tabs">
            <button
              className={`pane-tab ${rightTab === "feedback" ? "active" : ""}`}
              onClick={() => setRightTab("feedback")}
            >
              Feedback
              {feedback && rightTab !== "feedback" && <span className="tab-dot" />}
            </button>
            <button
              className={`pane-tab ${rightTab === "history" ? "active" : ""}`}
              onClick={() => setRightTab("history")}
            >
              History
              {history.length > 0 && <span className="tab-count">{history.length}</span>}
            </button>
          </div>

          <div className="pane-body">
            {rightTab === "feedback" && (
              <FeedbackCard
                feedback={feedback}
                onFollowup={handleFollowup}
                followups={followups}
                followupWarning={followupWarning}
                loading={loading.followup}
              />
            )}
            {rightTab === "history" && (
              <div className="history-pane">
                {history.length === 0 ? (
                  <div className="empty-state">
                    <span className="empty-icon">↺</span>
                    <p>Questions you submit will appear here.</p>
                  </div>
                ) : (
                  <ul className="history-list">
                    {history.map((q, i) => (
                      <li key={i} className="history-item">
                        <span className="history-num">{history.length - i}</span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
