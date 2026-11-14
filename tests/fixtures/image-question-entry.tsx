// Picture questions in a real browser, for tests/image-redaction-ui.test.ts: the cover-up tool or
// the whole flow, with synthetic pictures only. `window.picture` exposes the real pipeline so the
// test can feed it bytes and read the bytes that would be sent.
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { LangProvider } from "../../src/i18n";
import { ImageQuestion, ImageRedactor, AttachedImageNote } from "../../src/ImageQuestion";
import { encodeForSending, sendSize, toAttachedImage, type AttachedImage } from "../../src/image-upload";
import { decodePhoto, renderPhoto, NO_CROP, type Rect } from "../../src/photo-capture";
import type { HealthConsentChoice } from "../../src/health-consent";
import "../../src/styles.css";
import "../../src/chat-design.css";

const query = new URLSearchParams(location.search);

/** A synthetic page: white, with a red band at the top and lines of dark "text". */
async function syntheticPng(width = 1200, height = 900): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#fff";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#d22";
  context.fillRect(0, 0, width, 120);
  context.fillStyle = "#123";
  context.font = "36px sans-serif";
  context.fillText("Synthetic letter: erika.mustermann@example.org", 60, 300);
  context.fillText("IBAN DE89 3704 0044 0532 0130 00", 60, 380);
  const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
  return new File([blob], "synthetic.png", { type: "image/png" });
}

const picture = {
  /** A clean JPEG from this browser's own encoder, for the test to add metadata to. */
  async jpeg(width: number, height: number): Promise<number[]> {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#e33";
    context.fillRect(0, 0, width, height);
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.9));
    return [...new Uint8Array(await blob.arrayBuffer())];
  },
  /** The whole path of a chosen file: validate and decode, re-encode (photo dialog), boxes, JPEG under the cap. */
  async send(bytes: number[], type: string, boxes: Rect[], maxBytes: number) {
    const source = await decodePhoto(new File([new Uint8Array(bytes)], "chosen", { type }));
    const { file } = await renderPhoto(source, { rotation: 0, inset: NO_CROP }, { name: "photo-1.png" });
    source.release();
    const bitmap = await createImageBitmap(file);
    const size = sendSize(bitmap);
    const sent = await toAttachedImage(await encodeForSending(bitmap, size, boxes, maxBytes));
    bitmap.close();
    return {
      intermediate: [...new Uint8Array(await file.arrayBuffer())],
      bytes: [...Uint8Array.from(atob(sent.dataUrl.split(",")[1]), (c) => c.charCodeAt(0))],
      dataUrl: sent.dataUrl,
      width: sent.width,
      height: sent.height,
    };
  },
  /** Red, green, blue of every pixel in a region of an encoded picture. */
  async pixels(dataUrl: string, region: Rect): Promise<number[][]> {
    const bitmap = await createImageBitmap(await (await fetch(dataUrl)).blob());
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d")!;
    context.drawImage(bitmap, 0, 0);
    const { data } = context.getImageData(region.x, region.y, region.width, region.height);
    const out: number[][] = [];
    for (let i = 0; i < data.length; i += 4) out.push([data[i], data[i + 1], data[i + 2]]);
    return out;
  },
};
Object.assign(window, { picture });

function Fixture() {
  const [file, setFile] = useState<File>();
  const [attached, setAttached] = useState<AttachedImage>();
  const [open, setOpen] = useState(true);
  const [notice, setNotice] = useState("");
  const [consent, setConsent] = useState<HealthConsentChoice | undefined>(
    (query.get("choice") as HealthConsentChoice | null) ?? undefined,
  );
  React.useEffect(() => void syntheticPng().then(setFile), []);
  return (
    <main className="chat-design" style={{ padding: 12 }}>
      <p data-testid="notice">{notice}</p>
      <p data-testid="consent">{consent ?? "none"}</p>
      {attached && <AttachedImageNote image={attached} onRemove={() => setAttached(undefined)} />}
      {query.get("view") === "flow"
        ? open && (
            <ImageQuestion
              maxBytes={280_000}
              thinkingChosen={query.has("thinking")}
              consentOn={query.has("consent")}
              consentChoice={consent}
              onConsent={setConsent}
              onAttach={setAttached}
              onClose={() => setOpen(false)}
              notify={setNotice}
            />
          )
        : file &&
          !attached && (
            <ImageRedactor
              file={file}
              maxBytes={280_000}
              thinkingChosen={query.has("thinking")}
              onAttach={setAttached}
              onDiscard={() => setNotice("discarded")}
            />
          )}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <LangProvider>
    <Fixture />
  </LangProvider>,
);
