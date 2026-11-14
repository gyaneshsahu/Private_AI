// Read an answer aloud with a voice that works on this device (owner, 14 November 2026).
// Nothing here stores or sends text. docs/read-aloud-and-pdf-export-20261114.md has the design.

export type SpeechLang = "de" | "en";
export interface SpokenWords {
  spokenLink: string;
  spokenCode: string;
  spokenFormula: string;
  spokenTable: string;
  spokenMasked: string;
}

/**
 * The local-voice rule. Some browser voices send the text to the vendor's servers (Chrome's
 * "Google ..." voices, Edge's "Online (Natural)" voices). A voice is used only if ALL hold:
 *  1. `localService === true` (missing or false: not used);
 *  2. its name and voiceURI carry no mark of a network voice (a second check, in case a browser
 *     reports the flag wrongly; it can also reject a harmless local voice with such a name);
 *  3. the browser is not on Android. There the voices come from the phone's speech engine, which can
 *     use the network for a voice whatever the flag says, and the page cannot find out.
 * No match means no speech: there is never a fallback to another voice.
 * Limit: the flag is the browser's own statement and a page cannot verify it. Desktop Chrome, Edge,
 * Firefox and Safari hand out operating-system voices with the flag set, and those work offline.
 */
const NETWORK_MARK = /google|online|network|cloud|remote|natural/i;
export function chooseVoice(
  voices: readonly SpeechSynthesisVoice[],
  lang: SpeechLang,
  userAgent: string = navigator.userAgent,
): SpeechSynthesisVoice | "none" | "unverifiable" {
  if (/Android/i.test(userAgent)) return "unverifiable";
  const usable = voices.filter(
    (voice) =>
      voice.localService === true &&
      new RegExp(`^${lang}([-_]|$)`, "i").test(voice.lang) &&
      !NETWORK_MARK.test(`${voice.name} ${voice.voiceURI}`),
  );
  return usable.find((voice) => voice.default) ?? usable[0] ?? "none";
}

/** Chrome fills the voice list late: wait for `voiceschanged` once, for a short time. */
export function loadVoices(
  synth: Pick<SpeechSynthesis, "getVoices" | "addEventListener" | "removeEventListener">,
  wait = 1500,
): Promise<SpeechSynthesisVoice[]> {
  const ready = synth.getVoices();
  if (ready.length) return Promise.resolve(ready);
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      synth.removeEventListener?.("voiceschanged", done);
      resolve(synth.getVoices());
    };
    const timer = setTimeout(done, wait);
    synth.addEventListener?.("voiceschanged", done);
  });
}

/** Addresses become the word "link", leftover masking placeholders a short phrase. */
export function tidySpeech(text: string, words: SpokenWords): string {
  return text
    .replace(/(?:https?:\/\/|www\.)[^\s<>]*[^\s<>.,;:!?)\]]/gi, words.spokenLink)
    .replace(/\{{1,2}\s*[A-Za-z]+\s*-\s*\d+\s*\}{1,2}/g, words.spokenMasked)
    .replace(/[ \t]+/g, " ")
    // A citation chip that was left out must not leave a gap before the full stop.
    .replace(/ ([.,;:!?])/g, "$1")
    .replace(/ *\n\s*/g, "\n")
    .trim();
}

const BLOCK = /^(p|li|h[1-6]|blockquote|div|br|tr|ul|ol|hr)$/;
/**
 * The prose of a rendered answer (the `.message-text` element), so speech follows what the screen
 * shows: no markdown signs, no source ids. Code blocks, formulas, citation chips and notices are
 * replaced by a word or left out; tables are read row by row.
 */
export function spokenText(root: Element, words: SpokenWords): string {
  const read = (node: Node): string => {
    if (node.nodeType === 3) return node.nodeValue ?? "";
    if (node.nodeType !== 1) return "";
    const element = node as Element;
    const tag = element.localName;
    if (element.matches("button, .muted, [hidden], [aria-hidden='true'], script, style")) return "";
    if (element.matches(".code-block, pre")) return `\n${words.spokenCode}\n`;
    if (element.matches(".katex-display, .katex, .katex-error")) return ` ${words.spokenFormula} `;
    if (tag === "table")
      return `\n${words.spokenTable}\n${[...element.querySelectorAll("tr")]
        .map((row) => [...row.children].map((cell) => read(cell).trim()).join(", ") + ".")
        .join("\n")}\n`;
    const inner = [...element.childNodes].map(read).join("");
    return BLOCK.test(tag) ? `\n${inner}\n` : inner;
  };
  return tidySpeech(read(root), words);
}

/**
 * Sentences joined into pieces of at most `max` characters. Some engines stop in the middle of a
 * long utterance (Chrome after about 15 seconds), so each piece stays short.
 */
export function speechChunks(text: string, max = 200): string[] {
  const chunks: string[] = [];
  let current = "";
  const add = (piece: string) => {
    if (current && current.length + 1 + piece.length > max) {
      chunks.push(current);
      current = "";
    }
    current = current ? `${current} ${piece}` : piece;
  };
  // A sentence ends at . ! ? … before a space, or at a line end ("3.5" stays whole).
  for (let sentence of text.match(/\S[^\n]*?(?:[.!?…]+(?=\s|$)|(?=\n|$))/g) ?? []) {
    while (sentence.length > max) {
      const space = sentence.lastIndexOf(" ", max);
      const cut = space > 0 ? space : max;
      add(sentence.slice(0, cut));
      sentence = sentence.slice(cut).trim();
    }
    if (sentence) add(sentence);
  }
  if (current) chunks.push(current);
  return chunks;
}

export type ReadingState = { id: string; paused: boolean } | undefined;
/** One answer at a time: idle, reading or paused. Keeps nothing once it stops. */
export function createReader(
  synth: Pick<SpeechSynthesis, "speak" | "cancel" | "pause" | "resume">,
  utterance: (text: string) => SpeechSynthesisUtterance,
) {
  let state: ReadingState;
  let run = 0;
  // Held so the engine's end event is not lost when the utterance is collected (seen in Chrome).
  let speaking: SpeechSynthesisUtterance | undefined;
  const listeners = new Set<() => void>();
  const set = (next: ReadingState) => {
    state = next;
    listeners.forEach((listener) => listener());
  };
  const stop = () => {
    if (!state) return;
    run++;
    speaking = undefined;
    synth.cancel();
    set(undefined);
  };
  return {
    state: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    start(id: string, chunks: string[], voice: SpeechSynthesisVoice) {
      stop();
      if (!chunks.length) return;
      const mine = ++run;
      let index = 0;
      const next = () => {
        if (mine !== run) return;
        if (index >= chunks.length) {
          speaking = undefined;
          return set(undefined);
        }
        speaking = utterance(chunks[index++]);
        speaking.voice = voice;
        speaking.lang = voice.lang;
        speaking.onend = next;
        speaking.onerror = () => {
          if (mine === run) stop();
        };
        synth.speak(speaking);
      };
      set({ id, paused: false });
      try {
        next();
      } catch {
        // An engine that refuses the utterance must not leave the button on "reading".
        stop();
      }
    },
    pause() {
      if (!state || state.paused) return;
      synth.pause();
      set({ ...state, paused: true });
    },
    resume() {
      if (!state?.paused) return;
      synth.resume();
      set({ ...state, paused: false });
    },
    stop,
  };
}

let shared: ReturnType<typeof createReader> | undefined;
/** The page's one reader; undefined where the browser has no speech synthesis. */
export function pageReader() {
  if (!shared && typeof speechSynthesis !== "undefined") {
    shared = createReader(speechSynthesis, (text) => new SpeechSynthesisUtterance(text));
    // Speech would otherwise go on after a reload or after leaving the page.
    addEventListener("pagehide", () => shared?.stop());
  }
  return shared;
}
/** Called when a message is sent, another conversation opens or the vault locks. */
export const stopReading = () => shared?.stop();
