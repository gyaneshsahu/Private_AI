import { BrandLockup } from "./CometMark";
import { AccountTheme } from "./AccountTheme";
import React, { Suspense } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { LangProvider, useText } from "./i18n";
import { themeText } from "./text/account";
import { AccountPreview } from "./AccountPreview";
import { preloadAnswer } from "./ChatMessage";
import { importFresh, LoadBoundary, loadInference, retryLazy } from "./LoadBoundary";
import { isAccountPreview } from "../shared/account-design";
import "./focus-origin"; // starts remembering focus before any on-demand dialog loads
import "./styles.css";
import "./chat-design.css";
import "./InstallApp"; // hears the browser's install offer from the first moment (docs/pwa-20261125.md)
const AccountLab = retryLazy(() => importFresh(() => import("./AccountLab")));
const LoadingAccount = () => <p role="status">{useText(themeText).loadingAccount}</p>;
const pageUrl = new URL(window.location.href);
const lab =
  ["http:", "https:"].includes(pageUrl.protocol) &&
  pageUrl.hostname === "localhost" &&
  pageUrl.searchParams.get("account-lab") === "1";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <LangProvider>
    {lab || pageUrl.pathname === "/account" ? (
      <AccountTheme>
        <Suspense
          fallback={
            <main
              className="account-preview account-login-page"
              aria-busy="true"
            >
              <span className="account-preview-brand">
                <BrandLockup />
              </span>
              <section className="account-preview-card account-entry">
                <LoadingAccount />
              </section>
            </main>
          }
        >
          <LoadBoundary>
            <AccountLab synthetic={lab} />
          </LoadBoundary>
        </Suspense>
      </AccountTheme>
    ) : isAccountPreview(new URL(window.location.href)) ? (
      <AccountTheme>
        <AccountPreview />
      </AccountTheme>
    ) : (
      <App />
    )}
    </LangProvider>
  </React.StrictMode>,
);

// Once the chat is up and idle, fetch the parts the first answer needs, so a connection lost later
// does not leave the app unable to show answers. Not while offline: a failed fetch is kept.
if (!lab && pageUrl.pathname !== "/account" && !isAccountPreview(pageUrl) && navigator.onLine) {
  const idle = window.requestIdleCallback ?? ((run: () => void) => setTimeout(run, 2000));
  idle(() => {
    preloadAnswer();
    loadInference().catch(() => {});
    // Settings, the most used part that loads on demand (SS-13): fetched now so it opens at once, also offline later.
    import("./SettingsBody").catch(() => {});
  });
}
