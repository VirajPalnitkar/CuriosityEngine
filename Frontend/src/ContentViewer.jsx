export default function ContentViewer({ content, onChange, onGenerate, loading }) {
  return (
    <div className="card">
      <p className="section-label">Lesson content</p>
      <textarea
        className="content-input"
        placeholder="Paste a lesson, article, or topic you want to explore..."
        value={content}
        onChange={(e) => onChange(e.target.value)}
        rows={10}
      />
      <button
        className="btn-primary"
        onClick={onGenerate}
        disabled={loading || !content.trim()}
      >
        {loading ? "Generating…" : "Generate questions →"}
      </button>
    </div>
  );
}
