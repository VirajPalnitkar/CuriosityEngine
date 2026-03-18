import { useState, useRef } from "react";

const API = "https://curiosityengine.onrender.com";

const MODES = [
  { id: "paste",  label: "Paste content" },
  { id: "file",   label: "Upload file"   },
  { id: "topic",  label: "Search topic"  },
];

export default function ContentViewer({ content, onChange, onGenerate, loading }) {
  const [mode, setMode]         = useState("paste");
  const [topic, setTopic]       = useState("");
  const [fetching, setFetching] = useState(false);
  const [sources, setSources]   = useState([]);
  const [fileName, setFileName] = useState("");
  const [fetchErr, setFetchErr] = useState("");
  const fileRef = useRef(null);

  // ---- file upload ----
  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setFetching(true);
    setFetchErr("");
    setSources([]);
    setFileName(file.name);
    onChange("");
    const form = new FormData();
    form.append("file", file);
    try {
      const res  = await fetch(`${API}/upload`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Upload failed.");
      onChange(data.content);
    } catch (err) {
      setFetchErr(err.message);
      setFileName("");
    } finally {
      setFetching(false);
    }
  }

  // ---- topic search ----
  async function handleTopicFetch() {
    if (!topic.trim()) return;
    setFetching(true);
    setFetchErr("");
    setSources([]);
    onChange("");
    try {
      const res  = await fetch(`${API}/topic`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ topic }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Topic fetch failed.");
      onChange(data.content);
      setSources(data.sources || []);
    } catch (err) {
      setFetchErr(err.message);
    } finally {
      setFetching(false);
    }
  }

  const ready = content.trim().length > 0;

  return (
    <div className="card">

      {/* Mode tabs */}
      <div className="mode-tabs">
        {MODES.map((m) => (
          <button
            key={m.id}
            className={`mode-tab ${mode === m.id ? "active" : ""}`}
            onClick={() => {
              setMode(m.id);
              setFetchErr("");
              setSources([]);
              setFileName("");
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* ---- PASTE mode ---- */}
      {mode === "paste" && (
        <textarea
          className="content-input"
          placeholder="Paste a lesson, article, or any text you want to explore…"
          value={content}
          onChange={(e) => onChange(e.target.value)}
          rows={10}
        />
      )}

      {/* ---- FILE mode ---- */}
      {mode === "file" && (
        <div className="file-zone" onClick={() => fileRef.current?.click()}>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.pdf"
            style={{ display: "none" }}
            onChange={handleFile}
          />
          {fetching ? (
            <p className="file-status">Reading file…</p>
          ) : fileName ? (
            <p className="file-status file-ok">✓ {fileName}</p>
          ) : (
            <>
              <p className="file-icon">↑</p>
              <p className="file-label">Click to upload a <strong>.txt</strong> or <strong>.pdf</strong></p>
              <p className="file-sub">PDF text is extracted automatically</p>
            </>
          )}
        </div>
      )}

      {/* ---- TOPIC mode ---- */}
      {mode === "topic" && (
        <div className="topic-row">
          <input
            className="topic-input"
            placeholder="e.g. Quantum entanglement, The French Revolution…"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleTopicFetch()}
          />
          <button
            className="btn-secondary"
            onClick={handleTopicFetch}
            disabled={fetching || !topic.trim()}
          >
            {fetching ? "Fetching…" : "Fetch →"}
          </button>
        </div>
      )}

      {/* Content preview (file + topic modes) */}
      {mode !== "paste" && content && (
        <div className="content-preview">
          <p className="section-label">Retrieved content</p>
          <p className="preview-text">{content.slice(0, 400)}{content.length > 400 ? "…" : ""}</p>
        </div>
      )}

      {/* Web sources */}
      {sources.length > 0 && (
        <div className="sources">
          <p className="section-label">Sources</p>
          <ul className="source-list">
            {sources.map((s, i) => (
              <li key={i}>
                <a href={s.url} target="_blank" rel="noreferrer">{s.title || s.url}</a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Error */}
      {fetchErr && <p className="inline-error">{fetchErr}</p>}

      {/* Generate button */}
      <button
        className="btn-primary"
        onClick={onGenerate}
        disabled={loading || !ready || fetching}
      >
        {loading ? "Generating…" : "Generate questions →"}
      </button>

    </div>
  );
}
