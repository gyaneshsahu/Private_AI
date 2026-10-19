import React, { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { AccountPreview } from "./AccountPreview";
import { isAccountPreview } from "../shared/account-design";
import "./styles.css";
const AccountLab = lazy(() => import("./AccountLab"));
const pageUrl = new URL(window.location.href);
const lab =
  ["http:", "https:"].includes(pageUrl.protocol) &&
  pageUrl.hostname === "localhost" &&
  pageUrl.searchParams.get("account-lab") === "1";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {lab || pageUrl.pathname === "/account" ? (
      <Suspense fallback={<p>Loading account…</p>}>
        <AccountLab synthetic={lab} />
      </Suspense>
    ) : isAccountPreview(new URL(window.location.href)) ? (
      <AccountPreview />
    ) : (
      <App />
    )}
  </React.StrictMode>,
);
