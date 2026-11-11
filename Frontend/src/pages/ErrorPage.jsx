import Robot from "../components/Robot.jsx";

export default function ErrorPage() {
  return (
    <main id="main" className="status-page status-page--full">
      <Robot mood="error" className="status-robot" />
      <div className="status-copy">
        <h1>Something went wrong</h1>
        <p>
          Part of the page crashed. The checker itself should still be fine, so try
          reloading. Your checks from this session are saved on the server.
        </p>
        <div className="actions">
          <button type="button" className="btn" onClick={() => window.location.reload()}>
            Reload
          </button>
          <a href="/" className="btn btn--ghost">Go to the home page</a>
        </div>
      </div>
    </main>
  );
}
