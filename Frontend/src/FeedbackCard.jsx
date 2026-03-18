import { useState } from "react";

function ScoreDots({ value, max = 5 }) {
  return (
    <span className="score-dots">
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={i < value ? "dot filled" : "dot"} />
      ))}
    </span>
  );
}

export default function FeedbackCard({ feedback, onFollowup, followups, loading }) {
  const [answer, setAnswer] = useState("");

  const { depth, relevance, reason, rewrite, bloom_level } = feedback;

  function handleFollowup() {
    if (!answer.trim()) return;
    onFollowup(rewrite, answer);
    setAnswer("");
  }

  return (
    <div className="card feedback-card">
      <p className="section-label">Feedback on your question</p>

      <div className="score-row">
        <div className="score-item">
          <span className="score-label">Depth</span>
          <ScoreDots value={depth} />
          <span className="score-num">{depth}/5</span>
        </div>
        <div className="score-item">
          <span className="score-label">Relevance</span>
          <ScoreDots value={relevance} />
          <span className="score-num">{relevance}/5</span>
        </div>
        <div className="bloom-badge">
          {bloom_level}
        </div>
      </div>

      <p className="feedback-reason">{reason}</p>

      <div className="rewrite-box">
        <p className="section-label">Stronger version</p>
        <p className="rewrite-text">{rewrite}</p>
      </div>

      <div className="followup-section">
        <p className="section-label">Try answering — then go deeper</p>
        <textarea
          className="content-input"
          placeholder="Write your answer to the stronger question above…"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={3}
        />
        <button
          className="btn-secondary"
          onClick={handleFollowup}
          disabled={loading || !answer.trim()}
        >
          {loading ? "Thinking…" : "Go deeper →"}
        </button>
      </div>

      {followups.length > 0 && (
        <div className="followups">
          <p className="section-label">Follow-up questions</p>
          {followups.map((q, i) => (
            <p key={i} className="followup-q">↳ {q}</p>
          ))}
        </div>
      )}
    </div>
  );
}
