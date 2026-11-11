import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import SeaScene from "../art/SeaScene.jsx";

const STARS = Array.from({ length: 46 }, (_, i) => {
  const r = (n) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  return { x: r(1) * 100, y: r(2) * 58, size: 1 + r(3) * 2.2, delay: r(4) * 6 };
});

function usePointerLight(ref, enabled) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    let frame = 0;
    const onMove = (e) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = el.getBoundingClientRect();
        el.style.setProperty("--light-x", `${e.clientX - box.left}px`);
        el.style.setProperty("--light-y", `${e.clientY - box.top}px`);
      });
    };
    el.addEventListener("pointermove", onMove);
    return () => {
      el.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, [ref, enabled]);
}

const rise = {
  hidden: { opacity: 0, y: 18 },
  shown: (i) => ({ opacity: 1, y: 0, transition: { delay: 0.15 + i * 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] } }),
};

export default function Hero() {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  usePointerLight(ref, !reduce);

  return (
    <section className="hero" ref={ref} aria-labelledby="hero-title">
      <div className="sky" aria-hidden="true">
        {STARS.map((s, i) => (
          <span key={i} className="star"
            style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s` }} />
        ))}
        <svg className="moon" viewBox="0 0 200 200" focusable="false">
          <circle cx="100" cy="100" r="92" fill="#f1e6d2" />
          <g fill="#cbbfa8" opacity="0.55">
            <circle cx="70" cy="74" r="14" /><circle cx="128" cy="120" r="20" /><circle cx="92" cy="140" r="8" /><circle cx="140" cy="62" r="7" />
          </g>
          <circle cx="100" cy="100" r="92" fill="none" stroke="#07121f" strokeWidth="4" />
        </svg>
      </div>

      <div className="hero-copy container">
        <motion.h1 id="hero-title" variants={rise} custom={0} initial={reduce ? false : "hidden"} animate="shown">
          Checking messages for prompt injection
        </motion.h1>
        <motion.p className="hero-lede" variants={rise} custom={1} initial={reduce ? false : "hidden"} animate="shown">
          Prompt injection is when someone sneaks instructions into a message to make an AI
          ignore its rules. We trained a model to catch it. Paste a message into the checker
          and it'll tell you whether it would be blocked and how confident the model is.
        </motion.p>
        <motion.div className="actions" variants={rise} custom={2} initial={reduce ? false : "hidden"} animate="shown">
          <a href="#check" className="btn">Try the checker</a>
          <a href="#story" className="btn btn--ghost">What's prompt injection?</a>
        </motion.div>
      </div>

      <SeaScene />
    </section>
  );
}
