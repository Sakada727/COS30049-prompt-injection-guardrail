import { useState } from "react";
import { motion } from "motion/react";
import { THRESHOLD } from "../../api/client.js";
import { percent } from "../../lib/format.js";

const TICKS = [0, 0.25, 0.5, 0.75, 1];

export default function LikelihoodMeter({ chance }) {
  const [open, setOpen] = useState(false);
  const blocked = chance >= THRESHOLD;
  // capped so it never claims the model is completely certain
  const gap = Math.min(Math.abs(chance - THRESHOLD) * 100, 49.9);
  const explain = blocked
    ? `That's ${gap.toFixed(1)} points over the ${THRESHOLD * 100}% cut-off, so it was blocked.`
    : `That's ${gap.toFixed(1)} points under the ${THRESHOLD * 100}% cut-off, so it was allowed.`;

  return (
    <figure className="meter">
      <figcaption className="meter-head">
        <span className="chart-title">Chance this is an injection</span>
        <span className="meter-value">{percent(chance)}</span>
      </figcaption>

      <div className="meter-plot">
        <div className="meter-zones" aria-hidden="true">
          <span style={{ width: `${THRESHOLD * 100}%` }}>Allowed</span>
          <span style={{ width: `${(1 - THRESHOLD) * 100}%` }}>Blocked</span>
        </div>
        <div className="meter-track" aria-hidden="true">
          <span className="meter-zone meter-zone--allowed" style={{ width: `${THRESHOLD * 100}%` }} />
          <span className="meter-zone meter-zone--blocked" style={{ width: `${(1 - THRESHOLD) * 100}%` }} />
          <span className="meter-line" style={{ left: `${THRESHOLD * 100}%` }} />
        </div>

        <motion.button
          type="button"
          className={blocked ? "meter-marker is-blocked" : "meter-marker is-allowed"}
          initial={{ left: "0%" }}
          animate={{ left: `${chance * 100}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
          aria-label={`${percent(chance)} chance of an injection. ${explain}`}
          aria-describedby="meter-tip"
          onPointerEnter={() => setOpen(true)}
          onPointerLeave={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
        >
          <span className="meter-dot" />
        </motion.button>

        {open && (
          <p id="meter-tip" className="tooltip meter-tip" role="tooltip"
            style={{ left: `clamp(110px, ${chance * 100}%, calc(100% - 110px))` }}>
            <strong>{percent(chance)}</strong> chance of an injection
            <span className="tooltip-sub">{explain}</span>
          </p>
        )}

        <div className="meter-axis" aria-hidden="true">
          {TICKS.map((t) => (
            <span key={t} style={{ left: `${t * 100}%` }}>{t * 100}%</span>
          ))}
        </div>
      </div>

      <p className="meter-explain">{explain}</p>
    </figure>
  );
}
