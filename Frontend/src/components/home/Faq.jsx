import { model } from "../../content/results.js";

const pct = (v) => `${(v * 100).toFixed(1)}%`;

const QUESTIONS = [
  {
    q: "What does the percentage mean?",
    a: "It's the model's estimate of how likely the message is to be an injection. We calibrated it, so if you took lots of messages that scored 80%, roughly 8 in 10 of them would really be attacks. Anything at 50% or higher gets blocked.",
  },
  {
    q: "Do you keep what I type?",
    a: "Yes. Each check is saved under a random ID for this browser tab so the session chart can show it. Nobody else can see it and the ID isn't linked to you. Click \"Start a new session\" if you want a fresh history.",
  },
  {
    q: "Can it stop every attack?",
    a: `No. It caught ${pct(model.attackRecall)} of the attacks in our test set, but reworded attacks and new styles can still get through. It's meant to be one layer of defence, and the chatbot behind it should still have limited access to things.`,
  },
  {
    q: "Will it block rude or harmful messages?",
    a: "Not really. It looks for instructions aimed at the AI, not bad language. A rude message with no instructions in it will get through, so you'd need a separate content filter for that.",
  },
  {
    q: "Why did my harmless message get blocked?",
    a: `Messages that mention "ignoring" something or talk about a "system prompt" look a lot like attacks. On a test set built to check this, ${pct(model.notInjectBlocked)} of harmless prompts like that were blocked by mistake.`,
  },
  {
    q: "Who made this?",
    a: "Group 8 from Session 07 of COS30049 Computing Technology Innovation Project at Swinburne. We trained the model on public prompt injection datasets in Assignment 2 and built this site around it for Assignment 3.",
  },
];

export default function Faq() {
  return (
    <section id="faq" className="section faq" aria-labelledby="faq-title">
      <div className="container faq-inner">
        <div className="section-head">
          <h2 id="faq-title">FAQ</h2>
        </div>
        <div className="faq-list">
          {QUESTIONS.map((item) => (
            <details key={item.q} className="faq-item">
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
