import { Link } from "react-router-dom";

const steps = [
  { title: "1. Send a message", text: "Type or paste any message you would give to an AI assistant." },
  { title: "2. The model checks it", text: "A trained model looks for signs of a prompt injection attack." },
  { title: "3. See the result", text: "You get Allowed or Blocked, with a confidence score." },
];

export default function Home() {
  return (
    <main className="page">
      <section className="hero">
        <h1>Stop prompt injection before it reaches your AI</h1>
        <p>
          Some messages try to trick an AI into ignoring its rules or leaking
          secrets. This guardrail checks a message first and tells you whether
          it is safe to pass on.
        </p>
        <Link to="/check" className="btn">Try the guardrail</Link>
      </section>

      <section aria-labelledby="how">
        <h2 id="how">How it works</h2>
        <ul className="steps">
          {steps.map((s) => (
            <li key={s.title} className="step">
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}