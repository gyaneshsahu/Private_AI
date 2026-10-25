import { AccountTheme } from "./AccountTheme";
import React, { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { AccountPreview } from "./AccountPreview";
import { isAccountPreview } from "../shared/account-design";
import "./styles.css";
import "./chat-design.css";
const AccountLab = lazy(() => import("./AccountLab"));
const pageUrl = new URL(window.location.href);
const lab =
  ["http:", "https:"].includes(pageUrl.protocol) &&
  pageUrl.hostname === "localhost" &&
  pageUrl.searchParams.get("account-lab") === "1";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {lab || pageUrl.pathname === "/account" ? (
      <AccountTheme>
        <Suspense
          fallback={
            <main
              className="account-preview account-login-page"
              aria-busy="true"
            >
              <span className="account-preview-brand">
                Comet<span>Row</span>
              </span>
              <section className="account-preview-card account-entry">
                <p role="status">Loading account…</p>
              </section>
            </main>
          }
        >
          <AccountLab synthetic={lab} />
        </Suspense>
      </AccountTheme>
    ) : isAccountPreview(new URL(window.location.href)) ? (
      <AccountTheme>
        <AccountPreview />
      </AccountTheme>
    ) : (
      <App />
    )}
  </React.StrictMode>,
);
