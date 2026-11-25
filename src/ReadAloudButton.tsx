import { track } from "./owner/track";
import { useEffect, useState, useSyncExternalStore } from "react";
import { languageOf } from "./arithmetic/numbers";
import { readAloudEnabled } from "./device-features";
import { useLang, useText } from "./i18n";
import { chooseVoice, loadVoices, pageReader, speechChunks, spokenText } from "./read-aloud";
import { deviceText } from "./text/device-features";
import { Icon } from "./Icon";

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
        className="icon-action"
        disabled={disabled}
        aria-label={t.readAloud}
        title={t.readAloud}
        aria-pressed={active}
        onClick={async (event) => {
          if (active) return reader.stop();
          track("read-aloud.used");
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
        <Icon name="speaker" />
      </button>
      {active && (
        <button
          className="icon-action"
          aria-label={t.pause}
          title={t.pause}
          aria-pressed={state.paused}
          onClick={() => (state.paused ? reader.resume() : reader.pause())}
        >
          <Icon name="pause" />
        </button>
      )}
      {/* Always present, so a screen reader announces the text when it appears. */}
      <span role="status" className="muted">
        {refusal}
      </span>
    </>
  );
}
