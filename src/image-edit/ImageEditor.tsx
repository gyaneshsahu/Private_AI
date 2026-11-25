// The full-screen image editor (docs/image-editing-20261125.md): the picture, a strip of its
// versions, the tools and the "Describe edits" box. Every edit makes a new version at the end of
// the strip; earlier versions stay and any of them can be shown, downloaded or edited further.
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { IMAGE_EDIT, type EditSize, type EditTool } from "../../shared/image-edit";
import { Icon } from "../Icon";
import { useText } from "../i18n";
import { imageEditText } from "../text/image-edit";
import { applyEdit } from "./edit";
import { zoomStep } from "./geometry";
import type { EditFailure } from "./request";
import { addVersion, removeVersion, showVersion, versionsFull, versionsOf, type CreatedImage } from "./versions";
import "./image-edit.css";

/** Room one more version needs in the chat (a JPEG of IMAGE_EDIT.side is well under this). */
export const VERSION_ROOM = 400_000;

function useObjectUrls(list: readonly { type: string; data: string }[]) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    const made = list.map((v) => URL.createObjectURL(new Blob([Uint8Array.from(atob(v.data), (c) => c.charCodeAt(0))], { type: v.type })));
    setUrls(made);
    return () => made.forEach((url) => URL.revokeObjectURL(url));
  }, [list]);
  return urls;
}

export function ImageEditor(props: {
  image: CreatedImage;
  csrf: string;
  /** The provider changes only a painted area itself (status.imageEditing.masks). */
  masks: boolean;
  limit: number;
  used?: number;
  /** Characters of image data this chat can still take (CHAT_IMAGE_BUDGET less what it holds). */
  roomLeft: number;
  /** A new, shown or deleted version; `counted` when an edit used one of the day's images. */
  onChange(image: CreatedImage, counted?: boolean): void;
  onClose(): void;
}) {
  const t = useText(imageEditText);
  const dialog = useRef<HTMLDialogElement>(null);
  const overlay = useRef<HTMLCanvasElement>(null);
  const picture = useRef<HTMLImageElement>(null);
  // The picture's width on screen at "fit"; zooming multiplies it and the stage scrolls.
  const fit = useRef(0);
  const stroke = useRef<{ x: number; y: number } | undefined>(undefined);
  const abort = useRef<AbortController | undefined>(undefined);
  const { list, at } = useMemo(() => versionsOf(props.image), [props.image]);
  const urls = useObjectUrls(list);
  const [tool, setTool] = useState<"describe" | "area" | "erase">("describe");
  const [resizing, setResizing] = useState(false);
  const [text, setText] = useState("");
  const [brush, setBrush] = useState(48);
  const [zoom, setZoom] = useState(1);
  const [painted, setPainted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<EditFailure>();
  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    return () => {
      abort.current?.abort();
      element?.close();
    };
  }, []);
  const clear = () => {
    const canvas = overlay.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setPainted(false);
  };
  // Another version or another tool: the painted area belonged to the picture and tool before.
  useEffect(clear, [at, tool, list.length]);
  const painting = tool !== "describe";
  const zoomTo = (direction: 1 | -1) => {
    if (zoom === 1 && picture.current) fit.current = picture.current.getBoundingClientRect().width;
    setZoom(zoomStep(zoom, direction));
  };
  const point = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget;
    const box = canvas.getBoundingClientRect();
    return { x: ((event.clientX - box.left) / box.width) * canvas.width, y: ((event.clientY - box.top) / box.height) * canvas.height };
  };
  const draw = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget;
    const from = stroke.current;
    const c = canvas.getContext("2d");
    if (!from || !c) return;
    const to = point(event);
    // One opaque colour, shown translucent by CSS: crossing strokes do not darken.
    c.strokeStyle = c.fillStyle = "#2f6bff";
    c.lineCap = c.lineJoin = "round";
    c.lineWidth = (brush * canvas.width) / IMAGE_EDIT.side;
    c.beginPath();
    c.moveTo(from.x, from.y);
    c.lineTo(to.x, to.y);
    c.stroke();
    stroke.current = to;
    setPainted(true);
  };
  async function run(what: EditTool, size?: EditSize) {
    if (busy) return;
    setFailure(undefined);
    if (versionsFull(props.image)) return setFailure("versionsFull");
    if (props.roomLeft < VERSION_ROOM) return setFailure("chatFull");
    if ((what === "area" || what === "erase") && !painted) return setFailure("needSelection");
    if ((what === "describe" || what === "area") && !text.trim()) return;
    setBusy(true);
    abort.current = new AbortController();
    try {
      const version = await applyEdit({
        image: props.image,
        tool: what,
        prompt: text,
        size,
        overlay: overlay.current ?? undefined,
        masks: props.masks,
        csrf: props.csrf,
        label: what === "erase" ? t.erased : what === "resize" ? t.resized(t[size!]) : text.trim(),
        signal: abort.current.signal,
      });
      props.onChange(addVersion(props.image, version), true);
      setText("");
      setResizing(false);
      setTool("describe");
    } catch (key) {
      if (!abort.current.signal.aborted) setFailure(typeof key === "string" ? (key as EditFailure) : "unavailable");
    } finally {
      setBusy(false);
    }
  }
  const failureText =
    failure === "limit" ? t.limit(props.limit) : failure === "versionsFull" ? t.versionsFull(IMAGE_EDIT.versions) : failure ? t[failure] : "";
  const shown = list[at];
  const first = props.image.source === "upload" ? t.uploaded : t.original;
  const name = (index: number) => (index === 0 ? (list[0].prompt && props.image.source !== "upload" ? list[0].prompt : first) : list[index].prompt);
  const extension = shown.type === "image/png" ? "png" : shown.type === "image/webp" ? "webp" : "jpg";
  return (
    <dialog
      ref={dialog}
      className="image-editor"
      aria-label={t.title}
      onCancel={(event) => {
        event.preventDefault();
        props.onClose();
      }}
    >
      <header className="image-editor-bar">
        <button type="button" className="image-editor-back" onClick={props.onClose}>
          <Icon name="close" />
          <span>{t.back}</span>
        </button>
        <div className="image-editor-tools" role="toolbar" aria-label={t.tools}>
          <button type="button" aria-pressed={tool === "area"} disabled={busy} onClick={() => setTool(tool === "area" ? "describe" : "area")}>
            <Icon name="square" />
            <span>{t.selectArea}</span>
          </button>
          <button type="button" aria-pressed={tool === "erase"} disabled={busy} onClick={() => setTool(tool === "erase" ? "describe" : "erase")}>
            <Icon name="eraser" />
            <span>{t.erase}</span>
          </button>
          <button type="button" aria-expanded={resizing} disabled={busy} onClick={() => setResizing(!resizing)}>
            <Icon name="panel" />
            <span>{t.resize}</span>
          </button>
          <button type="button" className="icon-only" aria-label={t.zoomOut} title={t.zoomOut} disabled={zoom <= 1} onClick={() => zoomTo(-1)}>
            −
          </button>
          <button type="button" className="icon-only" aria-label={t.zoomIn} title={t.zoomIn} disabled={zoom >= 4} onClick={() => zoomTo(1)}>
            +
          </button>
          <a className="image-editor-download" href={urls[at]} download={`cometrow-image-${at + 1}.${extension}`} aria-label={t.download} title={t.download}>
            <Icon name="download" />
            <span>{t.download}</span>
          </a>
        </div>
      </header>
      {resizing && (
        <div className="image-editor-sizes" role="group" aria-label={t.resize}>
          {(["square", "portrait", "landscape"] as const).map((size) => (
            <button key={size} type="button" disabled={busy} onClick={() => void run("resize", size)}>
              {t[size]}
            </button>
          ))}
        </div>
      )}
      <div className="image-editor-stage" data-tool={tool}>
        <div className="image-editor-picture">
          {urls[at] && (
            <img
              ref={picture}
              src={urls[at]}
              alt={name(at)}
              style={zoom > 1 && fit.current ? { width: fit.current * zoom, maxWidth: "none", maxHeight: "none" } : undefined}
              onLoad={(event) => {
                const canvas = overlay.current;
                if (!canvas) return;
                canvas.width = event.currentTarget.naturalWidth;
                canvas.height = event.currentTarget.naturalHeight;
                setPainted(false);
              }}
            />
          )}
          <canvas
            ref={overlay}
            className="image-editor-overlay"
            aria-hidden={!painting}
            aria-label={tool === "erase" ? t.eraseHint : t.selectHint}
            style={{ pointerEvents: painting && !busy ? "auto" : "none" }}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              stroke.current = point(event);
              draw(event);
            }}
            onPointerMove={draw}
            onPointerUp={() => (stroke.current = undefined)}
            onPointerCancel={() => (stroke.current = undefined)}
          />
        </div>
      </div>
      <footer className="image-editor-foot">
        {painting && (
          <div className="image-editor-paint">
            <p>{tool === "erase" ? t.eraseHint : t.selectHint}</p>
            <label>
              <span>{t.brush}</span>
              <input type="range" min={12} max={160} step={4} value={brush} onChange={(event) => setBrush(Number(event.target.value))} />
            </label>
            <button type="button" className="text-button" disabled={!painted || busy} onClick={clear}>
              {t.clearSelection}
            </button>
          </div>
        )}
        <ol className="image-editor-versions" aria-label={t.versions}>
          {list.map((version, index) => (
            <li key={index}>
              <button type="button" aria-pressed={index === at} aria-label={t.version(index + 1, name(index))} title={name(index)} disabled={busy} onClick={() => props.onChange(showVersion(props.image, index))}>
                {urls[index] && <img src={urls[index]} alt="" />}
                <span>{index + 1}</span>
              </button>
            </li>
          ))}
        </ol>
        <p className="image-editor-status" role="status">
          {busy ? t.working : failureText || t.versionOf(at + 1, list.length)}
          {!busy && !failureText && props.used !== undefined && ` · ${t.left(Math.max(0, props.limit - props.used), props.limit)}`}
        </p>
        <form
          className="image-editor-form"
          onSubmit={(event) => {
            event.preventDefault();
            void run(tool);
          }}
        >
          {tool !== "erase" && (
            <input
              type="text"
              aria-label={t.describe}
              placeholder={tool === "area" ? t.areaPlaceholder : t.describePlaceholder}
              maxLength={IMAGE_EDIT.promptMax}
              value={text}
              disabled={busy}
              onChange={(event) => setText(event.target.value)}
            />
          )}
          {list.length > 1 && (
            <button type="button" className="icon-only" aria-label={t.deleteVersion} title={t.deleteVersion} disabled={busy} onClick={() => props.onChange(removeVersion(props.image, at))}>
              <Icon name="trash" />
            </button>
          )}
          <button type="submit" className="primary" disabled={busy || (tool === "erase" ? !painted : !text.trim())}>
            {tool === "erase" ? t.eraseNow : t.send}
          </button>
        </form>
      </footer>
    </dialog>
  );
}
