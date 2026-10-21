import { Reveal } from "../Reveal";
import { BRAND, CONTACT_EMAIL } from "../brand";

export function Closing() {
  const year = new Date().getFullYear();

  return (
    <footer className="night">
      <section className="section closing" aria-labelledby="closing-title">
        <div className="wrap">
          <Reveal>
            <h2 id="closing-title" className="serif">
              Ask anything. <em>Keep your life to yourself.</em>
            </h2>
            <p>
              {BRAND} is launching soon, starting with a small group of early users. Smart answers, and your private
              details never leave your device.
            </p>
            {CONTACT_EMAIL ? (
              <a
                className="btn btn-primary"
                href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`${BRAND} early access`)}`}
              >
                Ask about early access{" "}
                <span className="arrow" aria-hidden="true">
                  →
                </span>
              </a>
            ) : (
              <a className="btn btn-primary" href="#compare">
                See the difference again{" "}
                <span className="arrow" aria-hidden="true">
                  →
                </span>
              </a>
            )}
          </Reveal>
        </div>
      </section>

      <div className="footer">
        <div className="wrap footer-inner">
          <a className="wordmark" href="#top">
            <img src="/mark.svg" alt="" />
            {BRAND}
          </a>
          <p className="footer-note">This site uses no cookies, no analytics and no third-party requests.</p>
          <p>
            © {year} {BRAND} · Built in Germany
          </p>
        </div>
      </div>
    </footer>
  );
}
