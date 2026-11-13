// The server answers in English with fixed messages (busy, errors, refusals, notices). The browser
// shows them in the interface language; unknown text is shown as sent. Filled by the i18n work.
import type { Lang } from "./i18n";

export function serverMessage(text: string, _lang: Lang): string {
  return text;
}
