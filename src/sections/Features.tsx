import { useInView } from "motion/react";
import { useRef, type ReactNode } from "react";
import { Reveal } from "../Reveal";

// Each feature gets a tiny looping scene that shows what it does. The loops are pure CSS,
// only run while the section is on screen, and stop entirely for reduced-motion users.

function Incognito() {
  return (
    <div className="vis vis-incognito">
      <span className="vi-bubble a" />
      <span className="vi-bubble b" />
      <span className="vi-bubble c" />
      <span className="vi-gone">Closed. Nothing saved.</span>
    </div>
  );
}

function Disappearing() {
  return (
    <div className="vis vis-timer">
      <span className="vt-msg">See you at 6?</span>
      <svg className="vt-ring" width="34" height="34" viewBox="0 0 36 36" aria-hidden="true">
        <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
        <circle
          className="vt-arc"
          cx="18"
          cy="18"
          r="15"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray="100"
          transform="rotate(-90 18 18)"
        />
      </svg>
    </div>
  );
}

function Anonymous() {
  return (
    <div className="vis vis-anon">
      <span className="va-avatar">
        <span className="va-initials">AW</span>
        <svg className="va-blank" width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="8.5" r="4" />
          <path d="M4 20.5c.8-4 4.1-6 8-6s7.2 2 8 6z" />
        </svg>
      </span>
      <span className="va-name">
        <span className="va-real">Anna Weber</span>
        <span className="va-hidden">No name attached</span>
      </span>
    </div>
  );
}

function Locked() {
  return (
    <div className="vis vis-lock">
      <svg width="46" height="52" viewBox="0 0 46 52" fill="none" aria-hidden="true">
        <path
          className="vl-shackle"
          d="M12 24V15a11 11 0 0 1 22 0v9"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <rect x="5" y="22" width="36" height="27" rx="6" fill="currentColor" />
        <circle cx="23" cy="34" r="3.2" fill="var(--paper)" />
        <path d="M23 36v5" stroke="var(--paper)" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
      <span className="vl-label">Only your password opens it</span>
    </div>
  );
}

function NoTraining() {
  return (
    <div className="vis vis-train">
      <span className="vtr-chat">Your chats</span>
      <span className="vtr-line">
        <span className="vtr-dot" />
        <span className="vtr-wall" />
      </span>
      <span className="vtr-ai">AI training</span>
    </div>
  );
}

function AsksFirst() {
  return (
    <div className="vis vis-ask">
      <span className="vq-q">Search the web for “home office tax rules”?</span>
      <span className="vq-btns">
        <span className="vq-yes">Allow</span>
        <span className="vq-no">Not now</span>
      </span>
    </div>
  );
}

const features: { title: string; body: string; visual: ReactNode }[] = [
  {
    title: "Incognito mode",
    body: "Nothing is saved, not even on your device. Close the chat and it's gone.",
    visual: <Incognito />,
  },
  {
    title: "Disappearing messages",
    body: "Choose when chats delete themselves: after an hour, a day or a week.",
    visual: <Disappearing />,
  },
  {
    title: "Anonymous mode",
    body: "Ask without your name or account attached to the conversation.",
    visual: <Anonymous />,
  },
  {
    title: "Locked history",
    body: "Saved chats are locked with a password only you know. We can't open them.",
    visual: <Locked />,
  },
  {
    title: "Never used to train AI",
    body: "Your conversations are never used to train AI. Not ours, not anyone's.",
    visual: <NoTraining />,
  },
  {
    title: "Asks before it searches",
    body: "If an answer needs the internet, you see exactly what will be searched, and nothing happens until you say yes.",
    visual: <AsksFirst />,
  },
];

export function Features() {
  const grid = useRef<HTMLDivElement>(null);
  const inView = useInView(grid, { amount: 0.15 });

  return (
    <section className="section features" id="features" aria-labelledby="features-title">
      <div className="wrap">
        <Reveal className="section-head">
          <span className="label">Extra privacy</span>
          <h2 id="features-title" className="serif">
            More privacy, whenever you want it.
          </h2>
          <p>Your private details staying on your device is just the start. Turn these on with one tap.</p>
        </Reveal>

        <div className="feature-grid" ref={grid} data-play={inView}>
          {features.map((f, i) => (
            <Reveal key={f.title} className="feature" delay={0.06 * (i % 3)}>
              <div aria-hidden="true">{f.visual}</div>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
