import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef, useState } from "react";
import { BRAND } from "../brand";
import { Reveal } from "../Reveal";

const steps = [
  {
    title: "Your private details stay put",
    body: `${BRAND} spots your name, address, ID and tax numbers, bank details and the like, and keeps them on your device.`,
  },
  {
    title: "The rest is locked before it leaves",
    body: "Only the general part of your question goes out, sealed so nobody can read it on the way.",
  },
  {
    title: "A secure server works it out",
    body: "The answer is worked out on protected computers that nobody can look inside, not even us. It's never used to train AI.",
  },
  {
    title: "Your details are added back",
    body: "The answer comes back to your device, which fills your details back in. You get the full, personal answer.",
  },
];

export function HowItWorks() {
  const reduce = useReducedMotion();
  const flow = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(reduce ? steps.length - 1 : -1);

  // The path fills in as you scroll, lighting each step as it's reached.
  const { scrollYProgress } = useScroll({ target: flow, offset: ["start 85%", "end 45%"] });
  const fill = useTransform(scrollYProgress, [0, 1], [0, 1]);
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    if (!reduce) setActive(p <= 0.01 ? -1 : Math.min(steps.length - 1, Math.floor(p * steps.length)));
  });

  return (
    <section className="section night" id="how" aria-labelledby="how-title">
      <div className="wrap">
        <Reveal className="section-head">
          <span className="label">How it works</span>
          <h2 id="how-title" className="serif">
            What happens when you press send.
          </h2>
          <p>All of this happens by itself, in a moment. You just ask, the way you would anywhere else.</p>
        </Reveal>

        <div className="flow-wrap" ref={flow}>
          <div className="flow-track" aria-hidden="true">
            <motion.span className="flow-fill" style={{ scaleX: reduce ? 1 : fill }} />
          </div>
          <ol className="flow">
            {steps.map((step, i) => (
              <li key={step.title} className="flow-step" data-active={i <= active}>
                <Reveal delay={i * 0.1}>
                  <span className="flow-node" aria-hidden="true">
                    {i + 1}
                  </span>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
