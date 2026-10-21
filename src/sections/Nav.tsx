import { useEffect, useState } from "react";
import { BRAND } from "../brand";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="nav" data-scrolled={scrolled}>
      <div className="wrap nav-inner">
        <a className="wordmark" href="#top" aria-label={`${BRAND} home`}>
          <img src="/mark.svg" alt="" />
          {BRAND}
        </a>
        <nav className="nav-links" aria-label="Primary">
          <a href="#compare">Compare</a>
          <a href="#how">How it works</a>
          <a href="#features">Privacy</a>
          <a href="#faq">Questions</a>
          <a className="btn btn-primary" href="#compare">
            See the difference
          </a>
        </nav>
      </div>
    </header>
  );
}
