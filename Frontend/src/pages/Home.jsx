import { useState } from "react";
import Check from "./Check.jsx";

const steps = [
  { title: "1. Send a message", text: "Type or paste any message you would give to an AI assistant." },
  { title: "2. The model checks it", text: "A trained model looks for signs of a prompt injection attack." },
  { title: "3. See the result", text: "You get Allowed or Blocked, with a confidence score." },
];

export default function Home() {
  const [active, setActive] = useState(0);
  const step = steps[active];
  const next = () => setActive((i) => (i + 1) % steps.length);

  return (
    <main className="page">
      <section className="hero">
        <h1>Stop prompt injection before it reaches your AI</h1>
        <p>
          Some messages try to trick an AI into ignoring its rules or leaking
          secrets. This guardrail checks a message first and tells you whether
          it is safe to pass on.
        </p>
        <a href="#check" className="btn">Try the guardrail</a>
      </section>
      
      <section id="how-it-works" aria-labelledby="how">
        <h2 id="how">How it works</h2>
        <p className="slider-hint" aria-live="polite">
            Step {active + 1} of {steps.length}. Click the card to see the next step.
          </p>
        <div className="slider">
          <button type="button" className="step" onClick={next}>
            <span key={active} className="step-body">
              <span className="step-title">{step.title}</span>
              <span className="step-text">{step.text}</span>
            </span>
          </button>
          
        </div>
      </section>
      <Check />
    </main>
  );
}