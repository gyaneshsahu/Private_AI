// User-facing text of App.tsx in English and German (glossary: docs/i18n-glossary-20261113.md).
// The English must stay exactly as before; UI tests match it.
import { defineText } from "../i18n";
import type { DisappearAfter } from "../conversation";

const failuresEn: Record<string, string> = {
  stopped: "Stopped by you",
  timeout: "Response timed out",
  incomplete: "Response ended incomplete",
  unavailable: "Protected response unavailable",
  empty: "No answer received",
};
const failuresDe: Record<string, string> = {
  stopped: "Von Ihnen gestoppt",
  timeout: "Zeitüberschreitung bei der Antwort",
  incomplete: "Antwort unvollständig beendet",
  unavailable: "Geschützte Antwort nicht verfügbar",
  empty: "Keine Antwort erhalten",
};

export const appText = defineText({
  en: {
    // Tabs (the heading shows the open tab)
    tabConversation: "Conversation",
    tabContext: "Context",
    tabResearch: "Research",
    tabSaved: "Saved",
    tabAccount: "Account",
    tabHelp: "Help",

    // Notices, progress and errors built in the client
    discardConfirm:
      "Discard unsaved workspace changes? Cancel to keep working or save an encrypted snapshot first.",
    localServiceUnavailable:
      "Local service unavailable. Reload after it is running.",
    vaultChangedElsewhere:
      "Vault changed or locked in another tab. Private content cleared here.",
    newTemporary:
      "New temporary conversation. Previous unsaved content has been cleared.",
    copied: "Answer copied to your clipboard.",
    copyFailed: "Could not copy. Select the answer text and copy it manually.",
    serviceUnavailable: "Service is unavailable.",
    requestFailed: "Request failed.",
    signingOut: "Signing out…",
    signOutUnconfirmed:
      "Sign-out could not be confirmed. Your workspace is still here; try again when the service is available.",
    contextTooLarge:
      "Selected context is too large. Reduce included messages or attachments, or shorten your question. Your draft and conversation are unchanged.",
    preparing: "Preparing private context…",
    usageNotReported:
      "Provider usage was not reported. This request’s cost remains unknown.",
    tryingBackup: "Trying the backup model…",
    responseStopped:
      "Response stopped. Partial answers are excluded from future context.",
    usageRetained: "Reported usage was retained.",
    costUnknown: "This request’s cost remains unknown.",
    retriedOnce: "One automatic retry with the backup model was made.",
    timedOut: (retried: boolean) =>
      `Response timed out. Partial answers are excluded from future context. This request’s cost remains unknown. ${retried ? "One automatic retry with the backup model was made." : "No automatic retry was made."}`,
    protectedUnavailable: (retried: boolean) =>
      `Protected response unavailable. ${retried ? "One automatic retry with the backup model was made." : "No weaker fallback or automatic retry was used."} Check provider verification and service access.`,
    tooManyAttachments:
      "Use at most five attachments, including three screenshots, per conversation.",
    readingOnDevice: "Reading on your device…",
    extractionFailed: "Extraction failed.",
    researchLimit:
      "Remove an attachment before adding more research context (five-item limit).",
    retrieving: "Retrieving the approved public information…",
    searchResultsName: "Public search results",
    publicPageName: "Public page",
    searchAdded: (note: string) =>
      `Search results added to context. Return to Conversation to ask about them. Search results and source links are never saved; if you save this conversation, only your written answers and the approved query are kept, and you can search again later. ${note}`.trim(),
    pageAdded:
      "Public sources added to your selected context. Search excerpts are labelled; pages are fetched only with approval.",
    noSources: "The search returned no sources.",
    researchFailed: "Research failed.",
    waitForAccess: "Wait for service access before opening saved history.",
    unlocking: "Unlocking encrypted history…",
    vaultUnlocked:
      "Vault unlocked on this device. Saving is explicit; temporary chats are not saved automatically.",
    unlockFailed:
      "Could not unlock the vault. Check the passphrase (at least 12 characters).",
    eraseConfirm:
      "Delete every saved conversation and project on this device and lock the vault? This cannot be undone. Downloaded backup files, the secure server's short-term memory and our request records are not affected.",
    erasing: "Deleting everything saved on this device…",
    erased:
      "Everything saved on this device was deleted and the vault is locked. Downloaded backups, the secure server's short-term memory and our request records were not affected.",
    eraseFailed:
      "Deletion did not complete. Close other tabs of this app and try again; nothing was partly deleted.",
    incognitoNotSaved:
      "Incognito chats are never saved. Start a normal chat to keep history.",
    encrypting: "Encrypting your conversation…",
    copyTitle: (title: string) => `${title} (copy)`,
    snapshotSaved:
      "Encrypted snapshot saved on this browser. Later changes require saving again.",
    storageFull:
      "Browser storage is full. Your current work is still open but was not saved. Keep this tab open; free device storage without clearing this site's data, then save again.",
    saveFailed:
      "Save failed. Your current work is still open. Keep this tab open and check that the vault is unlocked before trying again.",
    encryptingBackup: "Encrypting saved backup…",
    backupRequested:
      "Encrypted backup download requested. Check your downloads before relying on it. It needs this vault’s original passphrase; later changes are not included.",
    backupFailed:
      "Backup could not be created. Keep this browser’s data. Unlock the vault, check for unreadable snapshots and the 100-conversation / 10 MiB limits, then try again.",
    updatingProtection: "Updating encrypted vault protection…",
    passphraseChanged:
      "Vault passphrase changed. Unlock with the new passphrase. Saved history was preserved; older downloaded backups still need their original passphrase.",
    passphraseFailed:
      "Passphrase change could not complete. No partial update was applied. Check the current passphrase, unreadable records or changes in another tab. Keep your browser data and existing backups.",
    restoring: "Verifying and restoring encrypted backup…",
    restored: (count: number) =>
      `Restored ${count} saved ${count === 1 ? "conversation" : "conversations"} as new copies. Your open workspace was not changed. The copies use this vault’s passphrase.`,
    restoreFailed:
      "Restore could not complete. Check the original backup passphrase, file integrity and available browser storage. Temporary research and unsupported backups are rejected. Existing snapshots were not overwritten; inspect Saved before trying again.",
    signOutFailed: "Workspace locked. Sign out failed; try again.",
    creatingProject: "Creating encrypted project…",
    projectCreated:
      "Project created in this device’s encrypted vault. Project chats are not automatically included in model context.",
    projectCreateFailed: "Project could not be created.",
    updatingProject: "Updating encrypted project…",
    projectRemoved:
      "Project removed. Its chats were kept without a project; archived chats remain archived.",
    projectRenamed: "Project renamed.",
    projectUpdateFailed: "Project update failed.",
    updatingOrganization: "Updating encrypted organization…",
    organized:
      "Saved chat organization updated. Open drafts still require saving explicitly.",
    organizeFailed: "Organization could not be saved.",
    openedPruned: (removed: number, after: string) =>
      `Opened a saved snapshot. ${removed} message${removed === 1 ? "" : "s"} older than ${after} disappeared from this device.`,
    opened: "Opened a saved snapshot. Save again to keep later changes.",
    incognitoTitle: "Incognito chat",
    branchOpened:
      "Branch opened locally. No request was sent. Save again to keep these changes.",
    branchCreated:
      "New branch created; the original is available in Conversation branches. Choose Answer this question to request a reply. Your draft is unchanged.",
    nothingLeft:
      "Nothing is left of the search text after removing personal details.",
    enterHttps: "Enter a public HTTPS URL.",
    deletingSnapshot: "Deleting encrypted snapshot…",
    snapshotDeleted:
      "Encrypted records and wrapped key deleted. Device backups and exported copies are outside this deletion.",
    deleteFailed: "Deletion failed. Try again after unlocking.",

    // Settings dialog
    settings: "Settings",
    closeSettings: "Close settings",
    settingsSections: "Settings sections",
    sectionAppearance: "Appearance",
    sectionAccount: "Account & security",
    sectionPrivacy: "Privacy & data",
    sectionUsage: "Plan & usage",
    themeSystem: "System theme",
    themeLight: "Light",
    themeDark: "Dark",
    languageLabel: "Language",
    languageNote: "Your language choice is kept only in this browser.",
    appearanceNote:
      "Only this appearance preference is saved outside your encrypted vault. Conversation contents are not included.",
    signedInAccount: (id: string) => `Signed-in account ${id}`,
    localSession: "Local development session. No account is signed in.",
    recoverySeparate:
      "Sign-in recovery and your local vault passphrase are separate. Recovering sign-in does not decrypt a lost vault.",
    accountAndUsage: "Account & usage",
    privacyPolicy: "Privacy policy",
    privacyPolicyLink: "Privacy policy ↗",
    imprint: "Imprint",
    imprintLink: "Imprint ↗",
    privateChatGated:
      "Private chat remains unavailable until provider verification passes. Search results are shown only during a conversation; the written answer is saved with your history.",
    projectsNote:
      "Projects organize local saved chats. They do not automatically send other chats or files to a model.",
    historyControls: "History & data controls",
    gettingStarted: "Getting started",
    guideTitle: "Using CometRow",
    guideText:
      "Start in Conversation. Write a message or use a starter to prepare an editable draft. Nothing sends until you choose Send. This evaluation is for synthetic examples; private chat remains unavailable until its privacy checks pass.\n\nAdd context when you need it. In Context, import DOCX body text, XLSX cell values, a PDF, UTF-8 text, Markdown, data or source-code file, PNG or JPEG. Code is read as text, never executed; spreadsheet formulas are not recalculated. Files are read on your device. Limits: five files (up to three screenshots), 10 MB each, 20 PDF pages; printed German and English text. Review extracted numbers, tables and wording before using them. A scanned PDF is read by OCR, first 5 pages only, and can contain errors. Handwriting is not supported. Select only the context you want included.\n\nSave deliberately. Temporary work disappears on reload. In Saved, create or unlock a vault, then choose Save encrypted snapshot. Save again after changes. Your passphrase cannot be recovered. History stays in this browser unless you explicitly download an encrypted backup in Saved; there is no cloud sync. Restore needs the backup and its original passphrase and adds copies to an unlocked vault. Backups include saved snapshots only, never current unsaved work or temporary research. Deleting browser history does not delete downloaded copies. Locking clears unsaved work. Removing an attachment does not remove its earlier messages or saved snapshots.\n\nResearch is your choice. Review the exact query or public URL before approving it. The research service and recipient can see it; your chat is not added automatically.\n\nStay in control. Stop ends an active response; an incomplete reply is excluded from later context. Retry is a separate request. Copy answer places completed text on your device clipboard; locking the vault does not clear that clipboard. Edit an earlier message to start a new branch. To remove a saved conversation, delete its snapshot in Saved. A new conversation clears the current workspace but does not delete saved snapshots.",
    safetyTitle: "Trial scope and safety",
    safetyText:
      "This initial trial is for adults aged 18 and over. Explicit sexual generation is outside its scope; non-graphic sexual-health, consent and relationship advice are supported. The assistant should refuse help enabling serious harm and respond supportively to distress. These instructions are being evaluated, not a guarantee that every unsafe answer will be prevented. Check important advice; CometRow is not an emergency service and cannot contact help for you. If you are in immediate danger, contact local emergency services or someone you trust. No separate moderation service receives your messages. Private-data chat remains gated until provider privacy qualification passes.",
    privacyBoundariesTitle: "Your privacy boundaries",
    privacyBoundariesLink: "Privacy boundaries ↗",

    // Header and banners
    openNavigation: "Open navigation",
    messageCount: (n: number) => `${n} messages ·`,
    jumpLatest: "Jump to latest ↓",
    shareTitle: "Explicit chat sharing — Coming later",
    share: "Share",
    comingLater: "Coming later",
    conversationActions: "Conversation actions",
    shareChatLater: "Share chat · Coming later",
    renameSave: "Rename, save & manage history",
    includedContext: "Included context",
    conversationFiles: "Conversation files",
    disappearing: "Disappearing messages",
    disappearOff: "Off",
    disappearHour: "After 1 hour",
    disappearDay: "After 1 day",
    disappearWeek: "After 1 week",
    disappearLabel: (after: DisappearAfter) =>
      ({ hour: "1 hour", day: "1 day", week: "1 week" })[after],
    protectedAvailable: "Protected connection available",
    privateNotYet: "Private chat isn’t available yet",
    privacyDetails: "Privacy details",
    privateNotConnected: "Private chat is not connected yet",
    localOnly:
      "Local documents and your vault work here. Messages stay on this device until private chat is switched on.",
    incognitoBannerTitle: "Incognito chat.",
    incognitoBanner:
      "Nothing from this chat is saved on this device; it is gone when you start another chat, lock, reload or sign out. This does not change what the secure server keeps for a short time or the request records we hold.",
    disappearingBannerTitle: "Disappearing messages.",
    disappearingBanner: (after: string) =>
      `Messages older than ${after} are deleted from this device while the chat is open or when you open it again, including from its saved copy. This does not change what the secure server keeps for a short time or the request records we hold.`,
    operatorNoticeTitle: "Notice from CometRow:",
    dismissNotice: "Dismiss notice",
    stop: "Stop",
    importResults: "File import results",
    dismissImports: "Dismiss import results",

    // Empty state
    eyebrow: "A LITTLE CLARITY, ON YOUR TERMS",
    welcomeA: "Make room for",
    welcomeB: "what’s on your mind.",
    welcomeLine1: "Think through a decision. Understand a document.",
    welcomeLine2: "Find the words you’ve been looking for.",
    writeTitle: "Write or revise",
    writeDescription: "Find clear words for what you want to say.",
    writeDraft:
      "Help me write a clear, friendly message. Here’s what I want to say: ",
    planTitle: "Plan something",
    planDescription: "Turn a goal and constraints into next steps.",
    planDraft: "Help me make a practical plan. My goal and constraints are: ",
    documentTitle: "Understand a document",
    documentDescription: "Bring a bill, a letter or a few notes.",

    // Messages
    messageLabel: (user: boolean, n: number) =>
      `${user ? "Your message" : "CometRow reply"} ${n}`,
    you: "You",
    incompleteExcluded: "Incomplete · excluded from context",
    noAnswer: "No answer received",
    keptNote:
      "Placeholders went to the secure server instead; the values were put back here. Not every number is recognised, least of all in photos and scans.",
    failure: (kind: string) =>
      `${failuresEn[kind]}. This attempt is not a completed answer and is excluded from future context.`,
    sourcesChanged: "Sources changed since this answer",
    sourcesChangedText:
      "Reference material changed or was removed after this answer. Its citations open the earlier captured version. Review this answer before using it in a follow-up; deselect the message in Included context to exclude it without deleting it.",
    sourcesUnrecorded: "Original sources unavailable",
    sourcesUnrecordedText:
      "This older answer has no recorded source snapshot. Its citations cannot be matched to the evidence used at the time; current attachments are not substituted.",
    editIntoBranch: "Edit into a new branch",
    edit: "Edit",
    copyAnswer: "Copy answer",
    editedMessage: "Edited message",
    createBranch: "Create branch",
    cancel: "Cancel",

    // Composer
    searchSuggestion: "Search suggestion",
    messageInput: "Message CometRow",
    placeholder: "What would you like to work through?",
    attachFiles: "Attach files to this conversation",
    tools: "Attachments and tools",
    attachFile: "Attach file",
    photoToText: "Photo to text",
    reviewContext: "Review context",
    selectedCount: (n: number) => `${n} selected`,
    planned: "Planned capabilities",
    createImage: "Create image",
    dictation: "Microphone dictation",
    liveVoice: "Live voice conversation",
    photoNote:
      "Photo to text reads printed text on this device and asks for the camera only when you press Use camera; it is not general image understanding. Dictation, live voice, image creation and sharing are not connected: no permissions or media are collected for them.",
    filesNote:
      "Files are read on this device. Review extracted text before sending.",
    answerMode: "Answer mode",
    contextCount: (messages: number, files: number) =>
      `${messages} messages included · ${files} files`,
    dictationLater: "Microphone dictation — Coming later",
    liveVoiceLater: "Live voice — Coming later",
    stopResponse: "Stop response",
    sendLabel: "Send ↑",
    send: "Send",
    attachments: "Conversation attachments",
    included: "Included",
    excluded: "Excluded",
    reviewNamed: (name: string) => `Review ${name}`,
    review: "Review",
    newCharge: "Starts a new request and may incur another charge",
    retryGated: "Retry is unavailable while private chat is gated",
    answerThis: "Answer this question",
    retryLast: "Retry last response",
    answerThinking: "Answer again with Thinking",
    captionVault: "Local vault unlocked · Save explicitly to keep changes",
    captionTemporary: "Temporary chat · Not saved",
    captionAi: "· Answers come from an AI, not a person · Check important answers.",

    // Included context dialog
    closeContext: "Close context",
    attachmentsNote:
      "Attachments are read on this device. Review extracted text before sending. DOCX body text, XLSX cell values, PDF, UTF-8 text, Markdown, data, source code, PNG and JPEG; five files, including up to three screenshots, 10 MB each, 60,000 extracted characters per file and 20 PDF pages. A scanned PDF is read by OCR, first 5 pages only. Images use text extraction, not general image understanding.",
    contextSize: (characters: string, limit?: string) =>
      `Selected input: ${characters} characters${limit ? ` of ${limit}` : " · sending limit unavailable until chat is qualified"}. Includes instructions, selected messages, documents and your draft. This is not a token count. Oversized requests are blocked; history is not silently shortened. There is no indefinite memory.`,
    onlySelected:
      "Only selected context is included. CometRow is an AI system, not a person, and can make mistakes—check important details.",

    // Development calculator (?developmentTools)
    calculator: "Exact decimal calculator",
    calculatorNote:
      "Enter source numbers explicitly. This calculator runs locally; it does not execute model-generated code.",
    firstNumber: "First number",
    operation: "Operation",
    percentChange: "% change",
    secondNumber: "Second number",
    calculate: "Calculate",
    usage: (tokens: number, usd: string) =>
      `Reported inference: ${tokens} tokens · estimated $${usd}. Includes reported usage across all branches. Excludes unreported usage and search charges; incomplete requests may still cost money.`,

    // Context tab
    contextHeadA: "A clearer picture.",
    contextHeadB: "Only what you choose.",
    contextIntro:
      "Import documents locally, review their text, then choose what to include in your next conversation.",
    addDocuments: "Add documents or screenshots",
    formats:
      "DOCX body · XLSX cells · PDF · Text / Markdown / Code · CSV / JSON · PNG / JPEG",
    limits:
      "Up to 10 MB, 60,000 extracted characters and 20 PDF pages per file. A scanned PDF is read by OCR, first 5 pages only. OCR supports printed German and English text. Older .doc and .xls files: save as .docx, .xlsx or PDF first.",
    contextEmpty: "Your context is empty. Files are read on your device.",
    fromLiveSearch: "From a live search",
    liveSearchNote: (date: string) =>
      `From a live search on ${date}. Results and links were not kept; search again to see current sources. The search needs your approval again.`,
    searchAgain: "Search again",
    remove: "Remove",
    pageSuffix: (page: number) => ` · page ${page}`,
    inspectSource: "Inspect source",
    reviewPage: "Review page retrieval",
    correctText: "Review or correct extracted text",
    userEditedShort:
      "User-edited text. This is not an unmodified extraction or verified quotation from the original source.",
    textFor: (title: string, page?: number) =>
      `Text for ${title}${page ? ` page ${page}` : ""}`,
    removeNote:
      "Removing context affects future requests. It cannot retract prior processing or information already present in earlier messages.",

    // Research tab
    researchHeadA: "Explore the public web.",
    researchHeadB: "Keep the choice yours.",
    researchNote:
      "Search results and source links are shown only during this session and are never saved. Saving keeps your written answers and the approved search text. Use public, non-sensitive queries only.",
    sourcesQuestion: (question?: string) =>
      `Using the selected web sources, answer: ${question ?? "What do these sources establish?"} Cite evidence beside each factual claim and explain missing or conflicting evidence.`,
    prepareQuestion: "Prepare a question about these sources",
    prepareNote:
      "Opens your existing draft, or prepares an editable question. Nothing is sent automatically.",
    answersUnavailable:
      " AI answers are currently unavailable while provider verification is incomplete.",
    researchMethod: "Research method",
    publicSearch: "Public search",
    readPage: "Read a public page",
    exactQuery: "Exact search query",
    exactUrl: "Exact HTTPS URL",
    searchNeedsAccess:
      "Search needs service access. No search request can be sent yet.",
    pageDomains: (hosts: string) =>
      `Available page domains in this workspace: ${hosts}. Other domains remain blocked.`,
    noneConfigured: "none configured yet",
    reviewDisclosure: "Review disclosure",
    confirmDisclosure: "Confirm external disclosure",
    approvalEyebrow: "YOUR APPROVAL IS REQUIRED",
    shareOnly: (search: boolean) =>
      `Share only this ${search ? "query" : "URL"}?`,
    editAbove: "Edit the search text above if you need something else searched.",
    recipient: (who: string) =>
      `Recipient: ${who}, through CometRow’s research service. Their retention policies apply. No private chat or attachment is included automatically.`,
    pageExact:
      " The page address is sent exactly as shown; personal details in it are not removed.",
    approve: "Approve and retrieve",

    // Account tab
    changePassword: "Change sign-in password",
    signOut: "Sign out",

    // Saved tab
    savedHeadA: "A place for things",
    savedHeadB: "worth coming back to.",
    savedIntro:
      "Optional encrypted snapshots, stored only in this browser. No cloud sync and no password recovery. You can download an encrypted backup.",
    titleLabel: "Conversation title",
    titleNote:
      "Name the current conversation, then save explicitly. Titles are encrypted with the saved conversation.",
    unsavedChanges:
      "Unsaved workspace changes. Save explicitly to keep your draft and documents.",
    noUnsavedChanges: "No unsaved workspace changes.",
    reloadClears:
      "Reloading clears temporary work. Locking clears the workspace even when changes are unsaved.",
    passphrase: "Vault passphrase",
    passphraseNote:
      "Use at least 12 characters. Your first unlock creates the vault. Losing the passphrase loses access. Clearing browser storage loses history unless you have an encrypted backup and its original passphrase.",
    createOrUnlock: "Create or unlock vault",
    saveSnapshot: "Save encrypted snapshot",
    saveAsNew: "Save as new conversation",
    researchNotSaved:
      "Search results and source links are never saved. Saving keeps your written answers and the approved search text; the reopened conversation says it came from a live search and offers to search again for current sources.",
    lockAndClear: "Lock and clear workspace",
    deleteAll: "Delete everything on this device",
    deleteAllText:
      "Removes every saved conversation and project in this browser and locks the vault. It cannot be undone, and it does not reach encrypted backup files you downloaded. It cannot delete the secure server's short-term working memory, which clears on its own, or our request records (which account asked, when, how many times, model, published cost). To close your account as well, use the account page.",
    whatDelete: "What you can and cannot delete ↗",
    unreadable: (n: number) =>
      `${n} saved ${n === 1 ? "snapshot could" : "snapshots could"} not be read. Unreadable records remain stored unchanged. Other snapshots are available. Do not clear this browser's storage if you want to preserve them.`,
    noSaved: "No saved conversations yet. Saving is always your choice.",
    footer: "Personal help. Sharing under your control.",
    footerNote: "Built for a bounded evaluation.",

    // Source dialog
    closeSource: "Close source",
    sourceUrl: "Source URL:",
    retrieved: (when?: string) => `· Retrieved: ${when ?? ""}`,
    providerDate: (date: string) =>
      `Provider-reported page date: ${date} (not verified as publication or event date).`,
    evidence: (kind: string) =>
      `Evidence: ${kind}. Retrieved material may be incomplete.`,
    userEditedLong:
      "User-edited text; not an unmodified extraction or verified quotation from the original source.",
    close: "Close",
  },
  de: {
    tabConversation: "Unterhaltung",
    tabContext: "Kontext",
    tabResearch: "Recherche",
    tabSaved: "Gespeichert",
    tabAccount: "Konto",
    tabHelp: "Hilfe",

    discardConfirm:
      "Ungespeicherte Änderungen verwerfen? Wählen Sie Abbrechen, um weiterzuarbeiten oder zuerst einen verschlüsselten Speicherstand anzulegen.",
    localServiceUnavailable:
      "Der lokale Dienst ist nicht erreichbar. Laden Sie die Seite neu, sobald er läuft.",
    vaultChangedElsewhere:
      "Der Tresor wurde in einem anderen Tab geändert oder gesperrt. Private Inhalte wurden hier entfernt.",
    newTemporary:
      "Neue vorübergehende Unterhaltung. Bisherige ungespeicherte Inhalte wurden entfernt.",
    copied: "Antwort in die Zwischenablage kopiert.",
    copyFailed:
      "Kopieren nicht möglich. Markieren Sie den Antworttext und kopieren Sie ihn selbst.",
    serviceUnavailable: "Der Dienst ist nicht verfügbar.",
    requestFailed: "Die Anfrage ist fehlgeschlagen.",
    signingOut: "Sie werden abgemeldet …",
    signOutUnconfirmed:
      "Die Abmeldung konnte nicht bestätigt werden. Ihr Arbeitsbereich ist noch da; versuchen Sie es erneut, wenn der Dienst verfügbar ist.",
    contextTooLarge:
      "Der ausgewählte Kontext ist zu groß. Nehmen Sie weniger Nachrichten oder Anhänge auf oder kürzen Sie Ihre Frage. Ihr Entwurf und die Unterhaltung bleiben unverändert.",
    preparing: "Privater Kontext wird vorbereitet …",
    usageNotReported:
      "Der Anbieter hat keinen Verbrauch gemeldet. Die Kosten dieser Anfrage bleiben unbekannt.",
    tryingBackup: "Das Ersatzmodell wird versucht …",
    responseStopped:
      "Antwort gestoppt. Unvollständige Antworten werden nicht in den weiteren Kontext übernommen.",
    usageRetained: "Der gemeldete Verbrauch wurde übernommen.",
    costUnknown: "Die Kosten dieser Anfrage bleiben unbekannt.",
    retriedOnce: "Es wurde einmal automatisch mit dem Ersatzmodell wiederholt.",
    timedOut: (retried: boolean) =>
      `Zeitüberschreitung bei der Antwort. Unvollständige Antworten werden nicht in den weiteren Kontext übernommen. Die Kosten dieser Anfrage bleiben unbekannt. ${retried ? "Es wurde einmal automatisch mit dem Ersatzmodell wiederholt." : "Es wurde nicht automatisch wiederholt."}`,
    protectedUnavailable: (retried: boolean) =>
      `Geschützte Antwort nicht verfügbar. ${retried ? "Es wurde einmal automatisch mit dem Ersatzmodell wiederholt." : "Es wurde weder auf eine schwächere Lösung ausgewichen noch automatisch wiederholt."} Prüfen Sie die Überprüfung des Anbieters und den Zugang zum Dienst.`,
    tooManyAttachments:
      "Verwenden Sie höchstens fünf Anhänge pro Unterhaltung, davon höchstens drei Bildschirmfotos.",
    readingOnDevice: "Wird auf Ihrem Gerät gelesen …",
    extractionFailed: "Das Auslesen ist fehlgeschlagen.",
    researchLimit:
      "Entfernen Sie einen Anhang, bevor Sie weitere Rechercheergebnisse hinzufügen (höchstens fünf).",
    retrieving: "Die freigegebenen öffentlichen Informationen werden abgerufen …",
    searchResultsName: "Öffentliche Suchergebnisse",
    publicPageName: "Öffentliche Seite",
    searchAdded: (note: string) =>
      `Suchergebnisse wurden dem Kontext hinzugefügt. Kehren Sie zur Unterhaltung zurück, um Fragen dazu zu stellen. Suchergebnisse und Quellenlinks werden nie gespeichert; wenn Sie diese Unterhaltung speichern, bleiben nur Ihre geschriebenen Antworten und die freigegebene Suchanfrage erhalten, und Sie können später erneut suchen. ${note}`.trim(),
    pageAdded:
      "Öffentliche Quellen wurden Ihrem ausgewählten Kontext hinzugefügt. Auszüge aus der Suche sind gekennzeichnet; Seiten werden nur mit Ihrer Freigabe abgerufen.",
    noSources: "Die Suche hat keine Quellen ergeben.",
    researchFailed: "Die Recherche ist fehlgeschlagen.",
    waitForAccess:
      "Warten Sie auf den Zugang zum Dienst, bevor Sie den gespeicherten Verlauf öffnen.",
    unlocking: "Verschlüsselter Verlauf wird entsperrt …",
    vaultUnlocked:
      "Tresor auf diesem Gerät entsperrt. Gespeichert wird nur auf Ihren Wunsch; vorübergehende Chats werden nicht automatisch gespeichert.",
    unlockFailed:
      "Der Tresor konnte nicht entsperrt werden. Prüfen Sie die Passphrase (mindestens 12 Zeichen).",
    eraseConfirm:
      "Alle gespeicherten Unterhaltungen und Projekte auf diesem Gerät löschen und den Tresor sperren? Das kann nicht rückgängig gemacht werden. Heruntergeladene Sicherungsdateien, der Kurzzeitspeicher des sicheren Servers und unsere Aufzeichnungen über Anfragen sind nicht betroffen.",
    erasing: "Alles auf diesem Gerät Gespeicherte wird gelöscht …",
    erased:
      "Alles auf diesem Gerät Gespeicherte wurde gelöscht und der Tresor ist gesperrt. Heruntergeladene Sicherungen, der Kurzzeitspeicher des sicheren Servers und unsere Aufzeichnungen über Anfragen waren nicht betroffen.",
    eraseFailed:
      "Das Löschen wurde nicht abgeschlossen. Schließen Sie andere Tabs dieser App und versuchen Sie es erneut; es wurde nichts teilweise gelöscht.",
    incognitoNotSaved:
      "Inkognito-Chats werden nie gespeichert. Starten Sie einen normalen Chat, um den Verlauf zu behalten.",
    encrypting: "Ihre Unterhaltung wird verschlüsselt …",
    copyTitle: (title: string) => `${title} (Kopie)`,
    snapshotSaved:
      "Verschlüsselter Speicherstand in diesem Browser gespeichert. Spätere Änderungen müssen erneut gespeichert werden.",
    storageFull:
      "Der Browserspeicher ist voll. Ihre aktuelle Arbeit ist noch geöffnet, wurde aber nicht gespeichert. Lassen Sie diesen Tab offen, geben Sie Speicher auf dem Gerät frei, ohne die Daten dieser Website zu löschen, und speichern Sie dann erneut.",
    saveFailed:
      "Speichern fehlgeschlagen. Ihre aktuelle Arbeit ist noch geöffnet. Lassen Sie diesen Tab offen und prüfen Sie, ob der Tresor entsperrt ist, bevor Sie es erneut versuchen.",
    encryptingBackup: "Sicherung wird verschlüsselt …",
    backupRequested:
      "Download der verschlüsselten Sicherung angefordert. Prüfen Sie Ihre Downloads, bevor Sie sich darauf verlassen. Die Sicherung benötigt die ursprüngliche Passphrase dieses Tresors; spätere Änderungen sind nicht enthalten.",
    backupFailed:
      "Die Sicherung konnte nicht erstellt werden. Behalten Sie die Daten dieses Browsers. Entsperren Sie den Tresor, prüfen Sie auf unlesbare Speicherstände und die Grenzen von 100 Unterhaltungen / 10 MiB und versuchen Sie es dann erneut.",
    updatingProtection: "Schutz des verschlüsselten Tresors wird aktualisiert …",
    passphraseChanged:
      "Passphrase des Tresors geändert. Entsperren Sie mit der neuen Passphrase. Der gespeicherte Verlauf ist erhalten; ältere heruntergeladene Sicherungen benötigen weiterhin ihre ursprüngliche Passphrase.",
    passphraseFailed:
      "Die Passphrase konnte nicht geändert werden. Es wurde nichts teilweise geändert. Prüfen Sie die aktuelle Passphrase, unlesbare Einträge oder Änderungen in einem anderen Tab. Behalten Sie Ihre Browserdaten und vorhandenen Sicherungen.",
    restoring: "Verschlüsselte Sicherung wird geprüft und wiederhergestellt …",
    restored: (count: number) =>
      `${count} gespeicherte ${count === 1 ? "Unterhaltung" : "Unterhaltungen"} als neue Kopien wiederhergestellt. Ihr geöffneter Arbeitsbereich wurde nicht geändert. Die Kopien verwenden die Passphrase dieses Tresors.`,
    restoreFailed:
      "Die Wiederherstellung wurde nicht abgeschlossen. Prüfen Sie die ursprüngliche Passphrase der Sicherung, ob die Datei unbeschädigt ist und ob genug Browserspeicher frei ist. Vorübergehende Recherche und nicht unterstützte Sicherungen werden abgelehnt. Vorhandene Speicherstände wurden nicht überschrieben; sehen Sie unter Gespeichert nach, bevor Sie es erneut versuchen.",
    signOutFailed:
      "Arbeitsbereich gesperrt. Die Abmeldung ist fehlgeschlagen; versuchen Sie es erneut.",
    creatingProject: "Verschlüsseltes Projekt wird erstellt …",
    projectCreated:
      "Projekt im verschlüsselten Tresor dieses Geräts erstellt. Chats eines Projekts werden nicht automatisch in den Kontext des Modells aufgenommen.",
    projectCreateFailed: "Das Projekt konnte nicht erstellt werden.",
    updatingProject: "Verschlüsseltes Projekt wird aktualisiert …",
    projectRemoved:
      "Projekt entfernt. Seine Chats bleiben ohne Projekt erhalten; archivierte Chats bleiben archiviert.",
    projectRenamed: "Projekt umbenannt.",
    projectUpdateFailed: "Das Projekt konnte nicht aktualisiert werden.",
    updatingOrganization: "Ordnung wird verschlüsselt gespeichert …",
    organized:
      "Ordnung der gespeicherten Chats aktualisiert. Offene Entwürfe müssen weiterhin ausdrücklich gespeichert werden.",
    organizeFailed: "Die Ordnung konnte nicht gespeichert werden.",
    openedPruned: (removed: number, after: string) =>
      `Gespeicherten Stand geöffnet. ${removed} ${removed === 1 ? "Nachricht" : "Nachrichten"} älter als ${after} ${removed === 1 ? "wurde" : "wurden"} von diesem Gerät gelöscht.`,
    opened:
      "Gespeicherten Stand geöffnet. Speichern Sie erneut, um spätere Änderungen zu behalten.",
    incognitoTitle: "Inkognito-Chat",
    branchOpened:
      "Zweig lokal geöffnet. Es wurde keine Anfrage gesendet. Speichern Sie erneut, um diese Änderungen zu behalten.",
    branchCreated:
      "Neuer Zweig erstellt; das Original finden Sie bei den Zweigen der Unterhaltung. Wählen Sie „Diese Frage beantworten“, um eine Antwort anzufordern. Ihr Entwurf bleibt unverändert.",
    nothingLeft:
      "Nach dem Entfernen persönlicher Angaben bleibt vom Suchtext nichts übrig.",
    enterHttps: "Geben Sie eine öffentliche HTTPS-Adresse ein.",
    deletingSnapshot: "Verschlüsselter Speicherstand wird gelöscht …",
    snapshotDeleted:
      "Verschlüsselte Einträge und der zugehörige Schlüssel wurden gelöscht. Sicherungen des Geräts und exportierte Kopien sind davon nicht betroffen.",
    deleteFailed:
      "Löschen fehlgeschlagen. Versuchen Sie es nach dem Entsperren erneut.",

    settings: "Einstellungen",
    closeSettings: "Einstellungen schließen",
    settingsSections: "Bereiche der Einstellungen",
    sectionAppearance: "Darstellung",
    sectionAccount: "Konto & Sicherheit",
    sectionPrivacy: "Datenschutz & Daten",
    sectionUsage: "Tarif & Nutzung",
    themeSystem: "Wie im System",
    themeLight: "Hell",
    themeDark: "Dunkel",
    languageLabel: "Sprache",
    languageNote: "Ihre Sprachwahl wird nur in diesem Browser gespeichert.",
    appearanceNote:
      "Nur diese Einstellung zur Darstellung wird außerhalb Ihres verschlüsselten Tresors gespeichert. Inhalte von Unterhaltungen gehören nicht dazu.",
    signedInAccount: (id: string) => `Angemeldetes Konto ${id}`,
    localSession: "Lokale Entwicklungssitzung. Es ist kein Konto angemeldet.",
    recoverySeparate:
      "Die Wiederherstellung der Anmeldung und die Passphrase Ihres lokalen Tresors sind getrennt. Eine wiederhergestellte Anmeldung entschlüsselt keinen verlorenen Tresor.",
    accountAndUsage: "Konto & Nutzung",
    privacyPolicy: "Datenschutzerklärung",
    privacyPolicyLink: "Datenschutzerklärung ↗",
    imprint: "Impressum",
    imprintLink: "Impressum ↗",
    privateChatGated:
      "Der private Chat bleibt nicht verfügbar, bis die Überprüfung des Anbieters bestanden ist. Suchergebnisse werden nur während einer Unterhaltung angezeigt; die geschriebene Antwort wird mit Ihrem Verlauf gespeichert.",
    projectsNote:
      "Projekte ordnen lokal gespeicherte Chats. Sie senden andere Chats oder Dateien nicht automatisch an ein Modell.",
    historyControls: "Verlauf & Datenverwaltung",
    gettingStarted: "Erste Schritte",
    guideTitle: "CometRow verwenden",
    guideText:
      "Beginnen Sie in der Unterhaltung. Schreiben Sie eine Nachricht oder nutzen Sie einen Vorschlag, um einen bearbeitbaren Entwurf vorzubereiten. Gesendet wird erst, wenn Sie Senden wählen. Diese Erprobung ist für ausgedachte Beispiele gedacht; der private Chat bleibt nicht verfügbar, bis seine Datenschutzprüfungen bestanden sind.\n\nFügen Sie Kontext hinzu, wenn Sie ihn brauchen. Unter Kontext können Sie Fließtext aus DOCX, Zellwerte aus XLSX, ein PDF, UTF-8-Text, Markdown-, Daten- oder Quellcodedateien, PNG oder JPEG importieren. Code wird als Text gelesen, nie ausgeführt; Formeln in Tabellen werden nicht neu berechnet. Dateien werden auf Ihrem Gerät gelesen. Grenzen: fünf Dateien (davon bis zu drei Bildschirmfotos), je 10 MB, 20 PDF-Seiten; gedruckter deutscher und englischer Text. Prüfen Sie ausgelesene Zahlen, Tabellen und Formulierungen, bevor Sie sie verwenden. Ein gescanntes PDF wird per Texterkennung gelesen, nur die ersten 5 Seiten, und kann Fehler enthalten. Handschrift wird nicht unterstützt. Wählen Sie nur den Kontext aus, der einbezogen werden soll.\n\nSpeichern Sie bewusst. Vorübergehende Arbeit verschwindet beim Neuladen. Legen Sie unter Gespeichert einen Tresor an oder entsperren Sie ihn und wählen Sie dann Verschlüsselt speichern. Speichern Sie nach Änderungen erneut. Ihre Passphrase kann nicht wiederhergestellt werden. Der Verlauf bleibt in diesem Browser, außer Sie laden unter Gespeichert ausdrücklich eine verschlüsselte Sicherung herunter; es gibt keine Synchronisierung über eine Cloud. Zum Wiederherstellen brauchen Sie die Sicherung und ihre ursprüngliche Passphrase; die Kopien werden einem entsperrten Tresor hinzugefügt. Sicherungen enthalten nur gespeicherte Stände, nie ungespeicherte Arbeit oder vorübergehende Recherche. Das Löschen des Browserverlaufs löscht keine heruntergeladenen Kopien. Sperren entfernt ungespeicherte Arbeit. Das Entfernen eines Anhangs entfernt weder frühere Nachrichten dazu noch gespeicherte Stände.\n\nRecherche ist Ihre Entscheidung. Prüfen Sie die genaue Suchanfrage oder öffentliche Adresse, bevor Sie sie freigeben. Der Recherchedienst und der Empfänger können sie sehen; Ihr Chat wird nicht automatisch hinzugefügt.\n\nSie behalten die Kontrolle. Stoppen beendet eine laufende Antwort; eine unvollständige Antwort wird nicht in den späteren Kontext übernommen. Erneutes Anfragen ist eine eigene Anfrage. Antwort kopieren legt den fertigen Text in die Zwischenablage Ihres Geräts; das Sperren des Tresors leert diese Zwischenablage nicht. Bearbeiten Sie eine frühere Nachricht, um einen neuen Zweig zu beginnen. Um eine gespeicherte Unterhaltung zu entfernen, löschen Sie ihren Speicherstand unter Gespeichert. Eine neue Unterhaltung leert den aktuellen Arbeitsbereich, löscht aber keine gespeicherten Stände.",
    safetyTitle: "Umfang und Sicherheit der Testphase",
    safetyText:
      "Diese erste Testphase ist für Erwachsene ab 18 Jahren. Das Erzeugen expliziter sexueller Inhalte gehört nicht dazu; nicht explizite Ratschläge zu sexueller Gesundheit, Einvernehmen und Beziehungen werden unterstützt. Der Assistent soll Hilfe ablehnen, die ernsthaften Schaden ermöglicht, und auf Belastung unterstützend reagieren. Diese Anweisungen werden erprobt; sie garantieren nicht, dass jede unsichere Antwort verhindert wird. Prüfen Sie wichtige Ratschläge; CometRow ist kein Notdienst und kann keine Hilfe für Sie rufen. Wenn Sie in unmittelbarer Gefahr sind, wenden Sie sich an den örtlichen Notruf oder an eine Person Ihres Vertrauens. Kein gesonderter Moderationsdienst erhält Ihre Nachrichten. Der Chat mit privaten Daten bleibt gesperrt, bis die Datenschutzprüfung des Anbieters bestanden ist.",
    privacyBoundariesTitle: "Ihre Datenschutzgrenzen",
    privacyBoundariesLink: "Datenschutzgrenzen ↗",

    openNavigation: "Navigation öffnen",
    messageCount: (n: number) => `${n} Nachrichten ·`,
    jumpLatest: "Zur neuesten Nachricht ↓",
    shareTitle: "Chats ausdrücklich teilen – folgt später",
    share: "Teilen",
    comingLater: "Folgt später",
    conversationActions: "Aktionen für die Unterhaltung",
    shareChatLater: "Chat teilen · Folgt später",
    renameSave: "Umbenennen, speichern & Verlauf verwalten",
    includedContext: "Einbezogener Kontext",
    conversationFiles: "Dateien der Unterhaltung",
    disappearing: "Selbstlöschende Nachrichten",
    disappearOff: "Aus",
    disappearHour: "Nach 1 Stunde",
    disappearDay: "Nach 1 Tag",
    disappearWeek: "Nach 1 Woche",
    disappearLabel: (after: DisappearAfter) =>
      ({ hour: "1 Stunde", day: "1 Tag", week: "1 Woche" })[after],
    protectedAvailable: "Geschützte Verbindung verfügbar",
    privateNotYet: "Der private Chat ist noch nicht verfügbar",
    privacyDetails: "Details zum Datenschutz",
    privateNotConnected: "Der private Chat ist noch nicht verbunden",
    localOnly:
      "Lokale Dokumente und Ihr Tresor funktionieren hier. Nachrichten bleiben auf diesem Gerät, bis der private Chat eingeschaltet ist.",
    incognitoBannerTitle: "Inkognito-Chat.",
    incognitoBanner:
      "Nichts aus diesem Chat wird auf diesem Gerät gespeichert; er ist weg, sobald Sie einen anderen Chat beginnen, sperren, neu laden oder sich abmelden. Das ändert nichts daran, was der sichere Server kurzzeitig behält, und nichts an unseren Aufzeichnungen über Anfragen.",
    disappearingBannerTitle: "Selbstlöschende Nachrichten.",
    disappearingBanner: (after: string) =>
      `Nachrichten, die älter als ${after} sind, werden von diesem Gerät gelöscht, solange der Chat geöffnet ist oder wenn Sie ihn wieder öffnen, auch aus der gespeicherten Kopie. Das ändert nichts daran, was der sichere Server kurzzeitig behält, und nichts an unseren Aufzeichnungen über Anfragen.`,
    operatorNoticeTitle: "Hinweis von CometRow:",
    dismissNotice: "Hinweis schließen",
    stop: "Stoppen",
    importResults: "Ergebnisse des Dateiimports",
    dismissImports: "Importergebnisse schließen",

    eyebrow: "ETWAS KLARHEIT, NACH IHREN REGELN",
    welcomeA: "Raum schaffen für das,",
    welcomeB: "was Sie beschäftigt.",
    welcomeLine1: "Eine Entscheidung durchdenken. Ein Dokument verstehen.",
    welcomeLine2: "Die Worte finden, nach denen Sie suchen.",
    writeTitle: "Schreiben oder überarbeiten",
    writeDescription: "Klare Worte für das finden, was Sie sagen möchten.",
    writeDraft:
      "Ich möchte eine klare, freundliche Nachricht schreiben. Das möchte ich sagen: ",
    planTitle: "Etwas planen",
    planDescription: "Aus einem Ziel und Rahmenbedingungen nächste Schritte machen.",
    planDraft:
      "Ich brauche einen praktischen Plan. Mein Ziel und meine Rahmenbedingungen: ",
    documentTitle: "Ein Dokument verstehen",
    documentDescription: "Eine Rechnung, einen Brief oder ein paar Notizen mitbringen.",

    messageLabel: (user: boolean, n: number) =>
      `${user ? "Ihre Nachricht" : "Antwort von CometRow"} ${n}`,
    you: "Sie",
    incompleteExcluded: "Unvollständig · nicht im Kontext",
    noAnswer: "Keine Antwort erhalten",
    keptNote:
      "Stattdessen gingen Platzhalter an den sicheren Server; die Werte wurden hier wieder eingesetzt. Nicht jede Zahl wird erkannt, am wenigsten in Fotos und Scans.",
    failure: (kind: string) =>
      `${failuresDe[kind]}. Dieser Versuch ist keine vollständige Antwort und wird nicht in den weiteren Kontext übernommen.`,
    sourcesChanged: "Quellen seit dieser Antwort geändert",
    sourcesChangedText:
      "Das Referenzmaterial wurde nach dieser Antwort geändert oder entfernt. Ihre Quellenangaben öffnen die früher erfasste Fassung. Prüfen Sie diese Antwort, bevor Sie sie in einer Folgefrage verwenden; wählen Sie die Nachricht unter Einbezogener Kontext ab, um sie auszuschließen, ohne sie zu löschen.",
    sourcesUnrecorded: "Ursprüngliche Quellen nicht verfügbar",
    sourcesUnrecordedText:
      "Für diese ältere Antwort ist kein Stand der Quellen gespeichert. Ihre Quellenangaben lassen sich nicht den damals verwendeten Belegen zuordnen; aktuelle Anhänge werden nicht ersatzweise verwendet.",
    editIntoBranch: "In einem neuen Zweig bearbeiten",
    edit: "Bearbeiten",
    copyAnswer: "Antwort kopieren",
    editedMessage: "Bearbeitete Nachricht",
    createBranch: "Zweig erstellen",
    cancel: "Abbrechen",

    searchSuggestion: "Suchvorschlag",
    messageInput: "Nachricht an CometRow",
    placeholder: "Was möchten Sie durchdenken?",
    attachFiles: "Dateien an diese Unterhaltung anhängen",
    tools: "Anhänge und Werkzeuge",
    attachFile: "Datei anhängen",
    photoToText: "Foto zu Text",
    reviewContext: "Kontext prüfen",
    selectedCount: (n: number) => `${n} ausgewählt`,
    planned: "Geplante Funktionen",
    createImage: "Bild erstellen",
    dictation: "Diktieren per Mikrofon",
    liveVoice: "Gespräch per Stimme",
    photoNote:
      "Foto zu Text liest gedruckten Text auf diesem Gerät und fragt erst nach der Kamera, wenn Sie „Kamera verwenden“ drücken; Bilder werden darüber hinaus nicht verstanden. Diktieren, Gespräche per Stimme, Bilderstellung und Teilen sind nicht angebunden: Dafür werden keine Berechtigungen oder Medien erfasst.",
    filesNote:
      "Dateien werden auf diesem Gerät gelesen. Prüfen Sie den ausgelesenen Text vor dem Senden.",
    answerMode: "Antwortmodus",
    contextCount: (messages: number, files: number) =>
      `${messages} Nachrichten einbezogen · ${files} Dateien`,
    dictationLater: "Diktieren per Mikrofon – folgt später",
    liveVoiceLater: "Gespräch per Stimme – folgt später",
    stopResponse: "Antwort stoppen",
    sendLabel: "Senden ↑",
    send: "Senden",
    attachments: "Anhänge der Unterhaltung",
    included: "Einbezogen",
    excluded: "Ausgeschlossen",
    reviewNamed: (name: string) => `${name} prüfen`,
    review: "Prüfen",
    newCharge: "Startet eine neue Anfrage und kann weitere Kosten verursachen",
    retryGated:
      "Erneutes Anfragen ist nicht möglich, solange der private Chat gesperrt ist",
    answerThis: "Diese Frage beantworten",
    retryLast: "Letzte Antwort neu anfordern",
    answerThinking: "Gründlich neu beantworten",
    captionVault:
      "Lokaler Tresor entsperrt · Speichern Sie ausdrücklich, um Änderungen zu behalten",
    captionTemporary: "Vorübergehender Chat · Nicht gespeichert",
    captionAi:
      "· Antworten stammen von einer KI, nicht von einem Menschen · Prüfen Sie wichtige Antworten.",

    closeContext: "Kontext schließen",
    attachmentsNote:
      "Anhänge werden auf diesem Gerät gelesen. Prüfen Sie den ausgelesenen Text vor dem Senden. Fließtext aus DOCX, Zellwerte aus XLSX, PDF, UTF-8-Text, Markdown, Daten, Quellcode, PNG und JPEG; fünf Dateien, davon bis zu drei Bildschirmfotos, je 10 MB, 60.000 ausgelesene Zeichen pro Datei und 20 PDF-Seiten. Ein gescanntes PDF wird per Texterkennung gelesen, nur die ersten 5 Seiten. Aus Bildern wird nur Text ausgelesen; ihr übriger Inhalt wird nicht verstanden.",
    contextSize: (characters: string, limit?: string) =>
      `Ausgewählte Eingabe: ${characters} Zeichen${limit ? ` von ${limit}` : " · die Sendegrenze ist erst bekannt, wenn der Chat geprüft ist"}. Enthält Anweisungen, ausgewählte Nachrichten, Dokumente und Ihren Entwurf. Das ist keine Zählung von Tokens. Zu große Anfragen werden blockiert; der Verlauf wird nicht stillschweigend gekürzt. Es gibt kein unbegrenztes Gedächtnis.`,
    onlySelected:
      "Nur der ausgewählte Kontext wird einbezogen. CometRow ist ein KI-System, kein Mensch, und kann Fehler machen – prüfen Sie wichtige Angaben.",

    calculator: "Genauer Dezimalrechner",
    calculatorNote:
      "Geben Sie die Ausgangszahlen ausdrücklich ein. Dieser Rechner läuft lokal; er führt keinen vom Modell erzeugten Code aus.",
    firstNumber: "Erste Zahl",
    operation: "Rechenart",
    percentChange: "% Veränderung",
    secondNumber: "Zweite Zahl",
    calculate: "Berechnen",
    usage: (tokens: number, usd: string) =>
      `Gemeldete Nutzung des Modells: ${tokens} Tokens · geschätzt ${usd} USD. Enthält die gemeldete Nutzung aller Zweige. Nicht enthalten sind nicht gemeldete Nutzung und Suchkosten; auch unvollständige Anfragen können Geld kosten.`,

    contextHeadA: "Ein klareres Bild.",
    contextHeadB: "Nur mit dem, was Sie auswählen.",
    contextIntro:
      "Importieren Sie Dokumente lokal, prüfen Sie ihren Text und wählen Sie dann aus, was in Ihre nächste Unterhaltung einfließt.",
    addDocuments: "Dokumente oder Bildschirmfotos hinzufügen",
    formats:
      "DOCX-Text · XLSX-Zellen · PDF · Text / Markdown / Code · CSV / JSON · PNG / JPEG",
    limits:
      "Bis zu 10 MB, 60.000 ausgelesene Zeichen und 20 PDF-Seiten pro Datei. Ein gescanntes PDF wird per Texterkennung gelesen, nur die ersten 5 Seiten. Die Texterkennung unterstützt gedruckten deutschen und englischen Text. Ältere .doc- und .xls-Dateien: zuerst als .docx, .xlsx oder PDF speichern.",
    contextEmpty: "Ihr Kontext ist leer. Dateien werden auf Ihrem Gerät gelesen.",
    fromLiveSearch: "Aus einer Websuche",
    liveSearchNote: (date: string) =>
      `Aus einer Websuche am ${date}. Ergebnisse und Links wurden nicht behalten; suchen Sie erneut, um aktuelle Quellen zu sehen. Die Suche braucht erneut Ihre Freigabe.`,
    searchAgain: "Erneut suchen",
    remove: "Entfernen",
    pageSuffix: (page: number) => ` · Seite ${page}`,
    inspectSource: "Quelle ansehen",
    reviewPage: "Abruf der Seite prüfen",
    correctText: "Ausgelesenen Text prüfen oder korrigieren",
    userEditedShort:
      "Von Ihnen bearbeiteter Text. Das ist keine unveränderte Auslesung und kein geprüftes Zitat aus der Originalquelle.",
    textFor: (title: string, page?: number) =>
      `Text für ${title}${page ? ` Seite ${page}` : ""}`,
    removeNote:
      "Das Entfernen von Kontext wirkt sich auf künftige Anfragen aus. Bereits erfolgte Verarbeitung oder Informationen in früheren Nachrichten lassen sich damit nicht zurücknehmen.",

    researchHeadA: "Das öffentliche Web erkunden.",
    researchHeadB: "Die Entscheidung bleibt bei Ihnen.",
    researchNote:
      "Suchergebnisse und Quellenlinks werden nur in dieser Sitzung angezeigt und nie gespeichert. Beim Speichern bleiben Ihre geschriebenen Antworten und der freigegebene Suchtext erhalten. Verwenden Sie nur öffentliche, nicht sensible Suchanfragen.",
    sourcesQuestion: (question?: string) =>
      `Antwort anhand der ausgewählten Webquellen auf: ${question ?? "Was belegen diese Quellen?"} Bitte bei jeder Tatsachenbehauptung den Beleg nennen und fehlende oder widersprüchliche Belege erklären.`,
    prepareQuestion: "Eine Frage zu diesen Quellen vorbereiten",
    prepareNote:
      "Öffnet Ihren vorhandenen Entwurf oder bereitet eine bearbeitbare Frage vor. Es wird nichts automatisch gesendet.",
    answersUnavailable:
      " KI-Antworten sind derzeit nicht verfügbar, solange die Überprüfung des Anbieters nicht abgeschlossen ist.",
    researchMethod: "Art der Recherche",
    publicSearch: "Öffentliche Suche",
    readPage: "Eine öffentliche Seite lesen",
    exactQuery: "Genaue Suchanfrage",
    exactUrl: "Genaue HTTPS-Adresse",
    searchNeedsAccess:
      "Die Suche braucht Zugang zum Dienst. Es kann noch keine Suchanfrage gesendet werden.",
    pageDomains: (hosts: string) =>
      `Verfügbare Domains für Seiten in diesem Arbeitsbereich: ${hosts}. Andere Domains bleiben gesperrt.`,
    noneConfigured: "noch keine eingerichtet",
    reviewDisclosure: "Weitergabe prüfen",
    confirmDisclosure: "Weitergabe nach außen bestätigen",
    approvalEyebrow: "IHRE FREIGABE IST ERFORDERLICH",
    shareOnly: (search: boolean) =>
      `Nur diese ${search ? "Suchanfrage" : "Adresse"} weitergeben?`,
    editAbove:
      "Bearbeiten Sie den Suchtext oben, wenn etwas anderes gesucht werden soll.",
    recipient: (who: string) =>
      `Empfänger: ${who}, über den Recherchedienst von CometRow. Es gelten die Aufbewahrungsregeln des Empfängers. Kein privater Chat und kein Anhang wird automatisch mitgesendet.`,
    pageExact:
      " Die Seitenadresse wird genau wie angezeigt gesendet; persönliche Angaben darin werden nicht entfernt.",
    approve: "Freigeben und abrufen",

    changePassword: "Anmeldepasswort ändern",
    signOut: "Abmelden",

    savedHeadA: "Ein Ort für das,",
    savedHeadB: "worauf Sie zurückkommen möchten.",
    savedIntro:
      "Freiwillige verschlüsselte Speicherstände, nur in diesem Browser abgelegt. Keine Synchronisierung über eine Cloud und keine Wiederherstellung des Passworts. Sie können eine verschlüsselte Sicherung herunterladen.",
    titleLabel: "Titel der Unterhaltung",
    titleNote:
      "Benennen Sie die aktuelle Unterhaltung und speichern Sie dann ausdrücklich. Titel werden mit der gespeicherten Unterhaltung verschlüsselt.",
    unsavedChanges:
      "Ungespeicherte Änderungen im Arbeitsbereich. Speichern Sie ausdrücklich, um Ihren Entwurf und Ihre Dokumente zu behalten.",
    noUnsavedChanges: "Keine ungespeicherten Änderungen im Arbeitsbereich.",
    reloadClears:
      "Neu laden entfernt vorübergehende Arbeit. Sperren leert den Arbeitsbereich, auch wenn Änderungen nicht gespeichert sind.",
    passphrase: "Passphrase des Tresors",
    passphraseNote:
      "Verwenden Sie mindestens 12 Zeichen. Beim ersten Entsperren wird der Tresor angelegt. Wenn Sie die Passphrase verlieren, verlieren Sie den Zugang. Wenn Sie den Browserspeicher leeren, ist der Verlauf verloren, außer Sie haben eine verschlüsselte Sicherung und deren ursprüngliche Passphrase.",
    createOrUnlock: "Tresor anlegen oder entsperren",
    saveSnapshot: "Verschlüsselt speichern",
    saveAsNew: "Als neue Unterhaltung speichern",
    researchNotSaved:
      "Suchergebnisse und Quellenlinks werden nie gespeichert. Beim Speichern bleiben Ihre geschriebenen Antworten und der freigegebene Suchtext erhalten; die wieder geöffnete Unterhaltung zeigt an, dass sie aus einer Websuche stammt, und bietet an, erneut nach aktuellen Quellen zu suchen.",
    lockAndClear: "Sperren und Arbeitsbereich leeren",
    deleteAll: "Alles auf diesem Gerät löschen",
    deleteAllText:
      "Entfernt alle gespeicherten Unterhaltungen und Projekte in diesem Browser und sperrt den Tresor. Das kann nicht rückgängig gemacht werden und betrifft keine verschlüsselten Sicherungsdateien, die Sie heruntergeladen haben. Der Kurzzeitspeicher des sicheren Servers, der sich von selbst leert, und unsere Aufzeichnungen über Anfragen (welches Konto wann wie oft angefragt hat, Modell, veröffentlichte Kosten) werden damit nicht gelöscht. Um auch Ihr Konto zu schließen, nutzen Sie die Kontoseite.",
    whatDelete: "Was Sie löschen können und was nicht ↗",
    unreadable: (n: number) =>
      `${n} ${n === 1 ? "Speicherstand konnte" : "Speicherstände konnten"} nicht gelesen werden. Unlesbare Einträge bleiben unverändert gespeichert. Andere Speicherstände sind verfügbar. Leeren Sie den Speicher dieses Browsers nicht, wenn Sie sie erhalten möchten.`,
    noSaved:
      "Noch keine gespeicherten Unterhaltungen. Ob Sie speichern, entscheiden immer Sie.",
    footer: "Persönliche Hilfe. Teilen unter Ihrer Kontrolle.",
    footerNote: "Gebaut für eine begrenzte Erprobung.",

    closeSource: "Quelle schließen",
    sourceUrl: "Quelladresse:",
    retrieved: (when?: string) => `· Abgerufen: ${when ?? ""}`,
    providerDate: (date: string) =>
      `Vom Anbieter gemeldetes Seitendatum: ${date} (nicht als Veröffentlichungs- oder Ereignisdatum geprüft).`,
    evidence: (kind: string) =>
      `Beleg: ${kind}. Abgerufenes Material kann unvollständig sein.`,
    userEditedLong:
      "Von Ihnen bearbeiteter Text; keine unveränderte Auslesung und kein geprüftes Zitat aus der Originalquelle.",
    close: "Schließen",
  },
});
