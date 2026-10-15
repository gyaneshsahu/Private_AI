import React from "react";
import { createRoot } from "react-dom/client";
import { Answer } from "../../src/Answer";
createRoot(document.getElementById("root")!).render(
  React.createElement(Answer, {
    text: "“The ferry may resume in November.” [notice-02]",
    sources: [
      {
        id: "notice-01",
        title: "Proposal",
        url: "https://example.com/proposal",
        text: "The ferry may resume in November.",
      },
      {
        id: "notice-02",
        title: "Inspection",
        url: "https://example.com/inspection",
        text: "Inspection remains unfinished.",
      },
    ],
    open: (source) => {
      document.getElementById("opened")!.textContent = source.text;
    },
  }),
);
