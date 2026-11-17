// Whiteboard panel alone (tests/whiteboard-ui.test.ts). The latest board, the number of onChange
// calls and the board picture are on window for the test. ?sample starts with a synthetic board,
// ?dark switches the theme. The wrapper has the app's classes for an open whiteboard (chat-design.css).
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import type { Board } from "../../shared/whiteboard";
import { LangProvider } from "../../src/i18n";
import { WhiteboardPanel } from "../../src/Whiteboard";
import { boardPicture } from "../../src/whiteboard-render";
import "../../src/styles.css";
import "../../src/chat-design.css";

declare global {
  interface Window {
    board: Board;
    changes: number;
    boardClosed: boolean;
    picture(maxBytes: number): ReturnType<typeof boardPicture>;
  }
}

const params = new URLSearchParams(location.search);
const at = "2026-11-17T12:00:00.000Z";
const sample: Board = {
  changedAt: at,
  items: [
    { id: "room", kind: "box", colour: 0, x: 220, y: 140, w: 760, h: 520 },
    { id: "wall", kind: "pen", colour: 0, width: 5, points: [600, 140, 602, 300, 604, 400, 600, 520, 600, 660] },
    { id: "door", kind: "arrow", colour: 1, x1: 1300, y1: 300, x2: 1000, y2: 420 },
    { id: "t1", kind: "text", colour: 0, x: 260, y: 180, text: "Meeting room" },
    { id: "t2", kind: "text", colour: 2, x: 640, y: 180, text: "Kitchen & <desks>" },
    { id: "n1", kind: "note", x: 1100, y: 600, text: "Budget at most 4,000 euros for furniture" },
    { id: "g1", kind: "pen", colour: 3, width: 5, points: [260, 760, 320, 720, 380, 780, 440, 720, 500, 780] },
  ],
};
window.board = params.has("sample") ? sample : { items: [], changedAt: at };
window.changes = 0;
window.boardClosed = false;
window.picture = (maxBytes) => boardPicture(window.board, maxBytes);

function Fixture() {
  const [board, setBoard] = useState(window.board);
  return (
    <div className="chat-design side-open side-board" data-theme={params.has("dark") ? "dark" : "light"}>
      <WhiteboardPanel
        board={board}
        onChange={(next) => {
          window.board = next;
          window.changes++;
          setBoard(next);
        }}
        onClose={() => {
          window.boardClosed = true;
        }}
      />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <LangProvider>
    <Fixture />
  </LangProvider>,
);
