import { motion } from "motion/react";
import { ease } from "../anim";
import { BRAND } from "../brand";
import { HeroDemo } from "./HeroDemo";
import { LightRays } from "./LightRays";
import { Ribbon } from "./Ribbon";

const PROMISES = [
  "Your personal details never leave your device",
  "Never used to train AI",
  "Nothing to set up. Just ask.",
];

function PromiseItem({ label, index }: { label: string; index: number }) {
  const delay = 0.6 + index * 0.16;
  return (
    <motion.li
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, ease, delay }}
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <circle cx="9" cy="9" r="8.25" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.5" />
        <motion.path
          d="M5.2 9.3 7.8 11.8 12.9 6.4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, ease, delay: delay + 0.2 }}
        />
      </svg>
      {label}
    </motion.li>
  );
}

export function Hero() {
  return (
    <section className="hero" id="top" aria-labelledby="hero-title">
      <div className="hero-grid">
        <div className="hero-copy">
          <LightRays />
          <motion.span
            className="status-pill"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease }}
          >
            <span className="status-dot" aria-hidden="true" />
            Launching soon
          </motion.span>

          <motion.h1
            id="hero-title"
            className="serif"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease, delay: 0.08 }}
          >
            The AI that actually <em>cares about your privacy.</em>
          </motion.h1>

          <motion.p
            className="hero-lede"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease, delay: 0.2 }}
          >
            {BRAND} is an AI assistant that answers your most personal questions without sending your personal details
            anywhere. Your name, ID numbers and bank details stay on your device. You just ask, like normal.
          </motion.p>

          <ul className="hero-promises" aria-label="What that means for you">
            {PROMISES.map((p, i) => (
              <PromiseItem key={p} label={p} index={i} />
            ))}
          </ul>

          <motion.div
            className="hero-actions"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease, delay: 0.32 }}
          >
            <a className="btn btn-primary" href="#compare">
              Compare with other AI apps{" "}
              <span className="arrow" aria-hidden="true">
                →
              </span>
            </a>
            <a className="btn btn-quiet" href="#how">
              How it works
            </a>
          </motion.div>
        </div>

        <div className="hero-stage">
          <Ribbon />
          <motion.div
            className="hero-stage-inner"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, ease, delay: 0.2 }}
          >
            <HeroDemo />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
