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
  copy: "M8 8h13v13H8ZM16 4V2H2v14h2",
  edit: "m15 3 6 6-12 12H3v-6L15 3ZM12 6l6 6",
  send: "m3 11 18-8-8 18-2-8-8-2ZM11 13 21 3",
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
