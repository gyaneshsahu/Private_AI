import type { Mode } from "../shared/modes";
import { useText } from "./i18n";
import { modesText } from "./text/modes";

/** The lock drawn for Secure Max. `solid` fills the body: a shape difference, not a colour. */
export function LockIcon({ solid }: { solid?: boolean }) {
  return (
    <svg
      className="mode-lock"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      <rect x="5" y="11" width="14" height="10" rx="2" fill={solid ? "currentColor" : "none"} />
    </svg>
  );
}

/**
 * The small lock on a Secure Max chat or project in a list. Secure shows nothing. `locked` (the
 * Secure Max vault is locked on this device) fills the lock and changes the accessible name.
 */
export function ModeBadge({ mode, locked }: { mode: Mode; locked?: boolean }) {
  const t = useText(modesText);
  if (mode !== "max") return null;
  const name = locked ? t.maxLocked : t.maxLabel;
  return (
    <span className="mode-badge" role="img" aria-label={name} title={name}>
      <LockIcon solid={locked} />
    </span>
  );
}
