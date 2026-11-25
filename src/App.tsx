import { CHAT_IMAGE_BUDGET, chatImageCharacters, CreateImageDialog } from "./CreateImage";
import { imageCreationText } from "./text/image-creation";
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
import { readLookUp, saveLookUp, searchSuggestion, WHEN_TO_SEARCH } from "./when-to-search";
import {
  checkArithmetic,
} from "./arithmetic/check";
import { checkAnswerCompleteness } from "./arithmetic/completeness";
import {
  checkUncheckedFigures,
  checkNoOfficialSource,
} from "./german-rules";
import { expireMessages, type DisappearAfter } from "./conversation";
import { textFor, useLang } from "./i18n";
import { researchText } from "./text/research";
import { answerCopyText } from "./conversation-text";
import { deepResearchText } from "./text/deep-research";
import { RESEARCH_MIN_SOURCE_CHARACTERS, researchSourceRoom } from "../shared/deep-research";
import { serverMessage } from "./server-messages";
import { appText } from "./text/app";
import { privacyPolicyText } from "../shared/privacy-policy";
import { disclosedProvider } from "../shared/provider-disclosure";
import { imprintText } from "../shared/legal-identity";
import { importDocuments, type ImportOutcome } from "./document-import";
import { VoiceInput } from "./VoiceInput";
import type { AttachedImage } from "./image-upload";
import { imageText } from "./text/images";
import { fitHeight, isSendKey, limitState, MESSAGE_LIMIT, sendBlocked, touchDevice } from "./composer-keys";
import { filesFrom, routeFiles, useFileDrop } from "./file-drop";
import { useFollowScroll } from "./follow-scroll";
import { AnswerAnnouncement, ConnectionBanner, useOnline } from "./ConnectionBanner";
import { failureKind, failureSentence } from "./chat-failures";
import { chatCoreText } from "./text/chat-core";
import { titleFrom } from "./title-from";
import { useMenuKeys } from "./use-menu-keys";
import { composerText } from "./text/composer";
import { Vault, VaultConflictError } from "./vault";
import type { Mode } from "../shared/modes";
import { assignMode, closeSecure, flushSecure, securePending, modeOf, openSecure, readAvailable, readProjects, secureVault, useSecureState, vaultFor } from "./stores";
import { SecureMaxSection, SecureMaxSidebarEntry, shouldShowSecureMaxIntro } from "./SecureMaxSection";
import { SecureMaxLists } from "./SecureMaxLists";
import { resetSecureMaxConfirmed } from "./SecureMaxDialog";
import { modesText } from "./text/modes";
import { forStorage, modeCopyText, type Storage } from "./text/mode-copy";
import { secureStoreText } from "./text/secure-store";
import { mergeConversation } from "./sync/merge";
import { holdProjects } from "./projects";
import { VaultBackup } from "./VaultBackup";
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
import { questionText } from "./text/questions";
import { sessionExpiryText } from "./text/session-expiry";
import { developerView } from "./developer-view";
import { lazyNamed, loadInference } from "./LoadBoundary";
import { attachLimitText } from "./text/attach-limits";
import { fileCount, FILE_LIMIT, SCREENSHOT_LIMIT, screenshotCount, withResearch } from "./attachment-limits";
import { holdTasks } from "./scheduled";
import { ensureProjectFiles, useSyncFiles } from "./sync/files";
import { VaultSecurity } from "./VaultSecurity";
import { BACKUP_MAX_BYTES } from "./vault-backup";
import { containsTemporaryResearch, keepLiveSearch } from "./saved-conversation";
import { WorkspaceNavigation } from "./WorkspaceNavigation";
import type { AccountPart } from "./SettingsBody";
import { readAppearance, saveAppearance } from "./appearance";
import { ConversationLibrary } from "./ConversationLibrary";
import { CopyConversationButton } from "./CopyConversationButton";
import { ChatMessage, type RetryAction } from "./ChatMessage";
import { ConversationBranches } from "./ConversationBranches";
import { branchConversation, switchBranch } from "./conversation-branches";
import { ContextReview } from "./ContextReview";
import { correctSource } from "./source-history";
import { SupportPanel } from "./SupportPanel";
import { useShortcuts } from "./use-shortcuts";
import { lastAnswer, lastCodeBlock } from "./shortcut-copy";
import { shortcutsText } from "./text/shortcuts";
import { skipLinkText } from "./text/skip-link";
import { researchNextText } from "./text/research-next";
import { calculate } from "./calculator";
import { IncompleteReplyError } from "./reply-stream";
import { limitAtStart, limitReached } from "./limit-message";
import { stopReading } from "./read-aloud";
import { PdfExportButton } from "./PdfExportButton";
import { canvasEnabled, liveVoiceEnabled, memoryEnabled, projectSpacesEnabled, readAloudEnabled, whiteboardEnabled } from "./device-features";
import { sidePanelsText } from "./text/side-panels";
import { boardText, boardUnsent, emptyBoard } from "../shared/whiteboard";
import { CANVAS_LIMITS, keepForUndo, proposedText, withCanvas, withoutEarlierCanvas } from "./canvas";
import { canvasText } from "./text/canvas";
import { addMemory, memoriesFor, rememberRequest } from "./memory";
import {
  changeMemories,
  loadMemories,
  MemoryChatSwitch,
  MemoryNote,
  memoryProblem,
  RememberDialog,
  useMemories,
  useMemoryVault,
} from "./MemoryPanel";
import { memoryText } from "./text/memory";
import { AttestationBusyError, DeploymentChangedError } from "./providers/inference-client";
import { projectInstructionsBlock } from "./projects";
import { useHeldProjects, useProjectVault } from "./project-hooks";
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
  runMode,
  ScheduleCard,
  useBackgroundResults,
  useScheduledVault,
  type TaskDraft,
} from "./ScheduledPanel";
import { scheduledText } from "./text/scheduled";
import type { ScheduledTask } from "../shared/scheduled-tasks";
import {
  parseResearchResult,
  researchSourceUrl,

} from "./research-result";

type Tab = "Conversation" | "Context" | "Saved" | "Account" | "Help";
/** "Open CometRow in Secure Max" on this device; no content, only the choice. */
// Rarely used screens load on demand (SS-13, docs/settings-structure-20261116.md); offline, a part
// that was never loaded shows the retry line (src/LoadBoundary.tsx). The composer, the message list
// and everything on the first screen stay in the first file.
const SettingsBody = lazyNamed(() => import("./SettingsBody"), "SettingsBody");
const AccountUsage = lazyNamed(() => import("./AccountUsage"), "AccountUsage");
const ScheduledPanel = lazyNamed(() => import("./ScheduledScreen"), "ScheduledPanel");
const ProjectPanel = lazyNamed(() => import("./ProjectPanel"), "ProjectPanel");
const CanvasPanel = lazyNamed(() => import("./CanvasPanel"), "CanvasPanel");
const WhiteboardPanel = lazyNamed(() => import("./Whiteboard"), "WhiteboardPanel");
const OutputsPanel = lazyNamed(() => import("./OutputsPanel"), "OutputsPanel");
const DeepResearch = lazyNamed(() => import("./DeepResearch"), "DeepResearch");
const LiveVoice = lazyNamed(() => import("./LiveVoice"), "LiveVoice");
const ImageQuestion = lazyNamed(() => import("./ImageQuestion"), "ImageQuestion");
const AttachedImageNote = lazyNamed(() => import("./ImageQuestion"), "AttachedImageNote");
const PhotoCapture = lazyNamed(() => import("./PhotoCapture"), "PhotoCapture");
const ShortcutHelp = lazyNamed(() => import("./ShortcutHelp"), "ShortcutHelp");
// Sync and the device vault's own screens: only with sync on, or in Saved.
const VaultUnlock = lazyNamed(() => import("./VaultUnlock"), "VaultUnlock");
const SyncSetup = lazyNamed(() => import("./SyncSetup"), "SyncSetup");
const AlsoDeleteSynced = lazyNamed(() => import("./SyncScreens"), "AlsoDeleteSynced");
const LocalPassphraseDialog = lazyNamed(() => import("./SyncScreens"), "LocalPassphraseDialog");
const PairingPrompt = lazyNamed(() => import("./SyncScreens"), "PairingPrompt");
const SyncGate = lazyNamed(() => import("./SyncScreens"), "SyncGate");
const SyncIndicator = lazyNamed(() => import("./SyncScreens"), "SyncIndicator");

const START_KEY = "cometrow.openInSecureMax";
/** SS-14: the unsent message of a session that ended, for this tab only. */
const EXPIRED_DRAFT_KEY = "cometrow.expired-draft";

export function App() {
  const { lang } = useLang();
  const t = appText[lang];
  const tabName: Record<Tab, string> = {
    Conversation: t.tabConversation,
    Context: t.tabContext,
    Saved: t.tabSaved,
    Account: t.tabAccount,
    Help: t.tabHelp,
  };
  const [appearance, setAppearance] = useState<"system" | "light" | "dark">(
    readAppearance,
  );
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [navigationCollapsed, setNavigationCollapsed] = useState(false);
  // The Secure store could not open: the sidebar says so instead of "Loading your chats".
  const [secureFailed, setSecureFailed] = useState(false);
  const [shortcutHelp, setShortcutHelp] = useState(false);
  const [settingsSection, setSettingsSection] = useState("general");
  const [projects, setProjects] = useState<Project[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  // Image questions: the picture for the next message. Memory only; gone once it was sent,
  // removed, or another conversation is opened. It is never part of `conversation`.
  const [imageOpen, setImageOpen] = useState(false);
  // Image creation: the dialog's starting description, or undefined while it is closed.
  const [createImageFor, setCreateImageFor] = useState<string>();
  // A chat's created images must fit in it when it syncs (CHAT_IMAGE_BUDGET): checked before any cost.
  const startImage = (prompt: string) =>
    chatImageCharacters(conversation.messages) >= CHAT_IMAGE_BUDGET ? fail(imageCreationText[lang].chatFull) : setCreateImageFor(prompt);
  // A pasted or dropped picture that opened the same steps (it starts at turn and crop).
  const [imageFile, setImageFile] = useState<File>();
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
      // Opened from the account menu, which may have closed (a phone's drawer): its visible opener.
      else [...document.querySelectorAll<HTMLElement>(".account-menu summary, .navigation-toggle")].find((e) => e.checkVisibility())?.focus();
    };
  }, [settingsOpen]);
  // Settings' content mounts on first opening and then stays, so a step in progress (a recovery key shown) survives closing.
  const settingsUsed = useRef(false);
  if (settingsOpen) settingsUsed.current = true;
  // Archived chats from Settings: the sidebar's own Archived filter.
  const [showArchived, setShowArchived] = useState(0);
  useEffect(() => {
    if (!contextOpen) return;
    const dialog = contextDialog.current;
    const trigger = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (trigger?.checkVisibility()) trigger.focus();
      else
        // The count is now a line inside the "+" menu; focus returns to "+".
        document.querySelector<HTMLElement>(".tools-menu summary")?.focus();
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
  // Another conversation, a new one, a lock: the waiting picture is dropped.
  useEffect(() => setAttachedImage(undefined), [conversation.id]);
  const [notice, setNotice] = useState("");
  // A notice is a finished sentence in one language: changing the language closes it rather than leave it untranslated.
  useEffect(() => setNotice(""), [lang]);
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
  const contextFileInput = useRef<HTMLInputElement>(null);
  const al = attachLimitText[lang];
  // Search is automatic (owner, 19 November; docs/owner-decisions.md): a question that needs current
  // information is searched, unless "Look things up online" is off on this device.
  const [lookUp, setLookUp] = useState(readLookUp);
  const chooseLookUp = (on: boolean) => {
    setLookUp(on);
    saveLookUp(on);
  };
  // Only when an automatic search failed: the answer then says nothing about the web.
  const [searchSent, setSearchSent] = useState("");
  useEffect(() => setSearchSent(""), [conversation.id]);
  // "+" > "Deep research" arms the next Send (`researchNext`); that Send starts the run in the
  // conversation for this text (`researchFor`), drawn into `researchSlot`.
  const [researchNext, setResearchNext] = useState(false);
  const [researchFor, setResearchFor] = useState<string>();
  const [researchSlot, setResearchSlot] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    setResearchNext(false);
    setResearchFor(undefined);
  }, [conversation.id]);
  const researchReady =
    !!status?.research && !!status.search && !!status.inference.ready;
  // The search text for a question, when the app searches for it (also German rules, fees and deadlines).
  const searchFor = (text: string) =>
    lookUp && status?.search && status.inference.ready ? searchSuggestion(text) : undefined;
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
  // The right-hand panel (canvas, whiteboard or "In this chat"); one at a time. Another conversation
  // closes it, except the chat it was opened with (Whiteboard in the menu starts a chat with it).
  const [side, setSide] = useState<"canvas" | "board" | "outputs">();
  const sideChat = useRef("");
  useEffect(() => {
    if (sideChat.current !== conversation.id) setSide(undefined);
  }, [conversation.id]);
  const canvasOpen = side === "canvas";
  const setCanvasOpen = (open: boolean) => setSide(open ? "canvas" : undefined);
  // Below 1,100 px the whiteboard covers the chat; this switches to the chat while it stays open.
  const [boardChatView, setBoardChatView] = useState(false);
  useEffect(() => setBoardChatView(false), [side]);
  // The board goes with the next question once it changed; "x" on its chip skips this version.
  const [boardSkipped, setBoardSkipped] = useState<string>();
  const boardGoes =
    whiteboardEnabled() && !!status?.images && !attachedImage && boardUnsent(conversation.board) && boardSkipped !== conversation.board.changedAt;
  // The board needs room: on wide screens the left menu folds away while it is open and comes back
  // afterwards, unless the user had folded it already (first-user pass, 18 November).
  const foldedForBoard = useRef(false);
  useEffect(() => {
    if (side === "board" && !navigationCollapsed && matchMedia("(min-width: 1100px)").matches) {
      foldedForBoard.current = true;
      setNavigationCollapsed(true);
    } else if (side !== "board" && foldedForBoard.current) {
      foldedForBoard.current = false;
      setNavigationCollapsed(false);
    }
    // Only a change of panel decides; the user's own fold or unfold in between stays as they set it.
  }, [side]);
  const openBoard = () => {
    setSide("board");
    setBoardChatView(false);
  };
  async function openCanvas(answer: string) {
    const text = proposedText(answer);
    const old = conversation.canvas?.text;
    if (text.length > CANVAS_LIMITS.characters) return fail(canvasText[lang].problem("long"));
    // Cancel opens the canvas as it is.
    const replace = old !== text && (!old || (await ask(q.canvasTitle, canvasText[lang].replaceConfirm, q.canvasReplace)));
    setCanvasOpen(true);
    if (!replace) return;
    keepForUndo(conversation.id, old);
    setConversation((c) => withCanvas(c, text));
  }
  // "In this chat": the whiteboard as a picture file, dark on white.
  async function downloadBoard() {
    if (!conversation.board) return;
    try {
      const picture = await (await import("./whiteboard-render")).boardPicture(conversation.board, 8_000_000);
      Object.assign(document.createElement("a"), { href: picture.dataUrl, download: "cometrow-whiteboard.jpg" }).click();
    } catch {
      fail(sidePanelsText[lang].boardFailed);
    }
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
  // The section the user is in (owner, 16 November): the normal app is Secure; Secure Max is its own
  // section of the sidebar, opened from its one entry. The app starts in the normal section unless
  // "Open CometRow in Secure Max" is on for this account on this device (Settings) and the explanation
  // was already confirmed here: nothing is asked at sign-in.
  const storedStart = () => {
    try {
      return localStorage.getItem(START_KEY);
    } catch {
      return null;
    }
  };
  const [startInMax, setStartInMaxState] = useState(false);
  const setStartInMax = (on: boolean) => {
    setStartInMaxState(on);
    try {
      if (on && status?.accountId) localStorage.setItem(START_KEY, status.accountId);
      else localStorage.removeItem(START_KEY);
    } catch {
      /* storage blocked: the app starts in the normal section */
    }
  };
  const [sectionState, setSection] = useState<Mode>("secure");
  useEffect(() => {
    const on = maxAvailable && storedStart() === status?.accountId;
    setStartInMaxState(on);
    if (on && !shouldShowSecureMaxIntro()) setSection("max");
  }, [maxAvailable, status?.accountId]);
  const section: Mode = maxAvailable ? sectionState : "secure";
  const sectionRef = useRef(section);
  sectionRef.current = section;
  const secureOnRef = useRef(secureOn);
  secureOnRef.current = secureOn;
  /** Set when the user opens the section from its entry: focus moves into it once it is mounted. */
  const focusSection = useRef(false);
  /** The name form of "New Secure Max project" is open. */
  const [maxCreating, setMaxCreating] = useState(false);
  const inMax = (id?: string) => modeOf(id) === "max";
  // A chat's mode is the store that holds it; a project's chats inherit the project's; a new chat has the section's.
  const mode: Mode = !secureOn ? "max" : (modeOf(conversation.id) ?? modeOf(conversation.projectId) ?? section);
  // Memory, project files and tasks are held for ONE mode at a time: the open project screen's, else the open chat's.
  const heldMode: Mode = !secureOn ? "max" : ((openProject && modeOf(openProject)) || mode);
  const heldVault = heldMode === "max" ? vault.current : (secureVault() ?? null);
  const heldReady = heldMode === "max" ? unlocked : secureReady;
  const anyStore = unlocked || secureReady;
  const storeOf = (id: string) => vaultFor(modeOf(id) ?? "max", vault.current)!;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  // Where saved data lives decides what a text may promise (src/text/mode-copy.ts). Never `mode` or
  // `heldMode` directly: both are "max" while Secure is off.
  const storageOf = (m: Mode): Storage => (!secureOn ? "local" : m === "max" ? "max" : "secure");
  const appModeText = useMemo(() => ({ ...appText[lang], ...modeCopyText[lang] }), [lang]);
  const tm = (m: Mode | "settings") => forStorage(appModeText, m === "settings" ? (secureOn ? "secure" : "local") : storageOf(m));
  const heldModeRef = useRef(heldMode);
  heldModeRef.current = heldMode;
  const conversationRef = useRef(conversation);
  conversationRef.current = conversation;
  const refreshRef = useRef(async () => {});
  // What the last automatic save wrote, so an unchanged chat is not written again.
  const autoSaved = useRef("");
  const plain = (c: Conversation) => JSON.stringify({ ...c, draft: undefined });
  useMemoryVault(heldVault, heldReady);
  useProjectVault(projects, heldVault, heldReady);
  // Scheduled tasks (docs/scheduled-20261115.md): held only while the vault is unlocked.
  const scheduledTasks = useScheduledVault(heldVault, heldReady);
  const [scheduledOpen, setScheduledOpen] = useState<{ draft?: TaskDraft }>();
  const [scheduleCard, setScheduleCard] = useState<{ text: string; found: DetectedSchedule }>();
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
  // The app's own question in place of window.confirm (FE-14): one at a time, answered by the dialog below.
  const q = questionText[lang];
  const [question, setQuestion] = useState<{ title: string; text: string; confirm: string; answer: (yes: boolean) => void }>();
  // The browser's question froze the page; this one does not, so a lock or sign-out meanwhile (epoch) turns a yes into no.
  const ask = (title: string, text: string, confirm: string) => {
    const at = epoch.current;
    return new Promise<boolean>((resolve) => setQuestion({ title, text, confirm, answer: (yes) => resolve(yes && at === epoch.current) }));
  };
  const allowReplace = async () => !unsaved || ask(q.discardTitle, t.discardConfirm, q.discard);
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
      setEditId(undefined);
      setOperandA("");
      setOperandB("");
      setCalculation("");
      setPassphrase("");
      // A locked vault shows no scheduled task, not even a waiting run choice.
      setScheduledOpen(undefined);
      setNotice(textFor(appText).vaultChangedElsewhere);
      if (secureVault()) void refreshRef.current();
    };
    let timer: ReturnType<typeof setTimeout>;
    const resetTimer = (event?: Event) => {
      // With Secure on, only activity in Secure Max (its section or one of its chats) keeps it unlocked.
      if (event && secureOnRef.current && sectionRef.current !== "max" && modeRef.current !== "max") return;
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
    conversation.messages.length > 0,
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
  // Dropped and pasted files: one picture opens "Ask about a picture" (its notice, consent and
  // covering steps, as from the "+" menu); everything else goes to the text reader.
  const takeFiles = (files: File[]) => {
    if (busy) return setNotice(ct.dropBusy);
    // On Conversation files everything goes to the reader, as its own button does.
    if (tab === "Context") return void importFiles(files);
    const route = routeFiles(files, !!status?.images && !!status.inference.ready);
    if (route.to === "reader") return void importFiles(route.files);
    setImageFile(route.file);
    setImageOpen(true);
  };
  const dropping = useFileDrop(
    takeFiles,
    () => (tab === "Conversation" || tab === "Context") && !document.querySelector("dialog[open]"),
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
          // Before the lock below empties the message box.
          if (response.status === 401) keepDraftForSignIn();
          vault.current?.close(false);
          vault.current?.onInvalidate?.();
          // Signed out or another account: this device's Secure copy goes.
          if (status.secureStore && status.accountId) {
            resetSecureMaxConfirmed();
            await closeSecure(true, status.accountId);
          }
          accessNavigation.current = true;
          window.location.assign(response.status === 401 ? "/auth?reason=expired" : "/");
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
  // SS-14: an ended session keeps the unsent message for this tab, so it is back after signing in
  // again. Never for incognito or Secure Max: sessionStorage is not encrypted (owner decision).
  const inputRef = useRef(input);
  inputRef.current = input;
  function keepDraftForSignIn() {
    const text = inputRef.current;
    if (!text.trim() || !status?.accountId || conversationRef.current.incognito || (secureOnRef.current && modeRef.current === "max")) return;
    try {
      sessionStorage.setItem(EXPIRED_DRAFT_KEY, JSON.stringify({ account: status.accountId, text }));
    } catch {
      /* storage blocked: the draft is lost as before */
    }
  }
  useEffect(() => {
    if (!status?.accountId) return;
    try {
      const kept = JSON.parse(sessionStorage.getItem(EXPIRED_DRAFT_KEY) ?? "null");
      sessionStorage.removeItem(EXPIRED_DRAFT_KEY);
      // Only for the account that wrote it: another person signing in on this tab never sees it.
      if (kept?.account === status.accountId && typeof kept.text === "string" && kept.text) {
        setInput((now) => now || kept.text);
        setNotice(sessionExpiryText[lang].draftRestored);
      }
    } catch {
      /* storage blocked or unreadable: nothing to restore */
    }
  }, [status?.accountId]);
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
      keepDraftForSignIn(); // before the lock below empties the message box
      vault.current?.lock();
      vault.current?.onInvalidate?.();
      // The session ended: this device's Secure copy goes, as at sign-out.
      if (status.secureStore) {
        resetSecureMaxConfirmed();
        await closeSecure(true, status.accountId);
      }
      accessNavigation.current = true;
      window.location.assign("/auth?reason=expired");
    }
    if (!response.ok)
      throw Object.assign(
        new Error(result.error ? serverMessage(result.error, lang) : t.requestFailed),
        { status: response.status },
      );
    return result;
  }
  // FE-02: the first use of Secure Max on a device sets up its encrypted sync (device name, recovery
  // key), never a device-only passphrase vault. True while this device has no vault at all and sync
  // is not on here yet; an existing passphrase vault keeps its form, an approved account its gate.
  const [maxFirst, setMaxFirst] = useState(false);
  useEffect(() => {
    let active = true;
    if (!maxAvailable || unlocked || syncState.phase === "needs-approval" || syncState.detached) setMaxFirst(false);
    // Other phases come and go while the set-up itself runs: the screen stays until it is done.
    else if (syncState.phase === "off") vault.current?.mode().then((m) => active && setMaxFirst(m === "none"), () => {});
    return () => {
      active = false;
    };
  }, [maxAvailable, unlocked, syncState.phase, syncState.detached, status?.accountId, tab]);
  /** "Unlock Secure Max" in its section: the screen that fits this device. */
  function unlockMax() {
    setNavigationOpen(false);
    setSection("max");
    // A device that is not approved yet: the code from this device, or the recovery key.
    if (syncState.phase === "needs-approval") return setSyncDismissed(false);
    // Otherwise this device's own screen: the first use sets up sync (maxFirst), else the unlock form.
    setTab("Saved");
  }
  /** Before sign-out: one bounded send; if Secure changes are still not on the account, the user decides. */
  async function readyToLeaveSecure() {
    if (!secureOn) return true;
    await flushSecure();
    return (await securePending()) === 0 || ask(q.signOutTitle, st.unsentSignOut, q.signOut);
  }
  /** Sign-out with Secure on: the local Secure databases on this device are deleted (the account keeps its copy). */
  async function leaveSecure() {
    if (!secureOn) return;
    resetSecureMaxConfirmed();
    setStartInMax(false); // a shared computer starts the next person in the normal section
    await closeSecure(true, status!.accountId);
  }
  async function signOutConsumer() {
    if (!status?.consumerWorkspace || busy || !(await allowReplace())) return;
    setBusy(t.signingOut);
    try {
      if (!(await readyToLeaveSecure())) return setBusy("");
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
    if (retry) void send(retry.base, retry.text, false, modeOverride);
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
  const cc = chatCoreText[lang];
  const menuKeys = useMenuKeys();
  // A new chat with nothing in it: no "Conversation" heading, no context count, no jump.
  const emptyChat =
    tab === "Conversation" && !conversation.messages.length && conversation.title === "New conversation";
  const online = useOnline();
  // The on-device decimal calculator stays reachable with ?developmentTools (it reads and sends nothing; the end-to-end
  // tests use it on the production build). Token and dollar figures need a development build too (SS-22).
  const developmentTools = new URLSearchParams(location.search).has("developmentTools");
  const developerFigures = developerView();
  // An answer is streaming: its request runs and the newest answer is open with no failure yet.
  // (Imports and searches also hold `controller`, but they add no open answer.)
  const answering =
    !!controller.current &&
    lastMessage?.role === "assistant" &&
    lastMessage.status === "partial" &&
    !lastMessage.failure;
  // New chat while an answer streams asks first, in one question that also covers unsaved changes.
  const allowNew = () =>
    answering ? ask(q.stopTitle, unsaved ? cc.stopForNewUnsaved : cc.stopForNew, q.stop) : allowReplace();
  // Keyboard shortcuts (docs/keyboard-shortcuts-20261116.md) and the skip link: the message box, from any tab.
  const goToMessageBox = () => {
    setTab("Conversation");
    setNavigationOpen(false);
    requestAnimationFrame(() => document.getElementById("message-input")?.focus());
  };
  const sh = shortcutsText[lang];
  useShortcuts({
    newChat: () => {
      if (busy && !controller.current) return false;
      // New chat keeps the section the user is in (owner note).
      void (async () => {
        if (!(await allowNew())) return;
        reset();
        setTab("Conversation");
        setNavigationOpen(false);
      })();
    },
    search: () => {
      if (!anyStore) return false;
      const box = () => document.querySelector<HTMLInputElement>(".history-search input");
      if (box()?.checkVisibility()) return box()!.focus();
      setNavigationOpen(true);
      requestAnimationFrame(() => box()?.focus());
    },
    sidebar: () => {
      if (matchMedia("(max-width: 760px)").matches) setNavigationOpen((o) => !o);
      else {
        setNavigationCollapsed((c) => !c);
        setNavigationOpen(false);
      }
    },
    composer: goToMessageBox,
    // The copy actions never return false: Ctrl+Shift+C would open the developer tools.
    copyAnswer: () => {
      const m = lastAnswer(conversation.messages);
      if (!m) return setNotice(sh.noAnswer);
      void copyAnswer(answerCopyText(m, lang), m.id);
    },
    copyCode: () => {
      const a = lastAnswer(conversation.messages);
      const code = a && lastCodeBlock(a.text);
      if (code === undefined) return setNotice(a ? sh.noCode : sh.noAnswer);
      navigator.clipboard.writeText(code).then(() => setNotice(t.copied), () => fail(t.copyFailed));
    },
    help: () => setShortcutHelp((o) => !o),
  });
  // "Report a problem with this answer" opens Help with that choice set; nothing else is passed.
  const [reporting, setReporting] = useState(false);
  useEffect(() => {
    if (tab !== "Help") setReporting(false);
  }, [tab]);

  async function send(
    base = conversation,
    text = input,
    consumeDraft = true,
    // The user's own one-off choice ("Answer again with Thinking"); it wins over Auto.
    modeOverride?: AnswerMode,
    // Deep research's answer request: the note kept on the answer and the run's own stop.
    research?: { note: string; abort: AbortController },
    // A voice conversation's answer: the recording it answers, already admitted (owner, 18 November).
    voiceTurn?: string,
    // The text an automatic search just searched for this question: shown as "Searched the web".
    searchedFor?: string,
  ): Promise<boolean | void> {
    // A picture goes with a message typed in the composer only, never with "ask again".
    // The whiteboard goes as a picture the same way when it changed since it last went.
    const board = consumeDraft && boardGoes ? base.board : undefined;
    let boardImage: AttachedImage | undefined;
    if (board && status?.images && text.trim() && !busy) {
      try {
        boardImage = await (await import("./whiteboard-render")).boardPicture(board, status.images.maxBytes);
      } catch {
        return fail(sidePanelsText[lang].boardFailed);
      }
    }
    const image = consumeDraft && status?.images ? (attachedImage ?? boardImage) : undefined;
    if (image && !text.trim()) return fail(imageText[lang].needQuestion);
    if (busy || !status?.inference.ready || !text.trim()) return;
    // The allowance is checked only at a start (owner, 18 November): with none left, the one calm
    // message and the draft stays. A deep research answer belongs to its started run: never checked.
    const limit = research || voiceTurn ? undefined : limitAtStart(status.requestAllowance, lang);
    if (limit) return void setNotice(limit);
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
          : titleFrom(text, 60, [appText.en.writeDraft, appText.en.planDraft, appText.de.writeDraft, appText.de.planDraft]),
      messages: [
        ...base.messages,
        {
          ...newMessage("user", text.trim()),
          ...(image ? { image: true as const } : {}),
          ...(boardImage && board ? { board: { ...(boardText(board) ? { text: boardText(board) } : {}) } } : {}),
        },
      ],
      ...(boardImage && board ? { board: { ...board, sentAt: new Date().toISOString() } } : {}),
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
      ...(searchedFor
        ? {
            searchedFor,
            searchedSources: next.attachments
              .filter((a) => a.researchQuery === searchedFor)
              .at(-1)
              ?.sources.map((source) => source.id)
              .slice(0, 50),
          }
        : {}),
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
        const { streamReply } = await abortable(loadInference(), signal);
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
          voiceTurn,
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
      const limit = limitReached(error, lang);
      if (limit && epoch.current === current) {
        // Refused at the start, before anything was sent: the message goes back to the draft, the
        // conversation is as it was, and the one calm message says when the allowance resets.
        const asked = next.messages.at(-1)!.id;
        setConversation((c) => ({ ...c, title: base.title, messages: c.messages.filter((m) => m.id !== answer.id && m.id !== asked) }));
        if (consumeDraft) setInput((draft) => (draft.trim() ? draft : text));
        if (image) setAttachedImage(image);
        setNotice(limit);
      } else if (epoch.current === current) {
        setConversation((c) => ({
          ...c,
          messages: c.messages.map((m) =>
            m.id === answer.id
              ? {
                  ...m,
                  status: "partial",
                  failure: failureKind(error, abort.signal.aborted),
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
        // CC-06: the message shows the plain sentence with Retry and the folded explanation. The
        // notice says only what that sentence does not: the verification wait, a changed deployment,
        // a reason without its own sentence (kind "error"), the backup retry. Otherwise it repeats the
        // sentence for screen readers only (noticeLine renders it hidden).
        const kind = failureKind(error, abort.signal.aborted);
        setNotice(
          abort.signal.aborted
            ? ""
            : error instanceof AttestationBusyError || error instanceof DeploymentChangedError
              ? passed(error.message)
              : error instanceof IncompleteReplyError && kind === "error"
                ? passed(error.message)
                : retried
                  ? t.retriedOnce
                  : failureSentence(kind, lang),
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
  // the user chose Thinking. It searches the web by itself like a typed question (owner, 19 November).
  const liveMode: AnswerMode | undefined = qualified?.modes
    ? modeChoice === "thinking" ? "thinking" : "fast"
    : undefined;
  // The last voice settings stay while the status says not ready (owner, 18 November: a started
  // recording or voice conversation is never cut off by a status change); new starts wait for ready.
  const voiceSettings = useRef(status?.voice);
  if (status?.voice) voiceSettings.current = status.voice;
  const liveVoiceOn = liveVoiceEnabled() && readAloudEnabled() && !!voiceSettings.current;
  async function liveSend(text: string, signal: AbortSignal, turn?: string) {
    const search = searchFor(text);
    const sent = search
      ? searchThenAnswer(search.value, false, { base: conversationNow.current, text, mode: liveMode, voiceTurn: turn })
      : send(conversationNow.current, text, false, liveMode, undefined, turn);
    const running = controller.current;
    signal.addEventListener("abort", () => running?.abort(), { once: true });
    return (await sent) ? ("answered" as const) : ("failed" as const);
  }
  // Deep research (docs/deep-research-20261114.md): the plan request. One message to the Fast
  // model through the ordinary send path (masking, verification, allowance, stop switch),
  // declared to the relay as a research plan. Its text is not shown; the search texts are.
  async function planResearch(prompt: string, signal: AbortSignal) {
    if (!status) throw Error(t.serviceUnavailable);
    const { streamReply } = await abortable(loadInference(), signal);
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
  // Checked before the plan request: a run starts while 1 unit is left (owner, 18 November).
  function researchBlocked(question: string) {
    const limit = limitAtStart(status?.requestAllowance, lang);
    if (limit) return limit;
    if (researchRoom(question) < RESEARCH_MIN_SOURCE_CHARACTERS) return deepResearchText[lang].tooLong;
    return undefined;
  }
  async function importFiles(files: FileList | readonly File[] | null) {
    if (!files || busy) return;
    if (
      files.length + fileCount(conversation.attachments) > FILE_LIMIT ||
      Array.from(files).filter((f) => f.type.startsWith("image/")).length + screenshotCount(conversation.attachments) >
        SCREENSHOT_LIMIT
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
  // One automatic search: its masked text goes to the server, its results join the chat.
  async function research(
    approved: Disclosure,
  ): Promise<{ attachment?: Attachment } | "failed" | "capped" | "quiet" | undefined> {
    if (busy) return;
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
            attachments: withResearch(c.attachments, attachment),
          }));
        return { attachment };
      }
    } catch (e) {
      if (current === epoch.current && !abort.signal.aborted) {
        // The day's searches are used up (429), or the search service has no credit left (402):
        // the question is answered without a search, never with an error (owner, 25 November).
        const code = (e as { status?: number }).status;
        if (approved.kind === "search" && (code === 429 || code === 402))
          return code === 429 ? "capped" : "quiet";
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
  // Automatic search (owner, 19 November): the masked text is searched, then the question is answered
  // and the answer keeps what was searched ("Searched the web"). A failed search still answers.
  // `again`: search for the last question and answer it again (the old answer is replaced the
  // same way "Retry last response" replaces it).
  async function searchThenAnswer(
    value: string,
    again = false,
    // A scheduled task's run or a voice turn: its own question and mode, not the draft.
    asked?: { base: Conversation; text: string; mode?: AnswerMode; voiceTurn?: string },
  ) {
    const retry = again ? lastQuestion() : undefined;
    if (again && !retry) return;
    const text = asked?.text ?? retry?.text ?? input;
    const base = asked?.base ?? retry?.base ?? conversation;
    const draft = !again && !asked;
    // Search and answer are one start (owner, 18 November): with no allowance left, nothing is searched.
    // A voice turn was already admitted when its recording started.
    const limit = asked?.voiceTurn ? undefined : limitAtStart(status?.requestAllowance, lang);
    if (limit) return void setNotice(limit);
    const outcome = await research({ kind: "search", value });
    if (!outcome) return;
    if (outcome === "failed" || outcome === "capped" || outcome === "quiet") {
      // "quiet": the search service is out of credit; the answer comes without a note.
      if (outcome !== "quiet")
        setSearchSent(outcome === "capped" ? WHEN_TO_SEARCH.dailyCapReached : WHEN_TO_SEARCH.automaticFailed);
      return send(base, text, draft, asked?.mode, undefined, asked?.voiceTurn);
    }
    return send(
      outcome.attachment
        ? {
            ...base,
            temporarySearch: true,
            attachments: withResearch(base.attachments, outcome.attachment),
          }
        : base,
      text,
      draft,
      asked?.mode,
      undefined,
      asked?.voiceTurn,
      value,
    );
  }
  // The composer's Send. `asIs`: the user chose "Just send" on the scheduled-task card.
  function submitDraft(asIs = false) {
    // While the deep research card is open, its buttons decide; armed, Send opens it for this text.
    if (researchFor !== undefined) return;
    const picture = !!attachedImage || boardGoes;
    if (researchNext && researchReady && !picture && !busy) {
      setResearchNext(false);
      setResearchFor(input.trim());
      return;
    }
    // "Remember that ...": ask to save it as a memory. Nothing is sent unless the user says so.
    const wanted =
      memoryEnabled() && !conversation.incognito && !picture && !busy
        ? rememberRequest(input)
        : undefined;
    // "Every day at 10, give me ...": offer a scheduled task. Nothing is sent unless the user says so.
    const planned =
      !wanted && !asIs && scheduledEnabled() && !conversation.incognito && !picture && !busy
        ? detectSchedule(input)
        : undefined;
    if (wanted) setRemember({ text: wanted, draft: true });
    else if (planned) setScheduleCard({ text: input, found: planned });
    // A picture question goes straight to the model: no search step in between.
    else if (picture && status?.images) void send();
    else {
      const search = picture ? undefined : searchFor(input);
      void (search ? searchThenAnswer(search.value) : send());
    }
  }
  // "Run now" of a scheduled task: a new conversation with the instruction as its first message,
  // answered like a chat message, so it searches when the instruction needs current information
  // (owner, 19 November). Only an answered run moves the task on; a refusal leaves it due.
  async function runTask(task: ScheduledTask) {
    if (busy || !status?.inference.ready) return;
    if (!(await allowReplace())) return;
    reset();
    setTab("Conversation");
    setScheduledOpen(undefined);
    setNavigationOpen(false);
    const asked = { base: emptyConversation(), text: task.instruction, mode: runMode(task, status) };
    const search = searchFor(task.instruction);
    const run = search
      ? searchThenAnswer(search.value, false, asked)
      : send(asked.base, asked.text, false, asked.mode);
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
  /** Signed in within the last 5 minutes (as account closure asks); false when the server did not say. */
  const recentSignIn = () => !!status?.signedInAt && Date.now() - status.signedInAt < 5 * 60_000;
  /**
   * Settings, "Reset Secure Max": the synced copy on the server and this device's Secure Max data go
   * (the hardened sync reset, which needs this unlocked device's proof), and Unlock Secure Max then
   * starts a fresh one. A locked device uses "Forgot passphrase" with the recovery key instead.
   */
  async function resetMax() {
    if (!unlocked || !recentSignIn()) throw new Error("locked");
    if (modeRef.current === "max") controller.current?.abort();
    await eraseThisDevice(true);
    vault.current?.lock();
    vault.current?.onInvalidate?.();
    setNotice(st.maxResetDone);
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
      // Only a change from elsewhere (the stored copy is not what this tab last saved or opened), only
      // when nothing here waits to be saved and no answer is streaming: otherwise the next save merges.
      // A save strips live search (owner decision 22 October), so the open chat keeps its own results.
      if (fresh && !controller.current && plain(shown) === autoSaved.current && (!savedBase.current || plain(fresh) !== plain(savedBase.current))) {
        const next = keepLiveSearch(fresh, shown);
        savedBase.current = fresh;
        autoSaved.current = plain(next);
        setConversation(structuredClone(next));
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
      setSecureFailed(!ok);
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
        const next = keepLiveSearch(snapshot, conversation);
        autoSaved.current = plain(next);
        savedBase.current = snapshot;
        setConversation(structuredClone(next));
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
    // Only once the chat has a message: attaching a file alone saves nothing (FE-12).
    if (!secureOn || busy || conversation.incognito || !conversation.messages.length) return;
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
      // The app's question (SS-16); in sync here it also asks about the synced copy (below).
      setEraseSynced(false);
      setEraseQuestion(true);
      return;
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
    if (!(await allowReplace())) return;
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
  /** A section of the account page (src/AccountLab.tsx), leaving the app as "Manage account" does. */
  async function openAccountPage(part: AccountPart) {
    if (!(await allowReplace())) return;
    accessNavigation.current = true;
    window.location.assign(`/account#${part}`);
  }
  async function signOut() {
    if (!status?.accountId) return;

    if (status.consumerWorkspace) {
      await signOutConsumer();
      return;
    }
    if (!(await allowReplace())) return;
    if (!(await readyToLeaveSecure())) return;
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
  async function createProject(name: string, into: Mode = secureOn ? "secure" : "max"): Promise<string | undefined> {
    const current = epoch.current;
    setBusy(t.creatingProject);
    try {
      const next = await vaultFor(into, vault.current)!.createProject(name);
      const id = next.at(-1)?.id;
      if (id) assignMode(id, into);
      const all = secureOn ? await readProjects(vault.current) : next;
      if (current !== epoch.current) return;
      setProjects(all);
      setNotice(tm(into).projectCreated);
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
      setNotice(tm(modeOf(c.id) ?? section).organized);
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
  /** Data controls' "Delete all chats" in Secure: each chat's delete leaves a tombstone that reaches every device. */
  async function deleteAllSecure() {
    const store = secureVault();
    if (!store) throw Error("Secure is not open");
    const chats = saved.filter((c) => !inMax(c.id));
    if (chats.some((c) => c.id === conversation.id)) reset();
    try {
      for (const c of chats) await store.delete(c.id);
    } finally {
      await showLists();
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
  const openSaved = async (c: Conversation) => {
    if (!(await allowReplace())) return;
    reset();
    savedBase.current = c;
    if (secureOn) setSection(modeOf(c.id) ?? "secure");
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

  const filesFull = fileCount(conversation.attachments) >= FILE_LIMIT;
  const screenshotsFull = screenshotCount(conversation.attachments) >= SCREENSHOT_LIMIT;
  const sources = conversation.attachments.flatMap((a) => a.sources);
  const sourceHistory = new Map(sources.map((item) => [item.id, item]));
  // On the conversation screen, notices and the "not available" line sit just above the message
  // box: at the top they scrolled away under the sticky header (phones, long chats).
  const inDock = tab === "Conversation";
  const connectionStatus = (
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
  );
  // Deep research's ways out, for the run in the chat (FE-07).
  const researchProps = !researchReady ? undefined : {
    limits: status!.research!,
    busy: !!busy,
    conversationId: conversation.id,
    blocked: researchBlocked,
    sourceRoom: researchRoom,
    hold: (label: string, abort?: AbortController) => {
      controller.current = label && abort ? abort : null;
      setBusy(label);
    },
    plan: planResearch,
    api,
    answer: async (question: string, queries: string[], sources: Source[], note: string, abort: AbortController) =>
      !!(await send(
        {
          ...conversationNow.current,
          temporarySearch: true,
          attachments: withResearch(conversationNow.current.attachments, researchAttachment(sources, queries)),
        },
        question,
        false,
        "thinking",
        { note, abort },
      )),
    keep: (sources: Source[], queries: string[]) =>
      setConversation((c) => ({
        ...c,
        temporarySearch: true,
        attachments: withResearch(c.attachments, researchAttachment(sources, queries)),
      })),
    showAnswer: () => setTab("Conversation"),
  };
  // The failed answer's own sentence is in the message already: announced, not shown twice (CC-06).
  const failed = conversation.messages.at(-1)?.failure;
  const noticeLine = notice && failed && notice === failureSentence(failed, lang) ? (
    <div role="status" className="sr-only">
      {notice}
    </div>
  ) : notice && (
    <div role="status" className={inDock ? "notice composer-note dock-notice" : "notice"}>
      {notice}
      <button aria-label={t.dismissNotice} onClick={() => setNotice("")}>
        ×
      </button>
    </div>
  );
  return (
    <div
      className={`app-shell chat-design ${navigationCollapsed ? "navigation-collapsed" : ""}${side && tab === "Conversation" ? ` side-open side-${side}${side === "board" && boardChatView ? " board-chat-view" : ""}` : ""}`}
      data-theme={
        appearance === "system" ? (systemDark ? "dark" : "light") : appearance
      }
    >
      {/* SS-23: first in the tab order; works from every tab (the message box exists on Conversation only). */}
      <a
        className="skip-link"
        href="#message-input"
        onClick={(event) => {
          event.preventDefault();
          goToMessageBox();
        }}
      >
        {skipLinkText[lang].toMessageBox}
      </a>
      <WorkspaceNavigation
        onDelete={(c) => void deleteSnapshot(c)}
        open={navigationOpen}
        collapsed={navigationCollapsed}
        onClose={() => setNavigationOpen(false)}
        onCollapse={() => setNavigationCollapsed(true)}
        onExpand={() => {
          setNavigationCollapsed(false);
          setNavigationOpen(false);
        }}
        // With Secure on, the normal lists hold Secure only; Secure Max lives in its own section below.
        conversations={secureOn ? saved.filter((c) => !inMax(c.id)) : saved}
        projects={secureOn ? projects.filter((p) => !inMax(p.id)) : projects}
        status={status}
        onSignOut={() => void signOut()}
        onCreateProject={createProject}
        onEditProject={editProject}
        onDeleteProject={deleteProject}
        // The normal list holds Secure projects with Secure on (Secure Max has its own section).
        projectStorage={secureOn ? "secure" : "local"}
        storage={secureOn ? "secure" : "local"}
        onShortcuts={() => {
          setNavigationOpen(false);
          setShortcutHelp(true);
        }}
        onOpenProject={(id) => {
          setNavigationOpen(false);
          setOpenProject(id);
        }}
        onOrganize={(c, change) => void organizeChat(c, change)}
        unlocked={anyStore}
        maxSection={
          !maxAvailable ? undefined : section !== "max" ? (
            // The one entry; the section replaces it while open (src/SecureMaxSection.tsx looks for it after Cancel).
            <SecureMaxSidebarEntry
              locked={!unlocked}
              onOpen={() => {
                focusSection.current = true;
                setSection("max");
              }}
            />
          ) : (
            <div
              className="secure-max-mount"
              ref={(element) => {
                if (element && !element.dataset.focusWatch) {
                  element.dataset.focusWatch = "1";
                  // After Confirm on the explanation its opener (the entry) is gone: focus moves into the section.
                  // Capture: a dialog's close event does not bubble.
                  element.addEventListener(
                    "close",
                    () =>
                      requestAnimationFrame(() => {
                        if (element.isConnected && (!document.activeElement || document.activeElement === document.body))
                          element.querySelector<HTMLElement>("button")?.focus();
                      }),
                    true,
                  );
                }
                // Opened from the entry: focus moves into the section, unless the explanation took it.
                if (!element || !focusSection.current) return;
                focusSection.current = false;
                if (!shouldShowSecureMaxIntro()) element.querySelector<HTMLElement>("button")?.focus();
              }}
            >
              <SecureMaxSection
                locked={!unlocked}
                onUnlock={unlockMax}
                onLock={() => {
                  vault.current?.lock();
                  vault.current?.onInvalidate?.();
                }}
                onNewChat={async () => {
                  if (!(await allowNew())) return;
                  reset();
                  setSection("max");
                  setTab("Conversation");
                  setNavigationOpen(false);
                }}
                onNewProject={projectSpacesEnabled() ? () => setMaxCreating(true) : undefined}
                onCancelIntro={() => setSection("secure")}
              >
                <SecureMaxLists
                  conversations={saved.filter((c) => inMax(c.id))}
                  projects={projects.filter((p) => inMax(p.id))}
                  currentId={conversation.id}
                  busy={!!busy}
                  projectsEnabled={projectSpacesEnabled()}
                  creating={maxCreating}
                  onCreateClose={() => setMaxCreating(false)}
                  onNewProject={(name) => createProject(name, "max")}
                  onOpen={openSaved}
                  onOpenProject={(id) => {
                    setNavigationOpen(false);
                    setOpenProject(id);
                  }}
                />
              </SecureMaxSection>
            </div>
          )
        }
        busy={!!busy}
        newDisabled={!!busy && !controller.current}
        currentId={conversation.id}
        onOpen={openSaved}
        onNew={async (projectId) => {
          if (!(await allowNew())) return;
          reset();
          setSection("secure");
          if (projectId) setConversation({ ...emptyConversation(), projectId });
          setTab("Conversation");
          setNavigationOpen(false);
        }}
        onWhiteboard={
          whiteboardEnabled()
            ? async () => {
                if (!(await allowNew())) return;
                reset();
                setSection("secure");
                const next = emptyConversation();
                sideChat.current = next.id;
                setConversation(next);
                setSide("board");
                setTab("Conversation");
                setNavigationOpen(false);
              }
            : undefined
        }
        onNewIncognito={async () => {
          if (!(await allowNew())) return;
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
        showArchived={showArchived}
        loadingNote={secureFailed ? secureStoreText[lang].unavailable : undefined}
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
      {question && (
        <ConfirmDialog
          title={question.title}
          text={question.text}
          confirmLabel={question.confirm}
          cancelLabel={q.cancel}
          // The opener can sit in a menu that closed: then the message box.
          fallback={() => document.getElementById("message-input")}
          onClose={(yes) => {
            setQuestion(undefined);
            question.answer(yes);
          }}
        />
      )}
      {shortcutHelp && (
        <ShortcutHelp
          onClose={() => setShortcutHelp(false)}
          fallback={() =>
            [...document.querySelectorAll<HTMLElement>(".account-menu summary, .navigation-toggle")].find((e) => e.checkVisibility()) ?? null
          }
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
          {syncMember && !syncState.detached && <AlsoDeleteSynced checked={eraseSynced} onChange={setEraseSynced} />}
        </ConfirmDialog>
      )}
      {scheduledEnabled() && scheduledOpen && (
        <ScheduledPanel
          storage={storageOf(heldMode)}
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
          storage={storageOf(heldMode)}
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
                  setNotice(forStorage(memoryText[lang], storageOf(heldMode)).added);
                },
                (error) => fail(memoryText[lang].problem(memoryProblem(error))),
              );
          }}
        />
      )}
      {anyStore && projectSpacesEnabled() && projects.some((p) => p.id === openProject) && (
        <ProjectPanel
          key={openProject}
          storage={storageOf(modeOf(openProject) === "secure" ? "secure" : "max")}
          vault={storeOf(openProject!)}
          fileSlot={modeOf(openProject) === "secure" ? "secure" : "max"}
          project={projects.find((p) => p.id === openProject)!}
          chats={saved.filter((c) => c.projectId === openProject)}
          busy={!!busy}
          onClose={() => setOpenProject(undefined)}
          onNewChat={async () => {
            if (!(await allowNew())) return;
            reset();
            if (secureOn) setSection(modeOf(openProject) ?? "secure");
            setConversation({ ...emptyConversation(), projectId: openProject });
            setTab("Conversation");
            setOpenProject(undefined);
          }}
          onRenameChat={(c, title) => void organizeChat(c, { title })}
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
        {settingsUsed.current && (
          <SettingsBody
            lookUp={status?.search ? lookUp : undefined}
            onLookUp={chooseLookUp}
            section={settingsSection}
            onSection={setSettingsSection}
            appearance={appearance}
            onAppearance={setAppearance}
            status={status}
            secureOn={secureOn}
            secureReady={secureReady}
            syncOn={syncOn}
            maxAvailable={maxAvailable}
            unlocked={unlocked}
            secureChats={saved.filter((c) => !inMax(c.id))}
            onDeleteAllSecure={deleteAllSecure}
            busy={!!busy}
            memoryVault={heldVault}
            memoryReady={heldReady}
            memoryStorage={storageOf(heldMode)}
            vault={vault.current}
            onNotice={setNotice}
            onSyncOpened={(remember) => void syncOpened(remember)}
            startInMax={startInMax}
            onStartInMax={setStartInMax}
            onResetMax={resetMax}
            recentSignIn={recentSignIn()}
            onSavedTab={() => {
              setSettingsOpen(false);
              setTab("Saved");
            }}
            onArchived={!(secureReady || unlocked) ? undefined : () => {
              setSettingsOpen(false);
              setShowArchived((n) => n + 1);
              // Only where the sidebar is a drawer; open stays false where it is always shown.
              if (navigationCollapsed || matchMedia("(max-width: 760px)").matches) setNavigationOpen(true);
            }}
            onAccountPage={(part) => {
              setSettingsOpen(false);
              void openAccountPage(part);
            }}
            onSignOut={() => {
              setSettingsOpen(false);
              void signOut();
            }}
          />
        )}
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
            {/* An empty chat shows no heading; it stays for screen readers. */}
            <h1 className={emptyChat ? "sr-only" : undefined}>
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
          {/* Shown once the chat has something to list: on an empty chat it would be an unexplained icon. */}
          {whiteboardEnabled() && tab === "Conversation" && (conversation.messages.length > 0 || !!conversation.board || side === "outputs") && (
            <button
              type="button"
              className="outputs-toggle icon-action"
              aria-label={sidePanelsText[lang].outputsOpen}
              title={sidePanelsText[lang].outputs}
              aria-pressed={side === "outputs"}
              onClick={() => setSide(side === "outputs" ? undefined : "outputs")}
            >
              <Icon name="panel" />
            </button>
          )}
          <details className="conversation-menu" {...menuKeys}>
            <summary aria-label={t.conversationActions}>
              <Icon name="more" />
            </summary>
            <div className="menu-surface">
              {tab !== "Conversation" && (
                <button onClick={() => setTab("Conversation")}>
                  <Icon name="chat" />
                  {t.tabConversation}
                </button>
              )}
              <CopyConversationButton
                conversation={conversation}
                disabled={!conversation.messages.length}
              />
              <button onClick={() => setTab("Saved")}>
                <Icon name="edit" />
                {t.renameSave}
              </button>
              <PdfExportButton
                conversation={conversation}
                disabled={!!busy || !conversation.messages.length}
              />
              {tab === "Conversation" && (
                <button onClick={() => setContextOpen(true)}>
                  <Icon name="layers" />
                  {t.includedContext}
                </button>
              )}
              <button onClick={() => setTab("Context")}>
                <Icon name="files" />
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
            </div>
          </details>
        </header>
        {!(inDock && !status?.inference.ready) && connectionStatus}
        {conversation.incognito && (
          <div role="status" className="notice incognito-banner">
            <strong>{t.incognitoBannerTitle}</strong> {tm(mode).incognitoBanner}
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
        {!inDock && <ConnectionBanner />}
        <AnswerAnnouncement last={conversation.messages.at(-1)} />
        {dropping && <div className="drop-target">{ct.dropHere}</div>}
        {!inDock && noticeLine}
        {busy && (
          <div role="status" className="progress">
            <span className="spinner" />
            {busy}
            {/* On the conversation screen the message box has the one Stop. */}
            {controller.current && !inDock && (
              <button onClick={() => controller.current?.abort()}>{t.stop}</button>
            )}
          </div>
        )}
        {!!imports.length && (
          <section className="import-results" aria-label={t.importResults}>
            <strong>{t.importResults}</strong>
            {/* The live region wraps the list: role="status" on the <ul> itself hid its list items (axe "listitem"). */}
            <div role="status" aria-live="polite" aria-relevant="text additions"><ul>
              {imports.map((item, index) => (
                <li key={index}>
                  <span>
                    {item.name} — {t.importStatus(item.status)}
                  </span>
                  {item.detail && <p>{item.detail}</p>}
                  {/* A picture the text reader could not use (no printed text, or unreadable):
                      point to the picture question instead. */}
                  {item.status === "failed" &&
                    /\.(png|jpe?g)$/i.test(item.name) &&
                    status?.images &&
                    status.inference.ready && (
                      <p>
                        {cc.pictureHint}{" "}
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => setImageOpen(true)}
                        >
                          {imageText[lang].menu}
                        </button>
                      </p>
                    )}
                </li>
              ))}
            </ul></div>
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
              takeFiles(files);
            }}
          >
            {!conversation.messages.length && researchFor === undefined && (
              <div className="welcome">
                <h2>{t.greeting}</h2>
                <div className="starter-grid">
                  {(
                    [
                      [t.writeTitle, "edit", t.writeDraft],
                      [t.planTitle, "check", t.planDraft],
                      [t.documentTitle, "file", ""],
                    ] as const
                  ).map(([title, icon, target]) => (
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
                      <Icon name={icon} />
                      <span>{title}</span>
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
                  streaming={answering && index === conversation.messages.length - 1}
                  storage={storageOf(mode)}
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
                  // Image creation on a short answer: the dialog opens with the answer's start as the description.
                  onCreateImage={
                    status?.imageCreation && message.role === "assistant" && message.text.length <= 600
                      ? () => startImage(message.text.replace(/[#*_`>|]/g, "").replace(/\s+/g, " ").trim().slice(0, 300))
                      : undefined
                  }
                  onRegenerateImage={status?.imageCreation ? (prompt) => startImage(prompt) : undefined}
                  onOpenBoard={whiteboardEnabled() && conversation.board ? openBoard : undefined}
                  onImagePrivacy={() =>
                    setSource({ id: "privacy-policy", title: t.privacyPolicy, text: privacyPolicyText(disclosedProvider(status), lang) })
                  }
                  onReport={() => {
                    setReporting(true);
                    setTab("Help");
                  }}
                  onResize={follow.hold}
                />
              ))}
              {/* The deep research card of this chat (FE-07) is drawn here; it lives outside the tab. */}
              <div ref={setResearchSlot} />
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
              {researchNext && researchFor === undefined && !busy && status?.research && (
                <div className="notice composer-note search-next">
                  <span>{researchNextText[lang].armed(status.research.cost)}</span>
                  <button type="button" className="text-button" onClick={() => setResearchNext(false)}>
                    {researchNextText[lang].cancel}
                  </button>
                </div>
              )}
              {searchSent && (
                <p className="notice composer-note" role="status">
                  {searchSent}
                </p>
              )}
              {boardGoes && (
                <p className="board-chip" role="status">
                  <Icon name="whiteboard" />
                  <span>{sidePanelsText[lang].chip}</span>
                  <button
                    type="button"
                    className="icon-action"
                    aria-label={sidePanelsText[lang].chipRemove}
                    title={sidePanelsText[lang].chipRemove}
                    onClick={() => setBoardSkipped(conversation.board?.changedAt)}
                  >
                    <Icon name="close" />
                  </button>
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
                  storage={storageOf(heldMode)}
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
              {noticeLine}
              <ConnectionBanner />
              {!status?.inference.ready && connectionStatus}
              {/* Added files sit just above the message box, as chips (first-user pass, 18 November). */}
              {conversation.attachments.length > 0 && (
                <ul
                  className="composer-attachments"
                  aria-label={t.attachments}
                >
                  {conversation.attachments.map((attachment) => (
                    <li key={attachment.id}>
                      <span>{attachment.name}</span>
                      <small className={attachment.selected ? undefined : "excluded"}>
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
                        ready: !!status?.inference.ready && online,
                        waiting: researchFor !== undefined,
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
                <div className="composer-footer" data-empty={input.trim() ? undefined : ""}>
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
                  <details className="tools-menu" {...menuKeys}>
                    <summary aria-label={t.tools}>
                      <Icon name="plus" />
                    </summary>
                    <div className="menu-surface">
                      <button
                        type="button"
                        className="text-button"
                        disabled={!!busy || filesFull}
                        aria-describedby={filesFull ? "file-limit-reason" : undefined}
                        onClick={() => chatFileInput.current?.click()}
                      >
                        <Icon name="file" />
                        {t.attachFile}
                      </button>
                      {/* FE-06: a "+" item that is off says why (searches never count). */}
                      {filesFull && (
                        <p id="file-limit-reason" className="menu-reason">
                          {al.fileLimit(FILE_LIMIT)}
                        </p>
                      )}
                      <button
                        type="button"
                        className="text-button"
                        disabled={!!busy || filesFull || screenshotsFull}
                        aria-describedby={!filesFull && screenshotsFull ? "screenshot-limit-reason" : undefined}
                        onClick={() => setPhotoOpen(true)}
                      >
                        <Icon name="camera" />
                        {t.photoToText}
                      </button>
                      {!filesFull && screenshotsFull && (
                        <p id="screenshot-limit-reason" className="menu-reason">
                          {al.screenshotLimit(SCREENSHOT_LIMIT)}
                        </p>
                      )}
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
                      {whiteboardEnabled() && (
                        <button type="button" className="text-button" onClick={openBoard}>
                          <Icon name="whiteboard" />
                          {sidePanelsText[lang].whiteboard}
                        </button>
                      )}
                      {status?.imageCreation && (
                        <button type="button" className="text-button" disabled={!!busy} onClick={() => startImage("")}>
                          <Icon name="sparkle" />
                          {imageCreationText[lang].menu}
                        </button>
                      )}
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => setContextOpen(true)}
                      >
                        <Icon name="layers" />
                        {t.reviewContext}{" "}
                        {/* The count left the message box for this row (17 November: one-line box). */}
                        {conversation.messages.length > 0 || conversation.attachments.length > 0 ? (
                          <span className="context-count">
                            {t.contextCount(
                              selectedContextSize.includedMessages,
                              conversation.attachments.filter((a) => a.selected).length,
                            )}
                          </span>
                        ) : (
                          <span>
                            {t.selectedCount(
                              conversation.attachments.filter((a) => a.selected).length,
                            )}
                          </span>
                        )}
                      </button>
                      {researchReady && (
                        <button
                          type="button"
                          className="text-button"
                          aria-pressed={researchNext}
                          disabled={!!busy || researchFor !== undefined}
                          onClick={() => {
                            setResearchNext((on) => !on);
                            // The menu closes on the click (closeMenus); typing goes on in the message box.
                            requestAnimationFrame(() => document.getElementById("message-input")?.focus());
                          }}
                        >
                          <Icon name="book" />
                          {deepResearchText[lang].heading}
                        </button>
                      )}
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => setTab("Context")}
                      >
                        <Icon name="files" />
                        {t.conversationFiles}
                      </button>
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
                  {status && voiceSettings.current && (
                    <VoiceInput
                      status={status}
                      voice={voiceSettings.current}
                      ready={!!status.voice && status.inference.ready}
                      busy={!!busy}
                      setInput={setInput}
                      notify={setNotice}
                      onVerifyWait={setVerifyWaitUntil}
                    />
                  )}
                  {liveVoiceOn && status && voiceSettings.current && (
                    <LiveVoice
                      status={status}
                      voice={voiceSettings.current}
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
                  )}
                  {controller.current ? (
                    <button
                      type="button"
                      className="primary stop-button"
                      aria-label={t.stopResponse}
                      title={t.stopResponse}
                      onClick={() => {
                        controller.current?.abort();
                        focusComposer();
                      }}
                    >
                      <Icon name="stop" />
                    </button>
                  ) : (
                    <button
                      className="primary send-button"
                      disabled={sendBlocked({
                        busy: !!busy,
                        text: input,
                        ready: !!status?.inference.ready && online,
                      })}
                      type="submit"
                      aria-label={t.sendLabel}
                      // Offline: the banner just above says why Send is off.
                      aria-describedby={online ? undefined : "offline-reason"}
                    >
                      <Icon name="arrow-up" />
                    </button>
                  )}
                </div>
              </form>
              <p className="composer-caption">
                {conversation.incognito
                  ? t.captionIncognito
                  : secureOn
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
                {t.captionAi}{" "}
                · <a href={`/terms?lang=${lang}`} target="_blank" rel="noopener">{t.captionTerms}</a> ·{" "}
                <a href={`/privacy?lang=${lang}`} target="_blank" rel="noopener">{t.captionPrivacy}</a>
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
            {developmentTools && (
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
            {/* Token and dollar figures are for development only, never for users. */}
            {developerFigures && conversation.usage.length > 0 && (
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
            {/* FE-10: the app's own button (the browser's file field is unstyled and in the browser's language); drops here are taken. */}
            <div className="upload-zone">
              <span>＋ {t.addDocuments}</span>
              <input
                ref={contextFileInput}
                hidden
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
              <span className="upload-choose">
                <button type="button" disabled={!!busy} onClick={() => contextFileInput.current?.click()}>
                  {al.chooseFiles}
                </button>
                <span>{al.dropHere}</span>
              </span>
              <small>
                {t.formats}
                <br />
                {t.limits}
              </small>
            </div>
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
                        disabled={!!busy || !status?.search || !status.inference.ready}
                        onClick={() => {
                          const value = prepareSearchQuery(attachment.researchQuery ?? "").value;
                          if (value.length >= 2) void searchThenAnswer(value, true);
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
        {tab === "Help" && (
          <SupportPanel
            initialSymptom={reporting ? "incorrect" : undefined}
            onShortcuts={() => setShortcutHelp(true)}
            onDocument={(id) =>
              setSource(
                id === "imprint"
                  ? { id, title: t.imprint, text: imprintText(undefined, lang) }
                  : id === "privacy-policy"
                    ? { id, title: t.privacyPolicy, text: privacyPolicyText(disclosedProvider(status), lang) }
                    : id === "trial-safety"
                      ? { id, title: t.safetyTitle, text: t.safetyText }
                      : id === "privacy"
                        ? // One source for privacy details (owner, 18 November): the Privacy Policy, which also
                          // corrects the older statement's sentences that are not true in Secure mode.
                          { id, title: t.privacyBoundariesTitle, text: privacyPolicyText(disclosedProvider(status), lang) }
                        : { id, title: t.guideTitle, text: tm("settings").guideText },
              )
            }
          />
        )}
        {researchReady && researchFor !== undefined && (
          <DeepResearch
            {...researchProps!}
            hidden={!researchSlot}
            answer={(...args) => {
              // The question becomes the user message: the draft it came from is used up.
              setInput((draft) => (draft.trim() === researchFor ? "" : draft));
              return researchProps!.answer(...args);
            }}
            inline={{
              question: researchFor,
              slot: researchSlot,
              close: (note) => {
                setResearchFor(undefined);
                if (note) setNotice(note);
                focusComposer();
              },
            }}
          />
        )}
        {tab === "Account" && (
          <>
            <div className="account-actions">
            {status?.accountId && !status.consumerWorkspace && (
              <button
                onClick={async () => {
                  if (!(await allowReplace())) return;
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
            </div>
            <AccountUsage
              storage={secureOn ? "secure" : "local"}
              chatReady={status?.inference.ready}
              allowance={status?.requestAllowance}
              metering={!!status?.metering}
              refresh={status}
              consumer={status?.consumerWorkspace}
              billing={
                status?.billingRehearsal
                  ? {
                      csrf: status.csrf,
                      onNavigate: async (url) => {
                        if (!(await allowReplace())) return;
                        accessNavigation.current = true;
                        window.location.assign(url);
                      },
                    }
                  : undefined
              }
              busy={!!busy}
              onManage={async () => {
                if (!(await allowReplace())) return;
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
            <p className="intro">{tm(section).savedIntro}</p>
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
            <p className="muted">{tm(mode).titleNote}</p>
            <p role="status">
              {unsaved ? t.unsavedChanges : t.noUnsavedChanges} {t.reloadClears}
            </p>
            {secureReady && section === "secure" && (
              <ConversationLibrary storage="secure" conversations={saved.filter((c) => !inMax(c.id))} busy={!!busy} onOpen={openSaved} onDelete={(c) => void deleteSnapshot(c)} />
            )}
            {/* The vault's own screens: inside the Secure Max section, or as before where Secure Max is not offered. */}
            {maxAvailable && section === "secure" ? null : !unlocked && maxFirst ? (
              <SyncSetup
                storage="max"
                // Not now: back to the normal section; nothing was created.
                onCancel={() => {
                  setSection("secure");
                  goToMessageBox();
                }}
                // Set up meanwhile on another device: this one joins by approval.
                onAlreadySetUp={() => setSyncDismissed(false)}
                onDone={(remember) => {
                  setMaxFirst(false);
                  setNotice(syncText[lang].onDone);
                  void syncOpened(remember).then(() =>
                    requestAnimationFrame(() => {
                      const first = document.querySelector<HTMLElement>(".secure-max-section button");
                      if (first?.checkVisibility()) first.focus();
                      else goToMessageBox();
                    }),
                  );
                }}
              />
            ) : !unlocked ? (
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
                  storage={secureOn ? "max" : "local"}
                  conversations={secureOn ? saved.filter((c) => inMax(c.id)) : saved}
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
            <span>{tm(mode).footerNote}</span>
          </footer>
        )}
      </main>
      {whiteboardEnabled() && side === "board" && tab === "Conversation" && (
        <>
          <div className="side-switch" role="group" aria-label={sidePanelsText[lang].switchLabel}>
            <button type="button" aria-pressed={boardChatView} onClick={() => setBoardChatView(true)}>
              {sidePanelsText[lang].switchChat}
            </button>
            <button type="button" aria-pressed={!boardChatView} onClick={() => setBoardChatView(false)}>
              {sidePanelsText[lang].whiteboard}
            </button>
          </div>
          <WhiteboardPanel
            key={conversation.id}
            board={conversation.board ?? emptyBoard(conversation.createdAt)}
            onChange={(next) => setConversation((c) => ({ ...c, board: next }))}
            onClose={() => setSide(undefined)}
          />
        </>
      )}
      {whiteboardEnabled() && side === "outputs" && tab === "Conversation" && (
        <OutputsPanel
          conversation={conversation}
          onOpenBoard={openBoard}
          onDownloadBoard={() => void downloadBoard()}
          onOpenCanvas={() => setSide("canvas")}
          onShowMessage={(id) => {
            if (matchMedia("(max-width: 1099px)").matches) setSide(undefined);
            document.querySelector(`article[data-message-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: "center" });
          }}
          onOpenFiles={() => {
            setSide(undefined);
            setTab("Context");
          }}
          onClose={() => setSide(undefined)}
        />
      )}
      {canvasEnabled() && canvasOpen && tab === "Conversation" && (
        <CanvasPanel
          storage={storageOf(mode)}
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
      {status?.imageCreation && createImageFor !== undefined && (
        <CreateImageDialog
          open
          initial={createImageFor}
          csrf={status.csrf}
          limit={status.imageCreation.limit}
          used={status.imageCreation.used}
          onClose={() => setCreateImageFor(undefined)}
          onCreated={(image) => {
            setCreateImageFor(undefined);
            const at = new Date().toISOString();
            // The request and the result, so later questions know an image was made; the model sees only its description.
            setConversation((current) => ({
              ...current,
              messages: [
                ...current.messages,
                { ...newMessage("user", `${imageCreationText[lang].menu}: ${image.prompt}`), at },
                { ...newMessage("assistant", imageCreationText[lang].context(image.prompt)), at, status: "complete", createdImage: image },
              ],
            }));
            // One more used today (the server counts too; this keeps the dialog's count right until the next status).
            setStatus((s) => (s?.imageCreation ? { ...s, imageCreation: { ...s.imageCreation, used: (s.imageCreation.used ?? 0) + 1 } } : s));
          }}
        />
      )}
      {imageOpen && status?.images && (
        <ImageQuestion
          maxBytes={status.images.maxBytes}
          thinkingChosen={modeChoice === "thinking"}
          onAttach={setAttachedImage}
          onClose={() => {
            setImageOpen(false);
            setImageFile(undefined);
          }}
          notify={setNotice}
          initialFile={imageFile}
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
