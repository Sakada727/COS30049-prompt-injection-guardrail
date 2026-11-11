import { useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import { evasion } from "../../content/results.js";

const SERIES = [
  { key: "none", name: "No cleaning", color: "#4f7fc4" },
  { key: "a2", name: "Assignment 2 version", color: "#c98500" },
  { key: "a3", name: "Current version", color: "#2a9d84" },
];
const TICKS = [0, 0.25, 0.5, 0.75, 1];
const pct = (v) => `${(v * 100).toFixed(1)}%`;

export default function EvasionChart() {
  const [hover, setHover] = useState(null);
  const ref = useRef(null);
  const shown = useInView(ref, { once: true, amount: 0.35 });

  return (
    <figure className="chart-card">
      <figcaption>
        <h3 className="chart-title">Disguised attacks that got through</h3>
        <p className="chart-sub">
          We took {evasion.injections} known attacks, disguised each one {evasion.disguises}{" "}
          different ways and ran it five times. Lower is better.
        </p>
      </figcaption>

      <ul className="legend" aria-label="Legend">
        {SERIES.map((s) => (
          <li key={s.key}><span className="legend-swatch" style={{ background: s.color }} />{s.name}</li>
        ))}
      </ul>

      <div className="hbar" ref={ref} role="group" aria-label="Bars: share of disguised attacks that got through">
        <div className="hbar-grid" aria-hidden="true">
          {TICKS.map((t) => (
            <span key={t} className="hbar-tick" style={{ left: `${t * 100}%` }}>
              <span className="hbar-tick-label">{t * 100}%</span>
            </span>
          ))}
        </div>

        {evasion.groups.map((g) => (
          <div key={g.name} className="hbar-group">
            <p className="hbar-group-label">{g.name}</p>
            {SERIES.map((s, i) => {
              const v = g[s.key];
              const active = hover?.group === g.name && hover?.series === s.key;
              return (
                <div key={s.key} className="hbar-row">
                  <button
                    type="button"
                    className={active ? "hbar-hit is-active" : "hbar-hit"}
                    aria-label={`${s.name}, ${g.name}: ${pct(v)} got through`}
                    onPointerEnter={() => setHover({ group: g.name, series: s.key })}
                    onPointerLeave={() => setHover(null)}
                    onFocus={() => setHover({ group: g.name, series: s.key })}
                    onBlur={() => setHover(null)}
                  >
                    <motion.span
                      className="hbar-bar"
                      style={{ background: s.color, width: `${v * 100}%` }}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: shown ? 1 : 0 }}
                      transition={{ duration: 0.9, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                    />
                    <motion.span
                      className={v > 0.82 ? "hbar-value hbar-value--inside" : "hbar-value"}
                      style={v > 0.82 ? { right: `${100 - v * 100}%` } : { left: `${v * 100}%` }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: shown ? 1 : 0 }}
                      transition={{ duration: 0.3, delay: 0.6 + i * 0.08 }}
                    >
                      {pct(v)}
                    </motion.span>
                  </button>
                  {active && (
                    <span className="tooltip" role="presentation">
                      <strong>{pct(v)}</strong> got through
                      <span className="tooltip-sub">
                        <span className="tooltip-key" style={{ background: s.color }} />
                        {s.name}, {g.name.toLowerCase()}
                      </span>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <details className="table-view">
        <summary>Show the numbers as a table</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">Disguises</th>
              {SERIES.map((s) => <th key={s.key} scope="col">{s.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {evasion.groups.map((g) => (
              <tr key={g.name}>
                <th scope="row">{g.name}</th>
                {SERIES.map((s) => <td key={s.key}>{pct(g[s.key])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
