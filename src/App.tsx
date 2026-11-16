import { Icon } from "./Icon";
import type { Project } from "./projects";
import { containDialogFocus } from "./dialog-focus";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
  type Usage,
} from "../shared/contracts";
import { codeToolOn, runPython } from "./code-tool";
import { calculatedWithCode } from "./CodeRuns";
import {
  answerLabel,
  autoMode,
  MODE_NAMES,
  requestCost,
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
import { SearchSuggestionField } from "./SearchSuggestionField";
import {
  editedSearchText,
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
import { checkAnswerCompleteness } from "./arithmetic/completeness";
import {
  asksBeforeSending,
  checkUncheckedFigures,
  checkNoOfficialSource,
  GERMAN_RULES,
} from "./german-rules";
import { expireMessages, type DisappearAfter } from "./conversation";
import { germanEnabled, LanguageSwitch, textFor, useLang } from "./i18n";
import { researchText } from "./text/research";
import { DeepResearch } from "./DeepResearch";
import { answerCopyText } from "./conversation-text";
import { deepResearchText } from "./text/deep-research";
import { RESEARCH_MIN_SOURCE_CHARACTERS, researchSourceRoom } from "../shared/deep-research";
import { serverMessage } from "./server-messages";
import { appText } from "./text/app";
import { liveVoiceText } from "./text/live-voice";
import { privacySummary, privacyText } from "../shared/privacy-copy";
import { privacyPolicyText } from "../shared/privacy-policy";
import { disclosedProvider } from "../shared/provider-disclosure";
import { imprintText } from "../shared/legal-identity";
import { importDocuments, type ImportOutcome } from "./document-import";
import { PhotoCapture } from "./PhotoCapture";
import { VoiceInput } from "./VoiceInput";
import { LiveVoice } from "./LiveVoice";
import { AttachedImageNote, ImageQuestion } from "./ImageQuestion";
import type { AttachedImage } from "./image-upload";
import { imageText } from "./text/images";
import { fitHeight, isSendKey, limitState, MESSAGE_LIMIT, sendBlocked, touchDevice } from "./composer-keys";
import { filesFrom, useFileDrop } from "./file-drop";
import { useFollowScroll } from "./follow-scroll";
import { AnswerAnnouncement, ConnectionBanner } from "./ConnectionBanner";
import { composerText } from "./text/composer";
import { Vault, VaultConflictError } from "./vault";
import type { Mode } from "../shared/modes";
import { assignMode, closeSecure, flushSecure, modeOf, openSecure, readAvailable, readProjects, saveDefaultMode, secureVault, useSecureState, vaultFor } from "./stores";
import { ModeToggle } from "./ModeToggle";
import { ModeBadge } from "./ModeBadge";
import { ModeDefaultSetting } from "./ModeDefaultSetting";
import { resetSecureMaxConfirmed } from "./SecureMaxDialog";
import { modesText } from "./text/modes";
import { secureStoreText } from "./text/secure-store";
import { mergeConversation } from "./sync/merge";
import { holdProjects } from "./projects";
import { VaultBackup } from "./VaultBackup";
import { VaultUnlock } from "./VaultUnlock";
import { AlsoDeleteSynced, LocalPassphraseDialog, PairingPrompt, SyncGate, SyncIndicator, SyncSettings } from "./SyncScreens";
import { syncText, vaultUnlockText } from "./text/sync";
import { syncHardeningText } from "./text/sync-hardening";
import {
  attachSync,
  deleteEverythingOnThisDevice,
  detachSync,
  onSyncApplied,
  openLocalVault,
  setLocalPassphrase,
  setRememberDevice,
  SyncError,
  unlockThisDevice,
  useSyncState,
} from "./sync";
import { ConfirmDialog } from "./ConfirmDialog";
import { holdTasks } from "./scheduled";
import { ensureProjectFiles, useSyncFiles } from "./sync/files";
import { VaultSecurity } from "./VaultSecurity";
import { BACKUP_MAX_BYTES } from "./vault-backup";
import { containsTemporaryResearch } from "./saved-conversation";
import { WorkspaceNavigation } from "./WorkspaceNavigation";
import { readAppearance, saveAppearance } from "./appearance";
import { ConversationLibrary } from "./ConversationLibrary";
import { CopyConversationButton } from "./CopyConversationButton";
import { ChatMessage, type RetryAction } from "./ChatMessage";
import { ConversationBranches } from "./ConversationBranches";
import { branchConversation, switchBranch } from "./conversation-branches";
import { ContextReview } from "./ContextReview";
import { correctSource } from "./source-history";
import { AccountUsage } from "./AccountUsage";
import { SupportPanel } from "./SupportPanel";
import { calculate } from "./calculator";
import { IncompleteReplyError } from "./reply-stream";
import { stopReading } from "./read-aloud";
import { PdfExportButton } from "./PdfExportButton";
import { canvasEnabled, liveVoiceEnabled, memoryEnabled, projectSpacesEnabled, readAloudEnabled } from "./device-features";
import { CANVAS_LIMITS, keepForUndo, proposedText, withCanvas, withoutEarlierCanvas } from "./canvas";
import { CanvasPanel } from "./CanvasPanel";
import { canvasText } from "./text/canvas";
import { addMemory, memoriesFor, rememberRequest } from "./memory";
import {
  changeMemories,
  loadMemories,
  MemoryChatSwitch,
  MemoryNote,
  memoryProblem,
  MemorySettings,
  RememberDialog,
  useMemories,
  useMemoryVault,
} from "./MemoryPanel";
import { memoryText } from "./text/memory";
import { AttestationBusyError, DeploymentChangedError } from "./providers/inference-client";
import { projectInstructionsBlock } from "./projects";
import { ProjectPanel, useHeldProjects, useProjectVault } from "./ProjectPanel";
import { projectText } from "./text/projects";
import { chatErrorText } from "./text/chat-errors";
import { abortable, withDeadline } from "./abortable";
import { createCalculationSession } from "./calculation-session";
import { scheduledEnabled } from "./device-features";
import { detectSchedule, type DetectedSchedule } from "./schedule-detection";
import { addTask, markRun, newTask, skipTask, taskProblem } from "./scheduled";
import {
  changeTasks,
  deleteServerCopies,
  DueStrip,
  RunSearchChoice,
  runMode,
  ScheduleCard,
  ScheduledPanel,
  useBackgroundResults,
  useScheduledVault,
  type TaskDraft,
} from "./ScheduledPanel";
import { scheduledText } from "./text/scheduled";
import type { ScheduledTask } from "../shared/scheduled-tasks";
import {
  parseResearchResult,
  researchSourceUrl,
  topPageNote,
} from "./research-result";

type Tab =
  "Conversation" | "Context" | "Research" | "Saved" | "Account" | "Help";
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
  // Image questions: the picture for the next message. Memory only; gone once it was sent,
  // removed, or another conversation is opened. It is never part of `conversation`.
  const [imageOpen, setImageOpen] = useState(false);
  const [attachedImage, setAttachedImage] = useState<AttachedImage>();
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
  // The conversation as it is now, for a deep research run that outlives the render it started in.
  const conversationNow = useRef(conversation);
  conversationNow.current = conversation;
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
  // Another conversation, a new one, a lock: the waiting picture is dropped.
  useEffect(() => setAttachedImage(undefined), [conversation.id]);
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
  // Memory across chats (docs/memory-20261114.md): held only while the vault is unlocked.
  const memories = useMemories();
  const [remember, setRemember] = useState<{ text: string; draft: boolean }>();
  // Projects (docs/projects-20261114.md): instructions and files go with questions from what is held.
  const heldProjects = useHeldProjects();
  const [openProject, setOpenProject] = useState<string>();
  const selectedContextSize = useMemo(
    () => measureContext(conversation, input),
    [conversation, input, memories, heldProjects],
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
  // The user may edit the shown search text. The edit belongs to one suggestion for one draft:
  // changing the question, sending or another conversation drops it. It is masked again here,
  // and `shown.value` is what a tap sends. The automatic paths keep the unedited suggestion.
  const [searchEdit, setSearchEdit] = useState<{ for: string; text: string }>();
  useEffect(
    () => setSearchEdit(undefined),
    [conversation.id, conversation.messages.length],
  );
  const editFor = `${input}\n${suggestion?.value}`;
  const searchText =
    searchEdit?.for === editFor ? searchEdit.text : suggestion?.value ?? "";
  const shown = suggestion && {
    ...suggestion,
    ...(searchEdit?.for === editFor
      ? editedSearchText(searchEdit.text, suggestion.removed)
      : { problem: undefined }),
  };
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
  // The new-device sync screen, until the user picks Not now (docs/vault-sync-screens-20261115.md).
  const [syncDismissed, setSyncDismissed] = useState(false);
  // Sync runs only signed in and with the deployment switch; "member": this device is in sync (also locked).
  const syncOn = !!status?.vaultSync && !!status?.accountId;
  const syncState = useSyncState();
  const syncMember = syncOn && syncState.phase !== "off" && syncState.phase !== "needs-approval";
  const syncCsrf = useRef("");
  syncCsrf.current = status?.csrf ?? "";
  // Pulled changes are shown only while the vault is shown (a recovery-key unlock keeps its own screen).
  const vaultShown = useRef(false);
  vaultShown.current = unlocked;
  const vaultOpening = useRef(false);
  const [syncRound, setSyncRound] = useState(0);
  const [askLocalPassphrase, setAskLocalPassphrase] = useState(false);
  const [eraseQuestion, setEraseQuestion] = useState(false);
  const [eraseSynced, setEraseSynced] = useState(false);
  const syncFiles = useSyncFiles();
  const [filesQuestion, setFilesQuestion] = useState<(sendAnyway: boolean) => void>();
  // Read aloud stops when a message is sent, another conversation opens or the vault locks.
  useEffect(stopReading, [conversation.id, conversation.messages.length, unlocked]);
  const [saved, setSaved] = useState<Conversation[]>([]);
  const [unreadableSnapshots, setUnreadableSnapshots] = useState(0);
  const [editId, setEditId] = useState<string>();
  // Canvas (docs/canvas-20261114.md): whether its panel is open. Another conversation closes it.
  const [canvasOpen, setCanvasOpen] = useState(false);
  useEffect(() => setCanvasOpen(false), [conversation.id]);
  function openCanvas(answer: string) {
    const text = proposedText(answer);
    const old = conversation.canvas?.text;
    if (text.length > CANVAS_LIMITS.characters) return fail(canvasText[lang].problem("long"));
    setCanvasOpen(true);
    // Cancel opens the canvas as it is.
    if (old === text || (old && !window.confirm(canvasText[lang].replaceConfirm))) return;
    keepForUndo(conversation.id, old);
    setConversation((c) => withCanvas(c, text));
  }
  const [operandA, setOperandA] = useState("");
  const [operandB, setOperandB] = useState("");
  const [operation, setOperation] = useState("+");
  const [calculation, setCalculation] = useState("");
  const controller = useRef<AbortController | null>(null);
  const vault = useRef<Vault | null>(null);
  // Secure and Secure Max (docs/secure-store-20261116.md). `vault` above stays the Secure Max vault;
  // src/stores.ts holds the Secure one and routes by mode. Inert while status.secureStore is absent:
  // every mode is then "max" and every value below equals what it replaced.
  const secureOn = !!status?.secureStore && !!status?.accountId;
  const secure = useSecureState();
  const secureReady = secureOn && secure.ready;
  // Secure Max is offered only when the encrypted sync, with files, is on.
  const maxAvailable = secureOn && !!status?.vaultSync?.files;
  const st = secureStoreText[lang];
  const [draftMode, setDraftMode] = useState<Mode>("secure");
  const [projectMode, setProjectMode] = useState<Mode>("secure");
  const [maxStored, setMaxStored] = useState<number>();
  // A chat's mode is the store that holds it; a project's chats inherit the project's; a new chat has the toggle's.
  const mode: Mode = !secureOn ? "max" : (modeOf(conversation.id) ?? modeOf(conversation.projectId) ?? (maxAvailable ? draftMode : "secure"));
  // Memory, project files and tasks are held for ONE mode at a time: the open project screen's, else the open chat's.
  const heldMode: Mode = !secureOn ? "max" : ((openProject && modeOf(openProject)) || mode);
  const heldVault = heldMode === "max" ? vault.current : (secureVault() ?? null);
  const heldReady = heldMode === "max" ? unlocked : secureReady;
  const anyStore = unlocked || secureReady;
  const storeOf = (id: string) => vaultFor(modeOf(id) ?? "max", vault.current)!;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const heldModeRef = useRef(heldMode);
  heldModeRef.current = heldMode;
  const conversationRef = useRef(conversation);
  conversationRef.current = conversation;
  const refreshRef = useRef(async () => {});
  // What the last automatic save wrote, so an unchanged chat is not written again.
  const autoSaved = useRef("");
  const plain = (c: Conversation) => JSON.stringify({ ...c, draft: undefined });
  useEffect(() => {
    if (!modeOf(conversation.id)) setDraftMode(secure.defaultMode);
  }, [conversation.id, secure.defaultMode]);
  useMemoryVault(heldVault, heldReady);
  useProjectVault(projects, heldVault, heldReady);
  // Scheduled tasks (docs/scheduled-20261115.md): held only while the vault is unlocked.
  const scheduledTasks = useScheduledVault(heldVault, heldReady);
  const [scheduledOpen, setScheduledOpen] = useState<{ draft?: TaskDraft }>();
  const [scheduleCard, setScheduleCard] = useState<{ text: string; found: DetectedSchedule }>();
  const [runSearch, setRunSearch] = useState<ScheduledTask>();
  const background = useBackgroundResults({
    vault: vault.current,
    unlocked,
    status,
    onSaved: (count) => {
      setNotice(scheduledText[lang].resultSaved(count));
      void readAvailable(vault.current).then((snapshots) => setSaved(snapshots.conversations), () => {});
    },
  });
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
    // Saved automatically (Secure wiring): nothing to warn about.
    if (secureOn && vaultFor(mode, vault.current)?.unlocked) return false;
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
  }, [conversation, input, saved, secureOn, secureReady, unlocked, mode]);
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
      // Secure Max locked while Secure is open: an open Secure chat and the Secure lists stay.
      if (secureVault() && modeRef.current === "secure") {
        setUnlocked(false);
        setPassphrase("");
        void refreshRef.current();
        return;
      }
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
      setOperandA("");
      setOperandB("");
      setCalculation("");
      setPassphrase("");
      // A locked vault shows no scheduled task, not even a waiting run choice.
      setRunSearch(undefined);
      setScheduledOpen(undefined);
      setNotice(textFor(appText).vaultChangedElsewhere);
      if (secureVault()) void refreshRef.current();
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
  // Composer, following the answer, dropped files (docs/chat-feature-gaps-20261114.md, A, B, F).
  const ct = composerText[lang];
  const follow = useFollowScroll(
    outputEnd,
    `${tab}:${conversation.id}:${conversation.messages.length}`,
  );
  useLayoutEffect(
    () => fitHeight(document.getElementById("message-input") as HTMLTextAreaElement | null),
    [input, tab],
  );
  const limit = limitState(input.length);
  const [copiedId, setCopiedId] = useState<string>();
  useEffect(() => {
    if (!copiedId) return;
    const timer = setTimeout(() => setCopiedId(undefined), 2000);
    return () => clearTimeout(timer);
  }, [copiedId]);
  const focusComposer = () => {
    // Not on touch devices: focusing the box there opens the on-screen keyboard.
    if (!touchDevice()) document.getElementById("message-input")?.focus();
  };
  const dropping = useFileDrop(
    (files) => {
      if (busy) setNotice(ct.dropBusy);
      else void importFiles(files);
    },
    () => tab === "Conversation" && !document.querySelector("dialog[open]"),
  );
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
    setOperandA("");
    setOperandB("");
    setCalculation("");
    setPassphrase("");
    setNotice(t.newTemporary);
  };
  const fail = (message: string) => setNotice(message);
  async function copyAnswer(text: string, id: string) {
    const current = epoch.current;
    try {
      await navigator.clipboard.writeText(text);
      if (current === epoch.current) setCopiedId(id);
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
          // Signed out or another account: this device's Secure copy goes.
          if (status.secureStore && status.accountId) {
            resetSecureMaxConfirmed();
            await closeSecure(true, status.accountId);
          }
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
  /** Sign-out with Secure on: the local Secure databases on this device are deleted (the account keeps its copy). */
  async function leaveSecure() {
    if (!secureOn) return;
    resetSecureMaxConfirmed();
    await closeSecure(true, status!.accountId);
  }
  async function signOutConsumer() {
    if (!status?.consumerWorkspace || busy || !allowReplace()) return;
    setBusy(t.signingOut);
    try {
      if (secureOn) await flushSecure();
      await api("/api/auth/sign-out", {});
      await leaveSecure();
      detachSync();
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
  // Edit and send in one step (docs/chat-feature-gaps-20261114.md, package D): the old sequence is
  // kept as a branch, then the edited text goes through send() like any message. The edit box
  // closes by itself when the edited message is replaced; it stays open if send() refuses.
  function editAndSend(id: string, text: string) {
    if (sendBlocked({ busy: !!busy, text, ready: !!status?.inference.ready })) return;
    try {
      const branch = branchConversation(conversation, input, id, text);
      calculationSession.clear();
      void send({ ...branch, messages: branch.messages.slice(0, -1) }, text, false);
      focusComposer();
    } catch (error) {
      fail((error as Error).message);
    }
  }
  // What a retry of the newest question would use now, for the visible labels. Auto reads the
  // question on this device; it is worked out again only when the question or the choice changes.
  const qualified = status?.inference.qualification;
  const lastMessage = conversation.messages.at(-1);
  const lastUser = [...conversation.messages].reverse().find((m) => m.role === "user");
  const retryCost = useMemo(
    () =>
      qualified && lastUser
        ? requestCost(qualified, modeChoice, conversation, codeToolOn(status))
        : undefined,
    [qualified, modeChoice, lastUser?.text, conversation.attachments, status?.code],
  );
  const retry: RetryAction = {
    cost: retryCost,
    // After a Fast answer only, by the recorded mode. Not for a picture question: asking again
    // sends no picture.
    thinkingCost:
      qualified?.modes && lastMessage?.role === "assistant" && lastMessage.mode === "fast" && !lastUser?.image
        ? tierFor(qualified, "thinking").allowanceCost
        : undefined,
    run: askAgain,
  };
  // "Report a problem with this answer" opens Help with that choice set; nothing else is passed.
  const [reporting, setReporting] = useState(false);
  useEffect(() => {
    if (tab !== "Help") setReporting(false);
  }, [tab]);

  async function send(
    base = conversation,
    text = input,
    consumeDraft = true,
    consentChosen = false,
    // The user's own one-off choice ("Answer again with Thinking"); it wins over Auto.
    modeOverride?: AnswerMode,
    // Deep research's answer request: the note kept on the answer and the run's own stop.
    research?: { note: string; abort: AbortController },
  ): Promise<boolean | void> {
    // A picture goes with a message typed in the composer only, never with "ask again".
    const image = consumeDraft && status?.images ? attachedImage : undefined;
    if (image && !text.trim()) return fail(imageText[lang].needQuestion);
    if (busy || !status?.inference.ready || !text.trim()) return;
    if (status.healthConsentDraft && !healthConsent && !consentChosen) {
      // Ask once before the first message; the message waits and is not sent yet.
      setConsentPending({ base, text, consumeDraft, modeOverride });
      return;
    }
    // Project files synced from another device are downloaded before a question in their project;
    // without them the question goes only if the user says so.
    if (base.projectId && syncOn && syncFiles.enabled) {
      setBusy(syncText[lang].fetchingFiles);
      const ready = await ensureProjectFiles(base.projectId).catch(() => false);
      setBusy("");
      if (!ready && !(await new Promise<boolean>((resolve) => setFilesQuestion(() => resolve)))) return;
    }
    const next = {
      ...base,
      title:
        base.title.trim() &&
        (base.messages.length || base.title !== "New conversation")
          ? base.title
          : text.trim().slice(0, 60),
      messages: [...base.messages, { ...newMessage("user", text.trim()), ...(image ? { image: true as const } : {}) }],
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
      // Memory: the ids of the notes that go with this question (the same choice composeContext makes).
      ...(memoriesFor(next).length ? { memoriesUsed: memoriesFor(next).map((m) => m.id) } : {}),
      ...(projectInstructionsBlock(next) ? { projectInstructionsSent: true as const } : {}),
      // A deep research answer: what was searched and read comes first (shown and exported the same way).
      // At most what a saved answer holds: with project files many documents can be named.
      passagesUsed:
        [research?.note, ...passageNotes(next, true)].filter(Boolean).join(" ").slice(0, 4000) || undefined,
    };
    setConversation({ ...next, messages: [...next.messages, answer] });
    if (consumeDraft) setInput("");
    // From here the picture lives only in this request; it is gone when the request ends.
    if (image) setAttachedImage(undefined);
    setNotice("");
    setBusy(t.preparing);
    const abort = research?.abort ?? new AbortController();
    abort.signal.addEventListener("abort", () => calculationSession.clear(), {
      once: true,
    });
    controller.current = abort;
    const current = epoch.current;
    const qualified = status.inference.qualification;
    const choiceForThis: ModeChoice = modeOverride ?? modeChoice;
    // Only the Fast model reads pictures, whatever mode is chosen; the answer label says so.
    // Code execution on this device (docs/code-execution-20261114.md): with it, Auto keeps maths in Fast.
    // A deep research answer is one plain request: no code tool, no backup retry.
    const codeOn = !research && codeToolOn(status);
    const mode = qualified?.modes
      ? image
        ? "fast"
        : choiceForThis === "auto"
          ? autoMode(next, codeOn)
          : choiceForThis
      : undefined;
    const hasBackup = !image && !research && !!qualified && !!tierFor(qualified, mode).backupModel;
    let textArrived = false;
    let completed = false;
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
          image?.dataUrl,
          codeOn
            ? {
                run: runPython,
                // Text streamed before the code ran was a preamble: the answer starts afresh.
                onRuns: (codeRuns, unavailable) => {
                  if (epoch.current === current && !abort.signal.aborted)
                    setConversation((c) => ({
                      ...c,
                      messages: c.messages.map((m) =>
                        m.id === answer.id
                          ? {
                              ...m,
                              text: "",
                              ...(codeRuns.length ? { codeRuns } : {}),
                              ...(unavailable ? { codeUnavailable: true as const } : {}),
                              // Each round is one follow-up request: shown as the calculation's cost with metering on.
                              ...(status.metering ? { codeSteps: (m.codeSteps ?? 0) + 1 } : {}),
                            }
                          : m,
                      ),
                    }));
                },
              }
            : undefined,
          research ? "answer" : undefined,
        );
        abort.signal.throwIfAborted();
        completed = textArrived;
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
                          // Figures taken from code that ran here are not second-guessed by the
                          // text recalculation: its notes would contradict the code mark.
                          ...(calculatedWithCode(m) ? {} : { arithmeticCheck: checkArithmetic(m.text) }),
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
                    answeredBy: image
                      ? `${answerLabel("fast", mode, false) ?? ""} (${imageText[lang].readByFast})`.trim()
                      : answerLabel(choiceForThis, mode, choice === "backup"),
                    // As data, so "Answer again with Thinking" never reads the label text.
                    ...(mode ? { mode } : {}),
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
        // The backup answers without the code tool: runs of the failed attempt do not mark its answer.
        if (epoch.current === current)
          setConversation((c) => ({
            ...c,
            messages: c.messages.map((m) =>
              m.id === answer.id ? { ...m, codeRuns: undefined, codeUnavailable: undefined, codeSteps: undefined } : m,
            ),
          }));
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
            : error instanceof AttestationBusyError || error instanceof DeploymentChangedError
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
    return completed;
  }
  // Live voice (docs/live-voice-20261114.md): one spoken question through send(), in Fast unless
  // the user chose Thinking. A question that would ask "search first?" or the health consent is
  // handed to the screen instead: nothing is searched or sent without that choice.
  const liveMode: AnswerMode | undefined = qualified?.modes
    ? modeChoice === "thinking" ? "thinking" : "fast"
    : undefined;
  const liveVoiceOn =
    liveVoiceEnabled() && readAloudEnabled() && !!status?.voice && !!status.inference.ready;
  async function liveSend(text: string, signal: AbortSignal) {
    const found = status?.search ? searchSuggestion(text) : undefined;
    const web = selectedSources(conversationNow.current).some((source) => !!source.url);
    if (found && (autoSearch ? !web : asksBeforeSending(found, false, web))) {
      setInput(text);
      setChoiceFor(text);
      return "choice" as const;
    }
    const consent = !!status?.healthConsentDraft && !healthConsent;
    const sent = send(conversationNow.current, text, false, false, liveMode);
    const running = controller.current;
    signal.addEventListener("abort", () => running?.abort(), { once: true });
    if (consent) return "consent" as const;
    return (await sent) ? ("answered" as const) : ("failed" as const);
  }
  // Deep research (docs/deep-research-20261114.md): the plan request. One message to the Fast
  // model through the ordinary send path (masking, verification, allowance, stop switch),
  // declared to the relay as a research plan. Its text is not shown; the search texts are.
  async function planResearch(prompt: string, signal: AbortSignal) {
    if (!status) throw Error(t.serviceUnavailable);
    const { streamReply } = await abortable(import("./inference"), signal);
    const counted = (usage?: Usage) => {
      if (usage) setConversation((c) => ({ ...c, usage: [...c.usage, usage] }));
    };
    let text = "";
    try {
      counted(
        await streamReply(
          { ...emptyConversation(), messages: [newMessage("user", prompt)] },
          status.inference.qualification,
          status.csrf,
          signal,
          (chunk) => {
            text += chunk;
          },
          () => {},
          undefined,
          undefined,
          "primary",
          status.inference.qualification?.modes ? "fast" : undefined,
          status.inference.cacheSalt,
          undefined,
          undefined,
          "plan",
        ),
      );
    } catch (error) {
      if (error instanceof IncompleteReplyError) counted(error.usage);
      throw error;
    }
    return text;
  }
  // Results of a deep research run as one search attachment: on save its results and links are
  // removed like any search's (src/saved-conversation.ts); the first search text remains.
  const researchAttachment = (sources: Source[], queries: string[]): Attachment => ({
    id: crypto.randomUUID(),
    name: deepResearchText[lang].attachment,
    selected: true,
    kind: "research",
    researchQuery: queries[0],
    sources,
  });
  // Source characters a run may send: what the report's input limit leaves beside this conversation.
  const researchRoom = (question: string) =>
    researchSourceRoom(
      status?.inference.qualification?.maxInputCharacters ?? 100000,
      measureContext(conversationNow.current, question).characters,
    );
  // Checked before the plan request, so a run that cannot finish costs nothing.
  function researchBlocked(question: string) {
    const allowance = status?.requestAllowance;
    const cost = status?.research?.cost ?? 0;
    if (allowance && allowance.state !== "unavailable" && allowance.remaining < cost)
      return deepResearchText[lang].notEnough(cost, allowance.remaining);
    if (conversation.attachments.length >= 5) return t.researchLimit;
    if (researchRoom(question) < RESEARCH_MIN_SOURCE_CHARACTERS) return deepResearchText[lang].tooLong;
    return undefined;
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
    // A scheduled task's run: its own question and mode, not the draft.
    asked?: { base: Conversation; text: string; mode?: AnswerMode },
  ) {
    const retry = again ? lastQuestion() : undefined;
    if (again && !retry) return;
    const text = asked?.text ?? retry?.text ?? input;
    const base = asked?.base ?? retry?.base ?? conversation;
    const draft = !again && !asked;
    const outcome = await research({ kind: "search", value }, how);
    if (!outcome || (outcome === "failed" && how === "tap")) return;
    if (outcome === "failed") {
      setSearchSent(WHEN_TO_SEARCH.automaticFailed);      return send(base, text, draft, false, asked?.mode);
    }
    setSearchSent(outcome.note);
    return send(
      outcome.attachment
        ? {
            ...base,
            temporarySearch: true,
            attachments: [...base.attachments, outcome.attachment],
          }
        : base,
      text,
      draft,
      false,
      asked?.mode,
    );
  }
  // The composer's Send. `asIs`: the user chose "Just send" on the scheduled-task card.
  function submitDraft(asIs = false) {
    // "Remember that ...": ask to save it as a memory. Nothing is sent unless the user says so.
    const wanted =
      memoryEnabled() && !conversation.incognito && !attachedImage && !busy
        ? rememberRequest(input)
        : undefined;
    // "Every day at 10, give me ...": offer a scheduled task. Nothing is sent unless the user says so.
    const planned =
      !wanted && !asIs && scheduledEnabled() && !conversation.incognito && !attachedImage && !busy
        ? detectSchedule(input)
        : undefined;
    if (wanted) setRemember({ text: wanted, draft: true });
    else if (planned) setScheduleCard({ text: input, found: planned });
    // A picture question goes straight to the model: no search step in between.
    else if (attachedImage && status?.images) void send();
    else if ((autoSearch || autoRules) && suggestion)
      void searchThenAnswer(suggestion.value, "auto");
    else if (askFirst) setChoiceFor(input);
    else void send();
  }
  // "Run now" of a scheduled task: a new conversation with the instruction as its first message,
  // through send() like any message. A task with an approved search text asks first, as the
  // search suggestion does. Only an answered run moves the task on; a refusal leaves it due.
  function runTask(task: ScheduledTask, search?: boolean) {
    if (busy || !status?.inference.ready) return;
    if (search === undefined) {
      if (!allowReplace()) return;
      reset();
      setTab("Conversation");
      setScheduledOpen(undefined);
      setNavigationOpen(false);
      if (task.useSearch && task.searchText && status.search) return setRunSearch(task);
    }
    setRunSearch(undefined);
    const asked = { base: emptyConversation(), text: task.instruction, mode: runMode(task, status) };
    const run = search
      ? searchThenAnswer(task.searchText!, "tap", false, asked)
      : send(asked.base, asked.text, false, false, asked.mode);
    void run.then((answered) => {
      if (answered && heldVault?.unlocked) changeTasks(heldVault, markRun(task.id)).catch(() => {});
    });
  }
  // remember: true or false is the device choice; "remembered" opens with the key this device keeps.
  async function unlockVault(remember: boolean | "remembered" = false) {
    if (!status) {
      fail(t.waitForAccess);
      return;
    }
    const current = epoch.current;
    const secret = passphrase;
    setPassphrase("");
    setBusy(t.unlocking);
    try {
      const store = vault.current!;
      // A synced vault opens with this device's sync key, so the account key comes with it.
      const synced = syncOn && (await store.mode()) === "sync";
      let note = t.vaultUnlocked;
      if (remember === "remembered") {
        // A synced vault opens only with this device's sync key; the older remembered key is for a passphrase vault.
        if (!(synced ? await openLocalVault(store) : await store.unlockRemembered())) throw Error("not remembered");
      } else {
        await store.unlock(secret, synced ? undefined : remember);
        // "Remember this device" on a synced device is the sync device key (VS-5: off needs this passphrase).
        // unlockThisDevice first: the engine unseals this device's token only after the unlock event.
        if (synced && syncMember && !!syncState.remembered !== remember)
          await unlockThisDevice()
            .then(() => setRememberDevice(remember))
            .catch(() => (note = syncText[lang].actionFailed));
      }
      const snapshots = await readAvailable(store);
      const projectList = await readProjects(store);
      if (current !== epoch.current) return;
      setUnlocked(true);
      setSaved(snapshots.conversations);
      setProjects(projectList);
      setUnreadableSnapshots(snapshots.unreadable);
      setNotice(note);
    } catch {
      if (current !== epoch.current) return;
      fail(t.unlockFailed);
    } finally {
      if (current === epoch.current) setBusy("");
    }
  }
  // Forgotten passphrase (Stage 0): deletes this device's vault while locked; nothing else.
  // The synced copy too needs the recovery key here: a locked device cannot prove it holds the account key.
  async function resetForgotten(alsoDeleteSynced: boolean, recoveryKey?: string): Promise<true | string> {
    try {
      await eraseThisDevice(alsoDeleteSynced, recoveryKey);
      return true;
    } catch (error) {
      return error instanceof SyncError && error.code === "wrong-key" ? syncHardeningText[lang].wrongRecoveryKey : vaultUnlockText[lang].resetFailed;
    }
  }
  /** With sync here the engine deletes its own data too (and the synced copy if asked), then starts again. */
  async function eraseThisDevice(alsoDeleteSynced: boolean, recoveryKey?: string) {
    if (!syncOn || syncState.phase === "off") return vault.current!.eraseEverything();
    await deleteEverythingOnThisDevice({ alsoDeleteSyncedData: alsoDeleteSynced, ...(recoveryKey ? { recoveryKey } : {}) });
    setSyncRound((n) => n + 1);
  }
  // A remembered device opens by itself on each visit (docs/vault-sync-screens-20261115.md).
  const openIfRemembered = () =>
    void vault.current?.isRemembered().then((yes) => {
      if (yes) void unlockVault("remembered");
    }, () => {});
  useEffect(() => {
    // With sync the attach below opens it first, so the device key, not an older key, opens a synced vault.
    if (status && !unlocked && !(status.vaultSync && status.accountId)) openIfRemembered();
  }, [status?.accountId, !!status]);
  /** Shows what the vault holds after sync opened it or wrote pulled changes into it. */
  async function showVault() {
    const store = vault.current;
    if (!store?.unlocked) return;
    const current = epoch.current;
    vaultOpening.current = true;
    try {
      const snapshots = await readAvailable(store);
      const projectList = await readProjects(store);
      if (current !== epoch.current || !store.unlocked) return;
      setUnlocked(true);
      setSaved(snapshots.conversations);
      setProjects(projectList);
      setUnreadableSnapshots(snapshots.unreadable);
      // Only while this mode's memory and tasks are the held ones (a Secure chat keeps Secure's).
      if (heldModeRef.current === "max") {
        await loadMemories(store);
        if (scheduledEnabled()) holdTasks(await store.readTasks());
      }
    } catch {
      /* Locked in between: the lock screen shows. */
    } finally {
      vaultOpening.current = false;
    }
  }
  useEffect(() => {
    const store = vault.current;
    if (!syncOn || !store) {
      detachSync();
      return;
    }
    let active = true;
    const stop = onSyncApplied(() => {
      if (vaultShown.current || vaultOpening.current) void showVault();
    });
    void attachSync({ vault: store, accountId: status!.accountId!, csrf: () => syncCsrf.current })
      .catch(() => {})
      .then(() => {
        if (!active) return;
        if (store.unlocked) void showVault();
        else openIfRemembered();
      });
    return () => {
      active = false;
      stop();
      detachSync();
    };
  }, [syncOn, status?.accountId, syncRound]);
  /** Secure wiring: both stores read into the lists; a change from another device reaches the open chat. */
  async function showLists() {
    const current = epoch.current;
    try {
      const snapshots = await readAvailable(vault.current);
      const projectList = await readProjects(vault.current);
      if (current !== epoch.current) return;
      setSaved(snapshots.conversations);
      setProjects(projectList);
      setUnreadableSnapshots(snapshots.unreadable);
      const shown = conversationRef.current;
      const fresh = snapshots.conversations.find((c) => c.id === shown.id);
      // Only when nothing here waits to be saved and no answer is streaming: otherwise the next save merges.
      if (fresh && !controller.current && plain(shown) === autoSaved.current && plain(fresh) !== autoSaved.current) {
        savedBase.current = fresh;
        autoSaved.current = plain(fresh);
        setConversation(structuredClone(fresh));
      }
      const held = heldModeRef.current === "secure" ? secureVault() : undefined;
      if (held) {
        await loadMemories(held);
        if (scheduledEnabled()) holdTasks(await held.readTasks());
        if (projectSpacesEnabled()) holdProjects({ files: await held.readProjectFiles() });
      }
    } catch {
      /* A store closed in between: the next refresh shows it. */
    }
  }
  refreshRef.current = showLists;
  useEffect(() => {
    if (!secureOn) return;
    let active = true;
    void openSecure({ accountId: status!.accountId!, csrf: () => syncCsrf.current, onApplied: () => void refreshRef.current() }).then((ok) => {
      if (!active) return;
      if (ok) void refreshRef.current();
      else setNotice(secureStoreText[lang].unavailable);
    });
    return () => {
      active = false;
      void closeSecure(false);
    };
  }, [secureOn, status?.accountId]);
  // Nothing is asked at sign-in: the new-device screen of Secure Max opens only from "Unlock Secure Max".
  useEffect(() => {
    if (secureOn) setSyncDismissed(true);
  }, [secureOn]);
  // While Secure Max is locked here: whether it exists, and how many chats this device holds (a count, no titles).
  useEffect(() => {
    if (!secureOn || unlocked) return setMaxStored(undefined);
    let active = true;
    void (async () => {
      const store = vault.current;
      const exists = (await store?.exists().catch(() => false)) || syncState.phase === "needs-approval" || syncState.phase === "locked";
      const count = exists ? ((await store?.storedCount().catch(() => 0)) ?? 0) : 0;
      if (active) setMaxStored(exists ? count : undefined);
    })();
    return () => {
      active = false;
    };
  }, [secureOn, unlocked, syncState.phase, status?.accountId]);
  /** Saves the open chat by itself at message boundaries (never while an answer streams); no notice, no busy state. */
  async function autoSave() {
    const store = vaultFor(mode, vault.current);
    if (!store?.unlocked) return;
    const current = epoch.current;
    const text = plain(conversation);
    try {
      let snapshot: Conversation;
      try {
        snapshot = await store.save({ ...conversation, draft: input }, savedBase.current);
      } catch (error) {
        if (!(error instanceof VaultConflictError)) throw error;
        // Changed on another device since: merge the three versions as the sync engine does.
        const theirs = (await store.readAvailable()).conversations.find((c) => c.id === conversation.id);
        if (!theirs) return;
        snapshot = await store.save({ ...mergeConversation(savedBase.current ?? undefined, conversation, theirs), draft: input }, theirs);
        if (current !== epoch.current) return;
        autoSaved.current = plain(snapshot);
        savedBase.current = snapshot;
        setConversation(structuredClone(snapshot));
        assignMode(snapshot.id, mode);
        return void showLists();
      }
      if (current !== epoch.current) return;
      savedBase.current = snapshot;
      autoSaved.current = text;
      assignMode(snapshot.id, mode);
      await showLists();
    } catch {
      if (current === epoch.current) setNotice(st.saveFailed);
    }
  }
  useEffect(() => {
    if (!secureOn || busy || conversation.incognito || !(conversation.messages.length || conversation.attachments.length)) return;
    if (!vaultFor(mode, vault.current)?.unlocked || plain(conversation) === autoSaved.current) return;
    const timer = setTimeout(() => void autoSave(), 300);
    return () => clearTimeout(timer);
  }, [conversation, busy, secureOn, secureReady, unlocked, mode]);
  /** Sync opened this device (set up, approved, recovery key) with the user's "Remember this device" choice. */
  async function syncOpened(remember: boolean) {
    const store = vault.current;
    if (store?.unlocked) await showVault();
    // VS-5: a device that is not remembered needs a local passphrase, or the recovery key every visit.
    if (!remember && !(await store?.hasLocalPassphrase().catch(() => true))) setAskLocalPassphrase(true);
  }
  const eraseText = () =>
    t.eraseConfirm +
    (memoryEnabled() ? ` ${memoryText[lang].eraseAlso}` : "") +
    (projectSpacesEnabled() ? ` ${projectText[lang].eraseAlso}` : "") +
    (scheduledEnabled() ? ` ${scheduledText[lang].eraseAlso}` : "");
  async function eraseEverything(alsoDeleteSynced?: boolean) {
    if (alsoDeleteSynced === undefined) {
      // In sync here: one question that also asks about the synced copy (below), not the browser's.
      if (syncMember && !syncState.detached) {
        setEraseSynced(false);
        setEraseQuestion(true);
        return;
      }
      if (!window.confirm(eraseText())) return;
    }
    const current = epoch.current;
    setBusy(t.erasing);
    try {
      controller.current?.abort();
      await deleteServerCopies(status);
      await eraseThisDevice(!!alsoDeleteSynced);
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
      if (secureReady) void showLists();
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
      const snapshot = await vaultFor(mode, vault.current)!.save(
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
      assignMode(snapshot.id, mode);
      autoSaved.current = plain(snapshot);
      setSaveConflict(false);
      if (asCopy) setConversation(snapshot);
      const snapshots = await readAvailable(vault.current);
      const projectList = await readProjects(vault.current);
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
      await loadMemories(vault.current!);
      const snapshots = await readAvailable(vault.current);
      const projectList = await readProjects(vault.current);
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
    if (secureOn) await flushSecure();
    detachSync();
    vault.current?.lock();
    vault.current?.onInvalidate?.();
    try {
      const response = await fetch("/auth/logout", {
        method: "POST",
      });
      if (!response.ok) throw new Error();
      await leaveSecure();
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
      const into: Mode = !secureOn ? "max" : maxAvailable && unlocked ? projectMode : "secure";
      const next = await vaultFor(into, vault.current)!.createProject(name);
      const id = next.at(-1)?.id;
      if (id) assignMode(id, into);
      const all = secureOn ? await readProjects(vault.current) : next;
      if (current !== epoch.current) return;
      setProjects(all);
      setProjectMode("secure");
      setNotice(t.projectCreated);
      return id;
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
      await storeOf(id).editProject(id, name);
      const available = await readAvailable(vault.current);
      const next = await readProjects(vault.current);
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
  // The project screen's delete: the project's chats first when the user chose that, then the project.
  async function deleteProject(id: string, withChats: boolean): Promise<boolean> {
    if (withChats) {
      const current = epoch.current;
      setBusy(t.deletingSnapshot);
      try {
        for (const c of saved.filter((s) => s.projectId === id)) {
          await storeOf(c.id).delete(c.id);
          if (conversation.id === c.id) reset();
        }
      } catch {
        if (current === epoch.current) fail(t.deleteFailed);
        return false;
      } finally {
        if (current === epoch.current) setBusy("");
      }
    }
    return editProject(id);
  }
  async function organizeChat(
    c: Conversation,
    change: Pick<Conversation, "pinned" | "archived" | "projectId" | "title">,
  ) {
    if (secureOn && change.projectId && modeOf(change.projectId) !== modeOf(c.id)) return fail(st.otherMode);
    const current = epoch.current;
    setBusy(t.updatingOrganization);
    try {
      const snapshot = await storeOf(c.id).save({ ...c, ...change }, c);
      if (current !== epoch.current) return;
      if (conversation.id === c.id) {
        savedBase.current = snapshot;
        autoSaved.current = plain({ ...conversation, pinned: snapshot.pinned, archived: snapshot.archived, projectId: snapshot.projectId });
        setConversation((previous) => ({
          ...previous,
          pinned: snapshot.pinned,
          archived: snapshot.archived,
          projectId: snapshot.projectId,
        }));
      }
      const available = await readAvailable(vault.current);
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
  async function deleteSnapshot(c: Conversation) {
    const current = epoch.current;
    setBusy(t.deletingSnapshot);
    try {
      await storeOf(c.id).delete(c.id);
      const snapshots = await readAvailable(vault.current);
      const projectList = await readProjects(vault.current);
      if (current !== epoch.current) return;
      setSaved(snapshots.conversations);
      setProjects(projectList);
      setUnreadableSnapshots(snapshots.unreadable);
      if (conversation.id === c.id) reset();
      setNotice(t.snapshotDeleted);
    } catch {
      if (current === epoch.current) fail(t.deleteFailed);
    } finally {
      if (current === epoch.current) setBusy("");
    }
  }
  const openSaved = (c: Conversation) => {
    if (!allowReplace()) return;
    reset();
    savedBase.current = c;
    const expired = expireMessages(c);
    autoSaved.current = plain(expired.conversation);
    setConversation(structuredClone(expired.conversation));
    setInput(c.draft ?? "");
    setTab("Conversation");
    setNavigationOpen(false);
    if (expired.removed) {
      setNotice(
        t.openedPruned(expired.removed, t.disappearLabel(c.disappearAfter!)),
      );
      // Persist the pruned copy so the deleted messages do not survive in the vault.
      void storeOf(c.id)
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
      className={`app-shell chat-design ${navigationCollapsed ? "navigation-collapsed" : ""}${canvasOpen && tab === "Conversation" ? " canvas-open" : ""}`}
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
        onOpenProject={(id) => {
          setNavigationOpen(false);
          setOpenProject(id);
        }}
        onOrganize={(c, change) => void organizeChat(c, change)}
        unlocked={anyStore}
        modeOf={secureOn ? modeOf : undefined}
        projectExtra={<ModeToggle mode={projectMode} onChange={setProjectMode} maxAvailable={maxAvailable && unlocked} />}
        lockedRow={
          secureOn && !unlocked && maxStored !== undefined ? (
            <p className="sidebar-hint mode-locked-row">
              <ModeBadge mode="max" locked /> {st.lockedRow(maxStored)}{" "}
              <button
                className="text-button"
                onClick={() => {
                  setNavigationOpen(false);
                  // A device that is not in the encrypted sync yet gets the new-device screen; otherwise the unlock form.
                  if (syncOn && syncState.phase === "needs-approval") setSyncDismissed(false);
                  else setTab("Saved");
                }}
              >
                {st.unlockMax}
              </button>
            </p>
          ) : undefined
        }
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
        onScheduled={
          scheduledEnabled()
            ? () => {
                setNavigationOpen(false);
                setScheduledOpen({});
              }
            : undefined
        }
        backgroundActive={scheduledTasks.some((task) => task.mode === "auto")}
        syncIndicator={
          syncOn && (
            <SyncIndicator
              onOpen={() => {
                setNavigationOpen(false);
                setSettingsSection("sync");
                setSettingsOpen(true);
              }}
            />
          )
        }
      />
      {syncOn && (
        <SyncGate
          dismissed={syncDismissed}
          onDismiss={() => setSyncDismissed(true)}
          onUnlocked={() => {
            setNotice(syncText[lang].approved);
            setTab("Saved");
            void showVault();
          }}
          onOpened={(remember) => void syncOpened(remember)}
        />
      )}
      {askLocalPassphrase && (
        <LocalPassphraseDialog
          text={syncText[lang].localPassphraseNotRemembered}
          cancelLabel={syncText[lang].notNow}
          onSubmit={(secret) => setLocalPassphrase(secret)}
          onClose={(done) => {
            setAskLocalPassphrase(false);
            if (done) setNotice(vaultUnlockText[lang].newPassphraseDone);
          }}
        />
      )}
      {filesQuestion && (
        <ConfirmDialog
          title={syncText[lang].missingFilesTitle}
          text={syncText[lang].missingFilesText}
          confirmLabel={syncText[lang].sendAnyway}
          cancelLabel={syncText[lang].cancel}
          onClose={(yes) => {
            setFilesQuestion(undefined);
            filesQuestion(yes);
          }}
        />
      )}
      {eraseQuestion && (
        <ConfirmDialog
          title={t.deleteAll}
          text={eraseText()}
          confirmLabel={t.deleteAll}
          cancelLabel={syncText[lang].cancel}
          onClose={(yes) => {
            setEraseQuestion(false);
            if (yes) void eraseEverything(eraseSynced);
          }}
        >
          <AlsoDeleteSynced checked={eraseSynced} onChange={setEraseSynced} />
        </ConfirmDialog>
      )}
      {scheduledEnabled() && scheduledOpen && (
        <ScheduledPanel
          vault={heldVault}
          unlocked={heldReady}
          status={status}
          busy={!!busy}
          draft={scheduledOpen.draft}
          onClose={() => setScheduledOpen(undefined)}
          onRun={(task) => runTask(task)}
        />
      )}
      {remember && (
        <RememberDialog
          text={remember.text}
          canSave={heldReady}
          canSend={remember.draft}
          onClose={(result) => {
            const asked = remember;
            setRemember(undefined);
            if (result === "send") void send();
            else if (result)
              changeMemories(heldVault!, addMemory(result.save)).then(
                () => {
                  if (asked.draft) setInput("");
                  setNotice(memoryText[lang].added);
                },
                (error) => fail(memoryText[lang].problem(memoryProblem(error))),
              );
          }}
        />
      )}
      {anyStore && projectSpacesEnabled() && projects.some((p) => p.id === openProject) && (
        <ProjectPanel
          key={openProject}
          vault={storeOf(openProject!)}
          fileSlot={modeOf(openProject) === "secure" ? "secure" : "max"}
          project={projects.find((p) => p.id === openProject)!}
          chats={saved.filter((c) => c.projectId === openProject)}
          busy={!!busy}
          onClose={() => setOpenProject(undefined)}
          onNewChat={() => {
            if (!allowReplace()) return;
            reset();
            setConversation({ ...emptyConversation(), projectId: openProject });
            setTab("Conversation");
            setOpenProject(undefined);
          }}
          onOpenChat={(c) => {
            setOpenProject(undefined);
            openSaved(c);
          }}
          onRename={(name) => editProject(openProject!, name)}
          onDelete={(withChats) => deleteProject(openProject!, withChats)}
          onChange={async (change) => {
            const own = await storeOf(openProject!).changeProjects(change);
            setProjects(secureOn ? await readProjects(vault.current) : own);
          }}
        />
      )}
      <dialog
        ref={settingsDialog}
        onKeyDown={containDialogFocus}
        className="settings-dialog"
        aria-label={t.settings}
        // React passes a nested dialog's cancel and close on to here (the Memory screen's confirmation).
        onCancel={(event) => event.target === event.currentTarget && setSettingsOpen(false)}
        onClose={(event) => event.target === event.currentTarget && setSettingsOpen(false)}
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
                ...(memoryEnabled() ? ([["memory", "pin", memoryText[lang].title]] as const) : []),
                ...(syncOn ? ([["sync", "shield", syncText[lang].section]] as const) : []),
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
                {secureOn && (
                  <>
                    <p>{modesText[lang].secureLong}</p>
                    <ModeDefaultSetting
                      value={secure.defaultMode}
                      maxAvailable={maxAvailable}
                      onChange={(next) => void saveDefaultMode(next, status!.csrf).then((ok) => !ok && fail(st.defaultFailed))}
                    />
                  </>
                )}
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
              <AccountUsage allowance={status?.requestAllowance} metering={!!status?.metering} refresh={status} />
            )}
            {settingsSection === "memory" && memoryEnabled() && (
              <MemorySettings vault={heldVault} unlocked={heldReady} />
            )}
            {settingsSection === "sync" && syncOn && (
              <SyncSettings unlocked={unlocked} vault={vault.current} onNotice={setNotice} onOpened={(remember) => void syncOpened(remember)} />
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
        {syncOn && <PairingPrompt />}
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
                {t.messageCount(conversation.messages.length)}
              </p>
            )}
          </div>
          <LanguageSwitch />
          <details className="conversation-menu">
            <summary aria-label={t.conversationActions}>
              <Icon name="more" />
            </summary>
            <div className="menu-surface">
              <button onClick={() => setTab("Conversation")}>
                <Icon name="chat" />
                {t.tabConversation}
              </button>
              <CopyConversationButton
                conversation={conversation}
                disabled={!conversation.messages.length}
              />
              <button onClick={() => setTab("Saved")}>
                {t.renameSave}
              </button>
              <PdfExportButton
                conversation={conversation}
                disabled={!!busy || !conversation.messages.length}
              />
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
              <MemoryChatSwitch
                conversation={conversation}
                unlocked={heldReady}
                disabled={!!busy}
                onChange={(on) =>
                  setConversation(({ memoryOff: _off, ...c }) =>
                    on ? c : { ...c, memoryOff: true },
                  )
                }
              />
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
            {/* The operator's own words are shown as written; a fixed server notice is translated. */}
            <strong>{t.operatorNoticeTitle}</strong> {serverMessage(status.operatorNotice, lang)}
          </div>
        )}
        <ConnectionBanner />
        <AnswerAnnouncement last={conversation.messages.at(-1)} />
        {dropping && <div className="drop-target">{ct.dropHere}</div>}
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
        {scheduledEnabled() && (
          <DueStrip
            tasks={scheduledTasks}
            visible={tab === "Conversation"}
            busy={!!busy}
            ready={!!status?.inference.ready}
            status={status}
            problems={background.problems}
            onRun={(task) => runTask(task)}
            onSkip={(task) =>
              changeTasks(heldVault!, skipTask(task.id)).then(
                () => setNotice(scheduledText[lang].skipped),
                (error) => fail(scheduledText[lang].problem(taskProblem(error))),
              )
            }
            onOpen={() => setScheduledOpen({})}
            onDismissProblems={background.dismiss}
            onBecameDue={(task) => setNotice(scheduledText[lang].becameDue(task.name))}
          />
        )}
        {tab === "Conversation" && (
          <section
            className="chat-view"
            onPaste={(event) => {
              // Pasted files go the way of the file picker; pasted text stays text.
              const files = filesFrom(event.clipboardData);
              if (!files.length) return;
              event.preventDefault();
              if (busy) setNotice(ct.dropBusy);
              else void importFiles(files);
            }}
          >
            {!conversation.messages.length && (
              <div className="welcome">
                <div className="welcome-mark">✳</div>
                <ModeToggle mode={mode} onChange={setDraftMode} maxAvailable={maxAvailable && !conversation.incognito && !conversation.projectId && !modeOf(conversation.id)} />
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
                  setSource(undefined);
                  setNotice(t.branchOpened);
                } catch (error) {
                  fail((error as Error).message);
                }
              }}
            />
            <div className="messages">
              {conversation.messages.map((message, index) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  index={index}
                  conversation={conversation}
                  sourceHistory={sourceHistory}
                  busy={!!busy}
                  ready={!!status?.inference.ready}
                  openSource={setSource}
                  copied={copiedId === message.id}
                  onCopy={() => void copyAnswer(answerCopyText(message, lang), message.id)}
                  editing={editId === message.id}
                  onEdit={(open) => setEditId(open ? message.id : undefined)}
                  onEditSend={(text) => editAndSend(message.id, text)}
                  editCost={(text) =>
                    qualified && requestCost(qualified, modeChoice, conversation, codeToolOn(status), text)
                  }
                  retry={index === conversation.messages.length - 1 ? retry : undefined}
                  onRemember={
                    memoryEnabled() && !conversation.incognito
                      ? () => setRemember({ text: message.text, draft: false })
                      : undefined
                  }
                  onCanvas={canvasEnabled() ? () => openCanvas(message.text) : undefined}
                  onReport={() => {
                    setReporting(true);
                    setTab("Help");
                  }}
                  onResize={follow.hold}
                />
              ))}
              <div ref={outputEnd} />
            </div>
            <div className="composer-dock">
              {follow.away && conversation.messages.length > 0 && (
                <button
                  type="button"
                  className="jump-latest"
                  aria-label={ct.jumpLatest}
                  title={ct.jumpLatest}
                  onClick={() => {
                    // Focus first: focusing scrolls by itself and would cut the smooth jump short.
                    focusComposer();
                    follow.toEnd(true);
                  }}
                >
                  ↓
                </button>
              )}
              {suggestion && shown && !autoSearch && !(autoRules && !choosing) && !busy && (
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
                    <span id="search-text-label">{WHEN_TO_SEARCH.label}</span>
                  </p>
                  <SearchSuggestionField
                    labelledBy="search-text-label"
                    text={searchText}
                    sent={shown.value}
                    problem={shown.problem}
                    onChange={(text) => setSearchEdit({ for: editFor, text })}
                    onEnter={() => choiceButton.current?.click()}
                  />
                  {shown.note && (
                    <p className="muted">{shown.note}</p>
                  )}
                  {shown.warning && (
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
                      disabled={!!shown.problem}
                      onClick={() => {
                        setChoiceFor(undefined);
                        void searchThenAnswer(
                          shown.value,
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
              {attachedImage && status?.images && (
                <AttachedImageNote
                  image={attachedImage}
                  onRemove={() => {
                    setAttachedImage(undefined);
                    setNotice(imageText[lang].removedNotice);
                  }}
                />
              )}
              {scheduleCard?.text === input && (
                <ScheduleCard
                  key={input}
                  found={scheduleCard.found}
                  unlocked={heldReady}
                  onCreate={(fields) => {
                    // Create stores a Manual task in the vault. Nothing is sent to the model.
                    changeTasks(heldVault!, addTask(newTask(fields))).then(
                      () => {
                        setScheduleCard(undefined);
                        setInput("");
                        setNotice(scheduledText[lang].cardCreated(fields.name));
                        focusComposer();
                      },
                      (error) => fail(scheduledText[lang].problem(taskProblem(error))),
                    );
                  }}
                  onEdit={(draft) => {
                    setScheduleCard(undefined);
                    setScheduledOpen({ draft });
                  }}
                  onSend={() => {
                    setScheduleCard(undefined);
                    submitDraft(true);
                    focusComposer();
                  }}
                  onClose={() => {
                    setScheduleCard(undefined);
                    document.getElementById("message-input")?.focus();
                  }}
                />
              )}
              {runSearch && (
                <RunSearchChoice
                  task={runSearch}
                  onSearch={() => runTask(runSearch, true)}
                  onWithout={() => runTask(runSearch, false)}
                  onClose={() => setRunSearch(undefined)}
                />
              )}
              <form
                className="composer"
                onSubmit={(e) => {
                  e.preventDefault();
                  submitDraft();
                  focusComposer();
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
                  maxLength={MESSAGE_LIMIT}
                  rows={1}
                  aria-describedby="composer-limit"
                  onKeyDown={(event) => {
                    if (!isSendKey(event.nativeEvent, touchDevice())) return;
                    // With a keyboard, plain Enter never makes a line. It sends through the form,
                    // as the Send button does, and only when that button could.
                    event.preventDefault();
                    if (
                      !sendBlocked({
                        busy: !!busy,
                        text: input,
                        ready: !!status?.inference.ready,
                        waiting: choosing || !!consentPending,
                      })
                    )
                      event.currentTarget.form?.requestSubmit();
                  }}
                />
                <p id="composer-limit" className="composer-limit" role="status">
                  {limit.cut ? ct.limitCut(MESSAGE_LIMIT.toLocaleString(lang)) : ""}
                </p>
                {limit.counter && !limit.cut && (
                  <p className="composer-limit">
                    {ct.remaining(limit.remaining.toLocaleString(lang))}
                  </p>
                )}
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
                      {status?.images && status.inference.ready && (
                        <button
                          type="button"
                          className="text-button"
                          disabled={!!busy}
                          onClick={() => setImageOpen(true)}
                        >
                          <Icon name="image" />
                          {imageText[lang].menu}
                        </button>
                      )}
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
                        ).filter(([icon]) => (icon !== "mic" || !status?.voice) && (icon !== "voice" || !liveVoiceOn)).map(([icon, label]) => (
                          <button key={icon} type="button" disabled>
                            <Icon name={icon} />
                            <span>{label}</span>
                            <small>{t.comingLater}</small>
                          </button>
                        ))}
                      </div>
                      <p className="muted">{liveVoiceOn ? liveVoiceText[lang].menuNote : status?.voice ? t.photoNoteVoice : t.photoNote}</p>
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
                  {status?.voice && status.inference.ready ? (
                    <VoiceInput
                      status={status}
                      voice={status.voice}
                      busy={!!busy}
                      setInput={setInput}
                      notify={setNotice}
                      onVerifyWait={setVerifyWaitUntil}
                    />
                  ) : (
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
                  )}
                  {liveVoiceOn && status?.voice ? (
                    <LiveVoice
                      status={status}
                      voice={status.voice}
                      modeName={MODE_NAMES[liveMode ?? "fast"]}
                      messageCost={qualified ? tierFor(qualified, liveMode).allowanceCost : 1}
                      busy={!!busy}
                      verifyWaiting={verifyWaitUntil > Date.now()}
                      conversationId={conversation.id}
                      unlocked={unlocked}
                      send={liveSend}
                      notify={setNotice}
                      onVerifyWait={setVerifyWaitUntil}
                      onEdit={(text) => {
                        setInput(text);
                        focusComposer();
                      }}
                    />
                  ) : (
                  <button
                    type="button"
                    className="future-voice"
                    disabled
                    aria-label={t.liveVoiceLater}
                    title={t.liveVoiceLater}
                  >
                    <Icon name="voice" />
                  </button>
                  )}
                  {controller.current ? (
                    <button
                      type="button"
                      className="primary"
                      onClick={() => {
                        controller.current?.abort();
                        focusComposer();
                      }}
                    >
                      {t.stopResponse}
                    </button>
                  ) : (
                    <button
                      className="primary"
                      disabled={sendBlocked({
                        busy: !!busy,
                        text: input,
                        ready: !!status?.inference.ready,
                      })}
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
              <p className="composer-caption">
                {secureOn && !conversation.incognito
                  ? mode === "secure"
                    ? secureReady
                      ? st.captionSecure
                      : t.captionTemporary
                    : unlocked
                      ? st.captionMax
                      : st.captionMaxLocked
                  : unlocked
                    ? t.captionVault
                    : t.captionTemporary}{" "}
                {t.captionAi}
                <span className="composer-hint"> · {ct.enterHint}</span>
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
        {tab === "Help" && <SupportPanel initialSymptom={reporting ? "incorrect" : undefined} />}
        {status?.research && status.search && status.inference.ready && !(status.healthConsentDraft && !healthConsent) && (
          <DeepResearch
            hidden={tab !== "Research"}
            limits={status.research}
            busy={!!busy}
            conversationId={conversation.id}
            blocked={researchBlocked}
            sourceRoom={researchRoom}
            hold={(label, abort) => {
              controller.current = label && abort ? abort : null;
              setBusy(label);
            }}
            plan={planResearch}
            api={api}
            answer={async (question, queries, sources, note, abort) =>
              !!(await send(
                {
                  ...conversationNow.current,
                  temporarySearch: true,
                  attachments: [...conversationNow.current.attachments, researchAttachment(sources, queries)],
                },
                question,
                false,
                false,
                "thinking",
                { note, abort },
              ))
            }
            keep={(sources, queries) =>
              setConversation((c) => ({
                ...c,
                temporarySearch: true,
                attachments: [...c.attachments, researchAttachment(sources, queries)],
              }))
            }
            showAnswer={() => setTab("Conversation")}
          />
        )}
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
              metering={!!status?.metering}
              refresh={status}
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
            {secureReady && !unlocked && <ConversationLibrary conversations={saved} busy={!!busy} onOpen={openSaved} onDelete={(c) => void deleteSnapshot(c)} />}
            {!unlocked ? (
              <VaultUnlock
                vault={vault.current}
                scope={status?.accountId}
                busy={!!busy}
                passphrase={passphrase}
                onPassphrase={setPassphrase}
                onUnlock={(remember) => void unlockVault(remember)}
                onOpenRemembered={() => void unlockVault("remembered")}
                onReset={resetForgotten}
                syncAvailable={syncOn}
                onSyncRecovered={(remember) => void syncOpened(remember)}
                onGetFromOther={() => setSyncDismissed(false)}
              />
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
                      if (secureReady) void showLists();
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
                  onDelete={(c) => void deleteSnapshot(c)}
                />
                <VaultSecurity
                  busy={!!busy}
                  blocked={unreadableSnapshots > 0}
                  onChange={changeVaultPassphrase}
                />
                <VaultBackup
                  busy={!!busy}
                  // Memories or tasks alone are enough; an empty vault gets a plain message.
                  canExport={unreadableSnapshots === 0}
                  exportParts={async (includeFiles) => {
                    const parts = await vault.current!.exportBackupParts(includeFiles);
                    if (parts.length === 1) setNotice(t.backupRequested);
                    return parts;
                  }}
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
      {canvasEnabled() && canvasOpen && tab === "Conversation" && (
        <CanvasPanel
          conversation={conversation}
          update={setConversation}
          busy={!!busy}
          ready={!!status?.inference.ready}
          cost={(text) =>
            qualified && requestCost(qualified, modeChoice, withoutEarlierCanvas(conversation), codeToolOn(status), text)
          }
          onAsk={(text) => void send(withoutEarlierCanvas(conversation), text, false)}
          onNotice={setNotice}
          onClose={() => setCanvasOpen(false)}
        />
      )}
      {photoOpen && (
        <PhotoCapture
          onClose={() => setPhotoOpen(false)}
          onUse={(file) => void importFiles([file])}
        />
      )}
      {imageOpen && status?.images && (
        <ImageQuestion
          maxBytes={status.images.maxBytes}
          thinkingChosen={modeChoice === "thinking"}
          consentOn={!!status.healthConsentDraft}
          consentChoice={healthConsent?.choice}
          onConsent={chooseHealthConsent}
          onAttach={setAttachedImage}
          onClose={() => setImageOpen(false)}
          notify={setNotice}
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
