// Secure and Secure Max screens on their own (tests/modes-ui.test.ts): the lock switch, the switch
// when Secure Max is not offered, the badges, the Settings choice with and without Secure Max, and
// the long Secure text. ?theme=dark shows the dark theme. Nothing is sent anywhere.
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import type { Mode } from "../../shared/modes";
import { LangProvider, useText } from "../../src/i18n";
import { ModeBadge } from "../../src/ModeBadge";
import { ModeDefaultSetting } from "../../src/ModeDefaultSetting";
import { ModeToggle } from "../../src/ModeToggle";
import { modesText } from "../../src/text/modes";
import "../../src/styles.css";
import "../../src/chat-design.css";

function Page() {
  const t = useText(modesText);
  const [mode, setMode] = useState<Mode>("secure");
  const [chosen, setChosen] = useState<Mode>("secure");
  const [nested, setNested] = useState<Mode>("secure");
  const [submits, setSubmits] = useState(0);
  return (
    <div className="chat-design" data-theme={new URLSearchParams(location.search).get("theme") ?? undefined} style={{ padding: 16 }}>
      <section id="toggle">
        <ModeToggle mode={mode} onChange={setMode} maxAvailable />
      </section>
      <section id="unavailable">
        <ModeToggle mode="secure" onChange={setMode} maxAvailable={false} />
      </section>
      <section id="disabled">
        <ModeToggle mode="max" onChange={setMode} maxAvailable disabled />
      </section>
      <ul id="badges">
        <li>
          Alpha <ModeBadge mode="max" />
        </li>
        <li>
          Beta <ModeBadge mode="max" locked />
        </li>
        <li>
          Gamma <ModeBadge mode="secure" />
        </li>
      </ul>
      <section id="settings">
        <ModeDefaultSetting value={chosen} onChange={setChosen} maxAvailable />
      </section>
      <section id="settings-secure-only">
        <ModeDefaultSetting value="secure" onChange={setChosen} maxAvailable={false} />
      </section>
      <p id="secure-long">{t.secureLong}</p>
      {/* As in the app: Settings is a modal dialog, New project a form inside one. */}
      <button id="open-nested" type="button" onClick={() => (document.getElementById("nested") as HTMLDialogElement).showModal()}>
        Nested
      </button>
      <dialog id="nested" className="settings-dialog">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setSubmits((n) => n + 1);
          }}
        >
          <h2>Nested</h2>
          <input aria-label="Name" defaultValue="Alpha" />
          <ModeDefaultSetting value={nested} onChange={setNested} maxAvailable />
          <output id="submits">{submits}</output>
          <button>Save</button>
        </form>
      </dialog>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <LangProvider>
    <Page />
  </LangProvider>,
);
