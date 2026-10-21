import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useRef, useState, type ReactNode } from "react";
import { ease, useLoop } from "../anim";
import { BRAND } from "../brand";
import { PERSONAL_COUNT, RECEIPT } from "../receipt";
import { Reveal } from "../Reveal";
import { Spikes } from "./Spikes";

// One shared storyboard keeps both columns in step (milliseconds per beat).
const BEATS = [700, 1300, 2000, 1500, 1500, 2000, 4400];
const B = { receipt: 1, sort: 2, travel: 3, arrive: 4, after: 5, tally: 6 } as const;

type Variant = "typical" | "ours";
type Tone = "good" | "bad" | "plain";

function Pop({ show, tone, delay = 0, children }: { show: boolean; tone: Tone; delay?: number; children: ReactNode }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.span
          className="pop"
          data-tone={tone}
          initial={{ opacity: 0, y: -6, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
          transition={{ duration: 0.45, ease, delay }}
        >
          {children}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

function Lock() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      aria-hidden="true"
    >
      <rect x="5" y="10.5" width="14" height="10" rx="2.2" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </svg>
  );
}

function Panel({ variant, beat, tilt }: { variant: Variant; beat: number; tilt: MotionValue<number> }) {
  const ours = variant === "ours";
  const atServer = beat >= B.arrive && beat < B.tally;
  const packetShown = beat >= B.travel && beat < B.tally;

  const outcomes: { text: string; tone: Tone }[] = ours
    ? [
        { text: "Your details added back on your phone", tone: "good" },
        { text: "Never used to train AI", tone: "good" },
        { text: "Nothing personal to leak", tone: "good" },
      ]
    : [
        { text: "Saved on their computers", tone: "bad" },
        { text: "May be used to train their AI*", tone: "bad" },
        { text: "Who else sees it? You can't know", tone: "bad" },
      ];

  const sentAway = ours ? 0 : PERSONAL_COUNT;

  return (
    <motion.article className="cmp-panel" data-variant={variant} style={{ rotateY: tilt }}>
      <header className="cmp-head">
        <h3>{ours ? BRAND : "A typical AI app"}</h3>
        <span className="cmp-sub">{ours ? "Your details stay with you" : "Your details go with your question"}</span>
      </header>

      {/* The same receipt in both columns; what happens to each line is the whole story. */}
      <div className="cmp-receipt" data-on={beat >= B.receipt}>
        <span className="cmp-receipt-title">Tax receipt 2025.pdf</span>
        <ul>
          {RECEIPT.map((row, i) => {
            const sorted = beat >= B.sort;
            const staying = ours && row.personal;
            return (
              <li key={row.label} data-personal={row.personal}>
                <span className="cmp-label">{row.label}</span>
                <motion.span
                  className="cmp-value"
                  animate={{
                    opacity: sorted && staying ? 0.35 : 1,
                    filter: sorted && staying ? "blur(3px)" : "blur(0px)",
                  }}
                  transition={{ duration: 0.4, delay: sorted ? i * 0.15 : 0 }}
                >
                  {row.value}
                </motion.span>
                <Pop show={sorted} tone={staying ? "good" : ours ? "plain" : "bad"} delay={i * 0.15}>
                  {staying ? (
                    <>
                      <Lock /> Stays
                    </>
                  ) : ours ? (
                    "Sent, locked"
                  ) : (
                    "Sent"
                  )}
                </Pop>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="cmp-trip">
        <div className="cmp-end">
          <span className="cmp-dot">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
              <path d="M11 18.5h2" strokeLinecap="round" />
            </svg>
          </span>
          <span className="cmp-end-label">Your phone</span>
        </div>

        <div className="cmp-track">
          <span className="cmp-track-line" />
          <motion.span
            className="cmp-packet"
            data-variant={variant}
            initial={false}
            animate={{ left: atServer ? "100%" : "0%", opacity: packetShown ? 1 : 0 }}
            transition={{ left: { duration: 1.1, ease }, opacity: { duration: 0.25 } }}
          >
            {ours ? (
              <>
                <Lock /> Income · 180 days · question
              </>
            ) : (
              "Your whole receipt"
            )}
          </motion.span>
        </div>

        <div className="cmp-end">
          <span className="cmp-dot" data-hot={atServer}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <rect x="4" y="4" width="16" height="6.5" rx="1.6" />
              <rect x="4" y="13.5" width="16" height="6.5" rx="1.6" />
            </svg>
          </span>
          <span className="cmp-end-label">{ours ? "Secure server" : "Their computers"}</span>
          <Pop show={beat >= B.arrive} tone={ours ? "good" : "bad"}>
            {ours ? "Can't see who you are" : "Can read all of it"}
          </Pop>
        </div>
      </div>

      <div className="cmp-after">
        {outcomes.map((o, i) => (
          <Pop key={o.text} show={beat >= B.after} tone={o.tone} delay={i * 0.35}>
            {o.text}
          </Pop>
        ))}
      </div>

      <footer className="cmp-tally" data-on={beat >= B.tally}>
        <span className="cmp-tally-k">Private details sent away</span>
        <motion.span
          className="cmp-count"
          key={beat >= B.tally ? "on" : "off"}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: beat >= B.tally ? 1 : 0.12, scale: 1 }}
          transition={{ duration: 0.5, ease }}
        >
          {beat >= B.tally ? sentAway : "–"}
        </motion.span>
        <span className="cmp-tally-v">
          {ours ? "None. They never left your phone." : "Name, tax ID, address and bank account."}
        </span>
      </footer>
    </motion.article>
  );
}

export function Compare() {
  const reduce = useReducedMotion() ?? false;
  const stage = useRef<HTMLDivElement>(null);
  const inView = useInView(stage, { amount: 0.4 });
  const [paused, setPaused] = useState(false);
  const beat = useLoop(BEATS, inView, paused, reduce);

  // The two screens swing in from an angle as the section scrolls into place.
  const { scrollYProgress } = useScroll({ target: stage, offset: ["start end", "start 35%"] });
  const tiltLeft = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [14, 0]);
  const tiltRight = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [-14, 0]);
  const lift = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [16, 0]);

  return (
    <section className="section compare" id="compare" aria-labelledby="compare-title">
      <div className="wrap">
        <Reveal className="section-head">
          <span className="label">Side by side</span>
          <h2 id="compare-title" className="serif">
            Same tax receipt. Two very different stories.
          </h2>
          <p>
            Ask a typical AI app and {BRAND} the same question about the same receipt. Watch what leaves your phone.
          </p>
        </Reveal>

        <motion.div className="cmp-stage" ref={stage} style={{ rotateX: lift, transformPerspective: 1600 }}>
          <Panel variant="typical" beat={beat} tilt={tiltLeft} />
          <Panel variant="ours" beat={beat} tilt={tiltRight} />
        </motion.div>

        <p className="sr-only">
          With a typical AI app, the whole receipt is sent to their computers, which can read all of it, may save it and
          may use it to train their AI: four private details leave your phone. With {BRAND}, your name, tax ID, address
          and bank account stay on your phone. Only your income, the number of home-office days and your question are
          sent, locked, to a secure server, and your details are added back to the answer on your phone: no private
          details leave your phone.
        </p>

        <div className="cmp-foot">
          <p>* Depends on the app and your settings. Many AI apps keep chats and can use them to improve their AI.</p>
          {!reduce && (
            <button type="button" className="pause" onClick={() => setPaused((p) => !p)} aria-pressed={paused}>
              {paused ? "Play" : "Pause"}
            </button>
          )}
        </div>
      </div>
      <Spikes />
    </section>
  );
}
