// Image questions in the composer (docs/images-20261114.md). Rendered only while the server says
// image questions are switched on. The steps: first-upload notice, choose a picture (the existing
// photo dialog: camera or file, turn, crop, metadata dropped), the health question when consent
// was not given, cover private parts with black boxes, check the exact picture, attach.
// The picture lives in this component and then in one App state value. It is never stored.
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { containDialogFocus } from "./dialog-focus";
import type { HealthConsentChoice } from "./health-consent";
import { HealthConsentPrompt } from "./HealthConsent";
import { useLang, useText } from "./i18n";
import { KIND_LABELS, maskingText, type IdentifierKind } from "./identifier-masking";
import {
  clampBox,
  encodeForSending,
  IMAGE_NOTE_KEY,
  imageConsentStep,
  recogniseWords,
  sendSize,
  suggestRedactions,
  toAttachedImage,
  type AttachedImage,
  type RedactionBox,
} from "./image-upload";
import { PhotoCapture } from "./PhotoCapture";
import type { Rect, Size } from "./photo-capture";
import { imageText } from "./text/images";

function noteSeen() {
  try {
    return localStorage.getItem(IMAGE_NOTE_KEY) === "1";
  } catch {
    return false; // storage blocked: the notice is simply shown each time
  }
}
type FaceFinder = new () => { detect(image: CanvasImageSource): Promise<{ boundingBox: DOMRectReadOnly }[]> };
/** The browser's own on-device face finder (Shape Detection API). Absent in most browsers. */
const faceFinder = () => (globalThis as { FaceDetector?: FaceFinder }).FaceDetector;

function Dialog({ label, onClose, children }: { label: string; onClose(): void; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="photo-dialog image-dialog"
      aria-label={label}
      onKeyDown={containDialogFocus}
      // Escape discards the picture. No onClose: closing this element on unmount must not end the flow.
      onCancel={onClose}
    >
      {children}
    </dialog>
  );
}

/** Black boxes over the picture, burned in when it is encoded; then the exact picture to check. */
export function ImageRedactor({
  file,
  maxBytes,
  thinkingChosen,
  onAttach,
  onDiscard,
}: {
  file: Blob;
  maxBytes: number;
  thinkingChosen: boolean;
  onAttach(image: AttachedImage): void;
  onDiscard(): void;
}) {
  const t = useText(imageText);
  const { lang } = useLang();
  const base = useRef<HTMLCanvasElement | null>(null);
  const view = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number } | undefined>(undefined);
  const history = useRef<RedactionBox[][]>([]);
  const [size, setSize] = useState<Size>();
  const [boxes, setBoxes] = useState<RedactionBox[]>([]);
  const [selected, setSelected] = useState(-1);
  const [draft, setDraft] = useState<Rect>();
  const [busy, setBusy] = useState<"" | "suggest" | "encode">("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<AttachedImage>();

  // Decode once and keep the picture at the size it is edited and sent at.
  useEffect(() => {
    let gone = false;
    void createImageBitmap(file).then(
      (bitmap) => {
        if (!gone) {
          const next = sendSize(bitmap);
          const canvas = document.createElement("canvas");
          canvas.width = next.width;
          canvas.height = next.height;
          const context = canvas.getContext("2d");
          if (context) {
            context.fillStyle = "#fff";
            context.fillRect(0, 0, next.width, next.height);
            context.drawImage(bitmap, 0, 0, next.width, next.height);
            base.current = canvas;
            setSize(next);
          } else setError(t.prepareFailed);
        }
        bitmap.close();
      },
      () => gone || setError(t.prepareFailed),
    );
    return () => {
      gone = true;
      if (base.current) base.current.width = base.current.height = 0;
      base.current = null;
    };
  }, [file]); // eslint-disable-line react-hooks/exhaustive-deps

  // The visible canvas holds the same pixels that are encoded: the picture and the black boxes.
  useEffect(() => {
    const canvas = view.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || !size || !base.current) return;
    if (canvas.width !== size.width) canvas.width = size.width;
    if (canvas.height !== size.height) canvas.height = size.height;
    context.drawImage(base.current, 0, 0);
    context.fillStyle = "#000";
    for (const box of draft ? [...boxes, clampBox(draft, size)] : boxes)
      context.fillRect(box.x, box.y, box.width, box.height);
  }, [size, boxes, draft, result]);

  const change = (next: RedactionBox[], select: number, message: string) => {
    history.current = [...history.current.slice(-199), boxes];
    setBoxes(next);
    setSelected(select);
    setStatus(message);
  };
  const point = (event: PointerEvent<HTMLCanvasElement>) => {
    const frame = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - frame.left) * size!.width) / frame.width,
      y: ((event.clientY - frame.top) * size!.height) / frame.height,
    };
  };
  const endDrag = (event: PointerEvent<HTMLCanvasElement>) => {
    const start = drag.current;
    drag.current = undefined;
    setDraft(undefined);
    if (!start || !size) return;
    const end = point(event);
    const box = clampBox({ x: start.x, y: start.y, width: end.x - start.x, height: end.y - start.y }, size);
    if (box.width >= 6 && box.height >= 6) return change([...boxes, box], boxes.length, t.boxAdded(boxes.length + 1));
    // A tap: choose the box under it, so it can be moved or removed.
    let hit = -1;
    boxes.forEach((b, i) => {
      if (end.x >= b.x && end.x <= b.x + b.width && end.y >= b.y && end.y <= b.y + b.height) hit = i;
    });
    setSelected(hit);
  };
  const remove = (index: number) =>
    change(
      boxes.filter((_, i) => i !== index),
      -1,
      t.boxRemoved(boxes.length - 1),
    );
  const onKey = (event: KeyboardEvent) => {
    const box = boxes[selected];
    if (!box || !size || busy) return;
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      return remove(selected);
    }
    const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    if (!direction) return;
    event.preventDefault();
    const step = Math.max(4, Math.round(Math.max(size.width, size.height) / 100));
    const [dx, dy] = [direction[0] * step, direction[1] * step];
    const moved = event.shiftKey
      ? { ...box, width: Math.max(6, box.width + dx), height: Math.max(6, box.height + dy) }
      : {
          ...box,
          x: Math.min(size.width - box.width, Math.max(0, box.x + dx)),
          y: Math.min(size.height - box.height, Math.max(0, box.y + dy)),
        };
    const next = clampBox(moved, size);
    const percent = (value: number, of: number) => Math.round((value / of) * 100);
    change(
      boxes.map((b, i) => (i === selected ? next : b)),
      selected,
      t.boxMoved(
        percent(next.x, size.width),
        percent(next.y, size.height),
        percent(next.width, size.width),
        percent(next.height, size.height),
      ),
    );
  };
  const addBox = () => {
    if (!size) return;
    const width = Math.round(size.width * 0.3);
    const height = Math.max(12, Math.round(size.height * 0.08));
    const box = clampBox(
      { x: (size.width - width) / 2, y: (size.height - height) / 2, width, height },
      size,
    );
    change([...boxes, box], boxes.length, t.boxAdded(boxes.length + 1));
    // The arrow keys work on the picture's frame.
    view.current?.parentElement?.focus();
  };
  async function suggest() {
    if (!size || !base.current) return;
    setBusy("suggest");
    setStatus(t.suggesting);
    try {
      const picture = await new Promise<Blob | null>((resolve) => base.current!.toBlob(resolve, "image/png"));
      if (!picture) throw new Error("no picture");
      const words = await recogniseWords(picture, (percent) => setStatus(`${t.suggesting} ${percent} %`));
      const found = suggestRedactions(words, size);
      if (found.length) change([...boxes, ...found], -1, t.suggested(found.length));
      else setStatus(t.suggestedNone);
    } catch {
      setStatus(t.suggestFailed);
    } finally {
      setBusy("");
    }
  }
  async function coverFaces() {
    const Finder = faceFinder();
    if (!Finder || !size || !base.current) return;
    try {
      const faces = await new Finder().detect(base.current);
      const found = faces.map(({ boundingBox: f }) =>
        clampBox(
          // Hair, chin and ears reach past the reported face.
          { x: f.x - f.width * 0.15, y: f.y - f.height * 0.2, width: f.width * 1.3, height: f.height * 1.4, kind: "FACE" as const },
          size,
        ),
      );
      if (found.length) change([...boxes, ...found], -1, t.facesFound(found.length));
      else setStatus(t.facesNone);
    } catch {
      setStatus(t.facesUnsupported);
    }
  }
  async function prepare() {
    if (!size || !base.current) return;
    setBusy("encode");
    setError("");
    try {
      setResult(await toAttachedImage(await encodeForSending(base.current, size, boxes, maxBytes)));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.prepareFailed);
    } finally {
      setBusy("");
    }
  }
  const kindLabel = (kind: IdentifierKind | "FACE") =>
    kind === "FACE" ? t.face : maskingText[lang].item(kind, 1, KIND_LABELS[kind]).replace(/^1 /, "");

  if (result)
    return (
      <div className="photo-stage">
        <h3>{t.checkTitle}</h3>
        <img className="photo-preview image-check" src={result.dataUrl} alt={t.checkLabel} />
        <p className="muted">{t.checkFacts(result.width, result.height, Math.ceil(result.bytes / 1000))}</p>
        {thinkingChosen && (
          <p className="notice" role="note">
            {t.thinkingNote}
          </p>
        )}
        <div className="photo-actions">
          <button type="button" className="primary" autoFocus onClick={() => onAttach(result)}>
            {t.attach}
          </button>
          <button type="button" onClick={() => setResult(undefined)}>
            {t.back}
          </button>
          <button type="button" onClick={onDiscard}>
            {t.discard}
          </button>
        </div>
      </div>
    );
  const chosen = boxes[selected];
  return (
    <div className="photo-stage">
      <p className="muted">{t.redactIntro}</p>
      {error && (
        <p className="photo-error" role="alert">
          {error}
        </p>
      )}
      {size && (
        <div
          className="image-redact-frame"
          tabIndex={0}
          role="group"
          aria-label={t.canvasLabel(size.width, size.height, boxes.length)}
          aria-describedby="image-redact-keys"
          onKeyDown={onKey}
        >
          <canvas
            ref={view}
            className="image-redact-canvas"
            role="img"
            aria-label={t.canvasLabel(size.width, size.height, boxes.length)}
            onPointerDown={(event) => {
              if (event.button || busy) return;
              event.currentTarget.setPointerCapture(event.pointerId);
              drag.current = point(event);
            }}
            onPointerMove={(event) => {
              const start = drag.current;
              if (!start) return;
              const now = point(event);
              setDraft({ x: start.x, y: start.y, width: now.x - start.x, height: now.y - start.y });
            }}
            onPointerUp={endDrag}
            onPointerCancel={() => {
              drag.current = undefined;
              setDraft(undefined);
            }}
          />
          {chosen && (
            // Shows which box the keys move. An overlay only: it is not part of the picture.
            <span
              className="image-redact-chosen"
              aria-hidden="true"
              style={{
                left: `${(chosen.x / size.width) * 100}%`,
                top: `${(chosen.y / size.height) * 100}%`,
                width: `${(chosen.width / size.width) * 100}%`,
                height: `${(chosen.height / size.height) * 100}%`,
              }}
            />
          )}
        </div>
      )}
      <p className="muted" id="image-redact-keys">
        {t.keyboardHelp}
      </p>
      <div className="photo-actions">
        <button type="button" disabled={!size || !!busy} onClick={addBox}>
          {t.addBox}
        </button>
        <button
          type="button"
          disabled={!history.current.length || !!busy}
          onClick={() => {
            const previous = history.current.pop();
            if (!previous) return;
            setBoxes(previous);
            setSelected(-1);
            setStatus(t.boxRemoved(previous.length));
          }}
        >
          {t.undo}
        </button>
        <button type="button" disabled={!boxes.length || !!busy} onClick={() => change([], -1, t.boxRemoved(0))}>
          {t.clear}
        </button>
      </div>
      <div className="photo-actions">
        <button type="button" disabled={!size || !!busy} aria-describedby="image-suggest-hint" onClick={() => void suggest()}>
          {t.suggest}
        </button>
        {faceFinder() && (
          <button type="button" disabled={!size || !!busy} aria-describedby="image-faces-hint" onClick={() => void coverFaces()}>
            {t.faces}
          </button>
        )}
      </div>
      <p className="muted" id="image-suggest-hint">
        {t.suggestHint}
      </p>
      <p className="muted" id="image-faces-hint">
        {faceFinder() ? t.facesHint : t.facesUnsupported}
      </p>
      <p className="notice image-redact-status" role="status">
        {status}
      </p>
      {boxes.length > 0 && (
        <ul className="image-redact-boxes" aria-label={t.boxList}>
          {boxes.map((box, index) => (
            <li key={index}>
              <button
                type="button"
                className="text-button"
                aria-pressed={index === selected}
                onClick={() => {
                  setSelected(index);
                  view.current?.parentElement?.focus();
                }}
              >
                {t.box(index + 1, box.kind && kindLabel(box.kind))}
              </button>
              <button type="button" className="text-button" disabled={!!busy} onClick={() => remove(index)}>
                {t.removeBox(index + 1)}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="photo-actions">
        <button type="button" className="primary" disabled={!size || !!busy} onClick={() => void prepare()}>
          {busy === "encode" ? t.preparing : t.preview}
        </button>
        <button type="button" onClick={onDiscard}>
          {t.discard}
        </button>
      </div>
    </div>
  );
}

/** The whole flow, opened from "Attachments and tools". Closing at any step discards the picture. */
export function ImageQuestion({
  maxBytes,
  thinkingChosen,
  consentOn,
  consentChoice,
  onConsent,
  onAttach,
  onClose,
  notify,
}: {
  maxBytes: number;
  thinkingChosen: boolean;
  /** The health-consent step is switched on for this deployment. */
  consentOn: boolean;
  consentChoice: HealthConsentChoice | undefined;
  onConsent(choice: HealthConsentChoice): void;
  onAttach(image: AttachedImage): void;
  onClose(): void;
  notify(text: string): void;
}) {
  const t = useText(imageText);
  const [step, setStep] = useState<"note" | "pick" | "health" | "consent" | "redact">(() =>
    noteSeen() ? "pick" : "note",
  );
  const [file, setFile] = useState<File>();
  const picked = useRef(false);
  if (step === "pick")
    return (
      <PhotoCapture
        wording={{ title: t.pickTitle, close: t.pickClose, intro: t.pickIntro, extraction: t.pickExtraction, use: t.pickUse }}
        onUse={(next) => {
          picked.current = true;
          setFile(next);
          setStep(imageConsentStep(consentOn, consentChoice) === "ask" ? "health" : "redact");
        }}
        // The photo dialog closes itself after handing over the picture; only a close without one ends the flow.
        onClose={() => picked.current || onClose()}
      />
    );
  return (
    <Dialog label={t.title} onClose={onClose}>
      <div className="row">
        <h2>{step === "note" ? t.noteTitle : t.title}</h2>
        <button type="button" aria-label={t.close} onClick={onClose}>
          ×
        </button>
      </div>
      {step === "note" && (
        <div className="photo-stage">
          {[t.note1, t.note2, t.note3, t.note4].map((text) => (
            <p key={text}>{text}</p>
          ))}
          <div className="photo-actions">
            <button
              type="button"
              className="primary"
              autoFocus
              onClick={() => {
                try {
                  localStorage.setItem(IMAGE_NOTE_KEY, "1");
                } catch {
                  /* storage blocked */
                }
                setStep("pick");
              }}
            >
              {t.noteContinue}
            </button>
            <button type="button" onClick={onClose}>
              {t.noteLater}
            </button>
          </div>
        </div>
      )}
      {step === "health" && (
        <div className="photo-stage">
          <h3>{t.healthTitle}</h3>
          <p className="muted">{t.healthText}</p>
          <div className="photo-actions">
            <button type="button" onClick={() => setStep("consent")}>
              {t.healthYes}
            </button>
            <button type="button" onClick={() => setStep("redact")}>
              {t.healthNo}
            </button>
          </div>
        </div>
      )}
      {step === "consent" && (
        // The existing consent card, unchanged. "Not now" keeps the picture from being attached.
        <HealthConsentPrompt
          onChoose={(choice) => {
            onConsent(choice);
            if (choice === "accepted") return setStep("redact");
            notify(t.healthDeclined);
            onClose();
          }}
        />
      )}
      {step === "redact" && file && (
        <ImageRedactor
          file={file}
          maxBytes={maxBytes}
          thinkingChosen={thinkingChosen}
          onDiscard={onClose}
          onAttach={(image) => {
            onAttach(image);
            notify(t.attachedNotice);
            onClose();
          }}
        />
      )}
    </Dialog>
  );
}

/** In the composer: the exact picture that goes with the next message, and a way to take it off. */
export function AttachedImageNote({ image, onRemove }: { image: AttachedImage; onRemove(): void }) {
  const t = useText(imageText);
  return (
    <div className="notice composer-note image-attached" role="group" aria-label={t.attachedLabel}>
      <img src={image.dataUrl} alt={t.checkLabel} />
      <span>{t.attachedNote}</span>
      <button type="button" className="text-button" onClick={onRemove}>
        {t.remove}
      </button>
    </div>
  );
}
