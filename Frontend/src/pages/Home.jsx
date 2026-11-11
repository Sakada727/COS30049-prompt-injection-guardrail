import { useState } from "react";
import Checker from "../components/checker/Checker.jsx";
import Defences from "../components/home/Defences.jsx";
import Faq from "../components/home/Faq.jsx";
import Gallery from "../components/home/Gallery.jsx";
import Hero from "../components/home/Hero.jsx";
import Pipeline from "../components/home/Pipeline.jsx";
import Results from "../components/home/Results.jsx";
import Story from "../components/home/Story.jsx";

export default function Home() {
  const [text, setText] = useState("");

  const tryPrompt = (example) => {
    setText(example);
    document.getElementById("check")?.scrollIntoView();
    requestAnimationFrame(() => document.getElementById("prompt")?.focus({ preventScroll: true }));
  };

  return (
    <main id="main">
      <Hero />
      <Story />
      <Checker text={text} setText={setText} />
      <Gallery onTry={tryPrompt} />
      <Pipeline />
      <Results />
      <Defences />
      <Faq />
    </main>
  );
}
