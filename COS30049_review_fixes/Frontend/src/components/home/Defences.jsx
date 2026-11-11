import { dos, evasion, sqli } from "../../content/results.js";

const pct = (v) => `${(v * 100).toFixed(1)}%`;
const newDisguises = evasion.groups[1];

const DEFENCES = [
  {
    name: "Disguised text",
    attack: "Look-alike letters, invisible characters and spaced-out words get past a model that has only ever seen normal text.",
    defence: "We clean every message before scoring it, so the model sees what a person would see.",
    measures: [
      { what: "New disguises that got through", before: pct(newDisguises.a2), after: pct(newDisguises.a3) },
    ],
  },
  {
    name: "Flooding the server",
    attack: "A burst of heavy requests froze the server for everyone, and a single 100 MB request got read in full before it was rejected.",
    defence: "Requests that are too big are refused before they're read. The model runs in separate worker processes with a short queue, and anything past that is turned away straight away.",
    art: {
      src: "/art/great-wave.jpg",
      caption: "Katsushika Hokusai, Under the Wave off Kanagawa, about 1831. Public domain.",
    },
    measures: [
      { what: "100 slow requests at once, time to clear", before: dos.floodBefore, after: dos.floodAfter },
      { what: "Slowest response to other users meanwhile", before: dos.slowestWaitBefore, after: dos.slowestWaitAfter },
      { what: "One 100 MB request", before: dos.bodyBefore, after: dos.bodyAfter },
    ],
  },
  {
    name: "SQL injection in the history",
    attack: "We sent prompts written as SQL that tried to read other people's prompts and change a blocked result to allowed.",
    defence: "Every database query passes the prompt in as a parameter, so it only ever gets stored as text.",
    measures: [
      { what: "SQL attacks that worked or crashed the query", before: `${sqli.workedBefore} of ${sqli.attacks}`, after: `${sqli.workedAfter} of ${sqli.attacks}` },
    ],
  },
];

export default function Defences() {
  return (
    <section id="defences" className="section section--deep" aria-labelledby="defences-title">
      <div className="container">
        <div className="section-head">
          <h2 id="defences-title">Keeping the app itself safe</h2>
          <p>
            We assumed someone would skip the website and go straight to the API, sending
            whatever they wanted as often as they wanted. For each defence we ran the attack
            with it turned off and then on again.
          </p>
        </div>

        <ul className="defences">
          {DEFENCES.map((d) => (
            <li key={d.name} className="defence">
              <div className="defence-copy">
                <h3>{d.name}</h3>
                <p><span className="defence-tag">The problem</span>{d.attack}</p>
                <p><span className="defence-tag">What we did</span>{d.defence}</p>
                {d.art && (
                  <figure className="defence-art">
                    <img src={d.art.src} alt="" width="928" height="514" loading="lazy" decoding="async" />
                    <figcaption>{d.art.caption}</figcaption>
                  </figure>
                )}
              </div>
              <table className="defence-measures">
                <thead>
                  <tr>
                    <th scope="col"><span className="visually-hidden">Measure</span></th>
                    <th scope="col">Without</th>
                    <th scope="col">With</th>
                  </tr>
                </thead>
                <tbody>
                  {d.measures.map((m) => (
                    <tr key={m.what}>
                      <th scope="row">{m.what}</th>
                      <td className="is-before">{m.before}</td>
                      <td className="is-after">{m.after}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
