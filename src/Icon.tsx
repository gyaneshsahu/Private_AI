const paths = {
  plus: "M12 5v14M5 12h14",
  chat: "M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2V11.5A8.5 8.5 0 0 1 10.5 3h2a8.5 8.5 0 0 1 8.5 8.5Z",
  search: "m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
  folder:
    "M3 7V5a1 1 0 0 1 1-1h5l3 3h8a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7Z",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  sidebar: "M3 4h18v16H3ZM9 4v16",
  close: "m6 6 12 12M6 18 18 6",
  pin: "m9 3 6 0-1 6 4 4v2H6v-2l4-4-1-6ZM12 15v6",
  archive: "M3 3h18v5H3ZM5 8v13h14V8M10 12h4",
  user: "M20 21v-2a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v2M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  settings:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1 1-3Z",
  help: "M9 8a3 3 0 0 1 6 0c0 2-3 2-3 5M12 17h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
  logout: "M9 4H3v16h6M14 7l5 5-5 5M8 12h13",
  shield: "m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6l9-4ZM8 12l3 3 5-6",
  usage: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  sun: "M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1 1M18 18l1 1M5 19l1-1M18 6l1-1M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z",
  file: "M14 2H4v20h16V8l-6-6ZM14 2v6h6M8 13h8M8 17h6",
  globe:
    "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM2 12h20M12 2c6 6 6 14 0 20-6-6-6-14 0-20Z",
  mic: "M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0V5ZM5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8",
  voice: "M4 9v6M8 5v14M12 2v20M16 6v12M20 9v6",
  camera: "M3 6h4l2-3h6l2 3h4v15H3V6ZM16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  image: "M3 3h18v18H3ZM3 17l6-6 4 4 3-3 5 5M8 7h.01",
  share: "M12 15V2M7 7l5-5 5 5M5 11H3v11h18V11h-2",
  download: "M12 2v13M7 10l5 5 5-5M3 17v4h18v-4",
  copy: "M8 8h13v13H8ZM16 4V2H2v14h2",
  edit: "m15 3 6 6-12 12H3v-6L15 3ZM12 6l6 6",
  send: "m3 11 18-8-8 18-2-8-8-2ZM11 13 21 3",
  "arrow-up": "M12 19V5M6 11l6-6 6 6",
  stop: "M8 8h8v8H8Z",
  // 17 November: one icon per meaning (owner: no duplicate icons for different actions).
  layers: "m12 3 9 4.5-9 4.5-9-4.5L12 3ZM3 12l9 4.5 9-4.5M3 16.5 12 21l9-4.5",
  book: "M3 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H3ZM21 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7Z",
  compass: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM16 8l-2.5 5.5L8 16l2.5-5.5L16 8Z",
  files: "M15 2H8a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7l-5-5ZM15 2v5h5M3 7v13a2 2 0 0 0 2 2h11",
  incognito: "M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 4.2A10 10 0 0 1 22 12a17 17 0 0 1-3 3.9M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9 9 0 0 0 5.4-1.6",
  sliders: "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6",
  drive: "M22 12H2M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6L5.5 5ZM6 16h.01M10 16h.01",
  sparkle: "M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3ZM19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8Z",
  keyboard: "M2 6h20v12H2ZM6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10",
  clock: "M12 7v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
  check: "m5 12 5 5 9-10",
  retry: "M20 12a8 8 0 1 1-2.3-5.7L20 8.6M20 3v5.6h-5.6",
  speaker: "M11 5 6 9H3v6h3l5 4V5ZM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13",
  pause: "M9 5v14M15 5v14",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  // Whiteboard (17 November): its tools, undo, the menu row, and the right-hand panel button.
  pen: "M4 20c4-1 6-3 9-7l5-5-3-3-5 5c-4 3-6 5-6 10Z",
  eraser: "M16 4l4 4-10 10H6v-4L16 4ZM3 21h18",
  square: "M6 6h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z",
  "arrow-tool": "M5 19 19 5M11 5h8v8",
  "text-tool": "M5 7V4h14v3M12 4v16M9 20h6",
  note: "M5 4h14v11l-5 5H5ZM14 20v-5h5",
  undo: "M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3",
  whiteboard: "M3 4h18v13H3ZM8 21l4-4 4 4M7 13l3-3 2 2 4-4",
  panel: "M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM15 4v16",
  open: "M14 4h6v6M20 4l-9 9M18 14v6H4V6h6",
} as const;
export type IconName = keyof typeof paths;
export function Icon({ name }: { name: IconName }) {
  return (
    <svg
      className="ui-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[name]} />
    </svg>
  );
}
