import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { THRESHOLD, injectionChance } from "../../api/client.js";
import { percent } from "../../lib/format.js";
import useWidth from "../../hooks/useWidth.js";

const H = 230;
const M = { top: 16, right: 18, bottom: 30, left: 46 };
const FILTERS = [
  { key: "all", label: "All" },
  { key: "blocked", label: "Blocked" },
  { key: "allowed", label: "Allowed" },
];

const time = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

function Mark({ blocked, x, y, selected }) {
  return (
    <>
      <circle cx={x} cy={y} r="14" className="pt-hit" />
      <circle cx={x} cy={y} r="11" className={selected ? "pt-ring is-selected" : "pt-ring"} />
      {blocked ? (
        <rect x={x - 6} y={y - 6} width="12" height="12" rx="2" className="pt pt--blocked" />
      ) : (
        <circle cx={x} cy={y} r="6.5" className="pt pt--allowed" />
      )}
    </>
  );
}

export default function SessionHistory({ items, source, onReuse, onReset }) {
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [hoverId, setHoverId] = useState(null);
  const plotRef = useRef(null);
  const width = useWidth(plotRef);

  const checks = useMemo(
    () =>
      [...items].reverse().map((c, i) => ({
        ...c,
        n: i + 1,
        chance: injectionChance(c.label, c.confidence),
      })),
    [items],
  );
  const counts = {
    all: checks.length,
    blocked: checks.filter((c) => c.label === "blocked").length,
    allowed: checks.filter((c) => c.label === "allowed").length,
  };
  const shown = checks.filter((c) => filter === "all" || c.label === filter);
  const selected = checks.find((c) => c.id === selectedId) ?? null;
  const hovered = checks.find((c) => c.id === hoverId) ?? null;

  const innerW = Math.max(width - M.left - M.right, 40);
  const innerH = H - M.top - M.bottom;
  const PAD = 24;
  const x = (n) =>
    M.left + (checks.length === 1 ? innerW / 2 : PAD + ((n - 1) / (checks.length - 1)) * (innerW - 2 * PAD));
  const y = (p) => M.top + (1 - p) * innerH;
  const xTicks = checks.length <= 12 ? checks.map((c) => c.n)
    : checks.filter((c) => (c.n - 1) % Math.ceil(checks.length / 10) === 0).map((c) => c.n);

  const select = (id) => setSelectedId((cur) => (cur === id ? null : id));

  return (
    <section className="history" aria-labelledby="history-title">
      <div className="history-head">
        <div>
          <h3 id="history-title">This session</h3>
          <p className="chart-sub">
            {checks.length === 0
              ? "Everything you check shows up here so you can compare."
              : `${counts.all} checked, ${counts.blocked} blocked, ${counts.allowed} allowed.`}
          </p>
        </div>
        <div className="history-controls">
          <div className="segmented" role="group" aria-label="Show">
            {FILTERS.map((f) => (
              <button key={f.key} type="button" aria-pressed={filter === f.key}
                className={filter === f.key ? "seg is-on" : "seg"} onClick={() => setFilter(f.key)}>
                {f.label} <span className="seg-count">{counts[f.key]}</span>
              </button>
            ))}
          </div>
          <button type="button" className="btn btn--quiet" onClick={() => { onReset(); setSelectedId(null); }}>
            Start a new session
          </button>
        </div>
      </div>

      {source === "local" && (
        <p className="history-note">
          Couldn't load the history from the back end, so these checks are only saved on this page.
        </p>
      )}

      <div className="history-body">
        <figure className="history-chart">
          <figcaption className="visually-hidden">
            Chance of an injection for each prompt checked in this session, in the order checked.
          </figcaption>
          <ul className="legend" aria-label="Legend">
            <li><svg width="12" height="12" aria-hidden="true"><rect x="1" y="1" width="10" height="10" rx="2" fill="var(--vermilion)" /></svg>Blocked</li>
            <li><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="5" fill="var(--foam)" /></svg>Allowed</li>
            <li><svg width="18" height="12" aria-hidden="true"><line x1="0" y1="6" x2="18" y2="6" stroke="var(--paper-2)" strokeWidth="1.5" /></svg>Blocked from {THRESHOLD * 100}%</li>
          </ul>

          <div className="history-plot" ref={plotRef}>
            {checks.length === 0 ? (
              <div className="history-empty">
                <p>Nothing checked yet. Try one of the examples above.</p>
              </div>
            ) : (
              <svg width={width} height={H} role="group" aria-label="Checks in this session">
                {[0, 0.25, 0.5, 0.75, 1].map((t) => (
                  <g key={t} aria-hidden="true">
                    <line x1={M.left} x2={M.left + innerW} y1={y(t)} y2={y(t)}
                      className={t === THRESHOLD ? "grid grid--threshold" : "grid"} />
                    <text x={M.left - 10} y={y(t)} dy="0.32em" textAnchor="end" className="axis-label">{t * 100}%</text>
                  </g>
                ))}
                {xTicks.map((n) => (
                  <text key={n} x={x(n)} y={H - 8} textAnchor="middle" className="axis-label" aria-hidden="true">{n}</text>
                ))}

                {shown.map((c) => (
                  <line key={`stem-${c.id}`} x1={x(c.n)} x2={x(c.n)} y1={y(THRESHOLD)} y2={y(c.chance)} className="stem" aria-hidden="true" />
                ))}
                {shown.map((c) => (
                  <motion.g
                    key={c.id}
                    role="button"
                    tabIndex={0}
                    className="pt-group"
                    aria-label={`Check ${c.n}: ${c.label}, ${percent(c.chance)} chance of an injection`}
                    aria-pressed={c.id === selectedId}
                    initial={{ opacity: 0, scale: 0.4 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    onClick={() => select(c.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        select(c.id);
                      }
                    }}
                    onPointerEnter={() => setHoverId(c.id)}
                    onPointerLeave={() => setHoverId(null)}
                    onFocus={() => setHoverId(c.id)}
                    onBlur={() => setHoverId(null)}
                  >
                    <Mark blocked={c.label === "blocked"} x={x(c.n)} y={y(c.chance)} selected={c.id === selectedId} />
                  </motion.g>
                ))}
              </svg>
            )}

            {hovered && (
              <p className="tooltip history-tip" role="presentation"
                style={{ left: x(hovered.n), top: y(hovered.chance) }}>
                <strong>{percent(hovered.chance)}</strong> chance of an injection
                <span className="tooltip-sub">Check {hovered.n} ({hovered.label}). Click to see the prompt.</span>
              </p>
            )}
          </div>
        </figure>

        <div className="history-side">
          <AnimatePresence mode="wait" initial={false}>
            {selected ? (
              <motion.div key={selected.id} className="history-detail"
                initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <p className="detail-meta">
                  <span className={`pill pill--${selected.label}`}>{selected.label === "blocked" ? "Blocked" : "Allowed"}</span>
                  Check {selected.n} at {time(selected.created_at)}
                </p>
                <p className="detail-chance"><strong>{percent(selected.chance)}</strong> chance of an injection</p>
                <p className="detail-text">{selected.text}</p>
                <div className="actions">
                  <button type="button" className="btn btn--small" onClick={() => onReuse(selected.text)}>Check this again</button>
                  <button type="button" className="btn btn--quiet" onClick={() => setSelectedId(null)}>Close</button>
                </div>
              </motion.div>
            ) : (
              <motion.ol key="list" className="history-list" aria-label="Checks, newest first"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                {[...shown].reverse().map((c) => (
                  <li key={c.id}>
                    <button type="button" className="history-row" onClick={() => select(c.id)}>
                      <span className="row-n">{c.n}</span>
                      <span className={`pill pill--${c.label}`}>{c.label === "blocked" ? "Blocked" : "Allowed"}</span>
                      <span className="row-chance">{percent(c.chance)}</span>
                      <span className="row-text">{c.text}</span>
                    </button>
                  </li>
                ))}
                {shown.length === 0 && <li className="history-none">{filter === "all" ? "No checks yet." : `No ${filter} checks yet.`}</li>}
              </motion.ol>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
