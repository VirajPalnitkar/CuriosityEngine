import { useState } from "react";

const LEVEL_COLOR = {
  recall:        "#a8c5da",
  understanding: "#a8dabd",
  application:   "#f5d08a",
  analysis:      "#f5b08a",
  evaluation:    "#d0a8da",
};

export default function QuestionPanel({ questions, onEvaluate, loading }) {
  const [studentQ, setStudentQ] = useState("");

  function handleEvaluate() {
    if (!studentQ.trim()) return;
    onEvaluate(studentQ);
    setStudentQ("");
  }

  return (
    <>
      <p className="pane-label">Questions</p>

      <div className="pane-scroll">

        {questions.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">?</span>
            <p>Generated questions will appear here.<br />Add content and hit <strong>Generate questions</strong>.</p>
          </div>
        ) : (
          <ul className="question-list">
            {questions.map((q, i) => (
              <li
                key={i}
                className="question-item"
                onClick={() => setStudentQ(q.question)}
                title="Click to use as your question"
              >
                <span
                  className="level-badge"
                  style={{ background: LEVEL_COLOR[q.level] || "#ddd" }}
                >
                  {q.level}
                </span>
                <div>
                  <p className="q-text">{q.question}</p>
                  <p className="q-hint">💡 {q.hint}</p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Student input — always visible at bottom of scroll area */}
        <div className="student-input-area">
          <p className="section-label">Your question</p>
          <textarea
            className="content-input"
            placeholder="Write your own question, or click one above to start from it…"
            value={studentQ}
            onChange={(e) => setStudentQ(e.target.value)}
            rows={4}
          />
          <button
            className="btn-primary"
            onClick={handleEvaluate}
            disabled={loading || !studentQ.trim()}
          >
            {loading ? "Evaluating…" : "Evaluate my question →"}
          </button>
        </div>

      </div>
    </>
  );
}
