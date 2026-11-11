import Robot from "../Robot.jsx";

function Rules() {
  return (
    <svg viewBox="0 0 200 140" className="panel-art" aria-hidden="true" focusable="false">
      <rect x="40" y="18" width="120" height="104" rx="6" fill="#f1e6d2" stroke="#07121f" strokeWidth="3" />
      <rect x="32" y="12" width="136" height="14" rx="7" fill="#cbbfa8" stroke="#07121f" strokeWidth="3" />
      <rect x="32" y="114" width="136" height="14" rx="7" fill="#cbbfa8" stroke="#07121f" strokeWidth="3" />
      <g stroke="#07121f" strokeWidth="3" strokeLinecap="round">
        <line x1="56" y1="44" x2="144" y2="44" /><line x1="56" y1="60" x2="132" y2="60" />
        <line x1="56" y1="76" x2="140" y2="76" /><line x1="56" y1="92" x2="112" y2="92" />
      </g>
      <circle cx="146" cy="96" r="12" fill="#e0452b" stroke="#07121f" strokeWidth="2.5" />
    </svg>
  );
}

function Letter() {
  return (
    <svg viewBox="0 0 200 140" className="panel-art" aria-hidden="true" focusable="false">
      <rect x="34" y="40" width="132" height="86" rx="6" fill="#f1e6d2" stroke="#07121f" strokeWidth="3" />
      <path d="M34 46 L100 92 L166 46" fill="none" stroke="#07121f" strokeWidth="3" strokeLinejoin="round" />
      <g transform="rotate(-12 120 40)">
        <rect x="84" y="10" width="78" height="44" rx="4" fill="#e0452b" stroke="#07121f" strokeWidth="3" />
        <g stroke="#f1e6d2" strokeWidth="3" strokeLinecap="round">
          <line x1="94" y1="24" x2="150" y2="24" /><line x1="94" y1="36" x2="138" y2="36" />
        </g>
      </g>
    </svg>
  );
}

const PANELS = [
  {
    art: <Rules />,
    title: "The company sets some rules",
    text: "Say a shop's support bot is told to be polite, stay on topic and never give out the discount codes.",
  },
  {
    art: <Letter />,
    title: "Someone adds their own",
    text: "They type it straight into the chat, or hide it in an email, review or web page the bot has been asked to read.",
  },
  {
    art: <Robot mood="lost" className="panel-robot" />,
    title: "The bot follows the wrong one",
    text: "It can't tell which instructions came from the company, so it goes with the newest one and hands over the codes.",
  },
];

export default function Story() {
  return (
    <section id="story" className="section story" aria-labelledby="story-title">
      <div className="container">
        <div className="section-head">
          <h2 id="story-title">What is prompt injection?</h2>
          <p>
            Chatbots get their instructions in plain English, the same way they get your
            messages, and most of the time they can't tell the two apart.
          </p>
        </div>

        <ol className="triptych">
          {PANELS.map((p, i) => (
            <li key={p.title} className="panel">
              <div className="panel-frame">{p.art}</div>
              <p className="panel-num" aria-hidden="true">{i + 1}</p>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </li>
          ))}
        </ol>

        <div className="story-close">
          <p>
            That's prompt injection. OWASP ranks it as the number one risk for apps built on
            large language models, and nobody has a complete fix for it yet.
          </p>
          <p>
            Our guardrail is one layer of defence. It reads each message before the chatbot
            does and blocks anything that looks like someone trying to give the AI orders.
          </p>
        </div>
      </div>
    </section>
  );
}
