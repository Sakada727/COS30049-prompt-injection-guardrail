import { useState } from "react";
import { checkMessage } from "../API/API";

const MAX_LENGTH = 5000;

export default function Check() {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { label, confidence }

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;

    if (!text.trim()) {
      setError("Please enter a message to check.");
      return;
    }
    if (text.length > MAX_LENGTH) {
      setError(`Message is too long. The limit is ${MAX_LENGTH} characters.`);
      return;
    }

    setError("");
    setResult(null);
    setLoading(true);

    try {
      const data = await checkMessage(text.trim());
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const label = result?.label?.toLowerCase();
  const verdictClass =
    label === "blocked" ? "blocked" : label === "allowed" ? "allowed" : "neutral";
  const icon = label === "blocked" ? "✖" : label === "allowed" ? "✔" : "•";

  return (
    <main className="page">
      <h1>Check a prompt</h1>

      <form className="check-form" onSubmit={handleSubmit} noValidate>
        <label htmlFor="message">Message to check</label>
        <textarea
          id="message"
          rows={5}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (error) setError("");
          }}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "message-error" : undefined}
        />

        <p className={text.length > MAX_LENGTH ? "counter over" : "counter"}>
          {text.length} / {MAX_LENGTH}
        </p>

        {error && (
          <p id="message-error" className="field-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn" disabled={loading}>
          {loading ? "Checking…" : "Check"}
        </button>
      </form>

      {/* Always in the page so screen readers announce changes */}
      <div aria-live="polite">
        {result && (
          <section className={`result ${verdictClass}`} aria-label="Result">
            <p className="result-label">
              <span aria-hidden="true">{icon}</span> {result.label}
            </p>
            <p className="result-confidence">
              Confidence: {Math.round(result.confidence * 100)}%
            </p>
          </section>
        )}
      </div>
    </main>
  );
}

