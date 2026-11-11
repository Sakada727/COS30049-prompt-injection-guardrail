# Prompt Injection Guardrail: front end

React 19 + Vite. All dependency versions are pinned in `package.json` and `package-lock.json`.

## Run it

You need Node.js 22 and the back end running on `http://localhost:8000`.

```
npm ci
npm run dev
```

Open http://localhost:5173. Vite forwards every request for `/api` and `/docs` to the back
end, so the browser only talks to its own address. If the back end runs somewhere else,
set `API_TARGET` before starting (Windows: `set API_TARGET=http://localhost:9000`).
For a production build served from a different address than the API, set `VITE_API_URL`
when building (see `.env.example`); the back end's CORS setting must then allow that site.

Other scripts: `npm run build` (output in `dist/`), `npm run preview` (serves the build,
with the same forwarding), `npm run lint`.

## Where things are

| Path | What it does |
|---|---|
| `src/api/client.js` | Every call to the back end, the per-tab session ID, and reading all error formats |
| `src/content/results.js` | Every number the site quotes, each with the file in `Backend/reports/` it comes from |
| `src/content/attacks.js` | The seven example attacks and the verdict the model gave each one when tested |
| `src/components/home/` | Hero, the prompt-injection story, attack gallery, how-it-works stepper, results and evasion chart, defences, FAQ |
| `src/components/checker/` | The checker, the blocked spotlight, the likelihood meter and the session history chart |
| `src/components/art/` | The hero's animated sea (`SeaScene.jsx`) and the stamped seal (`Seal.jsx`) |
| `src/components/Robot.jsx` | The sentinel robot, drawn in SVG like a woodblock print, with one face per state |
| `public/art/` | Hokusai's *Under the Wave off Kanagawa* (about 1831, public domain) |
| `src/pages/` | Home, the 404 page, and the fallback page for unexpected errors |
| `src/styles/` | Design tokens, then one stylesheet per part of the page |

## Look and credits

The design borrows from Japanese woodblock prints: a Prussian-blue night, paper-coloured
text, a vermilion seal for anything blocked and sea-foam for anything let through. All
colours are design tokens in `src/styles/tokens.css`. Everything is drawn in SVG and CSS
except one picture: Hokusai's *Under the Wave off Kanagawa*, which is in the public domain.
The fonts, Young Serif and Alegreya Sans, are under the SIL Open Font License
and are bundled from npm, so the site loads no fonts from other servers.

## Accessibility

Every input has a label, every action works by keyboard (the history chart's marks and
the how-it-works steps included), text contrast is at least 4.5:1, verdicts are always a
word and a shape as well as a colour, and all animation stops when the system asks for
reduced motion. User input is only ever rendered as text, never as HTML.
