// What someone sees who opens a shared link (docs/sharing-20261125.md): "/s/<id>#<key>". No
// sign-in. The page fetches the ciphertext for <id> and opens it here with <key>, which never
// leaves this browser. Shown as plain text and pictures: nothing in a snapshot can run.
import { useEffect, useState } from "react";
import type { ShareSnapshot } from "../../shared/share-links";
import { BrandLockup } from "../CometMark";
import { useLang, useText } from "../i18n";
import { shareText } from "../text/share";
import { openSnapshot } from "./crypto";
import "./share.css";

type State = { at: "loading" } | { at: "gone" } | { at: "broken" } | { at: "open"; snapshot: ShareSnapshot; expiresAt: string; imageUrl?: string };

export function ShareViewer() {
  const t = useText(shareText);
  const { lang } = useLang();
  const [state, setState] = useState<State>({ at: "loading" });
  useEffect(() => {
    let live = true;
    let made: string | undefined;
    const id = location.pathname.split("/")[2] ?? "";
    const key = location.hash.slice(1);
    void (async () => {
      if (!key) return setState({ at: "broken" });
      const response = await fetch(`/s/${encodeURIComponent(id)}/data`, { referrerPolicy: "no-referrer" }).catch(() => undefined);
      if (!live) return;
      if (!response?.ok) return setState({ at: "gone" });
      const { cipher, expiresAt } = (await response.json()) as { cipher: string; expiresAt: string };
      try {
        const snapshot = await openSnapshot(cipher, key);
        if (snapshot.image) {
          const bytes = Uint8Array.from(atob(snapshot.image.data), (c) => c.charCodeAt(0));
          made = URL.createObjectURL(new Blob([bytes], { type: snapshot.image.type }));
        }
        if (live) setState({ at: "open", snapshot, expiresAt, imageUrl: made });
      } catch {
        if (live) setState({ at: "broken" });
      }
    })();
    return () => {
      live = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, []);
  useEffect(() => {
    document.title = state.at === "open" ? `${state.snapshot.title} · CometRow` : t.viewerTitle;
  }, [state, t]);
  const date = (iso: string) => new Date(iso).toLocaleDateString(lang === "de" ? "de-DE" : "en-GB", { day: "numeric", month: "long", year: "numeric" });
  return (
    <main className="share-viewer chat-design">
      <header>
        <BrandLockup />
        <a className="share-viewer-open" href="/">
          {t.viewerOpen}
        </a>
      </header>
      {state.at === "loading" && <p role="status">{t.viewerLoading}</p>}
      {state.at === "gone" && <p role="status">{t.viewerGone}</p>}
      {state.at === "broken" && <p role="status">{t.viewerBroken}</p>}
      {state.at === "open" && (
        <>
          <h1>{state.snapshot.title || t.viewerTitle}</h1>
          <p className="share-viewer-note">
            {t.viewerNote} {t.viewerEnds(date(state.expiresAt))}
          </p>
          {state.imageUrl && <img className="share-viewer-image" src={state.imageUrl} alt={t.viewerImageAlt(state.snapshot.title)} />}
          {state.snapshot.turns?.map((turn, index) => (
            <article key={index} className={turn.role}>
              <h2>{turn.role === "user" ? t.viewerQuestion : t.viewerAnswer}</h2>
              <p>{turn.text}</p>
            </article>
          ))}
        </>
      )}
    </main>
  );
}
