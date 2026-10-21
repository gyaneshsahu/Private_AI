import { MotionConfig } from "motion/react";
import { Nav } from "./sections/Nav";
import { Hero } from "./sections/Hero";
import { Problem } from "./sections/Problem";
import { News } from "./sections/News";
import { Compare } from "./sections/Compare";
import { HowItWorks } from "./sections/HowItWorks";
import { Features } from "./sections/Features";
import { UseCases } from "./sections/UseCases";
import { Faq } from "./sections/Faq";
import { Closing } from "./sections/Closing";

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Nav />
      <main id="main">
        <Hero />
        <Problem />
        <Compare />
        <News />
        <HowItWorks />
        <Features />
        <UseCases />
        <Faq />
      </main>
      <Closing />
    </MotionConfig>
  );
}
