import { Reveal } from "../Reveal";
import { BRAND } from "../brand";

const faqs = [
  {
    q: "Can you read my chats?",
    a: `No. Your private details never leave your device, so there's nothing personal for us to read. The rest of your question is locked before it leaves and answered on secure servers that we can't look inside.`,
  },
  {
    q: "What counts as a private detail?",
    a: `Anything that points to you: your name, address, phone number, ID and tax numbers, passport number, bank details and similar. ${BRAND} spots them by itself.`,
  },
  {
    q: "Do I have to do anything special?",
    a: "No. Type your question and add files the way you normally would. The privacy part happens on its own, in the background.",
  },
  {
    q: "Will the answers be as good as other AI apps?",
    a: "That's the point of adding your details back on your device: the answer you read is complete and personal, even though your details never left.",
  },
  {
    q: "Is my data used to train AI?",
    a: "Never. Not by us, and not by anyone else.",
  },
  {
    q: "What happens to my chat history?",
    a: "If you save it, it stays on your device, locked with a password only you know. Prefer nothing saved at all? Use incognito mode or disappearing messages.",
  },
  {
    q: `When can I use ${BRAND}?`,
    a: "We're launching soon, starting with a small group of early users.",
  },
];

export function Faq() {
  return (
    <section className="section" id="faq" aria-labelledby="faq-title">
      <div className="wrap">
        <Reveal className="section-head">
          <span className="label">Questions</span>
          <h2 id="faq-title" className="serif">
            Straight answers.
          </h2>
        </Reveal>

        <div className="faq-list">
          {faqs.map((f) => (
            <details key={f.q} className="faq-item">
              <summary>
                {f.q}
                <span className="faq-plus" aria-hidden="true" />
              </summary>
              <p className="faq-answer">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
