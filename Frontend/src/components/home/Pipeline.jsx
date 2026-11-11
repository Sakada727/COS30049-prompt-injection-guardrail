import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { pipelineExample as ex } from "../../content/results.js";
import { percent } from "../../lib/format.js";

const STAGES = [
  {
    id: "arrives",
    title: "The message comes in",
    text: "This attacker has spaced out every letter. A person can still read it, but a filter looking for the word \"ignore\" won't find it.",
  },
  {
    id: "clean",
    title: "Clean it up",
    text: "Our normaliser undoes tricks like this one, plus look-alike letters from other alphabets, invisible characters and swaps like p@ssword.",
  },
  {
    id: "features",
    title: "Turn it into numbers",
    text: `The cleaned text becomes ${ex.featureCount.toLocaleString()} numbers, one for every word, word pair and 3 to 5 letter chunk the model knows about. These are the ones that mattered most for this message.`,
  },
  {
    id: "score",
    title: "Score it",
    text: "A linear SVM works out the chance that it's an injection. We calibrated it so the score behaves like a real probability. Anything at 50% or above gets blocked.",
  },
];

const AUTO_MS = 2800;

// Non-breaking spaces so "r e v e a l" doesn't wrap halfway through a word
const unbreakable = (s) => s.replace(/(\S) (?=\S)/g, "$1\u00a0");

function StageView({ id }) {
  if (id === "arrives") {
    return <p className="pipe-text pipe-text--raw">{unbreakable(ex.raw)}</p>;
  }
  if (id === "clean") {
    return (
      <div className="pipe-compare">
        <p className="pipe-text pipe-text--muted" aria-label="Before cleaning">{unbreakable(ex.raw)}</p>
        <p className="pipe-text pipe-text--clean" aria-label="After cleaning">{ex.clean}</p>
      </div>
    );
  }
  if (id === "features") {
    return (
      <div className="pipe-features">
        <p className="pipe-caption">Words</p>
        <ul className="chips">
          {ex.topWords.map((w) => <li key={w} className="chip chip--word">{w}</li>)}
        </ul>
        <p className="pipe-caption">Letter chunks</p>
        <ul className="chips">
          {ex.topFragments.map((f) => <li key={f} className="chip chip--frag">{f}</li>)}
        </ul>
      </div>
    );
  }
  return (
    <div className="pipe-score">
      <ScoreRow label="After cleaning" value={ex.chanceClean} />
      <ScoreRow label="Without cleaning" value={ex.chanceRaw} />
      <p className="pipe-note">
        If we skipped the cleaning step, this attack would only score {percent(ex.chanceRaw)} and get through.
      </p>
    </div>
  );
}

function ScoreRow({ label, value }) {
  const blocked = value >= 0.5;
  return (
    <div className="score-row">
      <p className="score-label">
        <span>{label}</span>
        <strong className={blocked ? "is-blocked" : "is-allowed"}>
          {percent(value)} chance, {blocked ? "blocked" : "allowed"}
        </strong>
      </p>
      <div className="score-track" aria-hidden="true">
        <motion.span
          className={blocked ? "score-fill score-fill--blocked" : "score-fill score-fill--allowed"}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: value }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
        <span className="score-threshold" />
      </div>
    </div>
  );
}

export default function Pipeline() {
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { amount: 0.45 });
  const tabs = useRef([]);

  useEffect(() => {
    if (!auto || !inView || reduce || active === STAGES.length - 1) return;
    const t = setTimeout(() => setActive((a) => a + 1), AUTO_MS);
    return () => clearTimeout(t);
  }, [auto, inView, reduce, active]);

  const choose = (i) => {
    setAuto(false);
    setActive(i);
  };
  const onKey = (e) => {
    const move = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    let next = null;
    if (move) next = (active + move + STAGES.length) % STAGES.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = STAGES.length - 1;
    if (next === null) return;
    e.preventDefault();
    choose(next);
    tabs.current[next]?.focus();
  };

  const stage = STAGES[active];
  return (
    <section id="how-it-works" className="section" aria-labelledby="how-title" ref={ref}>
      <div className="container">
        <div className="section-head">
          <h2 id="how-title">What happens to a message</h2>
          <p>Here's a disguised attack going through each step. It plays by itself, or you can click through the steps.</p>
        </div>

        <div className="pipeline">
          <div className="pipe-tabs" role="tablist" aria-label="Steps" onKeyDown={onKey}>
            {STAGES.map((s, i) => (
              <button
                key={s.id}
                ref={(el) => {
                  tabs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`tab-${s.id}`}
                aria-selected={i === active}
                aria-controls="pipe-panel"
                tabIndex={i === active ? 0 : -1}
                className={i === active ? "pipe-tab is-active" : i < active ? "pipe-tab is-done" : "pipe-tab"}
                onClick={() => choose(i)}
              >
                <span className="pipe-num" aria-hidden="true">{i + 1}</span>
                <span>{s.title}</span>
                {i === active && auto && inView && !reduce && i < STAGES.length - 1 && (
                  <motion.span
                    key={`progress-${i}`}
                    className="pipe-progress"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: AUTO_MS / 1000, ease: "linear" }}
                    aria-hidden="true"
                  />
                )}
              </button>
            ))}
          </div>

          <div id="pipe-panel" className="pipe-panel" role="tabpanel" aria-labelledby={`tab-${stage.id}`}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
              >
                <h3>{stage.title}</h3>
                <p className="pipe-explain">{stage.text}</p>
                <StageView id={stage.id} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
