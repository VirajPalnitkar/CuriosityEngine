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

export default function FeedbackCard({ feedback, onFollowup, followups, followupWarning, loading }) {
  const [answer, setAnswer] = useState("");

  if (!feedback) {
    return (
      <div className="empty-state">
        <span className="empty-icon">◇</span>
        <p>Submit a question in the middle panel to see feedback here.</p>
      </div>
    );
  }

  const { depth, relevance, reason, rewrite, bloom_level } = feedback;

  function handleFollowup() {
    if (!answer.trim()) return;
    onFollowup(rewrite, answer);
    setAnswer("");
  }

  return (
    <>
      {/* Scores */}
      <div className="card">
        <p className="section-label">Question score</p>
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
          <div className="bloom-badge">{bloom_level}</div>
        </div>
        <p className="feedback-reason">{reason}</p>
      </div>

      {/* Stronger rewrite */}
      <div className="card">
        <p className="section-label">Stronger version</p>
        <p className="rewrite-text">{rewrite}</p>
      </div>

      {/* Answer + go deeper */}
      <div className="card">
        <p className="section-label">Answer it — then go deeper</p>
        <textarea
          className="content-input"
          placeholder="Write your answer to the stronger question above…"
          value={answer}
          onChange={(e) => {
            setAnswer(e.target.value);
          }}
          rows={4}
        />

        {/* Relevance warning — shown instead of follow-ups when answer is off-topic */}
        {followupWarning && (
          <div className="relevance-warning">
            <span className="warning-icon">↩</span>
            {followupWarning}
          </div>
        )}

        <button
          className="btn-secondary"
          onClick={handleFollowup}
          disabled={loading || !answer.trim()}
        >
          {loading ? "Checking…" : "Go deeper →"}
        </button>
      </div>

      {/* Follow-up questions */}
      {followups.length > 0 && (
        <div className="card">
          <p className="section-label">Follow-up questions</p>
          <div className="followups">
            {followups.map((q, i) => (
              <p key={i} className="followup-q">↳ {q}</p>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
