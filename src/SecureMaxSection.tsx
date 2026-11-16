import { useEffect, useRef, useState, type ReactNode } from "react";
import { useText } from "./i18n";
import { LockIcon } from "./ModeBadge";
import { SecureMaxDialog, secureMaxConfirmed } from "./SecureMaxDialog";
import { modesText } from "./text/modes";

/** True until the explanation was confirmed once in this browser. */
export const shouldShowSecureMaxIntro = (): boolean => !secureMaxConfirmed();

/**
 * The entry in the normal sidebar that opens the Secure Max section. The lock is filled while
 * Secure Max is locked on this device, and the name says so.
 */
export function SecureMaxSidebarEntry({ locked, onOpen, selected }: { locked: boolean; onOpen: () => void; selected?: boolean }) {
  const t = useText(modesText);
  return (
    <button type="button" className="nav-item secure-max-entry" aria-current={selected ? "page" : undefined} aria-label={locked ? t.maxLocked : t.maxLabel} onClick={onOpen}>
      <LockIcon solid={locked} />
      <span>{t.maxLabel}</span>
    </button>
  );
}

/**
 * The shell of the Secure Max section in the sidebar: header with the lock, a band along the
 * section, the two "new" buttons and "Lock now" while unlocked, or "Secure Max is locked" with one
 * button while locked. The first time it opens, the explanation is shown first; Cancel hands
 * back to the normal sidebar. `children` are the section's own lists (wired by the lead).
 */
export function SecureMaxSection({
  locked,
  onUnlock,
  onLock,
  onNewChat,
  onNewProject,
  onCancelIntro,
  children,
}: {
  locked: boolean;
  onUnlock: () => void;
  onLock: () => void;
  onNewChat: () => void;
  /** Absent when Projects is switched off: no button then. */
  onNewProject?: () => void;
  onCancelIntro: () => void;
  children: ReactNode;
}) {
  const t = useText(modesText);
  const [intro, setIntro] = useState(shouldShowSecureMaxIntro);
  // Lock now, Unlock and the confirmed intro remove the control that had the focus: move it to the one primary button.
  const primary = useRef<HTMLButtonElement>(null);
  const mounted = useRef(false);
  useEffect(() => {
    if (mounted.current && !intro) primary.current?.focus();
    mounted.current = true;
  }, [locked, intro]);
  return (
    <section className="secure-max-section" aria-labelledby="secure-max-heading">
      <h2 id="secure-max-heading" className="secure-max-heading">
        <LockIcon solid={locked} />
        <span>{t.maxLabel}</span>
      </h2>
      <p className="secure-max-line">{t.maxLine}</p>
      {locked ? (
        <div className="secure-max-locked">
          <p>{t.maxIsLocked}</p>
          <button ref={primary} type="button" className="primary" onClick={onUnlock}>
            {t.maxUnlock}
          </button>
        </div>
      ) : (
        <>
          <div className="secure-max-actions">
            <button ref={primary} type="button" className="primary" onClick={onNewChat}>
              {t.maxNewChat}
            </button>
            {onNewProject && (
              <button type="button" onClick={onNewProject}>
                {t.maxNewProject}
              </button>
            )}
            <button type="button" onClick={onLock}>
              {t.maxLockNow}
            </button>
          </div>
          {children}
        </>
      )}
      {intro && (
        <SecureMaxDialog
          subject="section"
          onConfirm={() => setIntro(false)}
          onCancel={() => {
            onCancelIntro();
            // The entry that opened the section is mounted again by the parent; give it the focus back.
            requestAnimationFrame(() => document.querySelector<HTMLElement>(".secure-max-entry")?.focus());
          }}
        />
      )}
    </section>
  );
}
