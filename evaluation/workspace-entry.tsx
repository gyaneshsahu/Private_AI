import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "../src/App";
import "../src/styles.css";
createRoot(document.getElementById("root")!).render(
  <>
    <p role="note">
      ISOLATED PUBLIC/SYNTHETIC EVALUATION — not a qualified private-chat
      release.
    </p>
    <App />
  </>,
);
