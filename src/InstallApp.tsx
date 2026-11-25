// "Install CometRow" in Settings (docs/pwa-20261125.md): the home-screen app. Android and desktop
// Chrome offer an install the page may start; on an iPhone only the user can do it, from Safari's
// share menu, so there the row says how. Nothing is shown once the app runs from the home screen,
// or in a browser that can do neither.
import { useState, useSyncExternalStore } from "react";
import { installAppEnabled } from "./device-features";
import { Icon } from "./Icon";
import { useText } from "./i18n";
import { installText } from "./text/install";

type InstallPrompt = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

// The browser offers the install once, early, often before Settings is ever opened: kept here until asked for.
let offered: InstallPrompt | undefined;
const waiting = new Set<() => void>();
// Only while the switch is on: otherwise the browser's own offer is left exactly as it is.
if (typeof window !== "undefined" && installAppEnabled()) {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault(); // no banner of the browser's own; the user starts it from Settings
    offered = event as InstallPrompt;
    waiting.forEach((tell) => tell());
  });
  window.addEventListener("appinstalled", () => {
    offered = undefined;
    waiting.forEach((tell) => tell());
  });
}

/** Opened from the home screen (its own window, no browser bars). */
export const runsInstalled = () =>
  typeof window !== "undefined" && (matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true);
/** An iPhone or iPad (an iPad says "Macintosh" but has a touch screen), where only Safari's share menu installs. */
export const isAppleTouch = () =>
  typeof navigator !== "undefined" && (/iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1));

export function InstallApp() {
  const t = useText(installText);
  const [note, setNote] = useState("");
  // The offer can arrive while Settings is still loading: a store subscription cannot miss it, an effect can.
  const offer = useSyncExternalStore(
    (tell) => (waiting.add(tell), () => void waiting.delete(tell)),
    () => offered,
  );
  if (runsInstalled()) return null;
  const apple = isAppleTouch();
  if (!offer && !apple && !note) return null; // the "added" line stays after the one offer is used
  return (
    <section className="install-app" aria-labelledby="install-app-heading">
      <h4 id="install-app-heading">{t.heading}</h4>
      <p className="muted">{t.intro}</p>
      {offer ? (
        <button
          type="button"
          onClick={async () => {
            await offer.prompt();
            const { outcome } = await offer.userChoice;
            offered = undefined; // an offer can be used once
            setNote(outcome === "accepted" ? t.installed : "");
            waiting.forEach((tell) => tell());
          }}
        >
          <Icon name="download" />
          {t.install}
        </button>
      ) : (
        apple && <p>{t.appleSteps}</p>
      )}
      <p role="status">{note}</p>
    </section>
  );
}
