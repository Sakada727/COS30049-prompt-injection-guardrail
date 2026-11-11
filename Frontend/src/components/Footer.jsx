import { DOCS_URL } from "../api/client.js";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <p className="footer-title">Prompt Injection Guardrail</p>
        <p>
          COS30049 Computing Technology Innovation Project, Session 07 Group 8,
          Swinburne University of Technology.
        </p>
        <p>
          This is a student project for Swinburne. The model was trained on public datasets.
        </p>
        <p>
          <a href={DOCS_URL}>API documentation</a>
        </p>
        <p className="footer-credits">
          The wave picture is <cite>Under the Wave off Kanagawa</cite> by Katsushika Hokusai
          (about 1831), which is in the public domain. Fonts are Young Serif and Alegreya
          Sans, both under the SIL Open Font License.
        </p>
      </div>
    </footer>
  );
}
