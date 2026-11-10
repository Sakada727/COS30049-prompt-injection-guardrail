import { useState, useEffect } from "react";


export default function Header() {
  const [open, setOpen] = useState(false);

  // Escape closes the menu, for keyboard users
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="header">
      <button
        className="menu-btn"
        aria-label="Menu"
        aria-expanded={open}
        aria-controls="drawer"
        onClick={() => setOpen((o) => !o)}
      >
        <span />
        <span />
        <span />
      </button>

      <a href="#top" className="site-title">
        Prompt Injection Guardrail
      </a>

            {open && (
        <nav id="drawer" className="drawer" aria-label="Main">
          <a href="#top" onClick={() => setOpen(false)}>Home</a>
          <a href="#check" onClick={() => setOpen(false)}>Check a prompt</a>
          <a href="#how-it-works" onClick={() => setOpen(false)}>How it works</a>
        </nav>
      )}
    </header>
  );
}