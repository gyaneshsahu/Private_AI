import { useEffect, useRef, useState } from "react";
import { containDialogFocus } from "./dialog-focus";
import { Icon } from "./Icon";
import {
  NO_CROP,
  PHOTO_ACCEPT,
  PHOTO_CANVAS_ERROR,
  PHOTO_DECODE_ERROR,
  cropRect,
  decodePhoto,
  outputSize,
  photoFileName,
  previewLayout,
  renderPhoto,
  rotatedSize,
  rotationTransform,
  turnRotation,
  type CropInset,
  type PhotoSource,
  type Rotation,
  type Size,
} from "./photo-capture";

type Stage = "choose" | "camera" | "edit" | "preparing";
const PREVIEW_BOX: Size = { width: 560, height: 340 };
const EDGES = ["left", "top", "right", "bottom"] as const;
let photoSequence = 0;

function cameraFailure(cause: unknown): string {
  const name =
    typeof cause === "object" && cause && "name" in cause
      ? String(cause.name)
      : "";
  if (name === "NotAllowedError" || name === "SecurityError")
    return "Camera access was not granted or is blocked by this site's policy. Choose a photo instead.";
  if (name === "NotSupportedError" || name === "TypeError")
    return "Camera capture is not supported in this browser or is blocked by this site's policy. Choose a photo instead.";
  if (name === "NotFoundError" || name === "OverconstrainedError")
    return "No camera was found on this device. Choose a photo instead.";
  if (name === "NotReadableError")
    return "The camera is in use by another app. Close it and try again, or choose a photo.";
  return "The camera could not be started. Choose a photo instead.";
}

/**
 * Deliberate photo capture for local printed-text extraction. The camera is
 * requested only from the Use camera button; tracks stop on capture, discard,
 * close and unmount; the cropped, rotated image is re-encoded before import.
 */
export function PhotoCapture({
  onClose,
  onUse,
}: {
  onClose(): void;
  onUse(file: File): void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const preview = useRef<HTMLCanvasElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const source = useRef<PhotoSource | null>(null);
  const mounted = useRef(true);
  const [stage, setStage] = useState<Stage>("choose");
  const [starting, setStarting] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [sourceSize, setSourceSize] = useState<Size>();
  const [rotation, setRotation] = useState<Rotation>(0);
  const [inset, setInset] = useState<CropInset>(NO_CROP);
  const [error, setError] = useState("");

  const stopCamera = () => {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
    setCameraReady(false);
  };
  const releaseSource = () => {
    source.current?.release();
    source.current = null;
    setSourceSize(undefined);
  };
  const discard = () => {
    stopCamera();
    releaseSource();
    setRotation(0);
    setInset(NO_CROP);
    setError("");
    setStage("choose");
  };

  useEffect(() => {
    mounted.current = true;
    const element = dialog.current;
    const trigger = document.activeElement as HTMLElement | null;
    element?.showModal();
    return () => {
      mounted.current = false;
      stream.current?.getTracks().forEach((track) => track.stop());
      stream.current = null;
      source.current?.release();
      source.current = null;
      element?.close();
      if (trigger?.checkVisibility()) trigger.focus();
      else document.querySelector<HTMLElement>(".tools-menu summary")?.focus();
    };
  }, []);

  useEffect(() => {
    const element = video.current;
    if (stage !== "camera" || !element || !stream.current) return;
    element.srcObject = stream.current;
    void element.play().catch(() => undefined);
  }, [stage]);

  useEffect(() => {
    const canvas = preview.current;
    const current = source.current;
    if ((stage !== "edit" && stage !== "preparing") || !canvas || !current)
      return;
    const rotated = rotatedSize(current, rotation);
    const { scale, size } = previewLayout(rotated, PREVIEW_BOX);
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = "#fff";
    context.fillRect(0, 0, size.width, size.height);
    context.setTransform(scale, 0, 0, scale, 0, 0);
    const turn = rotationTransform(current, rotation);
    context.translate(turn.translateX, turn.translateY);
    context.rotate(turn.angle);
    context.drawImage(current.image, 0, 0, current.width, current.height);
    const crop = cropRect(rotated, inset);
    const x = crop.x * scale;
    const y = crop.y * scale;
    const width = crop.width * scale;
    const height = crop.height * scale;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = "#10121899";
    context.fillRect(0, 0, size.width, y);
    context.fillRect(0, y + height, size.width, size.height - y - height);
    context.fillRect(0, y, x, height);
    context.fillRect(x + width, y, size.width - x - width, height);
    context.strokeStyle = "#6b4bb0";
    context.lineWidth = 2;
    context.strokeRect(
      x + 1,
      y + 1,
      Math.max(0, width - 2),
      Math.max(0, height - 2),
    );
  }, [stage, rotation, inset]);

  async function startCamera() {
    setError("");
    const media = navigator.mediaDevices;
    if (typeof media?.getUserMedia !== "function") {
      setError(
        "Camera access is not available in this browser. Choose a photo instead.",
      );
      return;
    }
    setStarting(true);
    try {
      const next = await media.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      if (!mounted.current || stream.current) {
        next.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = next;
      setStage("camera");
    } catch (cause) {
      if (mounted.current) setError(cameraFailure(cause));
    } finally {
      if (mounted.current) setStarting(false);
    }
  }

  function takePhoto() {
    const element = video.current;
    if (!element || !element.videoWidth || !element.videoHeight) {
      setError("The camera preview is not ready yet.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = element.videoWidth;
    canvas.height = element.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setError(PHOTO_CANVAS_ERROR);
      return;
    }
    context.drawImage(element, 0, 0, canvas.width, canvas.height);
    stopCamera();
    releaseSource();
    source.current = {
      image: canvas,
      width: canvas.width,
      height: canvas.height,
      release: () => {
        canvas.width = 0;
        canvas.height = 0;
      },
    };
    setSourceSize({ width: canvas.width, height: canvas.height });
    setRotation(0);
    setInset(NO_CROP);
    setError("");
    setStage("edit");
  }

  async function choose(file: File | undefined) {
    if (!file) return;
    setError("");
    try {
      const next = await decodePhoto(file);
      if (!mounted.current) {
        next.release();
        return;
      }
      releaseSource();
      source.current = next;
      setSourceSize({ width: next.width, height: next.height });
      setRotation(0);
      setInset(NO_CROP);
      setStage("edit");
    } catch (cause) {
      if (mounted.current)
        setError(cause instanceof Error ? cause.message : PHOTO_DECODE_ERROR);
    }
  }

  async function usePhoto() {
    const current = source.current;
    if (!current) return;
    setStage("preparing");
    setError("");
    try {
      const { file } = await renderPhoto(
        current,
        { rotation, inset },
        { name: photoFileName(++photoSequence) },
      );
      if (!mounted.current) return;
      releaseSource();
      onUse(file);
      onClose();
    } catch (cause) {
      if (!mounted.current) return;
      setError(
        cause instanceof Error ? cause.message : "The photo could not be prepared.",
      );
      setStage("edit");
    }
  }

  const preparing = stage === "preparing";
  const rotated = sourceSize && rotatedSize(sourceSize, rotation);
  const crop = rotated && cropRect(rotated, inset);
  const output = crop && outputSize(crop);
  return (
    <dialog
      ref={dialog}
      className="photo-dialog"
      aria-label="Photo to text"
      onKeyDown={containDialogFocus}
      onCancel={onClose}
      onClose={onClose}
    >
      <div className="row">
        <h2>Photo to text</h2>
        <button
          type="button"
          aria-label="Close photo to text"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <p className="muted">
        Reads printed text from a photo on this device, exactly like an attached
        PNG screenshot. Handwriting, objects and scenes are not understood.
        Nothing is uploaded.
      </p>
      {error && (
        <p className="photo-error" role="alert">
          {error}
        </p>
      )}
      {stage === "choose" && (
        <div className="photo-paths">
          <div className="photo-path">
            <button
              type="button"
              disabled={starting}
              onClick={() => void startCamera()}
            >
              <Icon name="camera" />
              {starting ? "Starting camera…" : "Use camera"}
            </button>
            <small>
              Asks for camera permission only now. Rear camera preferred on
              phones.
            </small>
          </div>
          <div className="photo-path">
            <button type="button" onClick={() => fileInput.current?.click()}>
              <Icon name="image" />
              Choose photo
            </button>
            <small>PNG or JPEG from this device, up to 10 MB.</small>
          </div>
          <input
            ref={fileInput}
            type="file"
            hidden
            accept={PHOTO_ACCEPT}
            aria-label="Choose a PNG or JPEG photo"
            onChange={(event) => {
              void choose(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </div>
      )}
      {stage === "camera" && (
        <div className="photo-stage">
          <video
            ref={video}
            className="photo-video"
            autoPlay
            playsInline
            muted
            aria-label="Camera preview"
            onLoadedMetadata={(event) =>
              setCameraReady(event.currentTarget.videoWidth > 0)
            }
            onPlaying={(event) =>
              setCameraReady(event.currentTarget.videoWidth > 0)
            }
          />
          <p className="muted">
            The camera stays on only while this preview is open. Nothing is kept
            until you press Take photo.
          </p>
          <div className="photo-actions">
            <button
              type="button"
              className="primary"
              disabled={!cameraReady}
              onClick={takePhoto}
            >
              Take photo
            </button>
            <button type="button" onClick={discard}>
              Cancel camera
            </button>
          </div>
        </div>
      )}
      {(stage === "edit" || preparing) && rotated && crop && output && (
        <div className="photo-stage">
          <canvas
            ref={preview}
            className="photo-preview"
            role="img"
            aria-label={`Photo preview, ${rotated.width} by ${rotated.height} pixels, rotated ${rotation} degrees`}
          />
          <div className="photo-actions">
            <button
              type="button"
              disabled={preparing}
              onClick={() => setRotation((r) => turnRotation(r, "left"))}
            >
              Rotate left
            </button>
            <button
              type="button"
              disabled={preparing}
              onClick={() => setRotation((r) => turnRotation(r, "right"))}
            >
              Rotate right
            </button>
          </div>
          <fieldset className="photo-crop">
            <legend>Crop: percent removed from each edge</legend>
            {EDGES.map((edge) => (
              <label key={edge}>
                Crop from {edge} (%)
                <input
                  type="number"
                  min={0}
                  max={95}
                  step={1}
                  inputMode="numeric"
                  value={inset[edge]}
                  disabled={preparing}
                  onChange={(event) => {
                    const value = event.currentTarget.valueAsNumber;
                    setInset((c) => ({
                      ...c,
                      [edge]: Number.isFinite(value) ? value : 0,
                    }));
                  }}
                />
              </label>
            ))}
          </fieldset>
          <p className="muted" aria-live="polite">
            Keeps {crop.width} × {crop.height} of {rotated.width} ×{" "}
            {rotated.height} pixels; saved as a {output.width} × {output.height}{" "}
            PNG.
          </p>
          <p className="muted">
            Only this cropped, re-encoded PNG is used for local text extraction.
            Camera metadata such as location, device and time is not kept.
            Nothing leaves this device.
          </p>
          <div className="photo-actions">
            <button
              type="button"
              className="primary"
              disabled={preparing}
              onClick={() => void usePhoto()}
            >
              {preparing ? "Preparing photo…" : "Use this photo"}
            </button>
            <button type="button" disabled={preparing} onClick={discard}>
              Discard
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
