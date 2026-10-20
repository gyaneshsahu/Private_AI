import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  emptyConversation,
  type AppStatus,
  type Conversation,
  type Disclosure,
  type Source,
} from "../shared/contracts";
import {
  composeContext,
  measureContext,
  newMessage,
  selectedSources,
} from "./conversation";
import { DOCUMENT_ACCEPT } from "./document-formats";
import { importDocuments, type ImportOutcome } from "./document-import";
import { Vault, VaultConflictError } from "./vault";
import { VaultBackup } from "./VaultBackup";
import { VaultSecurity } from "./VaultSecurity";
import { BACKUP_MAX_BYTES } from "./vault-backup";
import { containsTemporaryResearch } from "./saved-conversation";
import { ConversationLibrary } from "./ConversationLibrary";
import { ConversationBranches } from "./ConversationBranches";
import { branchConversation, switchBranch } from "./conversation-branches";
import { ContextReview } from "./ContextReview";
import { correctSource, sourceHistoryStatus } from "./source-history";
import { AccountUsage } from "./AccountUsage";
import { SupportPanel } from "./SupportPanel";
import { calculate } from "./calculator";
import { IncompleteReplyError } from "./reply-stream";
import { abortable } from "./abortable";
import { createCalculationSession } from "./calculation-session";
import { parseResearchResult, researchSourceUrl } from "./research-result";

type Tab =
  "Conversation" | "Context" | "Research" | "Saved" | "Account" | "Help";
const Answer = lazy(() =>
  import("./Answer").then((module) => ({ default: module.Answer })),
);
export function App() {
  const [appearance, setAppearance] = useState<"system" | "light" | "dark">(
    "system",
  );
  const [systemDark, setSystemDark] = useState(
    () => matchMedia("(prefers-color-scheme: dark)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemDark(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const [tab, setTab] = useState<Tab>(() =>
    new URLSearchParams(location.search).has("billing")
      ? "Account"
      : "Conversation",
  );
  const [conversation, setConversation] =
    useState<Conversation>(emptyConversation);
  const [calculationSession] = useState(createCalculationSession);
  useEffect(() => {
    calculationSession.synchronize(conversation);
  }, [calculationSession, conversation]);
  useEffect(() => () => calculationSession.clear(), [calculationSession]);
  const [status, setStatus] = useState<AppStatus>();
  const [input, setInput] = useState("");
  const [notice, setNotice] = useState("");
  const savedBase = useRef<Conversation | null>(null);
  const [saveConflict, setSaveConflict] = useState(false);
  const [imports, setImports] = useState<ImportOutcome[]>([]);
  const selectedContextSize = useMemo(
    () => measureContext(conversation, input),
    [conversation, input],
  );
  const [busy, setBusy] = useState("");
  const [source, setSource] = useState<Source>();
  const chatFileInput = useRef<HTMLInputElement>(null);
  const [researchKind, setResearchKind] = useState<"search" | "page">("search");
  const [query, setQuery] = useState("");
  const [proposal, setProposal] = useState<Disclosure>();
  const [passphrase, setPassphrase] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [saved, setSaved] = useState<Conversation[]>([]);
  const [unreadableSnapshots, setUnreadableSnapshots] = useState(0);
  const [editId, setEditId] = useState<string>();
  const [editText, setEditText] = useState("");
  const [operandA, setOperandA] = useState("");
  const [operandB, setOperandB] = useState("");
  const [operation, setOperation] = useState("+");
  const [calculation, setCalculation] = useState("");
  const controller = useRef<AbortController | null>(null);
  const vault = useRef<Vault | null>(null);
  const epoch = useRef(0);
  const accessNavigation = useRef(false);
  const outputEnd = useRef<HTMLDivElement>(null);
  const unsaved = useMemo(() => {
    const previous = saved.find((item) => item.id === conversation.id);
    if (!previous)
      return !!(
        input.length ||
        conversation.title !== "New conversation" ||
        conversation.messages.length ||
        conversation.attachments.length
      );
    return (
      JSON.stringify({ ...conversation, draft: input }) !==
      JSON.stringify({ ...previous, draft: previous.draft ?? "" })
    );
  }, [conversation, input, saved]);
  useEffect(() => {
    if (!unsaved) return;
    const warn = (event: BeforeUnloadEvent) => {
      if (accessNavigation.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);
  const allowReplace = () =>
    !unsaved ||
    window.confirm(
      "Discard unsaved workspace changes? Cancel to keep working or save an encrypted snapshot first.",
    );
  useEffect(() => {
    if (!source) return;
    const previous = document.activeElement as HTMLElement;
    const dialog = document.querySelector<HTMLElement>(".source-dialog");
    const buttons = dialog?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
    );
    buttons?.[0]?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSource(undefined);
      if (event.key === "Tab" && buttons?.length) {
        if (event.shiftKey && document.activeElement === buttons[0]) {
          event.preventDefault();
          buttons[buttons.length - 1].focus();
        } else if (
          !event.shiftKey &&
          document.activeElement === buttons[buttons.length - 1]
        ) {
          event.preventDefault();
          buttons[0].focus();
        }
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [source]);
  useEffect(() => {
    let active = true;
    fetch("/api/status", { cache: "no-store" })
      .then(async (r) => {
        if (r.status === 401) {
          const denied = await r.json();
          if (active && denied.consumerWorkspace === true) {
            accessNavigation.current = true;
            window.location.assign("/auth");
            return undefined;
          }
        }
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        if (active && data) {
          store.selectAccount(data.accountId);
          setStatus(data);
        }
      })
      .catch(() => {
        if (active)
          setNotice("Local service unavailable. Reload after it is running.");
      });
    const store = new Vault();
    vault.current = store;
    store.onInvalidate = () => {
      savedBase.current = null;
      setSaveConflict(false);
      controller.current?.abort();
      controller.current = null;
      epoch.current++;
      setBusy("");
      setImports([]);
      setConversation(emptyConversation());
      setSource(undefined);
      setUnlocked(false);
      setSaved([]);
      setUnreadableSnapshots(0);
      setInput("");
      setQuery("");
      setProposal(undefined);
      setEditId(undefined);
      setEditText("");
      setOperandA("");
      setOperandB("");
      setCalculation("");
      setPassphrase("");
      setNotice(
        "Vault changed or locked in another tab. Private content cleared here.",
      );
    };
    let timer: ReturnType<typeof setTimeout>;
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(
        () => {
          if (store.unlocked) {
            store.lock();
            store.onInvalidate?.();
          }
        },
        15 * 60 * 1000,
      );
    };
    resetTimer();
    window.addEventListener("pointerdown", resetTimer);
    window.addEventListener("keydown", resetTimer);
    return () => {
      active = false;
      clearTimeout(timer);
      window.removeEventListener("pointerdown", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      controller.current?.abort();
      store.close();
    };
  }, []);
  useEffect(() => {
    outputEnd.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "end",
    });
  }, [conversation.messages.length]);
  useEffect(() => {
    if (editId) document.getElementById("edited-message")?.focus();
  }, [editId]);
  const reset = () => {
    savedBase.current = null;
    setSaveConflict(false);
    controller.current?.abort();
    controller.current = null;
    epoch.current++;
    setBusy("");
    setImports([]);
    setConversation(emptyConversation());
    setSource(undefined);
    setInput("");
    setQuery("");
    setProposal(undefined);
    setEditId(undefined);
    setEditText("");
    setOperandA("");
    setOperandB("");
    setCalculation("");
    setPassphrase("");
    setNotice(
      "New temporary conversation. Previous unsaved content has been cleared.",
    );
  };
  const fail = (message: string) => setNotice(message);
  async function copyAnswer(text: string) {
    const current = epoch.current;
    try {
      await navigator.clipboard.writeText(text);
      if (current === epoch.current)
        setNotice("Answer copied to your clipboard.");
    } catch {
      if (current === epoch.current)
        fail("Could not copy. Select the answer text and copy it manually.");
    }
  }
  useEffect(() => {
    if (!status?.accountId) return;
    let active = true;
    let pending = false;
    const abort = new AbortController();
    abort.signal.addEventListener("abort", () => calculationSession.clear(), {
      once: true,
    });
    const checkAccess = async () => {
      if (pending || !active) return;
      pending = true;
      try {
        const response = await fetch("/api/status", {
          cache: "no-store",
          signal: abort.signal,
        });
        const next: AppStatus | undefined = response.ok
          ? await response.json()
          : undefined;
        if (!active) return;
        if (
          response.status === 401 ||
          (next &&
            (next.accountId !== status.accountId ||
              next.accessEpoch !== status.accessEpoch))
        ) {
          vault.current?.close(false);
          vault.current?.onInvalidate?.();
          accessNavigation.current = true;
          window.location.assign(response.status === 401 ? "/auth" : "/");
        } else if (next) {
          setStatus(next);
        }
      } catch {
        /* A network outage does not grant access or delete saved data. */
      } finally {
        pending = false;
      }
    };
    const timer = setInterval(() => void checkAccess(), 30000);
    const focus = () => void checkAccess();
    window.addEventListener("focus", focus);
    window.addEventListener("pageshow", focus);
    const visible = () => {
      if (document.visibilityState === "visible") void checkAccess();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      active = false;
      abort.abort();
      clearInterval(timer);
      window.removeEventListener("focus", focus);
      window.removeEventListener("pageshow", focus);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [status?.accountId, status?.accessEpoch]);
  async function api(path: string, data: unknown, signal?: AbortSignal) {
    if (!status) throw new Error("Service is unavailable.");
    const response = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-PrivateAI-CSRF": status.csrf,
      },
      body: JSON.stringify(data),
      signal,
    });
    const result = await response.json();
    if (response.status === 401 && status.accountId) {
      vault.current?.lock();
      vault.current?.onInvalidate?.();
      accessNavigation.current = true;
      window.location.assign("/auth");
    }
    if (!response.ok) throw new Error(result.error ?? "Request failed.");
    return result;
  }
  async function signOutConsumer() {
    if (!status?.consumerWorkspace || busy || !allowReplace()) return;
    setBusy("Signing out…");
    try {
      await api("/api/auth/sign-out", {});
      vault.current?.lock();
      vault.current?.onInvalidate?.();
      accessNavigation.current = true;
      window.location.assign("/auth");
    } catch {
      setBusy("");
      fail(
        "Sign-out could not be confirmed. Your workspace is still here; try again when the service is available.",
      );
    }
  }
  async function send(base = conversation, text = input, consumeDraft = true) {
    if (busy || !status?.inference.ready || !text.trim()) return;
    const next = {
      ...base,
      title:
        base.title.trim() &&
        (base.messages.length || base.title !== "New conversation")
          ? base.title
          : text.trim().slice(0, 60),
      messages: [...base.messages, newMessage("user", text.trim())],
    };
    try {
      composeContext(
        next,
        status.inference.qualification?.maxInputCharacters ?? 100000,
      );
    } catch {
      fail(
        "Selected context is too large. Reduce included messages or attachments, or shorten your question. Your draft and conversation are unchanged.",
      );
      return;
    }
    const answer = {
      ...newMessage("assistant", ""),
      status: "partial" as const,
      sourceSnapshot: structuredClone(selectedSources(next)),
    };
    setConversation({ ...next, messages: [...next.messages, answer] });
    if (consumeDraft) setInput("");
    setNotice("");
    setBusy("Preparing private context…");
    const abort = new AbortController();
    abort.signal.addEventListener("abort", () => calculationSession.clear(), {
      once: true,
    });
    controller.current = abort;
    const current = epoch.current;
    try {
      const { streamReply } = await abortable(
        import("./inference"),
        abort.signal,
      );
      abort.signal.throwIfAborted();
      const usage = await streamReply(
        next,
        status.inference.qualification,
        status.csrf,
        abort.signal,
        (chunk) => {
          if (epoch.current === current && !abort.signal.aborted)
            setConversation((c) => ({
              ...c,
              messages: c.messages.map((m) =>
                m.id === answer.id ? { ...m, text: m.text + chunk } : m,
              ),
            }));
        },
        (message) => {
          if (epoch.current === current && !abort.signal.aborted)
            setBusy(message);
        },
        calculationSession,
      );
      abort.signal.throwIfAborted();
      if (epoch.current === current) {
        setConversation((c) => ({
          ...c,
          messages: c.messages.map((m) =>
            m.id === answer.id
              ? {
                  ...m,
                  status: m.text ? "complete" : "error",
                  ...(!m.text ? { failure: "empty" as const } : {}),
                }
              : m,
          ),
          usage: usage ? [...c.usage, usage] : c.usage,
        }));
        if (!usage)
          setNotice(
            "Provider usage was not reported. This request’s cost remains unknown.",
          );
      }
    } catch (error) {
      calculationSession.clear();
      if (epoch.current === current) {
        setConversation((c) => ({
          ...c,
          messages: c.messages.map((m) =>
            m.id === answer.id
              ? {
                  ...m,
                  status: "partial",
                  failure: abort.signal.aborted
                    ? "stopped"
                    : error instanceof IncompleteReplyError
                      ? [
                          "HTTP_RATE_LIMITED",
                          "HTTP_SERVICE_UNAVAILABLE",
                        ].includes(error.diagnostic?.code ?? "")
                        ? "unavailable"
                        : "incomplete"
                      : error instanceof Error && error.name === "TimeoutError"
                        ? "timeout"
                        : "unavailable",
                }
              : m,
          ),
          usage:
            error instanceof IncompleteReplyError && error.usage
              ? [...c.usage, error.usage]
              : c.usage,
        }));
        setNotice(
          abort.signal.aborted
            ? "Response stopped. Partial answers are excluded from future context."
            : error instanceof IncompleteReplyError
              ? `${error.message} ${error.usage ? "Reported usage was retained." : "This request’s cost remains unknown."}`
              : error instanceof Error && error.name === "TimeoutError"
                ? "Response timed out. Partial answers are excluded from future context. This request’s cost remains unknown. No automatic retry was made."
                : "Protected response unavailable. No weaker fallback or automatic retry was used. Check provider verification and service access.",
        );
      }
    } finally {
      if (epoch.current === current) {
        controller.current = null;
        setBusy("");
      }
    }
  }
  async function importFiles(files: FileList | null) {
    if (!files || busy) return;
    if (
      files.length + conversation.attachments.length > 5 ||
      Array.from(files).filter((f) => f.type.startsWith("image/")).length +
        conversation.attachments.filter((a) => a.kind === "screenshot").length >
        3
    ) {
      fail(
        "Use at most five attachments, including three screenshots, per conversation.",
      );
      return;
    }
    const abort = new AbortController();
    controller.current = abort;
    const current = epoch.current;
    setBusy("Reading on your device…");
    setNotice("");
    try {
      await importDocuments(Array.from(files), abort.signal, {
        update: (outcomes) => {
          if (current === epoch.current) setImports(outcomes);
        },
        progress: (message) => {
          if (current === epoch.current && !abort.signal.aborted)
            setBusy(message);
        },
        added: (attachment) => {
          if (current !== epoch.current || abort.signal.aborted) return;
          setConversation((c) => ({
            ...c,
            attachments: [...c.attachments, attachment],
          }));
        },
      });
    } catch (e) {
      if (current === epoch.current)
        fail(e instanceof Error ? e.message : "Extraction failed.");
    } finally {
      if (current === epoch.current) {
        controller.current = null;
        setBusy("");
      }
    }
  }
  async function research() {
    if (!proposal || busy) return;
    if (conversation.attachments.length >= 5) {
      fail(
        "Remove an attachment before adding more research context (five-item limit).",
      );
      return;
    }
    const approved = proposal;
    setProposal(undefined);
    setBusy("Retrieving the approved public information…");
    const current = epoch.current;
    const abort = new AbortController();
    controller.current = abort;
    try {
      const prepared = await api(
        "/api/research/prepare",
        approved,
        abort.signal,
      );
      abort.signal.throwIfAborted();
      if (current !== epoch.current) return;
      const result = await api(
        "/api/research/execute",
        { id: prepared.id, request: approved },
        abort.signal,
      );
      abort.signal.throwIfAborted();
      if (current === epoch.current) {
        const sources = parseResearchResult(
          result,
          conversation.attachments.flatMap((attachment) =>
            attachment.sources.map((source) => source.id),
          ),
        );
        if (sources.length)
          setConversation((c) => ({
            ...c,
            temporarySearch: c.temporarySearch || approved.kind === "search",
            attachments: [
              ...c.attachments,
              {
                id: crypto.randomUUID(),
                name:
                  approved.kind === "search"
                    ? "Public search results"
                    : "Public page",
                selected: true,
                kind: "research",
                ...(approved.kind === "search"
                  ? { researchQuery: approved.value }
                  : {}),
                sources,
              },
            ],
          }));
        setNotice(
          sources.length
            ? approved.kind === "search"
              ? "Search results added to context. Return to Conversation to ask about them. This conversation is temporary and cannot be saved; results and replies disappear when you clear or reload the workspace."
              : "Public sources added to your selected context. Search excerpts are labelled; pages are fetched only with approval."
            : "The search returned no sources.",
        );
      }
    } catch (e) {
      if (current === epoch.current)
        fail(e instanceof Error ? e.message : "Research failed.");
    } finally {
      if (current === epoch.current) {
        controller.current = null;
        setBusy("");
      }
    }
  }
  async function unlockVault() {
    if (!status) {
      fail("Wait for service access before opening saved history.");
      return;
    }
    const current = epoch.current;
    const secret = passphrase;
    setPassphrase("");
    setBusy("Unlocking encrypted history…");
    try {
      await vault.current!.unlock(secret);
      const snapshots = await vault.current!.readAvailable();
      if (current !== epoch.current) return;
      setUnlocked(true);
      setSaved(snapshots.conversations);
      setUnreadableSnapshots(snapshots.unreadable);
      setNotice(
        "Vault unlocked on this device. Saving is explicit; temporary chats are not saved automatically.",
      );
    } catch {
      if (current !== epoch.current) return;
      fail(
        "Could not unlock the vault. Check the passphrase (at least 12 characters).",
      );
    } finally {
      if (current === epoch.current) setBusy("");
    }
  }
  async function save(asCopy = false) {
    const current = epoch.current;
    setBusy("Encrypting your conversation…");
    try {
      const snapshot = await vault.current!.save(
        {
          ...conversation,
          ...(asCopy
            ? {
                id: crypto.randomUUID(),
                createdAt: new Date().toISOString(),
                title: `${conversation.title} (copy)`,
              }
            : {}),
          draft: input,
        },
        asCopy ? null : savedBase.current,
      );
      if (current !== epoch.current) return;
      savedBase.current = snapshot;
      setSaveConflict(false);
      if (asCopy) setConversation(snapshot);
      const snapshots = await vault.current!.readAvailable();
      if (current !== epoch.current) return;
      setSaved(snapshots.conversations);
      setUnreadableSnapshots(snapshots.unreadable);
      setNotice(
        "Encrypted snapshot saved on this browser. Later changes require saving again.",
      );
    } catch (error) {
      if (current !== epoch.current) return;
      if (error instanceof VaultConflictError) {
        setSaveConflict(true);
        fail(error.message);
        return;
      }
      fail(
        error instanceof DOMException && error.name === "QuotaExceededError"
          ? "Browser storage is full. Your current work is still open but was not saved. Keep this tab open; free device storage without clearing this site's data, then save again."
          : "Save failed. Your current work is still open. Keep this tab open and check that the vault is unlocked before trying again.",
      );
    } finally {
      if (current === epoch.current) setBusy("");
    }
  }
  async function exportVaultBackup() {
    const current = epoch.current;
    setBusy("Encrypting saved backup…");
    let url: string | undefined;
    try {
      const text = await vault.current!.exportBackup();
      if (current !== epoch.current) return;
      url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "privateai-encrypted.privateai-backup";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setNotice(
        "Encrypted backup download requested. Check your downloads before relying on it. It needs this vault’s original passphrase; later changes are not included.",
      );
    } catch {
      if (current === epoch.current)
        fail(
          "Backup could not be created. Keep this browser’s data. Unlock the vault, check for unreadable snapshots and the 100-conversation / 10 MiB limits, then try again.",
        );
    } finally {
      if (url) {
        const expired = url;
        setTimeout(() => URL.revokeObjectURL(expired), 1000);
      }
      if (current === epoch.current) setBusy("");
    }
  }
  async function changeVaultPassphrase(
    currentSecret: string,
    nextSecret: string,
  ) {
    if (!allowReplace()) return;
    const current = epoch.current;
    setBusy("Updating encrypted vault protection…");
    try {
      await vault.current!.changePassphrase(currentSecret, nextSecret);
      if (current !== epoch.current) return;
      vault.current!.onInvalidate?.();
      setNotice(
        "Vault passphrase changed. Unlock with the new passphrase. Saved history was preserved; older downloaded backups still need their original passphrase.",
      );
    } catch {
      if (current === epoch.current)
        fail(
          "Passphrase change could not complete. No partial update was applied. Check the current passphrase, unreadable records or changes in another tab. Keep your browser data and existing backups.",
        );
    } finally {
      if (current === epoch.current) setBusy("");
    }
  }
  async function restoreVaultBackup(file: File, secret: string) {
    const current = epoch.current;
    setBusy("Verifying and restoring encrypted backup…");
    try {
      if (!file.size || file.size > BACKUP_MAX_BYTES)
        throw Error("Invalid file size");
      const text = await file.text();
      if (current !== epoch.current) return;
      const count = await vault.current!.restoreBackup(text, secret);
      if (current !== epoch.current) return;
      const snapshots = await vault.current!.readAvailable();
      if (current !== epoch.current) return;
      setSaved(snapshots.conversations);
      setUnreadableSnapshots(snapshots.unreadable);
      setNotice(
        `Restored ${count} saved ${count === 1 ? "conversation" : "conversations"} as new copies. Your open workspace was not changed. The copies use this vault’s passphrase.`,
      );
    } catch {
      if (current === epoch.current)
        fail(
          "Restore could not complete. Check the original backup passphrase, file integrity and available browser storage. Temporary research and unsupported backups are rejected. Existing snapshots were not overwritten; inspect Saved before trying again.",
        );
    } finally {
      if (current === epoch.current) setBusy("");
    }
  }
  const sources = conversation.attachments.flatMap((a) => a.sources);
  const sourceHistory = new Map(sources.map((item) => [item.id, item]));
  return (
    <div
      className="app-shell chat-design"
      data-theme={
        appearance === "system" ? (systemDark ? "dark" : "light") : appearance
      }
    >
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="PrivateAI home">
          <span className="brand-mark" aria-hidden="true">
            <span className="clay-leaf" />P
          </span>
          Private<span>AI</span>
        </a>
        <p className="eyebrow">YOUR PERSONAL SPACE</p>
        <button
          className="new-chat"
          disabled={!!busy && !controller.current}
          onClick={() => {
            if (!allowReplace()) return;
            reset();
            setTab("Conversation");
          }}
        >
          ＋ New conversation
        </button>
        <nav aria-label="Workspace">
          {(
            [
              "Conversation",
              "Context",
              "Research",
              "Saved",
              "Account",
              "Help",
            ] as Tab[]
          ).map((name, i) => (
            <button
              className={tab === name ? "nav-item selected" : "nav-item"}
              key={name}
              onClick={() => setTab(name)}
              aria-current={tab === name ? "page" : undefined}
            >
              <span aria-hidden="true">
                {["◌", "▤", "⌕", "▣", "○", "?"][i]}
              </span>
              {name}
              {name === "Context" && (
                <small>{conversation.attachments.length}</small>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="small-dot" />
          Temporary by default
          <p>
            Your workspace stays on this device. Sharing starts with your
            choice.
          </p>
        </div>
        <div className="workspace-help">
          <button
            className="text-button"
            onClick={() =>
              setSource({
                id: "workspace-guide",
                title: "Using PrivateAI",
                text: "Start in Conversation. Write a message or use a starter to prepare an editable draft. Nothing sends until you choose Send. This evaluation is for synthetic examples; private chat remains unavailable until its privacy checks pass.\n\nAdd context when you need it. In Context, import DOCX body text, a text PDF, UTF-8 text, Markdown, data or source-code file, PNG or JPEG. Code is read as text, never executed; spreadsheets must be exported as CSV or PDF. Files are read on your device. Limits: five files (up to three screenshots), 10 MB each, 20 PDF pages; printed English text. Review extracted numbers, tables and wording before using them. Scanned PDFs and handwriting are not supported. Select only the context you want included.\n\nSave deliberately. Temporary work disappears on reload. In Saved, create or unlock a vault, then choose Save encrypted snapshot. Save again after changes. Your passphrase cannot be recovered. History stays in this browser unless you explicitly download an encrypted backup in Saved; there is no cloud sync. Restore needs the backup and its original passphrase and adds copies to an unlocked vault. Backups include saved snapshots only, never current unsaved work or temporary research. Deleting browser history does not delete downloaded copies. Locking clears unsaved work. Removing an attachment does not remove its earlier messages or saved snapshots.\n\nResearch is your choice. Review the exact query or public URL before approving it. The research service and recipient can see it; your chat is not added automatically.\n\nStay in control. Stop ends an active response; an incomplete reply is excluded from later context. Retry is a separate request. Copy answer places completed text on your device clipboard; locking the vault does not clear that clipboard. Edit an earlier message to start a new branch. To remove a saved conversation, delete its snapshot in Saved. A new conversation clears the current workspace but does not delete saved snapshots.",
              })
            }
          >
            Getting started
          </button>
          <button
            className="text-button"
            onClick={() =>
              setSource({
                id: "trial-safety",
                title: "Trial scope and safety",
                text: "This initial trial is for adults aged 18 and over. Explicit sexual generation is outside its scope; non-graphic sexual-health, consent and relationship advice are supported. The assistant should refuse help enabling serious harm and respond supportively to distress. These instructions are being evaluated, not a guarantee that every unsafe answer will be prevented. Check important advice; PrivateAI is not an emergency service and cannot contact help for you. If you are in immediate danger, contact local emergency services or someone you trust. No separate moderation service receives your messages. Private-data chat remains gated until provider privacy qualification passes.",
              })
            }
          >
            Trial scope and safety
          </button>
          <button
            className="text-button"
            onClick={() =>
              setSource({
                id: "privacy",
                title: "Your privacy boundaries",
                text: "This is a restricted evaluation, not a production privacy guarantee. Chat stays disabled until live confidential processing is qualified. Your device and browser can read local content. Saved history is encrypted when locked. There is no passphrase recovery or cloud sync; an explicitly downloaded encrypted backup can restore saved snapshots using its original passphrase. Temporary content is not intentionally written to application storage, but device memory, browser internals and backups are outside that guarantee. Approved queries and URLs are visible to our research service and the recipient. Anonymous access is not implemented. A malicious website update could capture content before encryption.",
              })
            }
          >
            Privacy boundaries ↗
          </button>
        </div>
        <div className="workspace-label">
          RESTRICTED EVALUATION <span>0.1</span>
        </div>
      </aside>
      <main>
        <header>
          <div>
            <span className="eyebrow">PRIVATEAI WORKSPACE</span>
            <h1>
              {tab === "Conversation" &&
              conversation.title !== "New conversation"
                ? conversation.title
                : tab}
            </h1>
            {tab === "Conversation" && conversation.messages.length > 0 && (
              <p className="conversation-meta">
                {conversation.messages.length} messages ·{" "}
                <button
                  className="text-button"
                  onClick={() =>
                    outputEnd.current?.scrollIntoView({
                      block: "end",
                      behavior: "instant",
                    })
                  }
                >
                  Jump to latest ↓
                </button>
              </p>
            )}
          </div>
          <div className="appearance-controls">
            <label className="sr-only" htmlFor="chat-appearance">
              Appearance
            </label>
            <select
              id="chat-appearance"
              value={appearance}
              onChange={(event) =>
                setAppearance(event.target.value as "system" | "light" | "dark")
              }
            >
              <option value="system">System theme</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
            <span className="pill">
              <span className="small-dot" />
              {unlocked ? "Local vault unlocked" : "Temporary session"}
            </span>
          </div>
        </header>
        <div className="connection-banner">
          {status?.accountId && !status.consumerWorkspace && (
            <button
              onClick={() => {
                if (!allowReplace()) return;
                vault.current?.lock();
                vault.current?.onInvalidate?.();
                accessNavigation.current = true;
                window.location.assign("/auth/password");
              }}
            >
              Change sign-in password
            </button>
          )}
          {status?.accountId && (
            <button
              disabled={!!busy}
              onClick={async () => {
                if (status.consumerWorkspace) {
                  await signOutConsumer();
                  return;
                }
                if (!allowReplace()) return;
                vault.current?.lock();
                vault.current?.onInvalidate?.();
                try {
                  const response = await fetch("/auth/logout", {
                    method: "POST",
                  });
                  if (!response.ok) throw new Error();
                  accessNavigation.current = true;
                  window.location.assign("/auth");
                } catch {
                  fail("Workspace locked. Sign out failed; try again.");
                }
              }}
            >
              Sign out
            </button>
          )}
          <span className="status-icon">◇</span>
          <div>
            <strong>
              {status?.inference.ready
                ? "Protected connection available"
                : "Private chat is not connected yet"}
            </strong>
            <p>
              {status?.inference.ready
                ? "The destination is verified before each request."
                : "Local documents and your vault work here. Messages stay on this device until provider verification and access are complete."}
            </p>
          </div>
        </div>
        {notice && (
          <div role="status" className="notice">
            {notice}
            <button aria-label="Dismiss notice" onClick={() => setNotice("")}>
              ×
            </button>
          </div>
        )}
        {busy && (
          <div role="status" className="progress">
            <span className="spinner" />
            {busy}
            {controller.current && (
              <button onClick={() => controller.current?.abort()}>Stop</button>
            )}
          </div>
        )}
        {!!imports.length && (
          <section className="import-results" aria-label="File import results">
            <strong>File import results</strong>
            <ul role="status" aria-live="polite" aria-relevant="text additions">
              {imports.map((item, index) => (
                <li key={index}>
                  <span>
                    {item.name} — {item.status}
                  </span>
                  {item.detail && <p>{item.detail}</p>}
                </li>
              ))}
            </ul>
            {!busy && (
              <button onClick={() => setImports([])}>
                Dismiss import results
              </button>
            )}
          </section>
        )}
        {tab === "Conversation" && (
          <section className="chat-view">
            {!conversation.messages.length && (
              <div className="welcome">
                <div className="welcome-mark">✳</div>
                <p className="eyebrow">A LITTLE CLARITY, ON YOUR TERMS</p>
                <h2>
                  Make room for
                  <br />
                  <em>what’s on your mind.</em>
                </h2>
                <p>
                  Think through a decision. Understand a document.
                  <br />
                  Find the words you’ve been looking for.
                </p>
                <div className="starter-grid">
                  {[
                    [
                      "Write or revise",
                      "Find clear words for what you want to say.",
                      "Help me write a clear, friendly message. Here’s what I want to say: ",
                    ],
                    [
                      "Plan something",
                      "Turn a goal and constraints into next steps.",
                      "Help me make a practical plan. My goal and constraints are: ",
                    ],
                    [
                      "Understand a document",
                      "Bring a bill, a letter or a few notes.",
                      "Context",
                    ],
                  ].map(([title, description, target]) => (
                    <button
                      key={title}
                      onClick={() => {
                        if (target === "Context") setTab("Context");
                        else {
                          if (input.trim()) {
                            document.getElementById("message-input")?.focus();
                            return;
                          }
                          setInput(target);
                          document.getElementById("message-input")?.focus();
                        }
                      }}
                    >
                      <span>{title} ↗</span>
                      <p>{description}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <ConversationBranches
              conversation={conversation}
              busy={!!busy}
              open={(id) => {
                if (busy) return;
                try {
                  const next = switchBranch(conversation, input, id);
                  calculationSession.clear();
                  setConversation(next);
                  setInput(next.draft ?? "");
                  setEditId(undefined);
                  setEditText("");
                  setSource(undefined);
                  setNotice(
                    "Branch opened locally. No request was sent. Save again to keep these changes.",
                  );
                } catch (error) {
                  fail((error as Error).message);
                }
              }}
            />
            <div className="messages">
              {conversation.messages.map((message, index) => (
                <article
                  key={message.id}
                  className={`message ${message.role}`}
                  aria-label={`${message.role === "user" ? "Your message" : "PrivateAI reply"} ${index + 1}`}
                >
                  <div className="message-heading">
                    <strong>
                      {message.role === "user" ? "You" : "PrivateAI"}
                    </strong>
                    {message.status !== "complete" && (
                      <span>
                        {message.status === "partial"
                          ? "Incomplete · excluded from context"
                          : "No answer received"}
                      </span>
                    )}
                  </div>
                  {message.failure && (
                    <p className="muted">
                      {
                        {
                          stopped: "Stopped by you",
                          timeout: "Response timed out",
                          incomplete: "Response ended incomplete",
                          unavailable: "Protected response unavailable",
                          empty: "No answer received",
                        }[message.failure]
                      }
                      . This attempt is not a completed answer and is excluded
                      from future context.
                    </p>
                  )}
                  <Suspense
                    fallback={
                      <div className="message-text">{message.text}</div>
                    }
                  >
                    <Answer
                      text={message.text}
                      complete={message.status === "complete"}
                      sources={message.sourceSnapshot ?? []}
                      open={setSource}
                    />
                  </Suspense>
                  {sourceHistoryStatus(message, sourceHistory) ===
                    "changed" && (
                    <p className="source-history-note">
                      Reference material changed or was removed after this
                      answer. Its citations open the earlier captured version.
                      Review this answer before using it in a follow-up; uncheck
                      Include in context to exclude it without deleting it.
                    </p>
                  )}
                  {sourceHistoryStatus(message, sourceHistory) ===
                    "unrecorded" && (
                    <p className="source-history-note">
                      This older answer has no recorded source snapshot. Its
                      citations cannot be matched to the evidence used at the
                      time; current attachments are not substituted.
                    </p>
                  )}
                  <div className="message-actions">
                    <label>
                      <input
                        type="checkbox"
                        checked={
                          message.included && message.status === "complete"
                        }
                        disabled={!!busy || message.status !== "complete"}
                        onChange={(e) =>
                          setConversation((c) => ({
                            ...c,
                            messages: c.messages.map((m) =>
                              m.id === message.id
                                ? { ...m, included: e.target.checked }
                                : m,
                            ),
                          }))
                        }
                      />{" "}
                      Include in context
                    </label>
                    {message.role === "user" && (
                      <button
                        disabled={!!busy}
                        id={`edit-message-${message.id}`}
                        onClick={() => {
                          setEditId(message.id);
                          setEditText(message.text);
                        }}
                      >
                        Edit into a new branch
                      </button>
                    )}
                    {message.role === "assistant" && (
                      <button
                        disabled={
                          message.status !== "complete" || !message.text
                        }
                        onClick={() => void copyAnswer(message.text)}
                      >
                        Copy answer
                      </button>
                    )}
                  </div>
                </article>
              ))}
              <div ref={outputEnd} />
            </div>
            {editId && (
              <div className="panel">
                <label>
                  Edited message
                  <textarea
                    id="edited-message"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                  />
                </label>
                <button
                  disabled={!!busy || !editText.trim()}
                  onClick={() => {
                    try {
                      setConversation(
                        branchConversation(
                          conversation,
                          input,
                          editId,
                          editText,
                        ),
                      );
                      calculationSession.clear();
                      setEditId(undefined);
                      setEditText("");
                      document.getElementById("message-input")?.focus();
                      setNotice(
                        "New branch created; the original is available in Conversation branches. Choose Answer this question to request a reply. Your draft is unchanged.",
                      );
                    } catch (error) {
                      fail((error as Error).message);
                    }
                  }}
                >
                  Create branch
                </button>
                <button
                  onClick={() => {
                    document.getElementById(`edit-message-${editId}`)?.focus();
                    setEditId(undefined);
                    setEditText("");
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
            <form
              className="composer"
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
            >
              <label className="sr-only" htmlFor="message-input">
                Message PrivateAI
              </label>
              <textarea
                id="message-input"
                placeholder="What would you like to work through?"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={20000}
                rows={3}
              />
              <div className="composer-footer">
                <input
                  ref={chatFileInput}
                  type="file"
                  hidden
                  aria-label="Attach files to this conversation"
                  multiple
                  accept={DOCUMENT_ACCEPT}
                  disabled={!!busy}
                  onChange={(event) => {
                    void importFiles(event.target.files);
                    event.target.value = "";
                  }}
                />
                <button
                  type="button"
                  className="text-button"
                  disabled={!!busy || conversation.attachments.length >= 5}
                  onClick={() => chatFileInput.current?.click()}
                >
                  Attach file
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setTab("Context")}
                >
                  Review context{" "}
                  <span>
                    {conversation.attachments.filter((a) => a.selected).length}{" "}
                    selected
                  </span>
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setTab("Research")}
                >
                  Research
                </button>
                <button
                  className="primary"
                  disabled={!!busy || !input.trim() || !status?.inference.ready}
                  type="submit"
                >
                  Send ↑
                </button>
              </div>
            </form>
            {conversation.attachments.length > 0 && (
              <ul
                className="composer-attachments"
                aria-label="Conversation attachments"
              >
                {conversation.attachments.map((attachment) => (
                  <li key={attachment.id}>
                    <span>{attachment.name}</span>
                    <small>
                      {attachment.selected ? "Included" : "Excluded"}
                    </small>
                    <button
                      type="button"
                      onClick={() => setTab("Context")}
                      aria-label={`Review ${attachment.name}`}
                    >
                      Review
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="composer-note">
              Attachments are read on this device. Review extracted text before
              sending. DOCX body text, text PDF, UTF-8 text, Markdown, data,
              source code, PNG and JPEG; five files, including up to three
              screenshots, 10 MB each, 60,000 extracted characters per file and
              20 PDF pages. Images use text extraction, not general image
              understanding.
            </p>
            <p className="composer-note" data-testid="context-size">
              Selected input: {selectedContextSize.characters.toLocaleString()}{" "}
              characters
              {status?.inference.qualification
                ? ` of ${status.inference.qualification.maxInputCharacters.toLocaleString()}`
                : " · sending limit unavailable until chat is qualified"}
              . Includes instructions, selected messages, documents and your
              draft. This is not a token count. Oversized requests are blocked;
              history is not silently shortened. There is no indefinite memory.
            </p>
            <p className="composer-note">
              Only selected context is included. PrivateAI can make
              mistakes—check important details.
            </p>
            <ContextReview
              conversation={conversation}
              size={selectedContextSize}
              limit={status?.inference.qualification?.maxInputCharacters}
              busy={!!busy}
              includeMessage={(id, included) =>
                setConversation((current) => ({
                  ...current,
                  messages: current.messages.map((message) =>
                    message.id === id ? { ...message, included } : message,
                  ),
                }))
              }
              includeAttachment={(id, selected) =>
                setConversation((current) => ({
                  ...current,
                  attachments: current.attachments.map((attachment) =>
                    attachment.id === id
                      ? { ...attachment, selected }
                      : attachment,
                  ),
                }))
              }
            />
            {conversation.messages.length > 0 && (
              <button
                className="text-button"
                disabled={!!busy || !status?.inference.ready}
                onClick={() => {
                  const last = [...conversation.messages]
                    .reverse()
                    .find((m) => m.role === "user");
                  if (last) {
                    const index = conversation.messages.indexOf(last);
                    try {
                      const base =
                        index === conversation.messages.length - 1
                          ? {
                              ...conversation,
                              messages: conversation.messages.slice(0, index),
                            }
                          : branchConversation(conversation, input, last.id);
                      void send(base, last.text, false);
                    } catch (error) {
                      fail((error as Error).message);
                    }
                  }
                }}
              >
                {conversation.messages.at(-1)?.role === "user"
                  ? "Answer this question (may incur a charge)"
                  : "Retry last turn explicitly (may incur another charge)"}
              </button>
            )}
            <details className="panel">
              <summary>Exact decimal calculator</summary>
              <p>
                Enter source numbers explicitly. This calculator runs locally;
                it does not execute model-generated code.
              </p>
              <div className="calculator">
                <input
                  aria-label="First number"
                  value={operandA}
                  onChange={(e) => setOperandA(e.target.value)}
                />
                <select
                  aria-label="Operation"
                  value={operation}
                  onChange={(e) => setOperation(e.target.value)}
                >
                  <option value="+">+</option>
                  <option value="-">−</option>
                  <option value="*">×</option>
                  <option value="/">÷</option>
                  <option value="change">% change</option>
                </select>
                <input
                  aria-label="Second number"
                  value={operandB}
                  onChange={(e) => setOperandB(e.target.value)}
                />
                <button
                  onClick={() => {
                    try {
                      setCalculation(
                        `${operandA} ${operation} ${operandB} = ${calculate(operandA, operation, operandB)}`,
                      );
                    } catch (e) {
                      fail((e as Error).message);
                    }
                  }}
                >
                  Calculate
                </button>
              </div>
              <output>{calculation}</output>
            </details>
            {conversation.usage.length > 0 && (
              <p className="muted">
                Reported inference:{" "}
                {conversation.usage.reduce((n, u) => n + u.total, 0)} tokens ·
                estimated $
                {conversation.usage
                  .reduce((n, u) => n + u.estimatedUSD, 0)
                  .toFixed(4)}
                . Includes reported usage across all branches. Excludes
                unreported usage and search charges; incomplete requests may
                still cost money.
              </p>
            )}
          </section>
        )}
        {tab === "Context" && (
          <section className="content-view">
            <h2>
              A clearer picture.
              <br />
              <em>Only what you choose.</em>
            </h2>
            <p className="intro">
              Import documents locally, review their text, then choose what to
              include in your next conversation.
            </p>
            <label className="upload-zone">
              ＋ Add documents or screenshots
              <input
                aria-label="Add documents or screenshots"
                type="file"
                multiple
                accept={DOCUMENT_ACCEPT}
                disabled={!!busy}
                onChange={(e) => {
                  void importFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <small>
                DOCX body · Text PDF · Text / Markdown / Code · CSV / JSON · PNG
                / JPEG
                <br />
                Up to 10 MB, 60,000 extracted characters and 20 PDF pages per
                file. Screenshot OCR supports printed English text. Legacy Word
                and spreadsheet workbooks: export as PDF or UTF-8 text first.
              </small>
            </label>
            {conversation.attachments.length === 0 && (
              <p className="empty-note">
                Your context is empty. Files are read on your device.
              </p>
            )}
            {conversation.attachments.map((attachment) => (
              <div className="panel" key={attachment.id}>
                <div className="row">
                  <label>
                    <input
                      type="checkbox"
                      checked={attachment.selected}
                      disabled={!!busy}
                      onChange={(e) =>
                        setConversation((c) => ({
                          ...c,
                          attachments: c.attachments.map((a) =>
                            a.id === attachment.id
                              ? { ...a, selected: e.target.checked }
                              : a,
                          ),
                        }))
                      }
                    />{" "}
                    {attachment.name}
                  </label>
                  <button
                    disabled={!!busy}
                    onClick={() => {
                      setConversation((c) => ({
                        ...c,
                        attachments: c.attachments.filter(
                          (a) => a.id !== attachment.id,
                        ),
                      }));
                      setSource(undefined);
                    }}
                  >
                    Remove
                  </button>
                </div>
                {attachment.warning && (
                  <p className="muted">{attachment.warning}</p>
                )}
                {attachment.sources.map((s) => (
                  <details key={s.id}>
                    <summary>
                      {s.title}
                      {s.page ? ` · page ${s.page}` : ""} · [{s.id}]
                    </summary>
                    <button onClick={() => setSource({ ...s })}>
                      Inspect source
                    </button>
                    {s.url && (
                      <button
                        disabled={!!busy}
                        onClick={() => {
                          setResearchKind("page");
                          setQuery(s.url!);
                          setProposal(undefined);
                          setTab("Research");
                        }}
                      >
                        Review page retrieval
                      </button>
                    )}
                    <label>
                      Review or correct extracted text
                      {s.userEdited && (
                        <span className="source-history-note">
                          User-edited text. This is not an unmodified extraction
                          or verified quotation from the original source.
                        </span>
                      )}
                      <textarea
                        aria-label={`Text for ${s.title}${s.page ? ` page ${s.page}` : ""}`}
                        value={s.text}
                        disabled={!!busy}
                        rows={7}
                        onChange={(e) =>
                          setConversation((c) =>
                            correctSource(c, s.id, e.target.value),
                          )
                        }
                      />
                    </label>
                  </details>
                ))}
              </div>
            ))}
            <p className="muted">
              Removing context affects future requests. It cannot retract prior
              processing or information already present in earlier messages.
            </p>
          </section>
        )}
        {tab === "Research" && (
          <section className="content-view">
            <h2>
              Explore the public web.
              <br />
              <em>Keep the choice yours.</em>
            </h2>
            <p className="intro">
              Your conversation is never automatically added to a search. Review
              the exact query or URL before sharing.
            </p>
            <p className="muted">
              Search conversations are temporary in this test version. You can
              inspect sources and ask follow-up questions during this session,
              but cannot save the conversation. Use public, non-sensitive
              queries only.
            </p>
            {conversation.attachments.some(
              (a) => a.kind === "research" && a.selected,
            ) && (
              <div className="panel">
                <button
                  onClick={() => {
                    if (!input.trim()) {
                      const question = [...conversation.attachments]
                        .reverse()
                        .find(
                          (a) => a.selected && a.researchQuery,
                        )?.researchQuery;
                      setInput(
                        `Using the selected web sources, answer: ${question ?? "What do these sources establish?"} Cite evidence beside each factual claim and explain missing or conflicting evidence.`,
                      );
                    }
                    setTab("Conversation");
                  }}
                >
                  Prepare a question about these sources
                </button>
                <p className="muted">
                  Opens your existing draft, or prepares an editable question.
                  Nothing is sent automatically.
                  {!status?.inference.ready &&
                    " AI answers are currently unavailable while provider verification is incomplete."}
                </p>
              </div>
            )}
            <div className="panel">
              <label>
                Research method
                <select
                  value={researchKind}
                  onChange={(e) => {
                    setResearchKind(e.target.value as "search" | "page");
                    setProposal(undefined);
                  }}
                >
                  <option value="search">Public search</option>
                  <option value="page">Read a public page</option>
                </select>
              </label>
              <label>
                {researchKind === "search"
                  ? "Exact search query"
                  : "Exact HTTPS URL"}
                <textarea
                  value={query}
                  maxLength={researchKind === "search" ? 400 : 2000}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setProposal(undefined);
                  }}
                  rows={3}
                />
              </label>
              {researchKind === "search" && !status?.search && (
                <p className="muted">
                  Search needs service access. No search request can be sent
                  yet.
                </p>
              )}
              {researchKind === "page" && status?.publicPageHosts && (
                <p className="muted">
                  Available page domains in this workspace:{" "}
                  {status.publicPageHosts.length
                    ? status.publicPageHosts.join(", ")
                    : "none configured yet"}
                  . Other domains remain blocked.
                </p>
              )}
              <button
                className="primary"
                disabled={
                  !!busy ||
                  !query.trim() ||
                  (researchKind === "search" && !status?.search)
                }
                onClick={() => {
                  try {
                    if (
                      researchKind === "page" &&
                      new URL(query).protocol !== "https:"
                    )
                      throw new Error();
                    setProposal({ kind: researchKind, value: query.trim() });
                  } catch {
                    fail("Enter a public HTTPS URL.");
                  }
                }}
              >
                Review disclosure
              </button>
            </div>
            {proposal && (
              <div
                className="approval"
                role="region"
                aria-label="Confirm external disclosure"
              >
                <p className="eyebrow">YOUR APPROVAL IS REQUIRED</p>
                <h3>
                  Share only this {proposal.kind === "search" ? "query" : "URL"}
                  ?
                </h3>
                <pre>{proposal.value}</pre>
                <p>
                  Recipient:{" "}
                  {proposal.kind === "search"
                    ? "Brave Search API"
                    : new URL(proposal.value).hostname}
                  , through PrivateAI’s research service. Their retention
                  policies apply. No private chat or attachment is included
                  automatically.
                </p>
                <button
                  className="primary"
                  disabled={!!busy}
                  onClick={() => void research()}
                >
                  Approve and retrieve
                </button>
                <button onClick={() => setProposal(undefined)}>Cancel</button>
              </div>
            )}
          </section>
        )}
        {tab === "Help" && <SupportPanel />}
        {tab === "Account" && (
          <AccountUsage
            allowance={status?.requestAllowance}
            consumer={status?.consumerWorkspace}
            billing={
              status?.billingRehearsal
                ? {
                    csrf: status.csrf,
                    onNavigate: (url) => {
                      if (!allowReplace()) return;
                      accessNavigation.current = true;
                      window.location.assign(url);
                    },
                  }
                : undefined
            }
            busy={!!busy}
            onManage={() => {
              if (!allowReplace()) return;
              accessNavigation.current = true;
              window.location.assign("/auth");
            }}
          />
        )}
        {tab === "Saved" && (
          <section className="content-view">
            <h2>
              A place for things
              <br />
              <em>worth coming back to.</em>
            </h2>
            <p className="intro">
              Optional encrypted snapshots, stored only in this browser. No
              cloud sync and no password recovery. You can download an encrypted
              backup.
            </p>
            <label>
              Conversation title
              <input
                value={conversation.title}
                maxLength={120}
                disabled={!!busy}
                onChange={(event) =>
                  setConversation((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
              />
            </label>
            <p className="muted">
              Name the current conversation, then save explicitly. Titles are
              encrypted with the saved conversation.
            </p>
            <p role="status">
              {unsaved
                ? "Unsaved workspace changes. Save explicitly to keep your draft and documents."
                : "No unsaved workspace changes."}{" "}
              Reloading clears temporary work. Locking clears the workspace even
              when changes are unsaved.
            </p>
            {!unlocked ? (
              <form
                className="panel"
                onSubmit={(e) => {
                  e.preventDefault();
                  void unlockVault();
                }}
              >
                <label>
                  Vault passphrase
                  <input
                    type="password"
                    autoComplete="off"
                    minLength={12}
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    required
                  />
                </label>
                <p className="muted">
                  Use at least 12 characters. Your first unlock creates the
                  vault. Losing the passphrase loses access. Clearing browser
                  storage loses history unless you have an encrypted backup and
                  its original passphrase.
                </p>
                <button className="primary" disabled={!!busy}>
                  Create or unlock vault
                </button>
              </form>
            ) : (
              <>
                <div className="row">
                  <button
                    className="primary"
                    disabled={
                      !!busy ||
                      !conversation.title.trim() ||
                      containsTemporaryResearch(conversation) ||
                      (!conversation.messages.length &&
                        !conversation.attachments.length &&
                        !input.length)
                    }
                    onClick={() => void save()}
                  >
                    Save encrypted snapshot
                  </button>
                  {saveConflict && (
                    <button
                      disabled={
                        !!busy || containsTemporaryResearch(conversation)
                      }
                      onClick={() => void save(true)}
                    >
                      Save as new conversation
                    </button>
                  )}
                  {containsTemporaryResearch(conversation) && (
                    <p role="status">
                      This search conversation is temporary and cannot be saved,
                      including its answers. You can copy a completed answer;
                      automatic exports remain unavailable. Removing search
                      attachments does not change this. Start a new conversation
                      for work you want to save.
                    </p>
                  )}
                  <button
                    onClick={() => {
                      vault.current!.lock();
                      setUnlocked(false);
                      setSaved([]);
                      setUnreadableSnapshots(0);
                      reset();
                      setPassphrase("");
                    }}
                  >
                    Lock and clear workspace
                  </button>
                </div>
                {unreadableSnapshots > 0 && (
                  <p role="alert">
                    {unreadableSnapshots} saved{" "}
                    {unreadableSnapshots === 1
                      ? "snapshot could"
                      : "snapshots could"}{" "}
                    not be read. Unreadable records remain stored unchanged.
                    Other snapshots are available. Do not clear this browser's
                    storage if you want to preserve them.
                  </p>
                )}
                {!saved.length && !unreadableSnapshots && (
                  <p className="empty-note">
                    No saved conversations yet. Saving is always your choice.
                  </p>
                )}
                <ConversationLibrary
                  conversations={saved}
                  busy={!!busy}
                  onOpen={(c) => {
                    if (!allowReplace()) return;
                    reset();
                    savedBase.current = c;
                    setConversation(structuredClone(c));
                    setInput(c.draft ?? "");
                    setTab("Conversation");
                    setNotice(
                      "Opened a saved snapshot. Save again to keep later changes.",
                    );
                  }}
                  onDelete={async (c) => {
                    const current = epoch.current;
                    setBusy("Deleting encrypted snapshot…");
                    try {
                      await vault.current!.delete(c.id);
                      const snapshots = await vault.current!.readAvailable();
                      if (current !== epoch.current) return;
                      setSaved(snapshots.conversations);
                      setUnreadableSnapshots(snapshots.unreadable);
                      if (conversation.id === c.id) reset();
                      setNotice(
                        "Encrypted records and wrapped key deleted. Device backups and exported copies are outside this deletion.",
                      );
                    } catch {
                      if (current === epoch.current)
                        fail("Deletion failed. Try again after unlocking.");
                    } finally {
                      if (current === epoch.current) setBusy("");
                    }
                  }}
                />
                <VaultSecurity
                  busy={!!busy}
                  blocked={unreadableSnapshots > 0}
                  onChange={changeVaultPassphrase}
                />
                <VaultBackup
                  busy={!!busy}
                  canExport={saved.length > 0 && unreadableSnapshots === 0}
                  onExport={exportVaultBackup}
                  onRestore={restoreVaultBackup}
                />
              </>
            )}
          </section>
        )}
        <footer>
          Personal help. Sharing under your control.
          <span>Built for a bounded evaluation.</span>
        </footer>
      </main>
      {source && (
        <div className="modal-backdrop">
          <section
            className="source-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={source.title}
          >
            <div className="row">
              <h2>{source.title}</h2>
              <button
                onClick={() => setSource(undefined)}
                aria-label="Close source"
              >
                ×
              </button>
            </div>
            {source.url && (
              <p className="muted">
                Source URL:{" "}
                <a
                  href={researchSourceUrl(source.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  referrerPolicy="no-referrer"
                >
                  {source.url}
                </a>{" "}
                · Retrieved: {source.retrievedAt}
              </p>
            )}
            {source.providerDate && (
              <p>
                Provider-reported page date: {source.providerDate} (not verified
                as publication or event date).
              </p>
            )}
            {source.evidenceKind && (
              <p>
                Evidence: {source.evidenceKind}. Retrieved material may be
                incomplete.
              </p>
            )}
            {source.userEdited && (
              <p className="source-history-note">
                User-edited text; not an unmodified extraction or verified
                quotation from the original source.
              </p>
            )}
            <pre>{source.text}</pre>
            <button onClick={() => setSource(undefined)}>Close</button>
          </section>
        </div>
      )}
    </div>
  );
}
