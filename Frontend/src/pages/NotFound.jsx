import { useLocation } from "react-router-dom";
import Robot from "../components/Robot.jsx";

export default function NotFound() {
  const { pathname } = useLocation();
  return (
    <main id="main" className="status-page">
      <Robot mood="lost" className="status-robot" />
      <div className="status-copy">
        <h1>Page not found</h1>
        <p>
          There's nothing at <code className="path">{pathname}</code>. Everything on
          this site is on the home page.
        </p>
        <div className="actions">
          <a href="/" className="btn">Back to the home page</a>
          <a href="/#check" className="btn btn--ghost">Try the checker</a>
        </div>
      </div>
    </main>
  );
}
