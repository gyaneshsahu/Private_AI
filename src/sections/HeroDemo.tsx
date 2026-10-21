import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { ease, useLoop, useMediaQuery } from "../anim";
import { BRAND } from "../brand";
import { ANSWER_NAME, ANSWER_REST, QUESTION, RECEIPT } from "../receipt";

// Storyboard, one entry per beat (milliseconds).
const BEATS = [700, 1300, 1800, 2200, 1700, 1100, 1600, 1100, 3600];
const B = {
  receipt: 1,
  question: 2,
  lock: 3,
  leaving: 4,
  out: 5,
  working: 6,
  back: 7,
  answer: 8,
} as const;

const CAPTIONS = [
  "You add your tax receipt and ask a question.",
  "Your private details stay on your phone.",
  "Only the question leaves, locked.",
  "A secure server works out the answer.",
  "Your details are added back. You get the full answer.",
];

function captionFor(beat: number) {
  if (beat >= B.back) return 4;
  if (beat >= B.working) return 3;
  if (beat >= B.leaving) return 2;
  if (beat >= B.lock) return 1;
  return 0;
}

function Typed({ text, run }: { text: string; run: boolean }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!run) {
      setN(0);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 1300);
      setN(Math.round(p * text.length));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [run, text]);
  return (
    <>
      {text.slice(0, n)}
      {run && n < text.length && <span className="caret" aria-hidden="true" />}
    </>
  );
}

function Lock({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <rect x="5" y="10.5" width="14" height="10" rx="2.2" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </svg>
  );
}

export function HeroDemo() {
  const reduce = useReducedMotion() ?? false;
  const root = useRef<HTMLDivElement>(null);
  const inView = useInView(root, { amount: 0.3 });
  const [paused, setPaused] = useState(false);
  const beat = useLoop(BEATS, inView, paused, reduce);
  const stacked = useMediaQuery("(max-width: 640px)");

  // Where the envelope is between the phone (0) and the server (1), and whether it's visible.
  const trip = beat === B.out || beat === B.working ? 1 : 0;
  const envelopeShown = beat === B.out || beat === B.back;
  const caption = captionFor(beat);
  const locked = beat >= B.lock;

  return (
    <div className="demo-wrap" ref={root}>
      <div className="demo" aria-hidden="true">
        {/* The phone: everything personal lives and stays here. */}
        <div className="phone">
          <div className="phone-bar">
            <span className="phone-app">
              <img src="/mark.svg" alt="" width="18" height="18" />
              {BRAND}
            </span>
            <span className="phone-tag">Your phone</span>
          </div>

          <div className="phone-chat">
            <AnimatePresence>
              {beat >= B.receipt && (
                <motion.div
                  className="receipt"
                  initial={{ opacity: 0, y: 14, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease }}
                >
                  <div className="receipt-head">
                    <span>Tax receipt 2025.pdf</span>
                    <AnimatePresence>
                      {locked && (
                        <motion.span
                          className="stays"
                          initial={{ opacity: 0, x: 8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.4, ease, delay: 0.9 }}
                        >
                          <Lock size={11} /> Private details stay here
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                  <dl>
                    {RECEIPT.map((row, i) => {
                      const hide = locked && row.personal;
                      return (
                        <div key={row.label} className="receipt-row" data-personal={row.personal} data-locked={hide}>
                          <dt>{row.label}</dt>
                          <dd>
                            <motion.span
                              className="receipt-value"
                              animate={{ opacity: hide ? 0 : 1, filter: hide ? "blur(4px)" : "blur(0px)" }}
                              transition={{ duration: 0.4, delay: hide ? i * 0.18 : 0 }}
                            >
                              {row.value}
                            </motion.span>
                            <motion.span
                              className="receipt-lock"
                              initial={false}
                              animate={{ opacity: hide ? 1 : 0, scale: hide ? 1 : 0.6 }}
                              transition={{ duration: 0.35, ease, delay: hide ? i * 0.18 + 0.15 : 0 }}
                            >
                              <Lock size={11} /> stays on phone
                            </motion.span>
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="bubble bubble-me" data-empty={beat < B.question}>
              <Typed text={QUESTION} run={beat >= B.question} />
            </div>

            <AnimatePresence>
              {beat >= B.leaving && beat < B.answer && (
                <motion.div
                  className="leaving"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.4, ease }}
                >
                  <span className="leaving-k">
                    <Lock size={11} /> Leaving your phone, locked
                  </span>
                  <span className="leaving-v">Income · 180 days · your question</span>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {beat >= B.answer && (
                <motion.div
                  className="bubble bubble-ai"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease }}
                >
                  <motion.mark
                    className="added-back"
                    initial={{ backgroundColor: "rgba(90, 62, 164, 0.32)" }}
                    animate={{ backgroundColor: "rgba(90, 62, 164, 0.12)" }}
                    transition={{ duration: 1.6, delay: 0.6 }}
                  >
                    {ANSWER_NAME}
                  </motion.mark>
                  {ANSWER_REST}
                  <span className="added-note">
                    <Lock size={10} /> Your name was added back on your phone
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* The path between phone and server, and the locked envelope travelling along it. */}
        <div className="path">
          <span className="path-line" />
          <motion.span
            className="envelope"
            data-return={beat >= B.back}
            initial={false}
            animate={
              stacked
                ? { top: `${(1 - trip) * 100}%`, left: "50%", opacity: envelopeShown ? 1 : 0 }
                : { left: `${trip * 100}%`, top: "50%", opacity: envelopeShown ? 1 : 0 }
            }
            transition={{ top: { duration: 0.95, ease }, left: { duration: 0.95, ease }, opacity: { duration: 0.2 } }}
          >
            <svg width="30" height="22" viewBox="0 0 30 22" fill="none">
              <rect x="1" y="1" width="28" height="20" rx="3" fill="currentColor" />
              <path d="m2 3 13 9 13-9" stroke="#f3f4f1" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
            <span className="envelope-lock">
              <Lock size={10} />
            </span>
          </motion.span>
        </div>

        {/* The secure server: sees only the question, never the person. */}
        <div className="server" data-state={beat === B.working ? "working" : beat > B.working ? "done" : "idle"}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="4" y="4" width="16" height="6.5" rx="1.6" />
            <rect x="4" y="13.5" width="16" height="6.5" rx="1.6" />
            <path d="M7.5 7.2h.01M7.5 16.8h.01" strokeLinecap="round" strokeWidth="2.2" />
          </svg>
          <strong>Secure server</strong>
          <span className="server-note">Locked. Even we can't look inside.</span>
          <span className="server-state">
            {beat === B.working ? (
              <span className="dots">
                Working<i>.</i>
                <i>.</i>
                <i>.</i>
              </span>
            ) : beat > B.working ? (
              "Answer sent back"
            ) : (
              "Waiting"
            )}
          </span>
        </div>
      </div>

      <div className="demo-steps" aria-hidden="true">
        <ol className="demo-dots">
          {CAPTIONS.map((c, i) => (
            <li key={c} data-on={i === caption} data-done={i < caption}>
              {i + 1}
            </li>
          ))}
        </ol>
        <div className="demo-caption">
          <AnimatePresence mode="wait">
            <motion.p
              key={caption}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease }}
            >
              {CAPTIONS[caption]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
      <div className="demo-controls">
        {!reduce && (
          <button type="button" className="pause" onClick={() => setPaused((p) => !p)} aria-pressed={paused}>
            {paused ? "Play" : "Pause"}
          </button>
        )}
      </div>

      <p className="sr-only">
        Animation: you add a tax receipt and ask how much you can get back for working from home. {BRAND} keeps your
        name, tax ID, address and bank account on your phone. Only your income, the number of home-office days and your
        question leave the phone, locked. A secure server works out the answer, and your phone adds your name back, so
        you get the full answer.
      </p>
    </div>
  );
}
