import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { AccountPreview } from "./AccountPreview";
import { isAccountPreview } from "../shared/account-design";
import "./styles.css";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {isAccountPreview(new URL(window.location.href)) ? (
      <AccountPreview />
    ) : (
      <App />
    )}
  </React.StrictMode>,
);
