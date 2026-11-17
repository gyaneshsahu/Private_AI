// Outputs panel: everything this chat has produced or holds (whiteboard, canvas, created images,
// files), so the user can jump to it, open it again or download it again. Positioning is the
// shared .side-panel's job; this file styles only the inside (src/outputs-panel.css).
import { useEffect, useState, type ReactNode } from "react";
import type { Conversation } from "../shared/contracts";
import { Icon, type IconName } from "./Icon";
import { useLang, useText } from "./i18n";
import { chatOutputs, type OutputItem } from "./outputs";
import { outputsText } from "./text/outputs";
import "./outputs-panel.css";

type Props = {
  conversation: Conversation;
  onOpenBoard(): void;
  onDownloadBoard(): void;
  onOpenCanvas(): void;
  onShowMessage(messageId: string): void;
  onOpenFiles(): void;
  onClose(): void;
};

function downloadText(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  Object.assign(document.createElement("a"), { href: url, download: name }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** A blob URL for a created image. Made in an effect, not useMemo: StrictMode's second mount would otherwise get a revoked URL. */
function useImageUrl(image: { type: string; data: string }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const bytes = Uint8Array.from(atob(image.data), (c) => c.charCodeAt(0));
    const made = URL.createObjectURL(new Blob([bytes], { type: image.type }));
    setUrl(made);
    return () => URL.revokeObjectURL(made);
  }, [image.data, image.type]);
  return url;
}

const extension = (type: string) => (type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg");

function Action(props: { icon: IconName; label: string; onClick(): void }) {
  return (
    <button type="button" className="outputs-action" aria-label={props.label} title={props.label} onClick={props.onClick}>
      <Icon name={props.icon} />
    </button>
  );
}

function Row(props: { item: OutputItem; preview: ReactNode; onPrimary(): void; children: ReactNode }) {
  return (
    <li className="outputs-row">
      {/* Mouse shortcut for the row's first action; keyboard and screen readers use the buttons beside it. */}
      <div className="outputs-main" onClick={props.onPrimary}>
        <span className="outputs-preview">{props.preview}</span>
        <span className="outputs-text">
          <span className="outputs-title">{props.item.title}</span>
          <span className="outputs-detail">{props.item.detail}</span>
        </span>
      </div>
      <span className="outputs-actions">{props.children}</span>
    </li>
  );
}

function ImageRow(props: { item: Extract<OutputItem, { kind: "image" }>; onShow(): void }) {
  const t = useText(outputsText);
  const url = useImageUrl(props.item.image);
  return (
    <Row item={props.item} preview={url && <img src={url} alt="" />} onPrimary={props.onShow}>
      <Action icon="chat" label={t.showInChat} onClick={props.onShow} />
      <a className="outputs-action" href={url || undefined} download={`cometrow-image.${extension(props.item.image.type)}`} aria-label={t.download} title={t.download}>
        <Icon name="download" />
      </a>
    </Row>
  );
}

export function OutputsPanel(props: Props) {
  const t = useText(outputsText);
  const { lang } = useLang();
  const items = chatOutputs(props.conversation, lang);
  // Same file name rule as the canvas's own download (src/CanvasPanel.tsx).
  const canvasName = (props.conversation.title.trim() || "canvas").replace(/[\\/:*?"<>|\s]+/g, "-").slice(0, 60);
  const row = (item: OutputItem) => {
    switch (item.kind) {
      case "board":
        return (
          <Row key={item.id} item={item} preview={<Icon name="whiteboard" />} onPrimary={props.onOpenBoard}>
            <Action icon="open" label={t.open} onClick={props.onOpenBoard} />
            <Action icon="download" label={t.download} onClick={props.onDownloadBoard} />
          </Row>
        );
      case "canvas":
        return (
          <Row key={item.id} item={item} preview={<Icon name="edit" />} onPrimary={props.onOpenCanvas}>
            <Action icon="open" label={t.open} onClick={props.onOpenCanvas} />
            <Action
              icon="download"
              label={t.download}
              onClick={() => downloadText(`${canvasName}.md`, props.conversation.canvas?.text ?? "", "text/markdown;charset=utf-8")}
            />
          </Row>
        );
      case "image":
        return <ImageRow key={item.id} item={item} onShow={() => props.onShowMessage(item.id)} />;
      case "file":
        return (
          <Row key={item.id} item={item} preview={<Icon name="files" />} onPrimary={props.onOpenFiles}>
            <Action icon="open" label={t.open} onClick={props.onOpenFiles} />
          </Row>
        );
    }
  };
  return (
    <aside className="side-panel outputs-panel" aria-label={t.title}>
      <header className="outputs-head">
        <h2>{t.title}</h2>
        <button type="button" className="outputs-action" aria-label={t.close} title={t.close} onClick={props.onClose}>
          <Icon name="close" />
        </button>
      </header>
      <div className="outputs-body">
        {items.length ? (
          <>
            <ul className="outputs-list">{items.map(row)}</ul>
            <p className="outputs-note">{t.note}</p>
          </>
        ) : (
          <p className="outputs-empty">{t.empty}</p>
        )}
      </div>
    </aside>
  );
}
