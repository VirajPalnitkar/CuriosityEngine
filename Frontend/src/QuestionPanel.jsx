import { useState } from "react";

const LEVEL_COLOR = {
  recall: "#a8c5da",
  understanding: "#a8dabd",
  application: "#f5d08a",
  analysis: "#f5b08a",
  evaluation: "#d0a8da",
};

export default function QuestionPanel({ questions, onEvaluate, loading }) {
  const [studentQ, setStudentQ] = useState("");

  function handleEvaluate() {
    if (!studentQ.trim()) return;
    onEvaluate(studentQ);
    setStudentQ("");
  }

  if (questions.length === 0) {
    return (
      <div className="card empty-state">
        <span className="empty-icon">?</span>
        <p>Add content on the left and hit <strong>Generate questions</strong> to begin.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <p className="section-label">Questions to explore</p>
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

      <div className="student-input-area">
        <p className="section-label">Your question</p>
        <textarea
          className="content-input"
          placeholder="Write your own question about this content…"
          value={studentQ}
          onChange={(e) => setStudentQ(e.target.value)}
          rows={3}
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
  );
}
