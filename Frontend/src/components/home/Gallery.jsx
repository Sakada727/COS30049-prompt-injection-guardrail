import { attacks } from "../../content/attacks.js";
import { percent } from "../../lib/format.js";
import Seal from "../art/Seal.jsx";

export default function Gallery({ onTry }) {
  return (
    <section id="attacks" className="section gallery" aria-labelledby="attacks-title">
      <div className="container">
        <div className="section-head">
          <h2 id="attacks-title">Attacks you can try</h2>
          <p>
            These are the main kinds of attack we tested against, with the score the model
            gave each example. Each one has a button that loads it into the checker.
          </p>
        </div>

        <ul className="prints">
          {attacks.map((a) => {
            const blocked = a.label === "blocked";
            return (
              <li key={a.title} className={a.miss ? "print print--miss" : "print"}>
                <Seal tone={blocked ? "blocked" : "allowed"} label={blocked ? "Blocked" : "Allowed"}
                  detail={percent(blocked ? a.chance : 1 - a.chance)} className="print-seal" stamp={false} />
                <h3>{a.title}</h3>
                <p className="print-text">{a.text}</p>
                <blockquote className="print-example">{a.example}</blockquote>
                <p className="print-verdict">
                  {blocked ? "Blocked" : "Let through"}, {percent(a.chance)} chance it's an injection
                </p>
                <button type="button" className="print-try" onClick={() => onTry(a.example)}>
                  Try this one
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
