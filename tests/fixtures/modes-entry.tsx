// Secure Max screens on their own (tests/modes-ui.test.ts): the sidebar entry, the section
// (unlocked, then locked through "Lock now"), the badges, the two settings and the long Secure
// text. ?theme=dark shows the dark theme; ?locked=1 starts locked. Nothing is sent anywhere.
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { LangProvider, useText } from "../../src/i18n";
import { ModeBadge } from "../../src/ModeBadge";
import { SecureMaxResetSetting } from "../../src/SecureMaxResetSetting";
import { SecureMaxSection, SecureMaxSidebarEntry } from "../../src/SecureMaxSection";
import { SecureMaxStartSetting } from "../../src/SecureMaxStartSetting";
import { modesText } from "../../src/text/modes";
import "../../src/styles.css";
import "../../src/chat-design.css";

const params = new URLSearchParams(location.search);
function Page() {
  const t = useText(modesText);
  const [open, setOpen] = useState(false);
  const [locked, setLocked] = useState(params.get("locked") === "1");
  const [log, setLog] = useState<string[]>([]);
  const [start, setStart] = useState(false);
  const note = (what: string) => setLog((l) => [...l, what]);
  return (
    <div className="chat-design" data-theme={params.get("theme") ?? undefined} style={{ padding: 16 }}>
      <aside id="side" style={{ width: "min(260px, 100%)" }}>
        {open ? (
          <SecureMaxSection
            locked={locked}
            onUnlock={() => {
              note("unlock");
              setLocked(false);
            }}
            onLock={() => {
              note("lock");
              setLocked(true);
            }}
            onNewChat={() => note("new-chat")}
            onNewProject={() => note("new-project")}
            onCancelIntro={() => {
              note("cancel-intro");
              setOpen(false);
            }}
          >
            <ul id="max-list">
              <li>
                Alpha <ModeBadge mode="max" />
              </li>
            </ul>
          </SecureMaxSection>
        ) : (
          <SecureMaxSidebarEntry locked={locked} onOpen={() => setOpen(true)} />
        )}
      </aside>
      <ul id="badges">
        <li>
          Beta <ModeBadge mode="max" locked />
        </li>
        <li>
          Gamma <ModeBadge mode="secure" />
        </li>
      </ul>
      <section id="settings" className="panel">
        <SecureMaxStartSetting value={start} onChange={setStart} />
        <SecureMaxResetSetting
          recentSignIn={params.get("stale") !== "1"}
          onReset={async () => {
            if (params.get("fail") === "1") throw Error("synthetic");
            note("reset");
          }}
        />
      </section>
      <p id="secure-line">{t.secureLine}</p>
      <p id="secure-long">{t.secureLong}</p>
      <span id="log">{log.join(",")}</span>
      <span id="start">{String(start)}</span>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <LangProvider>
    <Page />
  </LangProvider>,
);
