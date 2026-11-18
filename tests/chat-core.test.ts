// Chat core fixes of 16 November: titles, failure kinds and sentences, where a pasted picture goes,
// and the count labels in English and German.
import { describe, expect, it } from "vitest";
import { failureKind, failureSentence } from "../src/chat-failures";
import { routeFiles } from "../src/file-drop";
import { AttestationBusyError, DeploymentChangedError } from "../src/providers/inference-client";
import { IncompleteReplyError } from "../src/reply-stream";
import { appText } from "../src/text/app";
import { chatCoreText } from "../src/text/chat-core";
import { titleFrom } from "../src/title-from";

describe("titleFrom", () => {
  it("names a chat begun from a starter chip after the words the user added", () => {
    const starter = "Help me write a clear, friendly message. Here’s what I want to say: ";
    expect(titleFrom(`${starter}thanks for dinner, but not Friday.`, 60, [starter])).toBe("thanks for dinner, but not Friday.");
    expect(titleFrom(starter, 60, [starter])).toBe("Help me write a clear, friendly message. Here’s what I want…");
    expect(titleFrom("Plan my week", 60, [starter])).toBe("Plan my week");
  });
  it("keeps a short first line as it is", () => {
    expect(titleFrom("  Plan my week \nwith more detail")).toBe("Plan my week");
  });
  it("cuts a long line at the last word boundary within 60 characters, then adds …", () => {
    const text = "Please help me write a friendly but firm message to my landlord about the heating";
    const title = titleFrom(text);
    expect(title).toBe("Please help me write a friendly but firm message to my…");
    expect(title.length).toBeLessThanOrEqual(61);
  });
  it("keeps a word that ends exactly at 60 characters", () => {
    const sixty = "a".repeat(55) + " bbbb";
    expect(titleFrom(`${sixty} more`)).toBe(`${sixty}…`);
  });
  it("cuts one very long word inside the word", () => {
    expect(titleFrom("x".repeat(80))).toBe(`${"x".repeat(60)}…`);
  });
});

describe("failure kinds", () => {
  const incomplete = (code: string) =>
    new IncompleteReplyError("synthetic", undefined, {
      code: code as never,
      events: 0,
      usageEvents: 0,
      textCharacters: 0,
      finish: "",
    });
  it("tells each failure apart", () => {
    expect(failureKind(new Error("x"), true)).toBe("stopped");
    expect(failureKind(new AttestationBusyError(), false)).toBe("busy");
    expect(failureKind(incomplete("HTTP_RATE_LIMITED"), false)).toBe("busy");
    expect(failureKind(incomplete("HTTP_CAPACITY_REACHED"), false)).toBe("capacity");
    expect(failureKind(incomplete("HTTP_SERVICE_UNAVAILABLE"), false)).toBe("unavailable");
    expect(failureKind(incomplete("HTTP_MODEL_NOT_FOUND"), false)).toBe("unavailable");
    expect(failureKind(new DeploymentChangedError(), false)).toBe("unavailable");
    expect(failureKind(incomplete("TRANSPORT_OR_DECRYPTION"), false)).toBe("incomplete");
    expect(failureKind(incomplete("MISSING_DONE"), false)).toBe("incomplete");
    expect(failureKind(incomplete("OUTPUT_LIMIT_REACHED"), false)).toBe("incomplete");
    expect(failureKind(incomplete("TIMED_OUT"), false)).toBe("timeout");
    expect(failureKind(incomplete("HTTP_UPSTREAM_REJECTED"), false)).toBe("error");
    expect(failureKind(incomplete("INVALID_JSON"), false)).toBe("error");
    // A withheld research answer carries no stream code.
    expect(failureKind(new IncompleteReplyError("withheld"), false)).toBe("error");
    expect(failureKind(new DOMException("x", "TimeoutError"), false)).toBe("timeout");
    expect(failureKind(new Error("anything else"), false)).toBe("error");
  });
  it("has one plain sentence per kind in both languages, the generic one for unknown kinds", () => {
    for (const lang of ["en", "de"] as const) {
      const seen = new Set<string>();
      for (const kind of ["stopped", "timeout", "busy", "capacity", "unavailable", "incomplete", "empty", "error"]) {
        const sentence = failureSentence(kind, lang);
        expect(sentence).toBeTruthy();
        expect(sentence).not.toContain("undefined");
        seen.add(sentence);
      }
      expect(seen.size).toBe(8);
      expect(failureSentence("capacity", lang)).not.toMatch(/minute/i);
      expect(failureSentence("from-a-newer-version", lang)).toBe(chatCoreText[lang].failureError);
      expect(appText[lang].failure("stopped")).toBe(chatCoreText[lang].failureStopped);
    }
    expect(appText.en.protectedUnavailable(false)).not.toContain("provider verification");
    expect(appText.de.protectedUnavailable(false)).not.toContain("Überprüfung des Anbieters");
  });
});

describe("routeFiles", () => {
  const file = (name: string, type: string) => new File(["x"], name, { type });
  it("sends one picture to the picture question while image questions are on", () => {
    const picture = file("a.png", "image/png");
    expect(routeFiles([picture], true)).toEqual({ to: "image", file: picture });
    expect(routeFiles([file("a.jpg", "image/jpeg")], true).to).toBe("image");
  });
  it("keeps the text reader for documents, several files, other image types, or with the feature off", () => {
    expect(routeFiles([file("a.png", "image/png")], false).to).toBe("reader");
    expect(routeFiles([file("a.pdf", "application/pdf")], true).to).toBe("reader");
    expect(routeFiles([file("a.png", "image/png"), file("b.png", "image/png")], true).to).toBe("reader");
    expect(routeFiles([file("a.gif", "image/gif")], true).to).toBe("reader");
  });
});

describe("count labels", () => {
  it("say one and many in English and German, with no trailing separator", () => {
    expect(appText.en.contextCount(1, 1)).toBe("1 message included · 1 file");
    expect(appText.en.contextCount(2, 0)).toBe("2 messages included · 0 files");
    expect(appText.de.contextCount(1, 1)).toBe("1 Nachricht einbezogen · 1 Datei");
    expect(appText.de.contextCount(3, 2)).toBe("3 Nachrichten einbezogen · 2 Dateien");
    expect(appText.en.messageCount(1)).toBe("1 message");
    expect(appText.en.messageCount(2)).toBe("2 messages");
    expect(appText.de.messageCount(1)).toBe("1 Nachricht");
    expect(appText.de.messageCount(4)).toBe("4 Nachrichten");
  });
});
