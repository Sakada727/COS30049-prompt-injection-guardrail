import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { checkPrompt, injectionChance } from "../../api/client.js";
import { examples } from "../../content/results.js";
import useApiStatus from "../../hooks/useApiStatus.js";
import useHistory from "../../hooks/useHistory.js";
import { percent } from "../../lib/format.js";
import Robot from "../Robot.jsx";
import Seal from "../art/Seal.jsx";
import VerdictIcon from "../VerdictIcon.jsx";
import LikelihoodMeter from "./LikelihoodMeter.jsx";
import SessionHistory from "./SessionHistory.jsx";
import Spotlight from "./Spotlight.jsx";

const STATUS_TEXT = {
  checking: "Connecting to the back end…",
  online: "Back end connected.",
  offline: "Can't reach the back end right now, so checks won't work.",
};

//Just for quick feedback. The back end checks the length again.
function validate(text, maxChars) {
  if (!text.trim()) return "Type or paste a message first.";
  if (text.length > maxChars) {
    const over = text.length - maxChars;
    return `That's ${text.length.toLocaleString()} characters and the limit is ${maxChars.toLocaleString()}. Cut ${over.toLocaleString()} and try again.`;
  }
  return "";
}

function ResultPanel({ status, result, error, onAgain, onNext }) {
  if (status === "loading") {
    return (
      <div className="result result--loading">
        <Robot mood="scanning" className="result-robot" />
        <p className="result-word">Checking</p>
        <p className="result-sub">Running it through the model.</p>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="result result--error">
        <Robot mood="error" className="result-robot" />
        <p className="result-word result-word--small">{error.status === 503 ? "Busy" : "No verdict"}</p>
        <p className="result-sub">
          {error.status === 503
            ? `Too many checks at once. Give it ${error.retryAfter ?? 1} second${error.retryAfter > 1 ? "s" : ""} and try again.`
            : error.message}
        </p>
        <button type="button" className="btn btn--small" onClick={onAgain}>Try again</button>
      </div>
    );
  }
  if (status === "done") {
    const blocked = result.label === "blocked";
    const chance = injectionChance(result.label, result.confidence);
    return (
      <div className={blocked ? "result result--blocked" : "result result--allowed"}>
        <Robot mood={blocked ? "blocked" : "allowed"} className="result-robot" />
        <p className="result-word">
          <VerdictIcon blocked={blocked} />
          {blocked ? "Blocked" : "Allowed"}
        </p>
        <p className="result-sub">
          {blocked
            ? `Looks like an injection. The model is ${percent(result.confidence)} sure.`
            : `Looks fine. The model is ${percent(result.confidence)} sure it's safe.`}
        </p>
        <LikelihoodMeter chance={chance} />
        <button type="button" className="btn btn--ghost result-next" onClick={onNext}>Check another one</button>
      </div>
    );
  }
  return (
    <div className="result result--idle">
      <Robot mood="idle" trackPointer className="result-robot" />
      <p className="result-word result-word--small">Waiting for a prompt</p>
      <p className="result-sub">The result shows up here once you check something.</p>
    </div>
  );
}

export default function Checker({ text, setText }) {
  const [checkedText, setCheckedText] = useState(null);
  const [fieldError, setFieldError] = useState("");
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [spotlit, setSpotlit] = useState(false);
  const history = useHistory();
  const { status: apiStatus, maxChars } = useApiStatus();
  const stageRef = useRef(null);
  const inputRef = useRef(null);

  const dismiss = useCallback(() => setSpotlit(false), []);

  const focusInput = useCallback(() => {
    setSpotlit(false);
    inputRef.current?.focus({ preventScroll: true });
    stageRef.current?.scrollIntoView({ block: "center" });
  }, []);

  async function submit(e) {
    e?.preventDefault();
    if (status === "loading") return;
    const problem = validate(text, maxChars);
    setFieldError(problem);
    if (problem) {
      inputRef.current?.focus();
      return;
    }
    setStatus("loading");
    setSpotlit(false);
    try {
      const res = await checkPrompt(text);
      setResult(res);
      setCheckedText(text);
      setStatus("done");
      setSpotlit(res.label === "blocked");
      history.record({ ...res, text, created_at: new Date().toISOString() });
    } catch (err) {
      if (err.status === 413 || err.status === 422) {
        setFieldError(err.message);
        setStatus("idle");
      } else {
        setError(err);
        setStatus("error");
      }
    }
  }

  const checkAnother = () => {
    setText("");
    setFieldError("");
    focusInput();
  };

  const onChange = (e) => {
    setText(e.target.value);
    if (fieldError) setFieldError("");
    if (spotlit) setSpotlit(false);
  };

  const fillExample = (t) => {
    setText(t);
    setFieldError("");
    setSpotlit(false);
    inputRef.current?.focus();
  };

  const over = text.length > maxChars;
  const sealed = status === "done" && text === checkedText ? result.label : null;

  return (
    <section id="check" className="section checker" aria-labelledby="check-title">
      <div className="container">
        <div className="section-head">
          <h2 id="check-title">Check a prompt</h2>
          <p>Paste in any message, up to {maxChars.toLocaleString()} characters, and see what the model makes of it.</p>
          <p className={`api-status api-status--${apiStatus}`} role="status">
            <span className="api-dot" aria-hidden="true" />
            {STATUS_TEXT[apiStatus]}
          </p>
        </div>

        <div ref={stageRef} className={spotlit ? "checker-stage is-spotlit" : "checker-stage"}>
          <AnimatePresence>
            {spotlit && (
              <motion.span className="beam" aria-hidden="true"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }} />
            )}
          </AnimatePresence>

          <form className={spotlit ? "check-card is-blocked" : "check-card"} onSubmit={submit} noValidate>
            {sealed && (
              <Seal key={result.id} tone={sealed} label={sealed === "blocked" ? "Blocked" : "Allowed"}
                detail={percent(result.confidence)} className="card-seal" />
            )}
            <label htmlFor="prompt" className="check-label">Message</label>
            <textarea
              id="prompt"
              ref={inputRef}
              rows={7}
              value={text}
              onChange={onChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit(e);
              }}
              placeholder="e.g. Can you summarise this article for me?"
              spellCheck="false"
              aria-invalid={Boolean(fieldError)}
              aria-describedby={`prompt-count${fieldError ? " prompt-error" : ""}`}
            />
            <div className="check-meta">
              <p id="prompt-count" className={over ? "counter is-over" : "counter"}>
                {text.length.toLocaleString()} / {maxChars.toLocaleString()} characters
              </p>
              <p className="shortcut">Ctrl + Enter to check</p>
            </div>
            {fieldError && (
              <p id="prompt-error" className="field-error" role="alert">{fieldError}</p>
            )}

            <div className="examples">
              <p className="examples-label" id="examples-label">Or try one of these</p>
              <ul className="examples-list" aria-labelledby="examples-label">
                {examples.map((ex) => (
                  <li key={ex.label}>
                    <button type="button" className="example" onClick={() => fillExample(ex.text)}>{ex.label}</button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="check-actions">
              <button type="submit" className="btn" disabled={status === "loading"}>
                {status === "loading" ? "Checking…" : "Check"}
              </button>
            </div>
          </form>

          <div className="result-slot" aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={status === "done" ? `done-${result.id}` : status}
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                <ResultPanel status={status} result={result} error={error} onAgain={submit} onNext={checkAnother} />
              </motion.div>
            </AnimatePresence>
          </div>

        </div>

        <SessionHistory
          items={history.items}
          source={history.source}
          onReuse={(t) => {
            setText(t);
            setFieldError("");
            focusInput();
          }}
          onReset={history.reset}
        />
      </div>

      <Spotlight active={spotlit} targetRef={stageRef} onDismiss={dismiss} />
    </section>
  );
}
