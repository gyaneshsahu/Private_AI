/**
 * Switches for features that run only on the device (docs/read-aloud-and-pdf-export-20261114.md).
 * Each is off unless the build sets its variable to "1", like VITE_GERMAN_UI. Build settings and
 * not /api/status fields: neither feature sends or receives anything, so the server has no part.
 */
const on = (name: string): boolean => {
  // Read in two steps: Vite and Vitest only fill the plain `import.meta.env` form.
  const env: ImportMetaEnv | undefined = import.meta.env;
  return env?.[name] === "1";
};
export const readAloudEnabled = () => on("VITE_READ_ALOUD");
export const pdfExportEnabled = () => on("VITE_PDF_EXPORT");
/** Memory across chats (docs/memory-20261114.md): kept in the vault on the device, no server part. */
export const memoryEnabled = () => on("VITE_MEMORY");
/** Canvas (docs/canvas-20261114.md): an editable document beside the chat. Nothing new on the server. */
export const canvasEnabled = () => on("VITE_CANVAS");
/** Live voice conversation (docs/live-voice-20261114.md): also needs voice input and read aloud. */
export const liveVoiceEnabled = () => on("VITE_LIVE_VOICE");
/** Whiteboard next to the chat and the "In this chat" panel (owner, 17 November). */
export const whiteboardEnabled = () => on("VITE_WHITEBOARD");
/**
 * Project instructions and project files (docs/projects-20261114.md): kept in the vault on the
 * device, no server part. Grouping chats by project works without this switch.
 */
export const projectSpacesEnabled = () => on("VITE_PROJECTS");
/**
 * Scheduled tasks (docs/scheduled-20261115.md): the Scheduled screen, Manual tasks in the vault,
 * the "Due now" strip and the chat detection. Auto tasks also need the server's switch.
 */
export const scheduledEnabled = () => on("VITE_SCHEDULED");
/** Answer design (docs/answer-design-20261125.md): key figures, step markers, tickable lists, table tools, clearer headings. */
export const answerDesignEnabled = () => on("VITE_ANSWER_DESIGN");
/** Activity (docs/activity-states-20261126.md): the live line, "Thought for N s", placeholders and skeleton rows. */
export const activityEnabled = () => on("VITE_ACTIVITY");
/** Error states (docs/error-states-20261126.md): one friendly line with Retry where an answer or image failed. */
export const errorStatesEnabled = () => on("VITE_ERROR_STATES");
/** Answer blocks (docs/answer-blocks-20261126.md): notes, steps, diagrams, quick checks and tabs in an answer, and the rules that tell the model when. */
export const answerBlocksEnabled = () => on("VITE_ANSWER_BLOCKS");
/** Report card (docs/report-card-20261125.md): a deep research answer is a card in the chat and opens in the side panel. */
export const reportCardEnabled = () => on("VITE_REPORT_CARD");
