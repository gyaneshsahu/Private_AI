// stub: replaced at merge. The screens agent owns this file (header with the lock, colour band,
// lock controls, first-time explanation). Same name and props as agreed on 16 November.
import type { ReactNode } from "react";
import { useText } from "./i18n";
import { LockIcon } from "./ModeBadge";
import { modesText } from "./text/modes";
import { secureStoreText } from "./text/secure-store";

export function SecureMaxSection({ locked, onUnlock, onLock, children }: { locked: boolean; onUnlock: () => void; onLock: () => void; children: ReactNode }) {
  const t = useText(modesText);
  const s = useText(secureStoreText);
  return (
    <section className="secure-max-section" aria-label={t.maxLabel}>
      <div className="section-heading">
        <h2>
          <LockIcon solid={locked} /> {t.maxLabel}
        </h2>
        <button className="text-button" onClick={locked ? onUnlock : onLock}>
          {locked ? s.unlockMax : s.lockNow}
        </button>
      </div>
      {locked ? <p className="sidebar-hint">{s.maxLocked}</p> : children}
    </section>
  );
}
