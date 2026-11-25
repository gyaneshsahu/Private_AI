// Feature-use counting (docs/analytics-20261125.md): one request that says a fixed name and
// nothing else. Off unless the server says analytics is on (App sets the token then), so with
// the switch off no request is ever made. A failure is ignored: counting must never get in the way.
import type { UseEvent } from "../../shared/analytics";

let token: string | undefined;
/** The session's request token while analytics is on; undefined turns counting off. */
export const setTracking = (csrf: string | undefined) => void (token = csrf);

export function track(name: UseEvent) {
  if (!token) return;
  void fetch("/api/analytics/event", {
    method: "POST",
    keepalive: true,
    headers: { "Content-Type": "application/json", "X-PrivateAI-CSRF": token },
    body: JSON.stringify({ name }),
  }).catch(() => {});
}
