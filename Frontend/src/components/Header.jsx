import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

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

      <Link to="/" className="site-title">
        Prompt Injection Guardrail
      </Link>

      {open && (
        <nav id="drawer" className="drawer" aria-label="Main">
          <Link to="/" onClick={() => setOpen(false)}>Home</Link>
          <Link to="/check" onClick={() => setOpen(false)}>Check a prompt</Link>
        </nav>
      )}
    </header>
  );
}