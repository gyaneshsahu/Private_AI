import { motion } from "motion/react";
import { ease } from "../anim";
import { Reveal } from "../Reveal";

const cases = [
  { doc: "Tax receipt", ask: "How much can I get back?", stays: ["Tax ID", "Name", "Address"] },
  { doc: "Doctor's letter", ask: "What do these results mean?", stays: ["Name", "Date of birth", "Insurance number"] },
  { doc: "Bank statement", ask: "Where is my money going each month?", stays: ["Account number", "Name"] },
  { doc: "Rental contract", ask: "Is this deposit fair?", stays: ["Your address", "Landlord's name"] },
  { doc: "Job offer", ask: "Is this a good offer?", stays: ["Name", "Phone number", "Employer"] },
  { doc: "Visa letter", ask: "What do I need to do next?", stays: ["Passport number", "Date of birth"] },
];

export function UseCases() {
  return (
    <section className="section uses" aria-labelledby="uses-title">
      <div className="wrap">
        <Reveal className="section-head">
          <span className="label">Made for real life</span>
          <h2 id="uses-title" className="serif">
            For the papers you'd never paste into a normal AI app.
          </h2>
        </Reveal>

        <ul className="use-list">
          {cases.map((c, i) => (
            <li key={c.doc}>
              <Reveal className="use" delay={0.05 * i}>
                <div className="use-doc">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
                    <path d="M14 3v5h5M9 13h6M9 17h4" />
                  </svg>
                  <div>
                    <h3>{c.doc}</h3>
                    <p>“{c.ask}”</p>
                  </div>
                </div>
                <div className="use-stays">
                  <span className="use-k">Stays on your device</span>
                  <span className="use-chips">
                    {c.stays.map((s, j) => (
                      <motion.span
                        key={s}
                        className="use-chip"
                        initial={{ opacity: 0, y: 6 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "0px 0px -10% 0px" }}
                        transition={{ duration: 0.45, ease, delay: 0.25 + j * 0.12 }}
                      >
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.6"
                        >
                          <rect x="5" y="10.5" width="14" height="10" rx="2.2" />
                          <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
                        </svg>
                        {s}
                      </motion.span>
                    ))}
                  </span>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
