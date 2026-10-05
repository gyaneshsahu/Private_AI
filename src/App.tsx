import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  emptyConversation,
  type AppStatus,
  type Conversation,
  type Disclosure,
  type Source,
} from "../shared/contracts";
import { forkAt, newMessage, selectedSources } from "./conversation";
import { extract } from "./documents";
import { Vault } from "./vault";
import { calculate } from "./calculator";
import { IncompleteReplyError } from "./reply-stream";
import { abortable } from "./abortable";

type Tab = "Conversation" | "Context" | "Research" | "Saved";
const Answer = lazy(() =>
  import("./Answer").then((module) => ({ default: module.Answer })),
);
export function App() {
  const [tab, setTab] = useState<Tab>("Conversation");
  const [conversation, setConversation] =
    useState<Conversation>(emptyConversation);
  const [status, setStatus] = useState<AppStatus>();
  const [input, setInput] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [source, setSource] = useState<Source>();
  const [researchKind, setResearchKind] = useState<"search" | "page">("search");
  const [query, setQuery] = useState("");
  const [proposal, setProposal] = useState<Disclosure>();
  const [passphrase, setPassphrase] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [saved, setSaved] = useState<Conversation[]>([]);
  const [editId, setEditId] = useState<string>();
  const [editText, setEditText] = useState("");
  const [operandA, setOperandA] = useState("");
  const [operandB, setOperandB] = useState("");
  const [operation, setOperation] = useState("+");
  const [calculation, setCalculation] = useState("");
  const controller = useRef<AbortController | null>(null);
  const vault = useRef<Vault | null>(null);
  const epoch = useRef(0);
  const outputEnd = useRef<HTMLDivElement>(null);
  const unsaved = useMemo(() => {
    const previous = saved.find((item) => item.id === conversation.id);
    if (!previous)
      return !!(
        input.length ||
        conversation.messages.length ||
        conversation.attachments.length
      );
    return (
      JSON.stringify({ ...conversation, draft: input }) !==
      JSON.stringify({ ...previous, draft: previous.draft ?? "" })
    );
  }, [conversation, input, saved]);
  const allowReplace = () =>
    !unsaved ||
    window.confirm(
      "Discard unsaved workspace changes? Cancel to keep working or save an encrypted snapshot first.",
    );
  useEffect(() => {
    if (!source) return;
    const previous = document.activeElement as HTMLElement;
    const dialog = document.querySelector<HTMLElement>(".source-dialog");
    const buttons = dialog?.querySelectorAll<HTMLButtonElement>("button");
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
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        if (active) setStatus(data);
      })
      .catch(() => {
        if (active)
          setNotice("Local service unavailable. Reload after it is running.");
      });
    const store = new Vault();
    vault.current = store;
    store.onInvalidate = () => {
      controller.current?.abort();
      controller.current = null;
      epoch.current++;
      setBusy("");
      setConversation(emptyConversation());
      setSource(undefined);
      setUnlocked(false);
      setSaved([]);
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
    outputEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [conversation.messages.length]);
  const reset = () => {
    controller.current?.abort();
    controller.current = null;
    epoch.current++;
    setBusy("");
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
    if (!response.ok) throw new Error(result.error ?? "Request failed.");
    return result;
  }
  async function send(base = conversation, text = input) {
    if (busy || !status?.inference.ready || !text.trim()) return;
    const next = {
      ...base,
      title: base.messages.length ? base.title : text.trim().slice(0, 60),
      messages: [...base.messages, newMessage("user", text.trim())],
    };
    const answer = {
      ...newMessage("assistant", ""),
      status: "partial" as const,
      sourceSnapshot: structuredClone(selectedSources(next)),
    };
    setConversation({ ...next, messages: [...next.messages, answer] });
    setInput("");
    setNotice("");
    setBusy("Preparing private context…");
    const abort = new AbortController();
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
      );
      abort.signal.throwIfAborted();
      if (epoch.current === current) {
        setConversation((c) => ({
          ...c,
          messages: c.messages.map((m) =>
            m.id === answer.id
              ? { ...m, status: m.text ? "complete" : "error" }
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
      if (epoch.current === current) {
        setConversation((c) => ({
          ...c,
          messages: c.messages.map((m) =>
            m.id === answer.id ? { ...m, status: "partial" } : m,
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
      for (const file of Array.from(files)) {
        abort.signal.throwIfAborted();
        const attachment = await extract(file, abort.signal, (message) => {
          if (current === epoch.current && !abort.signal.aborted)
            setBusy(message);
        });
        abort.signal.throwIfAborted();
        if (current !== epoch.current) return;
        if (current === epoch.current)
          setConversation((c) => ({
            ...c,
            attachments: [...c.attachments, attachment],
          }));
      }
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
      const result = (await api(
        "/api/research/execute",
        { id: prepared.id },
        abort.signal,
      )) as { sources: Source[] };
      abort.signal.throwIfAborted();
      if (current === epoch.current) {
        if (result.sources.length)
          setConversation((c) => ({
            ...c,
            attachments: [
              ...c.attachments,
              {
                id: crypto.randomUUID(),
                name:
                  approved.kind === "search"
                    ? "Public search results"
                    : "Public page",
                selected: true,
                sources: result.sources,
              },
            ],
          }));
        setNotice(
          result.sources.length
            ? "Public sources added to your selected context. Search excerpts are labelled; pages are fetched only with approval."
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
    const current = epoch.current;
    const secret = passphrase;
    setPassphrase("");
    setBusy("Unlocking encrypted history…");
    try {
      await vault.current!.unlock(secret);
      const snapshots = await vault.current!.list();
      if (current !== epoch.current) return;
      setUnlocked(true);
      setSaved(snapshots);
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
  async function save() {
    const current = epoch.current;
    setBusy("Encrypting your conversation…");
    try {
      await vault.current!.save({ ...conversation, draft: input });
      const snapshots = await vault.current!.list();
      if (current !== epoch.current) return;
      setSaved(snapshots);
      setNotice(
        "Encrypted snapshot saved on this browser. Later changes require saving again.",
      );
    } catch {
      if (current !== epoch.current) return;
      fail("Save failed. Unlock the vault and try again.");
    } finally {
      if (current === epoch.current) setBusy("");
    }
  }
  const sources = conversation.attachments.flatMap((a) => a.sources);
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="PrivateAI home">
          <span className="brand-mark">P</span>Private<span>AI</span>
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
          {(["Conversation", "Context", "Research", "Saved"] as Tab[]).map(
            (name, i) => (
              <button
                className={tab === name ? "nav-item selected" : "nav-item"}
                key={name}
                onClick={() => setTab(name)}
                aria-current={tab === name ? "page" : undefined}
              >
                <span aria-hidden="true">{["◌", "▤", "⌕", "▣"][i]}</span>
                {name}
                {name === "Context" && (
                  <small>{conversation.attachments.length}</small>
                )}
              </button>
            ),
          )}
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
                text: "Start in Conversation. Write a message or use a starter to prepare an editable draft. Nothing sends until you choose Send. This evaluation is for synthetic examples; private chat remains unavailable until its privacy checks pass.\n\nAdd context when you need it. In Context, import a text PDF, TXT, PNG or JPEG. Files are read on your device. Limits: five files (up to three screenshots), 10 MB each, 20 PDF pages; printed English text. Review extracted numbers, tables and wording before using them. Scanned PDFs and handwriting are not supported. Select only the context you want included.\n\nSave deliberately. Temporary work disappears on reload. In Saved, create or unlock a vault, then choose Save encrypted snapshot. Save again after changes. Your passphrase cannot be recovered; history stays in this browser, without cloud sync. Locking clears unsaved work. Removing an attachment does not remove its earlier messages or saved snapshots.\n\nResearch is your choice. Review the exact query or public URL before approving it. The research service and recipient can see it; your chat is not added automatically.\n\nStay in control. Stop ends an active response; an incomplete reply is excluded from later context. Retry is a separate request. Edit an earlier message to start a new branch. To remove a saved conversation, delete its snapshot in Saved. A new conversation clears the current workspace but does not delete saved snapshots.",
              })
            }
          >
            Getting started
          </button>
          <button
            className="text-button"
            onClick={() =>
              setSource({
                id: "privacy",
                title: "Your privacy boundaries",
                text: "This is a local evaluation, not a production privacy guarantee. Chat stays disabled until live confidential processing is qualified. Your device and browser can read local content. Saved history is encrypted when locked; there is no recovery or cloud sync. Temporary content is not intentionally written to application storage, but device memory, browser internals and backups are outside that guarantee. Approved queries and URLs are visible to our research service and the recipient. Anonymous access is not implemented. A malicious website update could capture content before encryption.",
              })
            }
          >
            Privacy boundaries ↗
          </button>
        </div>
        <div className="workspace-label">
          LOCAL EVALUATION <span>0.1</span>
        </div>
      </aside>
      <main>
        <header>
          <div>
            <span className="eyebrow">PRIVATEAI WORKSPACE</span>
            <h1>{tab}</h1>
          </div>
          <span className="pill">
            <span className="small-dot" />
            {unlocked ? "Local vault unlocked" : "Temporary session"}
          </span>
        </header>
        <div className="connection-banner">
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
            <button onClick={() => controller.current?.abort()}>Stop</button>
          </div>
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
            <div className="messages">
              {conversation.messages.map((message) => (
                <article key={message.id} className={`message ${message.role}`}>
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
                  <Suspense
                    fallback={
                      <div className="message-text">{message.text}</div>
                    }
                  >
                    <Answer
                      text={message.text}
                      sources={message.sourceSnapshot ?? sources}
                      open={setSource}
                    />
                  </Suspense>
                  <div className="message-actions">
                    <label>
                      <input
                        type="checkbox"
                        checked={message.included}
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
                        onClick={() => {
                          setEditId(message.id);
                          setEditText(message.text);
                        }}
                      >
                        Edit into a new branch
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
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                  />
                </label>
                <button
                  disabled={!!busy || !editText.trim()}
                  onClick={() => {
                    setConversation(forkAt(conversation, editId, editText));
                    setEditId(undefined);
                    setNotice(
                      "New branch created. Add a follow-up message to continue.",
                    );
                  }}
                >
                  Create branch
                </button>
                <button onClick={() => setEditId(undefined)}>Cancel</button>
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
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setTab("Context")}
                >
                  ＋ Add context{" "}
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
            <p className="composer-note">
              Only selected context is included. PrivateAI can make
              mistakes—check important details.
            </p>
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
                    void send(
                      {
                        ...conversation,
                        messages: conversation.messages.slice(0, index),
                      },
                      last.text,
                    );
                  }
                }}
              >
                Retry last turn explicitly (may incur another charge)
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
                . Excludes unknown or failed requests and search charges.
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
                accept=".txt,.pdf,.png,.jpg,.jpeg"
                disabled={!!busy}
                onChange={(e) => {
                  void importFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <small>
                Text PDF · TXT · PNG · JPEG
                <br />
                Up to 10 MB and 20 PDF pages. Printed English text.
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
                    <label>
                      Review or correct extracted text
                      <textarea
                        aria-label={`Text for ${s.title}${s.page ? ` page ${s.page}` : ""}`}
                        value={s.text}
                        disabled={!!busy}
                        rows={7}
                        onChange={(e) =>
                          setConversation((c) => ({
                            ...c,
                            attachments: c.attachments.map((a) => ({
                              ...a,
                              sources: a.sources.map((old) =>
                                old.id === s.id
                                  ? { ...old, text: e.target.value }
                                  : old,
                              ),
                            })),
                          }))
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
        {tab === "Saved" && (
          <section className="content-view">
            <h2>
              A place for things
              <br />
              <em>worth coming back to.</em>
            </h2>
            <p className="intro">
              Optional encrypted snapshots, stored only in this browser. No
              cloud sync and no password recovery.
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
                  vault. Losing this passphrase or clearing browser storage
                  loses saved history.
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
                      (!conversation.messages.length &&
                        !conversation.attachments.length &&
                        !input.length)
                    }
                    onClick={() => void save()}
                  >
                    Save encrypted snapshot
                  </button>
                  <button
                    onClick={() => {
                      vault.current!.lock();
                      setUnlocked(false);
                      setSaved([]);
                      reset();
                      setPassphrase("");
                    }}
                  >
                    Lock and clear workspace
                  </button>
                </div>
                {!saved.length && (
                  <p className="empty-note">
                    No saved conversations yet. Saving is always your choice.
                  </p>
                )}
                {saved.map((c) => (
                  <div className="panel row" key={c.id}>
                    <div>
                      <strong>
                        {c.title === "New conversation"
                          ? c.draft?.slice(0, 60) ||
                            c.attachments[0]?.name ||
                            c.title
                          : c.title}
                      </strong>
                      <p className="muted">
                        {new Date(c.createdAt).toLocaleDateString()} ·{" "}
                        {c.messages.length} messages · {c.attachments.length}{" "}
                        attachments
                        {c.draft ? " · Unsent draft" : ""}
                      </p>
                    </div>
                    <button
                      disabled={!!busy}
                      onClick={() => {
                        if (!allowReplace()) return;
                        reset();
                        setConversation(structuredClone(c));
                        setInput(c.draft ?? "");
                        setTab("Conversation");
                        setNotice(
                          "Opened a saved snapshot. Save again to keep later changes.",
                        );
                      }}
                    >
                      Open
                    </button>
                    <button
                      disabled={!!busy}
                      onClick={async () => {
                        try {
                          await vault.current!.delete(c.id);
                          setSaved(await vault.current!.list());
                          if (conversation.id === c.id) reset();
                          setNotice(
                            "Encrypted records and wrapped key deleted. Device backups and exported copies are outside this deletion.",
                          );
                        } catch {
                          fail("Deletion failed. Try again after unlocking.");
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ))}
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
                Source URL: {source.url} · {source.retrievedAt}
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
