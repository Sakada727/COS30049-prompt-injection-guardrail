import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

const LINKS = [
  { id: "story", label: "What it is" },
  { id: "attacks", label: "Examples" },
  { id: "how-it-works", label: "How it works" },
  { id: "results", label: "Results" },
  { id: "defences", label: "Defences" },
  { id: "faq", label: "FAQ" },
];

function Mark() {
  return (
    <svg viewBox="0 0 32 32" className="brand-mark" aria-hidden="true" focusable="false">
      <rect x="2" y="2" width="28" height="28" rx="5" fill="#e0452b" transform="rotate(-6 16 16)" />
      <path d="M6 21 C9 21 10 14 15 14 C19 14 19 19 22 19 C24 19 25 17 26 16" fill="none" stroke="#f1e6d2" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M13 17.5 c1.6 -1.6 3.6 -1.2 4.2 0.6" fill="none" stroke="#f1e6d2" strokeWidth="2" strokeLinecap="round" />
      <circle cx="22" cy="10" r="2.4" fill="#f1e6d2" />
    </svg>
  );
}

function useCurrentSection(enabled) {
  const [current, setCurrent] = useState(null);
  useEffect(() => {
    if (!enabled) return;
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setCurrent(e.target.id)),
      { rootMargin: "-45% 0px -50% 0px" },
    );
    LINKS.forEach((l) => {
      const el = document.getElementById(l.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [enabled]);
  return enabled ? current : null;
}

export default function Header() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const current = useCurrentSection(pathname === "/");

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="brand" onClick={close}>
          <Mark />
          <span>Prompt Injection Guardrail</span>
        </Link>

        <button
          type="button"
          className="menu-btn"
          aria-expanded={open}
          aria-controls="site-nav"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Close" : "Menu"}
        </button>

        <nav id="site-nav" className={open ? "nav nav--open" : "nav"} aria-label="Main">
          <ul className="nav-list">
            {LINKS.map((l) => (
              <li key={l.id}>
                <a href={`/#${l.id}`} onClick={close} aria-current={current === l.id ? "true" : undefined}>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <a href="/#check" className="btn btn--small" onClick={close}>Try the checker</a>
        </nav>
      </div>
    </header>
  );
}
