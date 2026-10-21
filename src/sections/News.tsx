import { Reveal } from "../Reveal";
import { BRAND } from "../brand";

// Summaries of public reporting, in our own words, each linked to its source.
const stories = [
  {
    date: "March 2023",
    who: "ChatGPT",
    title: "A bug showed people other users' chat titles",
    body: "OpenAI said the same bug may have exposed names, email and payment addresses of 1,2 % of Plus subscribers active in a nine-hour window.",
    source: "OpenAI",
    url: "https://openai.com/index/march-20-chatgpt-outage/",
    tone: "coral",
  },
  {
    date: "May 2023",
    who: "Samsung",
    title: "Engineers pasted secret source code into ChatGPT",
    body: "Samsung then restricted generative AI tools on company devices, worried the data sat on outside servers it couldn't delete.",
    source: "CSO Online",
    url: "https://www.csoonline.com/article/3695170/samsung-bans-staff-ai-use-over-data-leak-concerns.html",
    tone: "violet",
  },
  {
    date: "December 2024",
    who: "OpenAI",
    title: "Italy fined OpenAI 15 million € over personal data",
    body: "The privacy regulator found ChatGPT was trained on people's data without a proper legal basis. OpenAI said it would appeal.",
    source: "AP / ABC News",
    url: "https://abcnews.go.com/Business/wireStory/italys-privacy-watchdog-fines-openai-chatgpts-violations-collecting-116987605",
    tone: "sky",
  },
  {
    date: "January 2025",
    who: "DeepSeek",
    title: "An open database held over a million lines of logs",
    body: "Security researchers found it unprotected on the internet, including people's chat history. DeepSeek closed it after being told.",
    source: "Wiz Research",
    url: "https://www.wiz.io/blog/wiz-research-uncovers-exposed-deepseek-database-leak",
    tone: "pink",
  },
  {
    date: "July 2025",
    who: "ChatGPT",
    title: "Shared chats started showing up on Google",
    body: "Thousands of conversations, some with names and locations, became searchable. OpenAI removed the option.",
    source: "Search Engine Journal",
    url: "https://www.searchenginejournal.com/openai-is-pulling-shared-chatgpt-chats-from-google-search/552671/",
    tone: "amber",
  },
  {
    date: "August 2025",
    who: "Grok",
    title: "Over 370.000 conversations were indexed by search engines",
    body: "Shared links were left open to Google. Some chats reportedly contained names, passwords and medical details.",
    source: "Fortune",
    url: "https://fortune.com/2025/08/22/xai-grok-chats-public-on-google-search-elon-musk/",
    tone: "indigo",
  },
];

export function News() {
  return (
    <section className="section news" id="news" aria-labelledby="news-title">
      <div className="wrap">
        <div className="news-head">
          <Reveal className="section-head">
            <span className="label">Why this matters</span>
            <h2 id="news-title" className="serif">
              This isn't a what‑if. <span className="muted">It keeps happening.</span>
            </h2>
            <p>When your words live on someone else's servers, a bug, a setting or a bad day is all it takes.</p>
          </Reveal>
          <Reveal className="news-stat" delay={0.1}>
            <strong>22 %</strong>
            <span>
              of what employees paste into AI tools contains personal or payment data.
              <a
                href="https://www.theregister.com/2025/10/07/gen_ai_shadow_it_secrets/"
                target="_blank"
                rel="noreferrer"
              >
                LayerX, 2025
              </a>
            </span>
          </Reveal>
        </div>

        <ul className="news-grid">
          {stories.map((s, i) => (
            <li key={s.url}>
              <Reveal className="story" delay={0.05 * (i % 3)}>
                <a href={s.url} target="_blank" rel="noreferrer" data-tone={s.tone}>
                  <span className="story-band" aria-hidden="true" />
                  <span className="story-meta">
                    <span className="story-who">{s.who}</span>
                    <span>{s.date}</span>
                  </span>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                  <span className="story-source">
                    Read on {s.source} <span aria-hidden="true">↗</span>
                  </span>
                </a>
              </Reveal>
            </li>
          ))}
        </ul>

        <p className="news-foot">
          Short summaries of public reporting. {BRAND} isn't affiliated with any company named here.
        </p>
      </div>
    </section>
  );
}
