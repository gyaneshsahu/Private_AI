import { Reveal } from "../Reveal";

const facts = [
  {
    title: "It all goes to their computers",
    body: "Upload a tax receipt and everything on it goes too: your name, your tax number, your address, your bank details.",
  },
  {
    title: "It can be kept and reused",
    body: "Many AI apps save your chats and may use them to train their AI, unless you find the right setting to stop it.",
  },
  {
    title: "You can't see where it ends up",
    body: "Once your details leave your device, who keeps them, for how long and who else sees them is out of your hands.",
  },
];

export function Problem() {
  return (
    <section className="section problem" aria-labelledby="problem-title">
      <div className="wrap">
        <Reveal>
          <h2 id="problem-title" className="serif problem-statement">
            Normal AI apps are helpful. <span>They also see everything you share with them.</span>
          </h2>
        </Reveal>
        <ol className="facts">
          {facts.map((f, i) => (
            <li key={f.title}>
              <Reveal delay={0.08 * i}>
                <span className="fact-n">{String(i + 1).padStart(2, "0")}</span>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
