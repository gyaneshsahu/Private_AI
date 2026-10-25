import { crc32 } from "node:zlib";
import { test, expect, type Page } from "@playwright/test";
import { listImageMetadata, sniffImageType } from "../../src/photo-capture";

type Probe = Window & {
  __media: { calls: unknown[]; tracks: MediaStreamTrack[] };
  __posted: { name: string; type: string; base64: string }[];
  __closed: number;
};

/** Record getUserMedia calls and answer with a synthetic printed-text stream. */
function stubCamera() {
  const media = { calls: [] as unknown[], tracks: [] as MediaStreamTrack[] };
  (window as unknown as Probe).__media = media;
  if (!navigator.mediaDevices)
    Object.defineProperty(navigator, "mediaDevices", {
      value: {},
      configurable: true,
    });
  navigator.mediaDevices.getUserMedia = async (constraints) => {
    media.calls.push(JSON.parse(JSON.stringify(constraints ?? null)));
    const canvas = document.createElement("canvas");
    canvas.width = 1000;
    canvas.height = 240;
    const context = canvas.getContext("2d")!;
    const paint = () => {
      context.fillStyle = "white";
      context.fillRect(0, 0, 1000, 240);
      context.fillStyle = "black";
      context.font = "48px Arial";
      context.fillText("Invoice total 4821 EUR", 30, 130);
    };
    paint();
    setInterval(paint, 100);
    const stream = canvas.captureStream(15);
    media.tracks.push(...stream.getTracks());
    return stream;
  };
}

/** Capture every file handed to the local extraction worker. */
function captureWorkerFiles() {
  const posted: Probe["__posted"] = [];
  (window as unknown as Probe).__posted = posted;
  const original = Worker.prototype.postMessage;
  Worker.prototype.postMessage = function (this: Worker, ...args: unknown[]) {
    const [message] = args;
    if (message instanceof File) {
      const reader = new FileReader();
      reader.onload = () =>
        posted.push({
          name: message.name,
          type: message.type,
          base64: String(reader.result).split(",")[1],
        });
      reader.readAsDataURL(message);
    }
    return (original as (...rest: unknown[]) => void).apply(this, args);
  };
}

function countBitmapReleases() {
  (window as unknown as Probe).__closed = 0;
  const close = ImageBitmap.prototype.close;
  ImageBitmap.prototype.close = function (this: ImageBitmap) {
    (window as unknown as Probe).__closed += 1;
    return close.call(this);
  };
}

async function printedText(page: Page, text: string): Promise<Buffer> {
  const base64 = await page.evaluate((value) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1000;
    canvas.height = 200;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "white";
    context.fillRect(0, 0, 1000, 200);
    context.fillStyle = "black";
    context.font = "48px Arial";
    context.fillText(value, 30, 100);
    return canvas.toDataURL("image/png").split(",")[1];
  }, text);
  return Buffer.from(base64, "base64");
}

/** Insert a PNG tEXt chunk directly after IHDR, as cameras and editors do. */
function withTextChunk(png: Buffer, keyword: string, value: string): Buffer {
  const body = Buffer.concat([
    Buffer.from("tEXt"),
    Buffer.from(`${keyword}\0${value}`),
  ]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(body.length - 4);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([
    png.subarray(0, 33),
    length,
    body,
    crc,
    png.subarray(33),
  ]);
}

function trackDisclosures(page: Page): string[] {
  const disclosures: string[] = [];
  page.on("request", (request) => {
    if (
      request.method() !== "GET" ||
      new URL(request.url()).origin !== "http://127.0.0.1:4173"
    )
      disclosures.push(request.url());
  });
  return disclosures;
}

async function openPhotoDialog(page: Page) {
  await page.getByLabel("Attachments and tools", { exact: true }).click();
  await page
    .locator(".tools-menu")
    .getByRole("button", { name: "Photo to text", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Photo to text" });
  await expect(dialog).toBeVisible();
  return dialog;
}

test("a chosen photo is previewed, rotated, cropped, re-encoded without metadata and read locally", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const disclosures = trackDisclosures(page);
  await page.addInitScript(stubCamera);
  await page.addInitScript(captureWorkerFiles);
  await page.goto("/");
  const photo = withTextChunk(
    await printedText(page, "Total: 120.50 EUR"),
    "Comment",
    "SYNTHETIC METADATA CANARY",
  );
  expect(listImageMetadata(photo)).toEqual(["tEXt"]);
  await page
    .getByLabel("Message CometRow")
    .fill("Read this synthetic receipt");
  const dialog = await openPhotoDialog(page);
  expect(
    await page.evaluate(
      () => (window as unknown as Probe).__media.calls.length,
    ),
  ).toBe(0);
  await dialog.getByLabel("Choose a PNG or JPEG photo").setInputFiles({
    name: "receipt.png",
    mimeType: "image/png",
    buffer: photo,
  });
  await expect(
    dialog.getByRole("img", { name: /^Photo preview/ }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Rotate right", exact: true })
    .click();
  await expect(
    dialog.getByRole("img", {
      name: "Photo preview, 200 by 1000 pixels, rotated 90 degrees",
    }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Rotate left", exact: true })
    .click();
  await expect(
    dialog.getByRole("img", {
      name: "Photo preview, 1000 by 200 pixels, rotated 0 degrees",
    }),
  ).toBeVisible();
  await dialog.getByLabel("Crop from left (%)").fill("2");
  await dialog.getByLabel("Crop from right (%)").fill("2");
  await expect(dialog).toContainText("Keeps 960 × 200 of 1000 × 200 pixels");
  await expect(dialog).toContainText("saved as a 960 × 200 PNG");
  await expect(dialog).toContainText(
    "Camera metadata such as location, device and time is not kept",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await dialog
    .getByRole("button", { name: "Use this photo", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  const attachments = page.getByRole("list", {
    name: "Conversation attachments",
  });
  await expect(attachments.getByRole("listitem")).toHaveCount(1, {
    timeout: 45000,
  });
  await expect(attachments).toContainText(/photo-\d+\.png/);
  await expect(page.getByLabel("Message CometRow")).toHaveValue(
    "Read this synthetic receipt",
  );
  const posted = await page.evaluate(
    () => (window as unknown as Probe).__posted,
  );
  expect(posted).toHaveLength(1);
  expect(posted[0].name).toMatch(/^photo-\d+\.png$/);
  expect(posted[0].type).toBe("image/png");
  const bytes = Buffer.from(posted[0].base64, "base64");
  expect(sniffImageType(bytes)).toBe("image/png");
  expect(listImageMetadata(bytes)).toEqual([]);
  expect(bytes.includes("SYNTHETIC METADATA CANARY")).toBe(false);
  expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([960, 200]);
  await attachments
    .getByRole("button", { name: /^Review photo-\d+\.png$/ })
    .click();
  await page.locator(".content-view details summary").first().click();
  await expect(
    page.getByLabel(/^Text for photo-\d+\.png page 1$/),
  ).toContainText("120.50 EUR");
  expect(
    await page.evaluate(
      () => (window as unknown as Probe).__media.calls.length,
    ),
  ).toBe(0);
  expect(disclosures).toEqual([]);
});

test("the camera is requested only from Use camera, prefers the rear camera, stops after capture and the frame is read locally", async ({
  page,
}) => {
  const disclosures = trackDisclosures(page);
  await page.addInitScript(stubCamera);
  await page.goto("/");
  const dialog = await openPhotoDialog(page);
  expect(
    await page.evaluate(() => (window as unknown as Probe).__media.calls),
  ).toEqual([]);
  await dialog.getByRole("button", { name: "Use camera", exact: true }).click();
  await expect(dialog.getByLabel("Camera preview")).toBeVisible();
  expect(
    await page.evaluate(() => (window as unknown as Probe).__media.calls),
  ).toEqual([
    { video: { facingMode: { ideal: "environment" } }, audio: false },
  ]);
  await expect(dialog).toContainText(
    "The camera stays on only while this preview is open",
  );
  const take = dialog.getByRole("button", { name: "Take photo", exact: true });
  await expect(take).toBeEnabled({ timeout: 15000 });
  await take.click();
  await expect(
    dialog.getByRole("img", {
      name: "Photo preview, 1000 by 240 pixels, rotated 0 degrees",
    }),
  ).toBeVisible();
  await expect(dialog.getByLabel("Camera preview")).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      (window as unknown as Probe).__media.tracks.map(
        (track) => track.readyState,
      ),
    ),
  ).toEqual(["ended"]);
  await dialog
    .getByRole("button", { name: "Use this photo", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  const attachments = page.getByRole("list", {
    name: "Conversation attachments",
  });
  await expect(attachments.getByRole("listitem")).toHaveCount(1, {
    timeout: 45000,
  });
  await attachments
    .getByRole("button", { name: /^Review photo-\d+\.png$/ })
    .click();
  await page.locator(".content-view details summary").first().click();
  await expect(
    page.getByLabel(/^Text for photo-\d+\.png page 1$/),
  ).toContainText("4821");
  expect(
    await page.evaluate(
      () => (window as unknown as Probe).__media.calls.length,
    ),
  ).toBe(1);
  expect(disclosures).toEqual([]);
});

test("discard releases decoded bitmaps, malformed photos are refused, an absent camera explains itself, and Escape closes without importing", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(countBitmapReleases);
  await page.goto("/");
  const photo = await printedText(page, "Synthetic note");
  await page.getByLabel("Message CometRow").fill("Keep this synthetic draft");
  const dialog = await openPhotoDialog(page);
  const chooser = dialog.getByLabel("Choose a PNG or JPEG photo");
  await chooser.setInputFiles({
    name: "note.png",
    mimeType: "image/png",
    buffer: photo,
  });
  await expect(
    dialog.getByRole("img", { name: /^Photo preview/ }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Discard", exact: true }).click();
  await expect(dialog.getByRole("img", { name: /^Photo preview/ })).toHaveCount(
    0,
  );
  await expect(
    dialog.getByRole("button", { name: "Use camera", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as Probe).__closed)).toBe(
    1,
  );
  await chooser.setInputFiles({
    name: "broken.png",
    mimeType: "image/png",
    buffer: Buffer.from("not a png at all"),
  });
  await expect(dialog.getByRole("alert")).toContainText(
    "Choose a PNG or JPEG photo",
  );
  await chooser.setInputFiles({
    name: "truncated.png",
    mimeType: "image/png",
    buffer: photo.subarray(0, 60),
  });
  await expect(dialog.getByRole("alert")).toContainText("could not be decoded");
  await chooser.setInputFiles({
    name: "disguised.png",
    mimeType: "image/png",
    buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x02]),
  });
  await expect(dialog.getByRole("alert")).toContainText("do not match");
  await expect(dialog.getByRole("img", { name: /^Photo preview/ })).toHaveCount(
    0,
  );
  // The served app sends Permissions-Policy camera=(self): the document may
  // ask for the camera. Playwright's headless browser has no media capture at
  // all, so a real request still fails here; the proof is that the policy
  // allows the feature and the rejection is not a policy or permission
  // denial, while the dialog explains itself and keeps the photo path open.
  expect(
    await page.evaluate(() => {
      const doc = document as unknown as {
        permissionsPolicy?: { allowsFeature(name: string): boolean };
        featurePolicy?: { allowsFeature(name: string): boolean };
      };
      return (
        (doc.permissionsPolicy ?? doc.featurePolicy)?.allowsFeature("camera") ??
        null
      );
    }),
  ).toBe(true);
  await page.context().grantPermissions(["camera"]);
  await page.evaluate(() => {
    const media = navigator.mediaDevices;
    const original = media.getUserMedia.bind(media);
    (window as unknown as { __cameraError?: string }).__cameraError = "";
    media.getUserMedia = async (constraints) => {
      try {
        return await original(constraints);
      } catch (cause) {
        (window as unknown as { __cameraError?: string }).__cameraError =
          cause instanceof Error ? cause.name : String(cause);
        throw cause;
      }
    };
  });
  await dialog.getByRole("button", { name: "Use camera", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Choose a photo instead.",
  );
  const cameraError = await page.evaluate(
    () => (window as unknown as { __cameraError?: string }).__cameraError,
  );
  expect(cameraError).not.toBe("");
  expect(["NotAllowedError", "SecurityError"]).not.toContain(cameraError);
  await expect(dialog.getByLabel("Camera preview")).toHaveCount(0);
  await expect(
    dialog.getByRole("button", { name: "Choose photo", exact: true }),
  ).toBeEnabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  expect(
    await page.evaluate(() =>
      document.activeElement?.getAttribute("aria-label"),
    ),
  ).toBe("Attachments and tools");
  await expect(
    page.getByRole("list", { name: "Conversation attachments" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "File import results" }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Message CometRow")).toHaveValue(
    "Keep this synthetic draft",
  );
});
