import { useEffect, useState, useSyncExternalStore } from "react";
import { languageOf } from "./arithmetic/numbers";
import { readAloudEnabled } from "./device-features";
import { useLang, useText } from "./i18n";
import { chooseVoice, loadVoices, pageReader, speechChunks, spokenText } from "./read-aloud";
import { deviceText } from "./text/device-features";

const idle = () => () => {};
/** "Read aloud" on one answer, with pause while it reads. Renders nothing while the feature is off. */
export function ReadAloudButton({ id, disabled }: { id: string; disabled: boolean }) {
  const t = useText(deviceText);
  const { lang } = useLang();
  const reader = readAloudEnabled() ? pageReader() : undefined;
  const state = useSyncExternalStore(reader?.subscribe ?? idle, () => reader?.state());
  const [refusal, setRefusal] = useState("");
  const active = state?.id === id;
  useEffect(
    () => () => {
      if (reader?.state()?.id === id) reader.stop();
    },
    [reader, id],
  );
  if (!reader) return null;
  return (
    <>
      <button
        disabled={disabled}
        aria-pressed={active}
        onClick={async (event) => {
          if (active) return reader.stop();
          setRefusal("");
          // The rendered answer: speech follows what the screen shows.
          const shown = event.currentTarget.closest("article")?.querySelector(".message-text");
          if (!shown) return;
          const answerLang = languageOf(shown.textContent ?? "") ?? lang;
          const voice = chooseVoice(await loadVoices(speechSynthesis), answerLang);
          if (voice === "none") return setRefusal(t.noVoice(answerLang));
          if (voice === "unverifiable") return setRefusal(t.voiceUnknown);
          reader.start(id, speechChunks(spokenText(shown, deviceText[answerLang])), voice);
        }}
      >
        {t.readAloud}
      </button>
      {active && (
        <button
          aria-pressed={state.paused}
          onClick={() => (state.paused ? reader.resume() : reader.pause())}
        >
          {t.pause}
        </button>
      )}
      {/* Always present, so a screen reader announces the text when it appears. */}
      <span role="status" className="muted">
        {refusal}
      </span>
    </>
  );
}
