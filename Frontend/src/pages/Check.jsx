import { useState } from "react";

const MAX_LENGTH = 5000;

export default function Check() {
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();

    if (!text.trim()) {
      setError("Please enter a message to check.");
      return;
    }
    if (text.length > MAX_LENGTH) {
      setError(`Message is too long. The limit is ${MAX_LENGTH} characters.`);
      return;
    }

    setError("");
    // Step 2 will send text.trim() to the API here
    console.log("valid input:", text.trim());
  }

  return (
    <main className="page">
      <h1>Check a prompt</h1>

      <form className="check-form" onSubmit={handleSubmit} noValidate>
        <label htmlFor="message">Message to check</label>
        <textarea
          id="message"
          rows={5}
          value={text}
          onChange={(e) => setText(e.target.value)}
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

        <button type="submit" className="btn">Check</button>
      </form>
    </main>
  );
}