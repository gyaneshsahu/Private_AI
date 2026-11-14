import { Icon } from "./Icon";
import type { Project } from "./projects";
import { containDialogFocus } from "./dialog-focus";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  emptyConversation,
  tierFor,
  replyLimits,
  verificationSummary,
  type AnswerMode,
  type AppStatus,
  type Attachment,
  type Conversation,
  type Disclosure,
  type Source,
} from "../shared/contracts";
import {
  answerLabel,
  autoMode,
  MODE_NAMES,
  readModeChoice,
  saveModeChoice,
  shouldRetryOnBackup,
  type ModeChoice,
} from "./answer-modes";
import {
  composeContext,
  measureContext,
  passageNotes,
  newMessage,
  selectedSources,
} from "./conversation";
import { DOCUMENT_ACCEPT } from "./document-formats";
import { describeKept, prepareSearchQuery } from "./identifier-masking";
import {
  readAutoSearch,
  RULES_KEY,
  saveAutoSearch,
  searchSuggestion,
  WHEN_TO_SEARCH,
} from "./when-to-search";
import { healthConsentCopy } from "../shared/health-consent";
import {
  readHealthConsent,
  writeHealthConsent,
  type HealthConsentChoice,
} from "./health-consent";
import { HealthConsentPrompt, HealthConsentSetting } from "./HealthConsent";
import {
  checkArithmetic,
} from "./arithmetic/check";
import {
  checkAnswerCompleteness,
  completenessWarning,
} from "./arithmetic/completeness";
import {
  asksBeforeSending,
  checkUncheckedFigures,
  checkNoOfficialSource,
  GERMAN_RULES,
} from "./german-rules";
import { expireMessages, type DisappearAfter } from "./conversation";
import { germanEnabled, LanguageSwitch, textFor, useLang } from "./i18n";
import { arithmeticText } from "./text/arithmetic";
import { researchText } from "./text/research";
import { serverMessage } from "./server-messages";
import { appText } from "./text/app";
import { privacySummary, privacyText } from "../shared/privacy-copy";
import { privacyPolicyText } from "../shared/privacy-policy";
import { disclosedProvider } from "../shared/provider-disclosure";
import { imprintText } from "../shared/legal-identity";
import { importDocuments, type ImportOutcome } from "./document-import";
import { PhotoCapture } from "./PhotoCapture";
import { Vault, VaultConflictError } from "./vault";
import { VaultBackup } from "./VaultBackup";
import { VaultSecurity } from "./VaultSecurity";
import { BACKUP_MAX_BYTES } from "./vault-backup";
import { containsTemporaryResearch } from "./saved-conversation";
import { WorkspaceNavigation } from "./WorkspaceNavigation";
import { readAppearance, saveAppearance } from "./appearance";
import { ConversationLibrary } from "./ConversationLibrary";
import { ConversationBranches } from "./ConversationBranches";
import { branchConversation, switchBranch } from "./conversation-branches";
import { ContextReview } from "./ContextReview";
import { correctSource, sourceHistoryStatus } from "./source-history";
import { AccountUsage } from "./AccountUsage";
import { SupportPanel } from "./SupportPanel";
import { calculate } from "./calculator";
import { IncompleteReplyError } from "./reply-stream";
import { AttestationBusyError } from "./providers/inference-client";
import { chatErrorText } from "./text/chat-errors";
import { abortable, withDeadline } from "./abortable";
import { createCalculationSession } from "./calculation-session";
import {
  parseResearchResult,
  researchSourceUrl,
  topPageNote,
} from "./research-result";

type Tab =
  "Conversation" | "Context" | "Research" | "Saved" | "Account" | "Help";
const Answer = lazy(() =>
  import("./Answer").then((module) => ({ default: module.Answer })),
);
export function App() {
  const { lang } = useLang();
  const t = appText[lang];
  const tabName: Record<Tab, string> = {
    Conversation: t.tabConversation,
    Context: t.tabContext,
    Research: t.tabResearch,
    Saved: t.tabSaved,
    Account: t.tabAccount,
    Help: t.tabHelp,
  };
  const [appearance, setAppearance] = useState<"system" | "light" | "dark">(
    readAppearance,
  );
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [navigationCollapsed, setNavigationCollapsed] = useState(false);
  const [settingsSection, setSettingsSection] = useState("appearance");
  const [projects, setProjects] = useState<Project[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const settingsDialog = useRef<HTMLDialogElement>(null);
  const contextDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    saveAppearance(appearance);
  }, [appearance]);
  useEffect(() => {
    if (!settingsOpen) return;
    const dialog = settingsDialog.current;
    const trigger = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (trigger?.checkVisibility()) trigger.focus();
      else
        document
          .querySelector<HTMLElement>(".conversation-menu summary")
          ?.focus();
    };
  }, [settingsOpen]);
  useEffect(() => {
    if (!contextOpen) return;
    const dialog = contextDialog.current;
    const trigger = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (trigger?.checkVisibility()) trigger.focus();
      else document.querySelector<HTMLElement>(".context-count")?.focus();
    };
  }, [contextOpen]);
  useEffect(() => {
    const closeMenus = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      document
        .querySelectorAll<HTMLDetailsElement>(
          ".tools-menu[open], .conversation-menu[open], .account-menu[open], .chat-item-menu[open], .project-actions[open]",
        )
        .forEach((menu) => {
          if (
            event instanceof KeyboardEvent ||
            !(event.target instanceof Node) ||
            !menu.contains(event.target) ||
            (event.target instanceof Element && event.target.closest("button"))
          ) {
            menu.open = false;
            if (event instanceof KeyboardEvent) event.preventDefault();
            if (event instanceof KeyboardEvent)
              menu.querySelector<HTMLElement>("summary")?.focus();
          }
        });
    };
    document.addEventListener("click", closeMenus);
    document.addEventListener("keydown", closeMenus);
    return () => {
      document.removeEventListener("click", closeMenus);
      document.removeEventListener("keydown", closeMenus);
    };
  }, []);
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
  const [modeChoice, setModeChoice] = useState(readModeChoice);
  // Draft health consent (shared/health-consent.ts): only while the server enables it.
  const [healthConsent, setHealthConsent] = useState(readHealthConsent);
  const [consentPending, setConsentPending] = useState<{
    base: Conversation;
    text: string;
    consumeDraft: boolean;
    modeOverride?: AnswerMode;
  }>();
  const chooseHealthConsent = (choice: HealthConsentChoice) =>
    setHealthConsent(writeHealthConsent(choice));
  const [notice, setNotice] = useState("");
  // Verification limit reached: count down to the moment the relay allows the next check.
  const [verifyWaitUntil, setVerifyWaitUntil] = useState(0);
  useEffect(() => {
    if (!verifyWaitUntil) return;
    const show = () => {
      const left = Math.ceil((verifyWaitUntil - Date.now()) / 1000);
      if (left <= 0) {
        setNotice(textFor(chatErrorText).busyOver);
        setVerifyWaitUntil(0);
      } else setNotice(textFor(chatErrorText).busyWait(`${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`));
    };
    show();
    const timer = setInterval(show, 1000);
    return () => clearInterval(timer);
  }, [verifyWaitUntil]);
  const savedBase = useRef<Conversation | null>(null);
  const [saveConflict, setSaveConflict] = useState(false);
  const [imports, setImports] = useState<ImportOutcome[]>([]);
  const selectedContextSize = useMemo(
    () => measureContext(conversation, input),
    [conversation, input],
  );
  const [busy, setBusy] = useState("");
  const [source, setSource] = useState<Source>();
  const sourceDialog = useRef<HTMLDialogElement>(null);
  const chatFileInput = useRef<HTMLInputElement>(null);
  const [researchKind, setResearchKind] = useState<"search" | "page">("search");
  const [query, setQuery] = useState("");
  const [proposal, setProposal] = useState<Disclosure>();
  // When to search (docs/when-to-search-20261112.md): device-only setting, and the
  // exact text a suggestion tap or automatic search sent.
  const [autoSearch, setAutoSearch] = useState(readAutoSearch);
  const [autoSearchRules, setAutoSearchRules] = useState(() =>
    readAutoSearch(RULES_KEY),
  );
  const chooseAutoSearchRules = (on: boolean) => {
    setAutoSearchRules(on);
    saveAutoSearch(on, RULES_KEY);
  };
  const [searchSent, setSearchSent] = useState("");
  useEffect(() => setSearchSent(""), [conversation.id]);
  const suggestion = useMemo(() => {
    if (!status?.search || !status.inference.ready) return undefined;
    if (input.trim()) {
      const draft = searchSuggestion(input);
      return draft && { ...draft, again: false };
    }
    // After an answer to a time-sensitive question given without web results: offer to check
    // it with the same one-tap search (the exact text is shown, so the tap is the approval).
    const last = conversation.messages.at(-1);
    const question = [...conversation.messages]
      .reverse()
      .find((m) => m.role === "user");
    if (
      last?.role !== "assistant" ||
      last.status !== "complete" ||
      !question ||
      selectedSources(conversation).some((source) => !!source.url)
    )
      return undefined;
    // Also when the answer-side check flagged unchecked rules the question detector missed.
    const again = searchSuggestion(
      question.text,
      undefined,
      !!last.uncheckedFigures,
    );
    return again && { ...again, again: true };
  }, [status?.search, status?.inference.ready, input, conversation]);
  // Search first for German rules (docs/german-rules-20261113.md): Send shows the choice for
  // exactly this draft; editing the draft or Escape drops it, and nothing is remembered.
  const askFirst = asksBeforeSending(
    suggestion,
    autoSearch,
    selectedSources(conversation).some((source) => !!source.url),
  );
  // "Always search for rules, fees and deadlines": where Send would ask, it searches instead.
  const autoRules = autoSearchRules && askFirst;
  const [choiceFor, setChoiceFor] = useState<string>();
  const choosing = askFirst && choiceFor === input;
  const choiceButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (choosing) choiceButton.current?.focus();
  }, [choosing]);
  const [proposalNote, setProposalNote] = useState<{
    note: string;
    warning: boolean;
  }>();
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
  useEffect(() => {
    if (!conversation.disappearAfter) return;
    const tick = () =>
      setConversation((c) => {
        const expired = expireMessages(c);
        return expired.removed ? expired.conversation : c;
      });
    tick();
    const timer = setInterval(tick, 60_000);
    return () => clearInterval(timer);
  }, [conversation.disappearAfter]);
  const unsaved = useMemo(() => {
    // An incognito chat is meant to be lost; never warn about discarding it.
    if (conversation.incognito) return false;
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
    window.confirm(t.discardConfirm);
  useEffect(() => {
    if (!source) return;
    const previous = document.activeElement as HTMLElement;
    const dialog = sourceDialog.current;
    dialog?.showModal();
    const buttons = dialog?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
    );
    buttons?.[0]?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSource(undefined);
      }
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
      dialog?.close();
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
          setNotice(textFor(appText).localServiceUnavailable);
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
      setProjects([]);
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
      setNotice(textFor(appText).vaultChangedElsewhere);
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
    setNotice(t.newTemporary);
  };
  const fail = (message: string) => setNotice(message);
  async function copyAnswer(text: string) {
    const current = epoch.current;
    try {
      await navigator.clipboard.writeText(text);
      if (current === epoch.current)
        setNotice(t.copied);
    } catch {
      if (current === epoch.current) fail(t.copyFailed);
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
    if (!status) throw new Error(t.serviceUnavailable);
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
    if (!response.ok)
      throw new Error(
        result.error ? serverMessage(result.error, lang) : t.requestFailed,
      );
    return result;
  }
  async function signOutConsumer() {
    if (!status?.consumerWorkspace || busy || !allowReplace()) return;
    setBusy(t.signingOut);
    try {
      await api("/api/auth/sign-out", {});
      vault.current?.lock();
      vault.current?.onInvalidate?.();
      accessNavigation.current = true;
      window.location.assign("/auth");
    } catch {
      setBusy("");
      fail(t.signOutUnconfirmed);
    }
  }
  // The last question and the conversation to ask it again from (as "Retry last response").
  function lastQuestion() {
    const last = [...conversation.messages]
      .reverse()
      .find((m) => m.role === "user");
    if (!last) return undefined;
    const index = conversation.messages.indexOf(last);
    try {
      const base =
        index === conversation.messages.length - 1
          ? { ...conversation, messages: conversation.messages.slice(0, index) }
          : branchConversation(conversation, input, last.id);
      return { base, text: last.text };
    } catch (error) {
      fail((error as Error).message);
      return undefined;
    }
  }
  // Ask the last question again, optionally in a chosen mode for this one request.
  function askAgain(modeOverride?: AnswerMode) {
    const retry = lastQuestion();
    if (retry) void send(retry.base, retry.text, false, false, modeOverride);
  }

  async function send(
    base = conversation,
    text = input,
    consumeDraft = true,
    consentChosen = false,
    // The user's own one-off choice ("Answer again with Thinking"); it wins over Auto.
    modeOverride?: AnswerMode,
  ) {
    if (busy || !status?.inference.ready || !text.trim()) return;
    if (status.healthConsentDraft && !healthConsent && !consentChosen) {
      // Ask once before the first message; the message waits and is not sent yet.
      setConsentPending({ base, text, consumeDraft, modeOverride });
      return;
    }
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
      fail(t.contextTooLarge);
      return;
    }
    const answer = {
      ...newMessage("assistant", ""),
      status: "partial" as const,
      sourceSnapshot: structuredClone(selectedSources(next)),
      // Large documents: which passages this answer was given, and that the rest was not sent.
      passagesUsed: passageNotes(next, true).join(" ") || undefined,
    };
    setConversation({ ...next, messages: [...next.messages, answer] });
    if (consumeDraft) setInput("");
    setNotice("");
    setBusy(t.preparing);
    const abort = new AbortController();
    abort.signal.addEventListener("abort", () => calculationSession.clear(), {
      once: true,
    });
    controller.current = abort;
    const current = epoch.current;
    const qualified = status.inference.qualification;
    const choiceForThis: ModeChoice = modeOverride ?? modeChoice;
    const mode = qualified?.modes
      ? choiceForThis === "auto"
        ? autoMode(next)
        : choiceForThis
      : undefined;
    const hasBackup = !!qualified && !!tierFor(qualified, mode).backupModel;
    let textArrived = false;
    let retried = false;
    const startedAt = Date.now();
    try {
      const attempt = async (
        choice: "primary" | "backup",
        signal = abort.signal,
      ) => {
        const { streamReply } = await abortable(import("./inference"), signal);
        signal.throwIfAborted();
        const usage = await streamReply(
          next,
          status.inference.qualification,
          status.csrf,
          signal,
          (chunk) => {
            textArrived ||= !!chunk;
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
          (kept) => {
            const note = describeKept(kept);            if (epoch.current === current && !abort.signal.aborted && note)
              setConversation((c) => ({
                ...c,
                messages: c.messages.map((m) =>
                  m.id === answer.id ? { ...m, keptOnDevice: note } : m,
                ),
              }));
          },
          choice,
          mode,
          status.inference.cacheSalt,
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
                    ...(m.text
                      ? {
                          arithmeticCheck: checkArithmetic(m.text),
                          completenessCheck: checkAnswerCompleteness(
                            c.messages,
                            m.id,
                            m.text,
                          ),
                          uncheckedFigures: checkUncheckedFigures(
                            c.messages,
                            m.id,
                            m.text,
                            selectedSources(c).some((source) => !!source.url),
                          ),
                          noOfficialSource: checkNoOfficialSource(
                            c.messages,
                            m.id,
                            selectedSources(c).flatMap((source) => source.url ?? []),
                          ),
                        }
                      : {}),
                    answeredBy: answerLabel(
                      choiceForThis,
                      mode,
                      choice === "backup",
                    ),
                  }
                : m,
            ),
            usage: usage ? [...c.usage, usage] : c.usage,
          }));
          if (!usage)
            setNotice(t.usageNotReported);
        }
      };
      try {
        await attempt("primary");
      } catch (error) {
        // Owner, 12 November: one automatic, labelled retry on the same mode's backup
        // model at the same provider, only when no answer text arrived, within the time
        // the mode allows for the whole message.
        const msLeft = replyLimits(mode).totalMs - (Date.now() - startedAt);
        if (
          !hasBackup ||
          !shouldRetryOnBackup(
            error,
            abort.signal.aborted,
            textArrived,
            msLeft,
            mode,
          )
        )
          throw error;
        retried = true;
        if (
          epoch.current === current &&
          error instanceof IncompleteReplyError &&
          error.usage
        )
          setConversation((c) => ({ ...c, usage: [...c.usage, error.usage!] }));
        setBusy(t.tryingBackup);
        await withDeadline(abort.signal, msLeft, (signal) =>
          attempt("backup", signal),
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
                          "HTTP_MODEL_NOT_FOUND",
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
        // Client-module error texts are English; serverMessage shows unknown text as sent.
        const passed = (message: string) =>
          serverMessage(
            retried
              ? message.replace(
                  /No (weaker fallback or )?automatic retry was (made|used)\./,
                  t.retriedOnce,
                )
              : message,
            lang,
          );
        if (!abort.signal.aborted && error instanceof AttestationBusyError && error.retryAt)
          setVerifyWaitUntil(error.retryAt);
        setNotice(
          abort.signal.aborted
            ? t.responseStopped
            : error instanceof AttestationBusyError
              ? passed(error.message)
              : error instanceof IncompleteReplyError
                ? `${passed(error.message)} ${error.usage ? t.usageRetained : t.costUnknown}`
                : error instanceof Error && error.name === "TimeoutError"
                  ? t.timedOut(retried)
                  : t.protectedUnavailable(retried),
        );
      }
    } finally {
      if (epoch.current === current) {
        controller.current = null;
        setBusy("");
      }
    }
  }
  async function importFiles(files: FileList | readonly File[] | null) {
    if (!files || busy) return;
    if (
      files.length + conversation.attachments.length > 5 ||
      Array.from(files).filter((f) => f.type.startsWith("image/")).length +
        conversation.attachments.filter((a) => a.kind === "screenshot").length >
        3
    ) {
      fail(t.tooManyAttachments);
      return;
    }
    const abort = new AbortController();
    controller.current = abort;
    const current = epoch.current;
    setBusy(t.readingOnDevice);
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
        fail(e instanceof Error ? e.message : t.extractionFailed);
    } finally {
      if (current === epoch.current) {
        controller.current = null;
        setBusy("");
      }
    }
  }
  // `how` is set when a suggestion tap or the automatic setting approved the search.
  async function research(
    approved = proposal,
    how?: "tap" | "auto",
  ): Promise<{ attachment?: Attachment; note: string } | "failed" | undefined> {
    if (!approved || busy) return;
    if (conversation.attachments.length >= 5) {
      fail(t.researchLimit);
      return "failed";
    }
    setProposal(undefined);
    setSearchSent("");
    setBusy(t.retrieving);
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
        const attachment: Attachment | undefined = sources.length
          ? {
              id: crypto.randomUUID(),
              name:
                approved.kind === "search"
                  ? t.searchResultsName
                  : t.publicPageName,
              selected: true,
              kind: "research",
              ...(approved.kind === "search"
                ? { researchQuery: approved.value }
                : {}),
              sources,
            }
          : undefined;
        if (attachment)
          setConversation((c) => ({
            ...c,
            temporarySearch: c.temporarySearch || approved.kind === "search",
            attachments: [...c.attachments, attachment],
          }));
        if (how)
          return {
            attachment,
            note: `${how === "auto" ? WHEN_TO_SEARCH.searchedAutomatically(approved.value) : WHEN_TO_SEARCH.searched(approved.value)} ${topPageNote(result)}`.trim(),
          };
        setNotice(
          sources.length
            ? approved.kind === "search"
              ? t.searchAdded(topPageNote(result))              : t.pageAdded
            : t.noSources,
        );
      }
    } catch (e) {
      if (current === epoch.current && !abort.signal.aborted) {
        fail(e instanceof Error ? e.message : t.researchFailed);
        return "failed";
      }
    } finally {
      if (current === epoch.current) {
        controller.current = null;
        setBusy("");
      }
    }
  }
  // The tap (or the opt-in setting) approves exactly the shown text; then the draft is sent.
  // `again`: search for the last question and answer it again (the old answer is replaced the
  // same way "Retry last response" replaces it).
  async function searchThenAnswer(
    value: string,
    how: "tap" | "auto",
    again = false,
  ) {
    const retry = again ? lastQuestion() : undefined;
    if (again && !retry) return;
    const text = retry?.text ?? input;
    const base = retry?.base ?? conversation;
    const outcome = await research({ kind: "search", value }, how);
    if (!outcome || (outcome === "failed" && how === "tap")) return;
    if (outcome === "failed") {
      setSearchSent(WHEN_TO_SEARCH.automaticFailed);      void send(base, text, !again);
      return;
    }
    setSearchSent(outcome.note);
    void send(
      outcome.attachment
        ? {
            ...base,
            temporarySearch: true,
            attachments: [...base.attachments, outcome.attachment],
          }
        : base,
      text,
      !again,
    );
  }
  async function unlockVault() {
    if (!status) {
      fail(t.waitForAccess);
      return;
    }
    const current = epoch.current;
    const secret = passphrase;
    setPassphrase("");
    setBusy(t.unlocking);
    try {
      await vault.current!.unlock(secret);
      const snapshots = await vault.current!.readAvailable();
      const projectList = await vault.current!.readProjects();
      if (current !== epoch.current) return;
      setUnlocked(true);
      setSaved(snapshots.conversations);
      setProjects(projectList);
      setUnreadableSnapshots(snapshots.unreadable);
      setNotice(t.vaultUnlocked);
    } catch {
      if (current !== epoch.current) return;
      fail(t.unlockFailed);
    } finally {
      if (current === epoch.current) setBusy("");
    }
  }
  async function eraseEverything() {
    if (!window.confirm(t.eraseConfirm)) return;
    const current = epoch.current;
    setBusy(t.erasing);
    try {
      controller.current?.abort();
      await vault.current!.eraseEverything();
      if (current !== epoch.current) return;
      setUnlocked(false);
      setSaved([]);
      setProjects([]);
      setUnreadableSnapshots(0);
      reset();
      setPassphrase("");
      setConversation(emptyConversation());
      setInput("");
      setNotice(t.erased);
    } catch {
      if (current === epoch.current)
        fail(t.eraseFailed);
    } finally {
      if (current === epoch.current) setBusy("");
    }
  }
  async function save(asCopy = false) {
    if (conversation.incognito) {
      fail(t.incognitoNotSaved);
      return;
    }
    const current = epoch.current;
    setBusy(t.encrypting);
    try {
      const snapshot = await vault.current!.save(
        {
          ...conversation,
          ...(asCopy
            ? {
                id: crypto.randomUUID(),
                createdAt: new Date().toISOString(),
                title: t.copyTitle(conversation.title),
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
      const projectList = await vault.current!.readProjects();
      if (current !== epoch.current) return;
      setSaved(snapshots.conversations);
      setProjects(projectList);
      setUnreadableSnapshots(snapshots.unreadable);
      setNotice(t.snapshotSaved);
    } catch (error) {
      if (current !== epoch.current) return;
      if (error instanceof VaultConflictError) {
        setSaveConflict(true);
        fail(error.message);        return;
      }
      fail(
        error instanceof DOMException && error.name === "QuotaExceededError"
          ? t.storageFull
          : t.saveFailed,
      );
    } finally {
      if (current === epoch.current) setBusy("");
    }
  }
  async function exportVaultBackup() {
    const current = epoch.current;
    setBusy(t.encryptingBackup);
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
      setNotice(t.backupRequested);
    } catch {
      if (current === epoch.current)
        fail(t.backupFailed);
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
    setBusy(t.updatingProtection);
    try {
      await vault.current!.changePassphrase(currentSecret, nextSecret);
      if (current !== epoch.current) return;
      vault.current!.onInvalidate?.();
      setNotice(t.passphraseChanged);
    } catch {
      if (current === epoch.current)
        fail(t.passphraseFailed);
    } finally {
      if (current === epoch.current) setBusy("");
    }
  }
  async function restoreVaultBackup(file: File, secret: string) {
    const current = epoch.current;
    setBusy(t.restoring);
    try {
      if (!file.size || file.size > BACKUP_MAX_BYTES)
        throw Error("Invalid file size");
      const text = await file.text();
      if (current !== epoch.current) return;
      const count = await vault.current!.restoreBackup(text, secret);
      if (current !== epoch.current) return;
      const snapshots = await vault.current!.readAvailable();
      const projectList = await vault.current!.readProjects();
      if (current !== epoch.current) return;
      setSaved(snapshots.conversations);
      setProjects(projectList);
      setUnreadableSnapshots(snapshots.unreadable);
      setNotice(t.restored(count));
    } catch {
      if (current === epoch.current)
        fail(t.restoreFailed);
    } finally {
      if (current === epoch.current) setBusy("");
    }
  }
  async function signOut() {
    if (!status?.accountId) return;

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
      fail(t.signOutFailed);
    }
  }
  async function createProject(name: string): Promise<string | undefined> {
    const current = epoch.current;
    setBusy(t.creatingProject);
    try {
      const next = await vault.current!.createProject(name);
      if (current !== epoch.current) return;
      setProjects(next);
      setNotice(t.projectCreated);
      return next.at(-1)?.id;
    } catch (error) {
      if (current === epoch.current)
        fail(
          error instanceof Error
            ? error.message
            : t.projectCreateFailed,
        );
    } finally {
      if (current === epoch.current) setBusy("");
    }
  }
  async function editProject(id: string, name?: string): Promise<boolean> {
    const current = epoch.current;
    setBusy(t.updatingProject);
    try {
      await vault.current!.editProject(id, name);
      const available = await vault.current!.readAvailable();
      const next = await vault.current!.readProjects();
      if (current !== epoch.current) return false;
      setSaved(available.conversations);
      setProjects(next);
      if (name === undefined && conversation.projectId === id) {
        setConversation((previous) => ({ ...previous, projectId: undefined }));
        savedBase.current =
          available.conversations.find((c) => c.id === conversation.id) ?? null;
      }
      setNotice(
        name === undefined ? t.projectRemoved : t.projectRenamed,
      );
      return true;
    } catch (error) {
      if (current === epoch.current)
        fail(error instanceof Error ? error.message : t.projectUpdateFailed);
      return false;
    } finally {
      if (current === epoch.current) setBusy("");
    }
  }
  async function organizeChat(
    c: Conversation,
    change: Pick<Conversation, "pinned" | "archived" | "projectId" | "title">,
  ) {
    const current = epoch.current;
    setBusy(t.updatingOrganization);
    try {
      const snapshot = await vault.current!.save({ ...c, ...change }, c);
      if (current !== epoch.current) return;
      if (conversation.id === c.id) {
        savedBase.current = snapshot;
        setConversation((previous) => ({
          ...previous,
          pinned: snapshot.pinned,
          archived: snapshot.archived,
          projectId: snapshot.projectId,
        }));
      }
      const available = await vault.current!.readAvailable();
      if (current !== epoch.current) return;
      setSaved(available.conversations);
      setUnreadableSnapshots(available.unreadable);
      setNotice(t.organized);
    } catch (error) {
      if (current === epoch.current)
        fail(
          error instanceof Error
            ? error.message
            : t.organizeFailed,
        );
    } finally {
      if (current === epoch.current) setBusy("");
    }
  }
  const openSaved = (c: Conversation) => {
    if (!allowReplace()) return;
    reset();
    savedBase.current = c;
    const expired = expireMessages(c);
    setConversation(structuredClone(expired.conversation));
    setInput(c.draft ?? "");
    setTab("Conversation");
    setNavigationOpen(false);
    if (expired.removed) {
      setNotice(
        t.openedPruned(expired.removed, t.disappearLabel(c.disappearAfter!)),
      );
      // Persist the pruned copy so the deleted messages do not survive in the vault.
      void vault.current
        ?.save(expired.conversation, c)
        .then((snapshot) => {
          savedBase.current = snapshot;
        })
        .catch(() => {});
    } else
      setNotice(t.opened);
  };

  const sources = conversation.attachments.flatMap((a) => a.sources);
  const sourceHistory = new Map(sources.map((item) => [item.id, item]));
  return (
    <div
      className={`app-shell chat-design ${navigationCollapsed ? "navigation-collapsed" : ""}`}
      data-theme={
        appearance === "system" ? (systemDark ? "dark" : "light") : appearance
      }
    >
      <WorkspaceNavigation
        open={navigationOpen}
        collapsed={navigationCollapsed}
        onClose={() => setNavigationOpen(false)}
        onCollapse={() => setNavigationCollapsed(true)}
        onExpand={() => {
          setNavigationCollapsed(false);
          setNavigationOpen(false);
        }}
        conversations={saved}
        projects={projects}
        status={status}
        onSignOut={() => void signOut()}
        onCreateProject={createProject}
        onEditProject={editProject}
        onOrganize={(c, change) => void organizeChat(c, change)}
        unlocked={unlocked}
        busy={!!busy}
        newDisabled={!!busy && !controller.current}
        currentId={conversation.id}
        onOpen={openSaved}
        onNew={(projectId) => {
          if (!allowReplace()) return;
          reset();
          if (projectId) setConversation({ ...emptyConversation(), projectId });
          setTab("Conversation");
          setNavigationOpen(false);
        }}
        onNewIncognito={() => {
          if (!allowReplace()) return;
          reset();
          setConversation({
            ...emptyConversation(),
            incognito: true,
            title: t.incognitoTitle,
          });
          setTab("Conversation");
          setNavigationOpen(false);
        }}
        onNavigate={(target) => {
          setTab(target);
          setNavigationOpen(false);
        }}
        onSettings={() => {
          setNavigationOpen(false);
          setSettingsOpen(true);
        }}
      />
      <dialog
        ref={settingsDialog}
        onKeyDown={containDialogFocus}
        className="settings-dialog"
        aria-label={t.settings}
        onCancel={() => setSettingsOpen(false)}
        onClose={() => setSettingsOpen(false)}
      >
        <div className="row">
          <h2>{t.settings}</h2>
          <button
            onClick={() => setSettingsOpen(false)}
            aria-label={t.closeSettings}
          >
            ×
          </button>
        </div>
        <div className="settings-layout">
          <nav aria-label={t.settingsSections}>
            {(
              [
                ["appearance", "sun", t.sectionAppearance],
                ["account", "user", t.sectionAccount],
                ["privacy", "shield", t.sectionPrivacy],
                ["usage", "usage", t.sectionUsage],
              ] as const
            ).map(([id, icon, label]) => (
              <button
                key={id}
                aria-current={settingsSection === id ? "page" : undefined}
                onClick={() => setSettingsSection(id)}
              >
                <Icon name={icon} />
                {label}
              </button>
            ))}
          </nav>
          <section className="settings-content">
            {settingsSection === "appearance" && (
              <>
                <label htmlFor="chat-appearance">{t.sectionAppearance}</label>
                <select
                  id="chat-appearance"
                  value={appearance}
                  onChange={(event) =>
                    setAppearance(event.target.value as typeof appearance)
                  }
                >
                  <option value="system">{t.themeSystem}</option>
                  <option value="light">{t.themeLight}</option>
                  <option value="dark">{t.themeDark}</option>
                </select>
                <p className="muted">{t.appearanceNote}</p>
                {germanEnabled() && (
                  <>
                    <h3>{t.languageLabel}</h3>
                    <LanguageSwitch className="language-switch settings-language" />
                    <p className="muted">{t.languageNote}</p>
                  </>
                )}
              </>
            )}
            {settingsSection === "account" && (
              <>
                <h3>{t.sectionAccount}</h3>
                <p>
                  {status?.accountEmail ??
                    (status?.accountId
                      ? t.signedInAccount(status.accountId)
                      : t.localSession)}
                </p>
                <p>{t.recoverySeparate}</p>
                <button
                  onClick={() => {
                    setSettingsOpen(false);
                    setTab("Account");
                  }}
                >
                  {t.accountAndUsage}
                </button>
              </>
            )}
            {settingsSection === "privacy" && (
              <>
                <h3>{t.sectionPrivacy}</h3>
                <p>{privacySummary(lang)}</p>
                {status?.healthConsentDraft && (
                  <HealthConsentSetting
                    record={healthConsent}
                    onChoose={chooseHealthConsent}
                  />
                )}
                <button
                  className="text-button"
                  onClick={() => {
                    setSettingsOpen(false);
                    setSource({
                      id: "privacy-policy",
                      title: t.privacyPolicy,
                      text: privacyPolicyText(disclosedProvider(status), lang),
                    });
                  }}
                >
                  {t.privacyPolicyLink}
                </button>
                <button
                  className="text-button"
                  onClick={() => {
                    setSettingsOpen(false);
                    setSource({
                      id: "imprint",
                      title: t.imprint,
                      text: imprintText(undefined, lang),
                    });
                  }}
                >
                  {t.imprintLink}
                </button>
                <p>{t.privateChatGated}</p>
                <p>{t.projectsNote}</p>
                <button
                  onClick={() => {
                    setSettingsOpen(false);
                    setTab("Saved");
                  }}
                >
                  {t.historyControls}
                </button>
              </>
            )}
            {settingsSection === "usage" && (
              <AccountUsage allowance={status?.requestAllowance} />
            )}
          </section>
        </div>
        <div className="workspace-help">
          <button
            className="text-button"
            onClick={() => {
              setSource({
                id: "workspace-guide",
                title: t.guideTitle,
                text: t.guideText,
              });
            }}
          >
            {t.gettingStarted}
          </button>
          <button
            className="text-button"
            onClick={() => {
              setSource({
                id: "trial-safety",
                title: t.safetyTitle,
                text: t.safetyText,
              });
            }}
          >
            {t.safetyTitle}
          </button>
          <button
            className="text-button"
            onClick={() => {
              setSource({
                id: "privacy",
                title: t.privacyBoundariesTitle,
                // The statement for the provider in use (Privatemode's is a D17 draft).
                text: privacyText(disclosedProvider(status), lang),
              });
            }}
          >
            {t.privacyBoundariesLink}
          </button>
        </div>
      </dialog>
      <main>
        <header className="conversation-header">
          <button
            className="navigation-toggle"
            aria-label={t.openNavigation}
            onClick={() => {
              setNavigationOpen(true);
            }}
          >
            <Icon name="sidebar" />
          </button>
          <div className="header-title">
            <h1>
              {tab === "Conversation" &&
              conversation.title !== "New conversation"
                ? conversation.title
                : tabName[tab]}
            </h1>
            {tab === "Conversation" &&
              projects.some((p) => p.id === conversation.projectId) && (
                <p className="project-breadcrumb">
                  <Icon name="folder" />
                  {projects.find((p) => p.id === conversation.projectId)?.name}
                </p>
              )}
            {tab === "Conversation" && conversation.messages.length > 0 && (
              <p className="conversation-meta">
                {t.messageCount(conversation.messages.length)}{" "}
                <button
                  className="text-button"
                  onClick={() =>
                    outputEnd.current?.scrollIntoView({
                      block: "end",
                      behavior: "instant",
                    })
                  }
                >
                  {t.jumpLatest}
                </button>
              </p>
            )}
          </div>
          <LanguageSwitch />
          <button
            className="share-preview"
            disabled
            title={t.shareTitle}
          >
            <Icon name="share" />
            <span>
              {t.share} <small>{t.comingLater}</small>
            </span>
          </button>
          <details className="conversation-menu">
            <summary aria-label={t.conversationActions}>
              <Icon name="more" />
            </summary>
            <div className="menu-surface">
              <button onClick={() => setTab("Conversation")}>
                <Icon name="chat" />
                {t.tabConversation}
              </button>
              <button disabled>
                <Icon name="share" />
                {t.shareChatLater}
              </button>
              <button onClick={() => setTab("Saved")}>
                {t.renameSave}
              </button>
              {tab === "Conversation" && (
                <button onClick={() => setContextOpen(true)}>
                  {t.includedContext}
                </button>
              )}
              <button onClick={() => setTab("Context")}>
                {t.conversationFiles}
              </button>
              <label className="menu-select">
                {t.disappearing}
                <select
                  aria-label={t.disappearing}
                  value={conversation.disappearAfter ?? "off"}
                  disabled={!!busy}
                  onChange={(event) => {
                    const value = event.target.value;
                    setConversation((c) => {
                      const next = {
                        ...c,
                        disappearAfter:
                          value === "off"
                            ? undefined
                            : (value as DisappearAfter),
                      };
                      if (next.disappearAfter === undefined)
                        delete next.disappearAfter;
                      return expireMessages(next).conversation;
                    });
                  }}
                >
                  <option value="off">{t.disappearOff}</option>
                  <option value="hour">{t.disappearHour}</option>
                  <option value="day">{t.disappearDay}</option>
                  <option value="week">{t.disappearWeek}</option>
                </select>
              </label>
              <button onClick={() => setSettingsOpen(true)}>{t.settings}</button>
            </div>
          </details>
        </header>
        <details className="connection-banner">
          <summary>
            {status?.inference.ready ? t.protectedAvailable : t.privateNotYet}{" "}
            <span>{t.privacyDetails}</span>
          </summary>
          <span className="status-icon">◇</span>
          <div>
            <strong>
              {status?.inference.ready
                ? t.protectedAvailable
                : t.privateNotConnected}
            </strong>
            <p>
              {status?.inference.ready && status.inference.qualification
                ? verificationSummary(status.inference.qualification, lang)
                : t.localOnly}
            </p>
          </div>
        </details>
        {conversation.incognito && (
          <div role="status" className="notice incognito-banner">
            <strong>{t.incognitoBannerTitle}</strong> {t.incognitoBanner}
          </div>
        )}
        {conversation.disappearAfter && (
          <div role="status" className="notice disappearing-banner">
            <strong>{t.disappearingBannerTitle}</strong>{" "}
            {t.disappearingBanner(t.disappearLabel(conversation.disappearAfter))}
          </div>
        )}
        {status?.operatorNotice && (
          <div role="status" className="notice operator-notice">
            {/* The operator's own words are shown as written. */}
            <strong>{t.operatorNoticeTitle}</strong> {status.operatorNotice}
          </div>
        )}
        {notice && (
          <div role="status" className="notice">
            {notice}
            <button aria-label={t.dismissNotice} onClick={() => setNotice("")}>
              ×
            </button>
          </div>
        )}
        {busy && (
          <div role="status" className="progress">
            <span className="spinner" />
            {busy}
            {controller.current && (
              <button onClick={() => controller.current?.abort()}>{t.stop}</button>
            )}
          </div>
        )}
        {!!imports.length && (
          <section className="import-results" aria-label={t.importResults}>
            <strong>{t.importResults}</strong>
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
                {t.dismissImports}
              </button>
            )}
          </section>
        )}
        {tab === "Conversation" && (
          <section className="chat-view">
            {!conversation.messages.length && (
              <div className="welcome">
                <div className="welcome-mark">✳</div>
                <p className="eyebrow">{t.eyebrow}</p>
                <h2>
                  {t.welcomeA}
                  <br />
                  <em>{t.welcomeB}</em>
                </h2>
                <p>
                  {t.welcomeLine1}
                  <br />
                  {t.welcomeLine2}
                </p>
                <div className="starter-grid">
                  {[
                    [t.writeTitle, t.writeDescription, t.writeDraft],
                    [t.planTitle, t.planDescription, t.planDraft],
                    [t.documentTitle, t.documentDescription, ""],
                  ].map(([title, description, target]) => (
                    <button
                      key={title}
                      onClick={() => {
                        if (!target) setTab("Context");
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
                  setNotice(t.branchOpened);
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
                  aria-label={t.messageLabel(message.role === "user", index + 1)}
                >
                  <div className="message-heading">
                    <strong>
                      {message.role === "user" ? t.you : "CometRow"}
                    </strong>
                    {message.status !== "complete" && (
                      <span>
                        {message.status === "partial"
                          ? t.incompleteExcluded
                          : t.noAnswer}
                      </span>
                    )}
                  </div>
                  {message.answeredBy && (
                    <p className="muted answered-by">{message.answeredBy}</p>
                  )}
                  {message.arithmeticCheck &&
                    message.arithmeticCheck.mismatches > 0 && (
                      <p className="warning arithmetic-check" role="alert">
                        {arithmeticText[lang].mismatch}
                      </p>
                    )}
                  {message.arithmeticCheck &&
                    (message.arithmeticCheck.ambiguous ?? 0) > 0 && (
                      <p className="warning arithmetic-check" role="alert">
                        {arithmeticText[lang].ambiguous}
                      </p>
                    )}
                  {!!message.completenessCheck?.missing.length && (
                    <p className="warning arithmetic-check" role="alert">
                      {completenessWarning(message.completenessCheck.missing)}
                    </p>
                  )}
                  {message.uncheckedFigures && (
                    <p className="warning arithmetic-check" role="alert">
                      {GERMAN_RULES.warning}
                    </p>
                  )}
                  {message.noOfficialSource && (
                    <p className="warning arithmetic-check" role="alert">
                      {GERMAN_RULES.noOfficial}
                    </p>
                  )}
                  {message.passagesUsed && (
                    <p className="muted passages-used">{message.passagesUsed}</p>
                  )}
                  {message.keptOnDevice && (
                    <p className="muted kept-on-device">
                      {message.keptOnDevice} {t.keptNote}
                    </p>
                  )}
                  {message.failure && (
                    <p className="muted">{t.failure(message.failure)}</p>
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
                    <details className="source-history-note">
                      <summary>{t.sourcesChanged}</summary>
                      <p>{t.sourcesChangedText}</p>
                    </details>
                  )}
                  {!!message.text &&
                    sourceHistoryStatus(message, sourceHistory) ===
                      "unrecorded" && (
                      <details className="source-history-note">
                        <summary>{t.sourcesUnrecorded}</summary>
                        <p>{t.sourcesUnrecordedText}</p>
                      </details>
                    )}
                  <div className="message-actions">
                    {message.role === "user" && (
                      <button
                        disabled={!!busy}
                        aria-label={t.editIntoBranch}
                        id={`edit-message-${message.id}`}
                        onClick={() => {
                          setEditId(message.id);
                          setEditText(message.text);
                        }}
                      >
                        <Icon name="edit" />
                        {t.edit}
                      </button>
                    )}
                    {message.role === "assistant" && (
                      <button
                        disabled={
                          message.status !== "complete" || !message.text
                        }
                        onClick={() => void copyAnswer(message.text)}
                      >
                        <Icon name="copy" />
                        {t.copyAnswer}
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
                  {t.editedMessage}
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
                      setNotice(t.branchCreated);
                    } catch (error) {
                      fail((error as Error).message);
                    }
                  }}
                >
                  {t.createBranch}
                </button>
                <button
                  onClick={() => {
                    document.getElementById(`edit-message-${editId}`)?.focus();
                    setEditId(undefined);
                    setEditText("");
                  }}
                >
                  {t.cancel}
                </button>
              </div>
            )}
            <div className="composer-dock">
              {suggestion && !autoSearch && !(autoRules && !choosing) && !busy && (
                <div
                  className="notice composer-note search-suggestion"
                  role="region"
                  aria-label={t.searchSuggestion}
                  onKeyDown={(event) => {
                    if (!choosing || event.key !== "Escape") return;
                    event.preventDefault();
                    setChoiceFor(undefined);
                    document.getElementById("message-input")?.focus();
                  }}
                >
                  <p>
                    <strong>
                      {suggestion.again
                        ? WHEN_TO_SEARCH.againHeading
                        : choosing
                          ? GERMAN_RULES.choiceHeading
                          : suggestion.rules
                            ? GERMAN_RULES.heading
                            : WHEN_TO_SEARCH.heading}
                    </strong>{" "}
                    {WHEN_TO_SEARCH.label}
                  </p>
                  <pre>{suggestion.value}</pre>
                  {suggestion.note && (
                    <p className="muted">{suggestion.note}</p>
                  )}
                  {suggestion.warning && (
                    <p className="warning">{WHEN_TO_SEARCH.warning}</p>
                  )}
                  <p className="muted">
                    {suggestion.again
                      ? WHEN_TO_SEARCH.againExplanation
                      : askFirst
                        ? GERMAN_RULES.explanation
                        : WHEN_TO_SEARCH.explanation}
                  </p>
                  <div className="row">
                    <button
                      ref={choiceButton}
                      type="button"
                      className="primary"
                      onClick={() => {
                        setChoiceFor(undefined);
                        void searchThenAnswer(
                          suggestion.value,
                          "tap",
                          suggestion.again,
                        );
                      }}
                    >
                      {suggestion.again
                        ? WHEN_TO_SEARCH.againButton
                        : WHEN_TO_SEARCH.button}
                    </button>
                    {choosing && (
                      <button
                        type="button"
                        onClick={() => {
                          setChoiceFor(undefined);
                          void send();
                        }}
                      >
                        {GERMAN_RULES.without}
                      </button>
                    )}
                  </div>
                  {choosing && (
                    <label className="muted">
                      <input
                        type="checkbox"
                        checked={autoSearchRules}
                        onChange={(e) => chooseAutoSearchRules(e.target.checked)}
                      />{" "}
                      {WHEN_TO_SEARCH.rulesSettingLabel}.{" "}
                      {WHEN_TO_SEARCH.rulesSettingNote}
                    </label>
                  )}
                </div>
              )}
              {searchSent && (
                <p className="notice composer-note" role="status">
                  {searchSent}
                </p>
              )}
              {status?.healthConsentDraft && consentPending && (
                <HealthConsentPrompt
                  onChoose={(choice) => {
                    const pending = consentPending;
                    chooseHealthConsent(choice);
                    setConsentPending(undefined);
                    if (pending)
                      void send(
                        pending.base,
                        pending.text,
                        pending.consumeDraft,
                        true,
                        pending.modeOverride,
                      );
                  }}
                />
              )}
              {status?.healthConsentDraft &&
                healthConsent?.choice === "declined" && (
                  <p className="notice composer-note" role="note">
                    {healthConsentCopy(lang).declinedNote}
                  </p>
                )}
              <form
                className="composer"
                onSubmit={(e) => {
                  e.preventDefault();
                  if ((autoSearch || autoRules) && suggestion)
                    void searchThenAnswer(suggestion.value, "auto");
                  else if (askFirst) setChoiceFor(input);
                  else void send();
                }}
              >
                <label className="sr-only" htmlFor="message-input">
                  {t.messageInput}
                </label>
                <textarea
                  id="message-input"
                  placeholder={t.placeholder}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  maxLength={20000}
                  rows={1}
                  onInput={(event) => {
                    const field = event.currentTarget;
                    field.style.height = "auto";
                    field.style.height = `${Math.min(field.scrollHeight, 160)}px`;
                  }}
                />
                <div className="composer-footer">
                  <input
                    ref={chatFileInput}
                    type="file"
                    hidden
                    aria-label={t.attachFiles}
                    multiple
                    accept={DOCUMENT_ACCEPT}
                    disabled={!!busy}
                    onChange={(event) => {
                      void importFiles(event.target.files);
                      event.target.value = "";
                    }}
                  />
                  <details className="tools-menu">
                    <summary aria-label={t.tools}>
                      <Icon name="plus" />
                    </summary>
                    <div className="menu-surface">
                      <button
                        type="button"
                        className="text-button"
                        disabled={
                          !!busy || conversation.attachments.length >= 5
                        }
                        onClick={() => chatFileInput.current?.click()}
                      >
                        <Icon name="file" />
                        {t.attachFile}
                      </button>
                      <button
                        type="button"
                        className="text-button"
                        disabled={
                          !!busy ||
                          conversation.attachments.length >= 5 ||
                          conversation.attachments.filter(
                            (a) => a.kind === "screenshot",
                          ).length >= 3
                        }
                        onClick={() => setPhotoOpen(true)}
                      >
                        <Icon name="camera" />
                        {t.photoToText}
                      </button>
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => setContextOpen(true)}
                      >
                        {t.reviewContext}{" "}
                        <span>
                          {t.selectedCount(
                            conversation.attachments.filter((a) => a.selected)
                              .length,
                          )}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => setTab("Research")}
                      >
                        <Icon name="globe" />
                        {t.tabResearch}
                      </button>
                      <button type="button" onClick={() => setTab("Context")}>
                        <Icon name="folder" />
                        {t.conversationFiles}
                      </button>
                      <div
                        className="coming-later-list"
                        aria-label={t.planned}
                      >
                        {(
                          [
                            ["image", t.createImage],
                            ["mic", t.dictation],
                            ["voice", t.liveVoice],
                          ] as const
                        ).map(([icon, label]) => (
                          <button key={icon} type="button" disabled>
                            <Icon name={icon} />
                            <span>{label}</span>
                            <small>{t.comingLater}</small>
                          </button>
                        ))}
                      </div>
                      <p className="muted">{t.photoNote}</p>
                      <p className="muted">{t.filesNote}</p>
                    </div>
                  </details>
                  {status?.inference.qualification?.modes && (
                    <select
                      className="mode-select"
                      aria-label={t.answerMode}
                      value={modeChoice}
                      onChange={(event) => {
                        const value = event.target.value as ModeChoice;
                        setModeChoice(value);
                        saveModeChoice(value);
                      }}
                    >
                      {(["auto", "fast", "thinking"] as const).map((value) => (
                        <option key={value} value={value}>
                          {MODE_NAMES[value]}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    type="button"
                    className="context-count"
                    onClick={() => setContextOpen(true)}
                  >
                    {t.contextCount(
                      selectedContextSize.includedMessages,
                      conversation.attachments.filter((a) => a.selected).length,
                    )}
                  </button>
                  <button
                    type="button"
                    className="future-voice"
                    disabled
                    aria-label={t.dictationLater}
                    title={t.dictationLater}
                  >
                    <Icon name="mic" />
                    <small>{t.comingLater}</small>
                  </button>
                  <button
                    type="button"
                    className="future-voice"
                    disabled
                    aria-label={t.liveVoiceLater}
                    title={t.liveVoiceLater}
                  >
                    <Icon name="voice" />
                  </button>
                  {controller.current ? (
                    <button
                      type="button"
                      className="primary"
                      onClick={() => controller.current?.abort()}
                    >
                      {t.stopResponse}
                    </button>
                  ) : (
                    <button
                      className="primary"
                      disabled={
                        !!busy || !input.trim() || !status?.inference.ready
                      }
                      type="submit"
                      aria-label={t.sendLabel}
                    >
                      {t.send} <Icon name="send" />
                    </button>
                  )}
                </div>
              </form>
              {conversation.attachments.length > 0 && (
                <ul
                  className="composer-attachments"
                  aria-label={t.attachments}
                >
                  {conversation.attachments.map((attachment) => (
                    <li key={attachment.id}>
                      <span>{attachment.name}</span>
                      <small>
                        {attachment.selected ? t.included : t.excluded}
                      </small>
                      <button
                        type="button"
                        onClick={() => setTab("Context")}
                        aria-label={t.reviewNamed(attachment.name)}
                      >
                        {t.review}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {conversation.messages.length > 0 && (
                <button
                  className="text-button"
                  title={
                    status?.inference.ready ? t.newCharge : t.retryGated
                  }
                  disabled={!!busy || !status?.inference.ready}
                  onClick={() => askAgain()}
                >
                  {conversation.messages.at(-1)?.role === "user"
                    ? t.answerThis
                    : t.retryLast}
                </button>
              )}
              {/* One tap to the deeper mode after a Fast answer: user-chosen, labelled, same provider. */}
              {status?.inference.qualification?.modes &&
                conversation.messages.at(-1)?.role === "assistant" &&
                // German label once answer-modes passes the language.
                /(^|· )(Fast|Schnell)( ·|$)/.test(
                  conversation.messages.at(-1)?.answeredBy ?? "",
                ) && (
                  <button
                    className="text-button"
                    title={t.newCharge}
                    disabled={!!busy || !status?.inference.ready}
                    onClick={() => askAgain("thinking")}
                  >
                    {t.answerThinking}
                  </button>
                )}
              <p className="composer-caption">
                {unlocked ? t.captionVault : t.captionTemporary} {t.captionAi}
              </p>
            </div>
            <dialog
              ref={contextDialog}
              onKeyDown={containDialogFocus}
              className="context-dialog"
              aria-label={t.includedContext}
              onCancel={() => setContextOpen(false)}
              onClose={() => setContextOpen(false)}
            >
              <div className="row">
                <h2>{t.includedContext}</h2>
                <button
                  aria-label={t.closeContext}
                  onClick={() => setContextOpen(false)}
                >
                  ×
                </button>
              </div>
              <ContextReview
                expanded
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
              <p className="composer-note">{t.attachmentsNote}</p>
              <p className="composer-note" data-testid="context-size">
                {t.contextSize(
                  selectedContextSize.characters.toLocaleString(lang),
                  status?.inference.qualification?.maxInputCharacters.toLocaleString(
                    lang,
                  ),
                )}
              </p>
              <p className="composer-note">{t.onlySelected}</p>
            </dialog>
            {new URLSearchParams(location.search).has("developmentTools") && (
              <details className="panel">
                <summary>{t.calculator}</summary>
                <p>{t.calculatorNote}</p>
                <div className="calculator">
                  <input
                    aria-label={t.firstNumber}
                    value={operandA}
                    onChange={(e) => setOperandA(e.target.value)}
                  />
                  <select
                    aria-label={t.operation}
                    value={operation}
                    onChange={(e) => setOperation(e.target.value)}
                  >
                    <option value="+">+</option>
                    <option value="-">−</option>
                    <option value="*">×</option>
                    <option value="/">÷</option>
                    <option value="change">{t.percentChange}</option>
                  </select>
                  <input
                    aria-label={t.secondNumber}
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
                    {t.calculate}
                  </button>
                </div>
                <output>{calculation}</output>
              </details>
            )}
            {conversation.usage.length > 0 && (
              <p className="muted">
                {t.usage(
                  conversation.usage.reduce((n, u) => n + u.total, 0),
                  conversation.usage
                    .reduce((n, u) => n + u.estimatedUSD, 0)
                    .toLocaleString(lang, {
                      minimumFractionDigits: 4,
                      maximumFractionDigits: 4,
                    }),
                )}
              </p>
            )}
          </section>
        )}
        {tab === "Context" && (
          <section className="content-view">
            <h2>
              {t.contextHeadA}
              <br />
              <em>{t.contextHeadB}</em>
            </h2>
            <p className="intro">{t.contextIntro}</p>
            <label className="upload-zone">
              ＋ {t.addDocuments}
              <input
                aria-label={t.addDocuments}
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
                {t.formats}
                <br />
                {t.limits}
              </small>
            </label>
            {conversation.attachments.length === 0 && (
              <p className="empty-note">{t.contextEmpty}</p>
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
                  {attachment.liveSearch && attachment.researchQuery && (
                    <div
                      className="live-search-note"
                      role="region"
                      aria-label={t.fromLiveSearch}
                    >
                      <p className="muted">
                        {t.liveSearchNote(
                          new Date(
                            attachment.liveSearch.strippedAt,
                          ).toLocaleDateString(lang, { dateStyle: "long" }),
                        )}
                      </p>
                      <button
                        type="button"
                        disabled={!!busy}
                        onClick={() => {
                          const text = attachment.researchQuery ?? "";
                          const prepared = prepareSearchQuery(text);
                          setResearchKind("search");
                          setQuery(text);
                          setProposalNote({
                            note: prepared.note,
                            warning: prepared.warning,
                          });
                          setProposal({
                            kind: "search",
                            value: prepared.value,
                          });
                          setTab("Research");
                        }}
                      >
                        {t.searchAgain}
                      </button>
                    </div>
                  )}
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
                    {t.remove}
                  </button>
                </div>
                {attachment.warning && (
                  <p className="muted">{attachment.warning}</p>
                )}
                {attachment.sources.map((s) => (
                  <details key={s.id}>
                    <summary>
                      {s.title}
                      {s.page ? t.pageSuffix(s.page) : ""} · [{s.id}]
                    </summary>
                    <button onClick={() => setSource({ ...s })}>
                      {t.inspectSource}
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
                        {t.reviewPage}
                      </button>
                    )}
                    <label>
                      {t.correctText}
                      {s.userEdited && (
                        <span className="source-history-note">
                          {t.userEditedShort}
                        </span>
                      )}
                      <textarea
                        aria-label={t.textFor(s.title, s.page)}
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
            <p className="muted">{t.removeNote}</p>
          </section>
        )}
        {tab === "Research" && (
          <section className="content-view">
            <h2>
              {t.researchHeadA}
              <br />
              <em>{t.researchHeadB}</em>
            </h2>
            <p className="intro">
              {WHEN_TO_SEARCH.researchIntro}
            </p>
            <p className="muted">{t.researchNote}</p>
            <div className="panel">
              <label>
                <input
                  type="checkbox"
                  checked={autoSearch}
                  onChange={(e) => {
                    setAutoSearch(e.target.checked);
                    saveAutoSearch(e.target.checked);
                  }}
                />{" "}
                {WHEN_TO_SEARCH.settingLabel}
              </label>
              <p className="muted">{WHEN_TO_SEARCH.settingHelp}</p>
              <label>
                <input
                  type="checkbox"
                  checked={autoSearchRules}
                  onChange={(e) => chooseAutoSearchRules(e.target.checked)}
                />{" "}
                {WHEN_TO_SEARCH.rulesSettingLabel}
              </label>
              <p className="muted">{WHEN_TO_SEARCH.rulesSettingHelp}</p>
            </div>
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
                      setInput(t.sourcesQuestion(question));
                    }
                    setTab("Conversation");
                  }}
                >
                  {t.prepareQuestion}
                </button>
                <p className="muted">
                  {t.prepareNote}
                  {!status?.inference.ready && t.answersUnavailable}
                </p>
              </div>
            )}
            <div className="panel">
              <label>
                {t.researchMethod}
                <select
                  value={researchKind}
                  onChange={(e) => {
                    setResearchKind(e.target.value as "search" | "page");
                    setProposal(undefined);
                  }}
                >
                  <option value="search">{t.publicSearch}</option>
                  <option value="page">{t.readPage}</option>
                </select>
              </label>
              <label>
                {researchKind === "search" ? t.exactQuery : t.exactUrl}
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
                <p className="muted">{t.searchNeedsAccess}</p>
              )}
              {researchKind === "page" && status?.publicPageHosts && (
                <p className="muted">
                  {t.pageDomains(
                    status.publicPageHosts.length
                      ? status.publicPageHosts.join(", ")
                      : t.noneConfigured,
                  )}
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
                    if (researchKind === "search") {
                      const prepared = prepareSearchQuery(query.trim());
                      if (!prepared.value) {
                        fail(t.nothingLeft);
                        return;
                      }
                      setProposalNote({
                        note: prepared.note,
                        warning: prepared.warning,
                      });
                      setProposal({
                        kind: researchKind,
                        value: prepared.value,
                      });
                    } else {
                      setProposalNote(undefined);
                      setProposal({ kind: researchKind, value: query.trim() });
                    }
                  } catch {
                    fail(t.enterHttps);
                  }
                }}
              >
                {t.reviewDisclosure}
              </button>
            </div>
            {proposal && (
              <div
                className="approval"
                role="region"
                aria-label={t.confirmDisclosure}
              >
                <p className="eyebrow">{t.approvalEyebrow}</p>
                <h3>{t.shareOnly(proposal.kind === "search")}</h3>
                <pre>{proposal.value}</pre>
                {proposalNote?.note && (
                  <p className="muted kept-on-device">
                    {proposalNote.note} {t.editAbove}
                  </p>
                )}
                {proposalNote?.warning && (
                  <p className="warning" role="alert">
                    {WHEN_TO_SEARCH.warning}
                  </p>
                )}
                <p>
                  {t.recipient(
                    proposal.kind === "search"
                      ? "Brave Search API"
                      : new URL(proposal.value).hostname,
                  )}
                  {proposal.kind === "search" && ` ${researchText[lang].approval}`}
                  {proposal.kind === "page" && t.pageExact}
                </p>
                <button
                  className="primary"
                  disabled={!!busy}
                  onClick={() => void research()}
                >
                  {t.approve}
                </button>
                <button onClick={() => setProposal(undefined)}>{t.cancel}</button>
              </div>
            )}
          </section>
        )}
        {tab === "Help" && <SupportPanel />}
        {tab === "Account" && (
          <>
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
                {t.changePassword}
              </button>
            )}
            {status?.accountId && (
              <button disabled={!!busy} onClick={() => void signOut()}>
                {t.signOut}
              </button>
            )}
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
          </>
        )}
        {tab === "Saved" && (
          <section className="content-view">
            <h2>
              {t.savedHeadA}
              <br />
              <em>{t.savedHeadB}</em>
            </h2>
            <p className="intro">{t.savedIntro}</p>
            <label>
              {t.titleLabel}
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
            <p className="muted">{t.titleNote}</p>
            <p role="status">
              {unsaved ? t.unsavedChanges : t.noUnsavedChanges} {t.reloadClears}
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
                  {t.passphrase}
                  <input
                    type="password"
                    autoComplete="off"
                    minLength={12}
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    required
                  />
                </label>
                <p className="muted">{t.passphraseNote}</p>
                <button className="primary" disabled={!!busy}>
                  {t.createOrUnlock}
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
                      !!conversation.incognito ||
                      (!conversation.messages.length &&
                        !conversation.attachments.length &&
                        !input.length)
                    }
                    onClick={() => void save()}
                  >
                    {t.saveSnapshot}
                  </button>
                  {saveConflict && (
                    <button disabled={!!busy} onClick={() => void save(true)}>
                      {t.saveAsNew}
                    </button>
                  )}
                  {containsTemporaryResearch(conversation) && (
                    <p role="status">{t.researchNotSaved}</p>
                  )}
                  <button
                    onClick={() => {
                      vault.current!.lock();
                      setUnlocked(false);
                      setSaved([]);
                      setProjects([]);
                      setUnreadableSnapshots(0);
                      reset();
                      setPassphrase("");
                    }}
                  >
                    {t.lockAndClear}
                  </button>
                </div>
                <section
                  className="panel danger"
                  role="region"
                  aria-label={t.deleteAll}
                >
                  <h3>{t.deleteAll}</h3>
                  <p>{t.deleteAllText}</p>
                  <button
                    disabled={!!busy}
                    onClick={() => void eraseEverything()}
                  >
                    {t.deleteAll}
                  </button>
                  <button
                    className="text-button"
                    onClick={() =>
                      setSource({
                        id: "privacy-policy",
                        title: t.privacyPolicy,
                        text: privacyPolicyText(disclosedProvider(status), lang),
                      })
                    }
                  >
                    {t.whatDelete}
                  </button>
                </section>
                <div className="row"></div>
                {unreadableSnapshots > 0 && (
                  <p role="alert">{t.unreadable(unreadableSnapshots)}</p>
                )}
                {!saved.length && !unreadableSnapshots && (
                  <p className="empty-note">{t.noSaved}</p>
                )}
                <ConversationLibrary
                  conversations={saved}

                  busy={!!busy}
                  onOpen={openSaved}
                  onDelete={async (c) => {
                    const current = epoch.current;
                    setBusy(t.deletingSnapshot);
                    try {
                      await vault.current!.delete(c.id);
                      const snapshots = await vault.current!.readAvailable();
                      const projectList = await vault.current!.readProjects();
                      if (current !== epoch.current) return;
                      setSaved(snapshots.conversations);
                      setProjects(projectList);
                      setUnreadableSnapshots(snapshots.unreadable);
                      if (conversation.id === c.id) reset();
                      setNotice(t.snapshotDeleted);
                    } catch {
                      if (current === epoch.current)
                        fail(t.deleteFailed);
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
                  canExport={
                    (saved.length > 0 || projects.length > 0) &&
                    unreadableSnapshots === 0
                  }
                  onExport={exportVaultBackup}
                  onRestore={restoreVaultBackup}
                />
              </>
            )}
          </section>
        )}
        {tab !== "Conversation" && (
          <footer>
            {t.footer}
            <span>{t.footerNote}</span>
          </footer>
        )}
      </main>
      {photoOpen && (
        <PhotoCapture
          onClose={() => setPhotoOpen(false)}
          onUse={(file) => void importFiles([file])}
        />
      )}
      {source && (
        <dialog
          ref={sourceDialog}
          onCancel={() => setSource(undefined)}
          className="source-dialog"
          role="dialog"
          aria-modal="true"
          aria-label={source.title}
        >
          <div className="row">
            <h2>{source.title}</h2>
            <button
              onClick={() => setSource(undefined)}
              aria-label={t.closeSource}
            >
              ×
            </button>
          </div>
          {source.url && (
            <p className="muted">
              {t.sourceUrl}{" "}
              <a
                href={researchSourceUrl(source.url)}
                target="_blank"
                rel="noopener noreferrer"
                referrerPolicy="no-referrer"
              >
                {source.url}
              </a>{" "}
              {t.retrieved(source.retrievedAt)}
            </p>
          )}
          {source.providerDate && (
            <p>{t.providerDate(source.providerDate)}</p>
          )}
          {source.evidenceKind && (
            <p>{t.evidence(source.evidenceKind)}</p>
          )}
          {source.userEdited && (
            <p className="source-history-note">{t.userEditedLong}</p>
          )}
          <pre>{source.text}</pre>
          <button onClick={() => setSource(undefined)}>{t.close}</button>
        </dialog>
      )}
    </div>
  );
}
