// Dropped and pasted files. They are only handed on (to importFiles in App.tsx, the same call the
// file picker makes): nothing is read here. A file dropped anywhere in the window must never make
// the browser open it, because that leaves the app and loses a temporary chat.
import { useEffect, useRef, useState } from "react";

type Transfer = Pick<DataTransfer, "types" | "files"> | null | undefined;

/** A drag or paste that carries files (not selected text, not a link). */
export function carriesFiles(data: Transfer): boolean {
  return !!data && Array.from(data.types ?? []).includes("Files");
}

/** The files of a drop or paste. Empty for plain text, which then stays ordinary text. */
export function filesFrom(data: Transfer): File[] {
  return carriesFiles(data) ? Array.from(data!.files ?? []) : [];
}

/**
 * Window-wide file drops. Returns true while files are dragged over the window. `onFiles` gets the
 * dropped files only while `accept()` is true (the conversation is on screen and no dialog is open);
 * otherwise the drop is swallowed.
 */
export function useFileDrop(onFiles: (files: File[]) => void, accept: () => boolean): boolean {
  const [dragging, setDragging] = useState(false);
  const latest = useRef({ onFiles, accept });
  latest.current = { onFiles, accept };
  useEffect(() => {
    // A visible file field keeps the browser's own drop behaviour.
    const own = (event: DragEvent) =>
      event.target instanceof HTMLInputElement && event.target.type === "file";
    const over = (event: DragEvent) => {
      if (!carriesFiles(event.dataTransfer) || own(event)) return;
      event.preventDefault();
      const open = latest.current.accept();
      event.dataTransfer!.dropEffect = open ? "copy" : "none";
      setDragging(open);
    };
    const leave = (event: DragEvent) => {
      // relatedTarget is empty when the pointer leaves the window.
      if (!event.relatedTarget) setDragging(false);
    };
    const drop = (event: DragEvent) => {
      setDragging(false);
      if (!carriesFiles(event.dataTransfer) || own(event)) return;
      event.preventDefault();
      const files = filesFrom(event.dataTransfer);
      if (files.length && latest.current.accept()) latest.current.onFiles(files);
    };
    window.addEventListener("dragenter", over);
    window.addEventListener("dragover", over);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", over);
      window.removeEventListener("dragover", over);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", drop);
    };
  }, []);
  return dragging;
}
