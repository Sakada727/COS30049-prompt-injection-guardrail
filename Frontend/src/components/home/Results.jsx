import { evasion, model } from "../../content/results.js";
import EvasionChart from "./EvasionChart.jsx";

const pct = (v, d = 1) => `${(v * 100).toFixed(d)}%`;

const FIGURES = [
  { value: pct(model.attackRecall), text: "of attacks in the test set were blocked" },
  { value: pct(model.benignBlocked), text: "of normal prompts were blocked by mistake" },
  { value: pct(model.macroF1), text: "macro-F1, which counts both kinds of mistake" },
  { value: model.trainingPrompts.toLocaleString(), text: "labelled prompts used for training" },
];

const LIMITS = [
  {
    title: "Harmless prompts with trigger words",
    text: `If a normal prompt mentions "ignore" or "system prompt", it gets blocked ${pct(model.notInjectBlocked)} of the time (on the NotInject benchmark).`,
  },
  {
    title: "New jailbreak styles",
    text: `It only catches about half (${pct(model.temporalRecall)}) of the newest jailbreaks people have posted online. It can only spot styles that look like what it was trained on.`,
  },
  {
    title: "Words split into chunks",
    text: `Text like "ign ore all prev ious" still gets through ${pct(evasion.groups[2].a3)} of the time. We could join the pieces back up, but that would glue real short words together too.`,
  },
];

export default function Results() {
  return (
    <section id="results" className="section" aria-labelledby="results-title">
      <div className="container">
        <div className="section-head">
          <h2 id="results-title">How well it works</h2>
          <p>
            These numbers come from {model.testPrompts.toLocaleString()} prompts the model
            never saw during training, plus three harder test sets we used to find its weak spots.
          </p>
        </div>

        <dl className="figures">
          {FIGURES.map((f) => (
            <div key={f.text} className="figure">
              <dt>{f.text}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>

        <div className="results-grid">
          <EvasionChart />

          <div className="limits">
            <h3>What it gets wrong</h3>
            <ul>
              {LIMITS.map((l) => (
                <li key={l.title}>
                  <p className="limit-title">{l.title}</p>
                  <p>{l.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
