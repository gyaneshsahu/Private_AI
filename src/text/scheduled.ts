// Scheduled tasks: the screen, the form, the due strip and the chat card (docs/scheduled-20261115.md).
import { defineText } from "./core";
import type { ScheduleTrigger } from "../../shared/scheduled-tasks";
import type { TaskProblem } from "../scheduled";

/** Days the server keeps a background result that never reached a device (docs/background-tasks-20261115.md). */
export const RESULT_RETENTION_DAYS = 7;

const EN_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DE_DAYS = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const EN_UNITS = { day: ["day", "days"], week: ["week", "weeks"], month: ["month", "months"] } as const;
const DE_UNITS = { day: ["Tag", "Tage"], week: ["Woche", "Wochen"], month: ["Monat", "Monate"] } as const;

function triggerEn(t: ScheduleTrigger): string {
  const at = ` at ${t.time}`;
  const day = t.weekday !== undefined ? EN_DAYS[t.weekday] : "";
  if (t.unit === "day") return (t.every === 1 ? "Every day" : `Every ${t.every} days`) + at;
  if (t.unit === "week")
    return (t.every === 1 ? (day ? `Every ${day}` : "Every week") : `Every ${t.every} weeks${day ? ` on ${day}` : ""}`) + at;
  const on = t.dayOfMonth ? ` on day ${t.dayOfMonth}` : "";
  return (t.every === 1 ? `Every month${on}` : `Every ${t.every} months${on}`) + at;
}
function triggerDe(t: ScheduleTrigger): string {
  const at = ` um ${t.time}`;
  const day = t.weekday !== undefined ? DE_DAYS[t.weekday] : "";
  if (t.unit === "day") return (t.every === 1 ? "Jeden Tag" : `Alle ${t.every} Tage`) + at;
  if (t.unit === "week")
    return (t.every === 1 ? (day ? `Jeden ${day}` : "Jede Woche") : `Alle ${t.every} Wochen${day ? ` am ${day}` : ""}`) + at;
  const on = t.dayOfMonth ? ` am ${t.dayOfMonth}.` : "";
  return (t.every === 1 ? `Jeden Monat${on}` : `Alle ${t.every} Monate${on}`) + at;
}

export const scheduledText = defineText({
  en: {
    menu: "Scheduled",
    menuBackground: "Scheduled, a background task is active",
    title: "Scheduled tasks",
    close: "Close scheduled tasks",
    intro:
      "A Manual task is kept only in your encrypted vault on this device. When it is due, CometRow shows it here and above the chat, and you tap Run now. Nothing runs while CometRow is closed.",
    locked: "Unlock your saved conversations to see and create scheduled tasks. They are kept in the same encrypted vault.",
    tabs: "Scheduled task lists",
    yours: "Yours",
    templates: "Templates",
    newTask: "New task",
    emptyTitle: "No scheduled tasks yet",
    emptyText: "Set one up yourself, or start from a template.",
    setUp: "Set up manually",
    listLabel: "Your scheduled tasks",
    manual: "Manual",
    background: "Background task",
    backgroundHint: "Stored and run on our server",
    paused: "Paused",
    dueNow: "Due now",
    next: (when: string) => `Next: ${when}`,
    lastRun: (when: string) => `Last run: ${when}`,
    notRun: "Not run yet",
    runNow: "Run now",
    runCost: (units: number) => (units === 1 ? "counts as 1 request" : `counts as ${units} requests`),
    edit: "Edit",
    pause: "Pause",
    resume: "Resume",
    delete: "Delete",
    exportOne: "Export to calendar",
    actionsFor: (name: string) => `Actions for ${name}`,
    exportAll: "Export all Manual tasks to calendar",
    namesInCalendar: "Include task names in the calendar file",
    calendarNote:
      "The calendar file holds the time, the repeat and a link to CometRow. It never holds the instruction. Without the tick every entry is called “CometRow task”.",
    calendarTitle: "CometRow task",
    calendarDescription: "Open CometRow to run this task.",
    calendarSaved: "Calendar file saved.",
    counts: (manual: number, most: number, auto: number, mostAuto: number) =>
      `${manual} of ${most} Manual tasks · ${auto} of ${mostAuto} background tasks`,
    deleteTitle: (name: string) => `Delete “${name}”?`,
    deleteText: "The task is deleted from this device. This cannot be undone.",
    deleteBackgroundText:
      "The task is deleted from this device, and its copy and any waiting results are deleted from our server. This cannot be undone.",
    cancel: "Cancel",
    created: "Scheduled task created.",
    saved: "Scheduled task saved.",
    deleted: "Scheduled task deleted.",
    pausedDone: "Task paused.",
    resumed: "Task resumed.",
    skipped: "Skipped this time.",
    problem: (problem: TaskProblem | "failed") =>
      ({
        full: "You already have 20 Manual tasks. Delete one first.",
        autoFull: "You already have 3 background tasks. Delete one or switch it to Manual first.",
        gone: "This task no longer exists. It may have been deleted in another tab.",
        changed: "Your tasks were changed in another tab. Nothing was saved; open the list again.",
        failed: "The task could not be saved. Nothing was changed.",
      })[problem],
    // The form
    formNew: "New scheduled task",
    formEdit: "Edit scheduled task",
    name: "Name",
    namePlaceholder: "For example: German word of the day",
    instruction: "Instruction",
    instructionPlaceholder: "What CometRow should do each time. For example: Give me one new German word with its meaning and an example sentence.",
    length: (count: number, most: number) => `${count} of ${most} characters`,
    answerMode: "Answer mode",
    schedule: "Schedule",
    repeat: "Repeat",
    hourly: "Hourly (not in the test phase)",
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
    every: "Every",
    unitWord: (unit: "day" | "week" | "month", count: number): string => EN_UNITS[unit][count === 1 ? 0 : 1],
    weekday: "On",
    dayOfMonth: "Day of the month",
    time: "Time",
    timeZone: (zone: string) => `Times are in your device's time zone, ${zone}.`,
    shortestNote: "In the test phase a task runs at most once a day.",
    advanced: "Advanced settings",
    notifications: "Notifications",
    notifyInApp: "In the app, when it is due",
    notifyCalendar: "Calendar file, saved when I create the task",
    notifyEmail: "Email",
    notifyPush: "Push notification",
    later: "later",
    howItRuns: "How it runs",
    modeManual: "Manual",
    modeManualText: "CometRow shows the task when it is due and you tap Run now. Stored only on this device.",
    modeAuto: "Auto: background task",
    modeAutoText: "Our server runs the task at the set time, even when CometRow is closed.",
    notAvailable: "Not available yet",
    consentTitle: "Run this task in the background?",
    consentBody: (days: number) =>
      `A background task runs on our server at the times you set, even when CometRow is closed. For that, our server stores this task and can read it: its name, its instruction, its schedule and, if it searches the web, its search text. Everything is stored encrypted, so a copy of our database alone does not reveal it, but our running server can read it, and so could anyone who gains control of it.\n\nAt each run, the task is sent end to end encrypted to the same checked secure server that answers your chats. If it searches the web, our server first sends its search text to the search provider (Brave); that text was set when the task was created, with personal details removed.\n\nThe answer waits on our server, encrypted, until CometRow saves it on your device. It is deleted from our server at once when it is saved, and after ${days} days at the latest.\n\nEach run counts against your request allowance like a message. A task that cannot run for lack of allowance pauses itself after three tries.\n\nYou can pause or delete the task at any time. Deleting it, or switching it back to Manual, removes it and its stored answers from our server at once. Closing your account removes all of them.`,
    autoConsent: "I agree that CometRow's server stores and reads this task to run it in the background.",
    documentTitle: "This task includes a document.",
    documentBody:
      "The text of your document is stored on our server with the task, encrypted, and is sent with every run. Before it leaves this device, CometRow replaces email addresses, phone numbers, bank, card, tax, insurance and ID numbers and labelled birth dates with stand-ins. Names, addresses, employers, schools, dates and everything written in words stay as they are. A CV usually contains such details, and it can also contain information about health, religion, nationality or union membership. Only attach what you are willing to have stored on our server for as long as the task exists.",
    documentConsent:
      "I agree that this document's text, with the identifiers listed above replaced, is stored on CometRow's server and sent with every run of this task, including any sensitive information it contains.",
    cvTitle: "This task seems to contain CV details.",
    cvBody:
      "Names, addresses, employers, schools, dates and everything written in words are stored on our server as you wrote them, encrypted, and sent with every run. A CV can also contain information about health, religion, nationality or union membership.",
    cvConsent: "I agree that these personal details are stored on CometRow's server and sent with every run of this task.",
    healthTitle: "This task seems to be about health.",
    healthBody:
      "Health information is specially protected. As a background task, it is stored on our server, encrypted, and our running server can read it. CometRow does not give medical advice and a background answer is not checked by anyone before you read it. For anything urgent, call 112 or your doctor; do not wait for a scheduled answer.",
    healthConsent:
      "I explicitly agree that CometRow's server stores and processes this health information to run the task in the background.",
    badgeLine: "Stored on our server and readable by it. Delete it to remove it.",
    autoRunsFast: "A background task with the answer mode Auto runs as Fast.",
    attach: "Attach a document",
    attachNote: "One text document, read on this device. Identifiers are replaced before it is sent. At most 30,000 characters are kept.",
    attached: (name: string, characters: string, replaced: number) =>
      `${name} · ${characters} characters${replaced ? ` · ${replaced} identifiers replaced` : ""}`,
    attachShortened: "The document was shortened to 30,000 characters.",
    attachRemove: "Remove document",
    attachReading: "Reading the document on this device…",
    attachStoredRemove: "Remove the document stored with this task on the server",
    errorIdentifiers:
      "Remove email addresses, phone numbers, bank or ID numbers from the name and the instruction: a background task is stored without them.",
    cost: (units: number) =>
      units === 1 ? "Each run counts as 1 request of your allowance." : `Each run counts as ${units} requests of your allowance.`,
    costUnknown: "Each run counts against your allowance like a message.",
    create: "Create",
    save: "Save",
    errorName: "Give the task a name.",
    errorNameLong: "The name can have at most 80 characters.",
    errorInstruction: "Write what CometRow should do.",
    errorInstructionLong: "The instruction can have at most 2,000 characters.",
    errorEvery: "Choose a number from 1 to 31.",
    errorTime: "Choose a time.",
    errorConsent: "Tick the box to agree, or choose Manual.",
    serverRefused: (message: string) => `Our server did not accept the background task: ${message}`,
    // Templates
    templatesIntro: "Start from one of these. You can change everything before you create it.",
    useTemplate: "Use template",
    needsAuto: "Needs a background task and web search",
    templateWordName: "A new German word every day",
    templateWordText: "One word with its article, meaning and an example sentence, each morning.",
    templateWordInstruction:
      "Give me one new German word to learn: the word with its article, its English meaning, and one short example sentence. Choose an everyday word.",
    templateMealsName: "Weekly meal ideas",
    templateMealsText: "Five simple dinners and a shopping list, every Sunday.",
    templateMealsInstruction: "Suggest five simple dinners for this week, with a combined shopping list. Keep each recipe short.",
    templateMoneyName: "Monthly money check",
    templateMoneyText: "A short checklist for your accounts and subscriptions, on the first of the month.",
    templateMoneyInstruction:
      "Give me a short checklist for my monthly money check: bank statements, subscriptions to cancel, upcoming bills and savings.",
    templateJobsName: "Job search from my CV",
    templateJobsText: "New job offers that fit your CV, each morning. Runs on our server with a web search.",
    templateJobsInstruction:
      "Find job offers that match the attached CV. List each new offer in one line: title, employer, place, link. Say plainly if none fits.",
    templateJobsSearch: "job offers [your profession] [your city]",
    // The due strip
    dueTitle: (count: number) => (count === 1 ? "1 scheduled task is due" : `${count} scheduled tasks are due`),
    dueRegion: "Due scheduled tasks",
    skip: "Skip this time",
    openScheduled: "Open Scheduled",
    becameDue: (name: string) => `Scheduled task due: ${name}. Tap Run now above the chat.`,
    // Background results
    resultTitle: (name: string) => `${name} (background task)`,
    resultSaved: (count: number) =>
      count === 1 ? "1 background task result was saved to your conversations." : `${count} background task results were saved to your conversations.`,
    resultProblems: "Background task updates",
    resultNothingNew: (name: string, when: string) => `${name} ran on ${when} and found nothing new.`,
    resultFailed: (name: string, when: string, reason: string) => `${name} did not run on ${when}: ${reason}`,
    resultSkipped: (name: string, when: string, reason: string) => `${name} was skipped on ${when}: ${reason}`,
    reasonUnknown: "no reason was given",
    reason: (code: string) =>
      ({
        service_paused: "the service was paused by the operator",
        service_unavailable: "the protected AI service was not available",
        allowance_exhausted: "your request allowance was used up",
        paused_allowance: "your allowance ran out three times, so the task paused itself. Resume it when you have allowance again",
        daily_limit: "your daily limit was reached",
        service_limit: "the service's spending limit was reached",
        daily_runs: "an account can have at most 3 background runs a day",
        deployment_changed: "the AI service changed and must be checked again first",
        search_failed: "the web search did not work",
        search_unavailable: "the web search is not available",
        search_daily_limit: "your daily web searches were used up",
        provider_refused: "the AI service refused the request",
        provider_unavailable: "the AI service did not answer",
        model_not_found: "the AI model is no longer offered",
        timeout: "the answer took too long",
        failed_unreadable: "the stored task could not be read, so it paused itself",
      })[code] ?? code,
    dismiss: "Dismiss",
    unknownTask: "A deleted task",
    // The chat card
    cardRegion: "Create a scheduled task?",
    cardTitle: "Create a scheduled task?",
    cardWhen: "When do you want it?",
    cardLocked: "Scheduled tasks are kept in your encrypted vault. Unlock your saved conversations first, or send this as a normal message.",
    justSend: "Just send",
    closeCard: "Close without sending",
    fallbackName: "Scheduled task",
    eraseAlso: "Scheduled tasks are deleted too, and background tasks are deleted from our server.",
    cardCreated: (name: string) => `Scheduled task created: ${name}. Nothing was sent.`,
    trigger: triggerEn,
    weekdayName: (day: number) => EN_DAYS[day],
    // Per storage mode (forStorage in ./mode-copy): the texts above are the device vault's.
    intro_secure:
      "A Manual task is saved to your account, encrypted while stored, and is on all your devices after sign-in. When it is due, CometRow shows it here and above the chat, and you tap Run now. Nothing runs while CometRow is closed.",
    intro_max:
      "A Manual task is kept in Secure Max, encrypted with a key only you hold. When it is due, CometRow shows it here and above the chat, and you tap Run now. Nothing runs while CometRow is closed.",
    locked_secure: "Scheduled tasks are not available right now: your account's saved data has not loaded. Try again in a moment.",
    locked_max: "Unlock Secure Max to see and create its scheduled tasks.",
    deleteText_secure: "The task is deleted on all your devices. This cannot be undone.",
    deleteText_max: "The task is deleted on all your devices. This cannot be undone.",
    deleteBackgroundText_secure:
      "The task is deleted on all your devices, and its copy and any waiting results are deleted from our server. This cannot be undone.",
    deleteBackgroundText_max:
      "The task is deleted on all your devices, and its copy and any waiting results are deleted from our server. This cannot be undone.",
    modeManualText_secure: "CometRow shows the task when it is due and you tap Run now. Saved to your account.",
    modeManualText_max: "CometRow shows the task when it is due and you tap Run now. Saved in Secure Max.",
    cardLocked_secure: "Scheduled tasks are not available right now. Try again in a moment, or send this as a normal message.",
    cardLocked_max: "Scheduled tasks in Secure Max need Secure Max unlocked. Unlock it first, or send this as a normal message.",
  },
  de: {
    menu: "Geplant",
    menuBackground: "Geplant, eine Hintergrundaufgabe ist aktiv",
    title: "Geplante Aufgaben",
    close: "Geplante Aufgaben schließen",
    intro:
      "Eine manuelle Aufgabe wird nur in Ihrem verschlüsselten Tresor auf diesem Gerät gespeichert. Wenn sie fällig ist, zeigt CometRow sie hier und über dem Chat, und Sie tippen auf „Jetzt ausführen“. Solange CometRow geschlossen ist, läuft nichts.",
    locked: "Entsperren Sie Ihre gespeicherten Unterhaltungen, um geplante Aufgaben zu sehen und anzulegen. Sie liegen im selben verschlüsselten Tresor.",
    tabs: "Listen geplanter Aufgaben",
    yours: "Ihre",
    templates: "Vorlagen",
    newTask: "Neue Aufgabe",
    emptyTitle: "Noch keine geplanten Aufgaben",
    emptyText: "Legen Sie selbst eine an oder beginnen Sie mit einer Vorlage.",
    setUp: "Selbst anlegen",
    listLabel: "Ihre geplanten Aufgaben",
    manual: "Manuell",
    background: "Hintergrundaufgabe",
    backgroundHint: "Auf unserem Server gespeichert und ausgeführt",
    paused: "Pausiert",
    dueNow: "Jetzt fällig",
    next: (when: string) => `Nächste: ${when}`,
    lastRun: (when: string) => `Zuletzt ausgeführt: ${when}`,
    notRun: "Noch nicht ausgeführt",
    runNow: "Jetzt ausführen",
    runCost: (units: number) => (units === 1 ? "zählt als 1 Anfrage" : `zählt als ${units} Anfragen`),
    edit: "Bearbeiten",
    pause: "Pausieren",
    resume: "Fortsetzen",
    delete: "Löschen",
    exportOne: "In den Kalender exportieren",
    actionsFor: (name: string) => `Aktionen für ${name}`,
    exportAll: "Alle manuellen Aufgaben in den Kalender exportieren",
    namesInCalendar: "Aufgabennamen in die Kalenderdatei schreiben",
    calendarNote:
      "Die Kalenderdatei enthält die Uhrzeit, die Wiederholung und einen Link zu CometRow. Die Anweisung steht nie darin. Ohne Haken heißt jeder Eintrag „CometRow-Aufgabe“.",
    calendarTitle: "CometRow-Aufgabe",
    calendarDescription: "Öffnen Sie CometRow, um diese Aufgabe auszuführen.",
    calendarSaved: "Kalenderdatei gespeichert.",
    counts: (manual: number, most: number, auto: number, mostAuto: number) =>
      `${manual} von ${most} manuellen Aufgaben · ${auto} von ${mostAuto} Hintergrundaufgaben`,
    deleteTitle: (name: string) => `„${name}“ löschen?`,
    deleteText: "Die Aufgabe wird von diesem Gerät gelöscht. Das lässt sich nicht rückgängig machen.",
    deleteBackgroundText:
      "Die Aufgabe wird von diesem Gerät gelöscht, und ihre Kopie und wartende Ergebnisse werden von unserem Server gelöscht. Das lässt sich nicht rückgängig machen.",
    cancel: "Abbrechen",
    created: "Geplante Aufgabe angelegt.",
    saved: "Geplante Aufgabe gespeichert.",
    deleted: "Geplante Aufgabe gelöscht.",
    pausedDone: "Aufgabe pausiert.",
    resumed: "Aufgabe fortgesetzt.",
    skipped: "Diesmal übersprungen.",
    problem: (problem: TaskProblem | "failed") =>
      ({
        full: "Sie haben schon 20 manuelle Aufgaben. Löschen Sie zuerst eine.",
        autoFull: "Sie haben schon 3 Hintergrundaufgaben. Löschen Sie zuerst eine oder stellen Sie sie auf Manuell.",
        gone: "Diese Aufgabe gibt es nicht mehr. Vielleicht wurde sie in einem anderen Tab gelöscht.",
        changed: "Ihre Aufgaben wurden in einem anderen Tab geändert. Nichts wurde gespeichert; öffnen Sie die Liste erneut.",
        failed: "Die Aufgabe konnte nicht gespeichert werden. Nichts wurde geändert.",
      })[problem],
    formNew: "Neue geplante Aufgabe",
    formEdit: "Geplante Aufgabe bearbeiten",
    name: "Name",
    namePlaceholder: "Zum Beispiel: Deutsches Wort des Tages",
    instruction: "Anweisung",
    instructionPlaceholder: "Was CometRow jedes Mal tun soll. Zum Beispiel: Gib mir ein neues deutsches Wort mit Bedeutung und Beispielsatz.",
    length: (count: number, most: number) => `${count} von ${most} Zeichen`,
    answerMode: "Antwortmodus",
    schedule: "Zeitplan",
    repeat: "Wiederholung",
    hourly: "Stündlich (nicht in der Testphase)",
    daily: "Täglich",
    weekly: "Wöchentlich",
    monthly: "Monatlich",
    every: "Alle",
    unitWord: (unit: "day" | "week" | "month", count: number): string => DE_UNITS[unit][count === 1 ? 0 : 1],
    weekday: "Am",
    dayOfMonth: "Tag im Monat",
    time: "Uhrzeit",
    timeZone: (zone: string) => `Uhrzeiten gelten in der Zeitzone Ihres Geräts, ${zone}.`,
    shortestNote: "In der Testphase läuft eine Aufgabe höchstens einmal am Tag.",
    advanced: "Erweiterte Einstellungen",
    notifications: "Benachrichtigungen",
    notifyInApp: "In der App, wenn sie fällig ist",
    notifyCalendar: "Kalenderdatei, gespeichert beim Anlegen",
    notifyEmail: "E-Mail",
    notifyPush: "Push-Benachrichtigung",
    later: "später",
    howItRuns: "Wie sie läuft",
    modeManual: "Manuell",
    modeManualText: "CometRow zeigt die Aufgabe, wenn sie fällig ist, und Sie tippen auf „Jetzt ausführen“. Nur auf diesem Gerät gespeichert.",
    modeAuto: "Auto: Hintergrundaufgabe",
    modeAutoText: "Unser Server führt die Aufgabe zur eingestellten Zeit aus, auch wenn CometRow geschlossen ist.",
    notAvailable: "Noch nicht verfügbar",
    consentTitle: "Diese Aufgabe im Hintergrund ausführen?",
    consentBody: (days: number) =>
      `Eine Hintergrundaufgabe läuft zu den von Ihnen gewählten Zeiten auf unserem Server, auch wenn CometRow geschlossen ist. Dafür speichert unser Server diese Aufgabe und kann sie lesen: ihren Namen, ihre Anweisung, ihren Zeitplan und, wenn sie im Web sucht, ihren Suchtext. Alles wird verschlüsselt gespeichert, sodass eine Kopie unserer Datenbank allein nichts verrät, aber unser laufender Server kann es lesen, und ebenso jeder, der die Kontrolle über ihn erlangt.\n\nBei jeder Ausführung wird die Aufgabe Ende-zu-Ende-verschlüsselt an denselben geprüften sicheren Server gesendet, der Ihre Chats beantwortet. Wenn sie im Web sucht, sendet unser Server zuerst ihren Suchtext an den Suchanbieter (Brave); dieser Text wurde beim Anlegen der Aufgabe festgelegt, ohne persönliche Angaben.\n\nDie Antwort wartet verschlüsselt auf unserem Server, bis CometRow sie auf Ihrem Gerät speichert. Sobald sie gespeichert ist, wird sie von unserem Server gelöscht, spätestens nach ${days} Tagen.\n\nJede Ausführung zählt wie eine Nachricht für Ihr Anfragen-Kontingent. Eine Aufgabe, die mangels Kontingent nicht laufen kann, pausiert sich nach drei Versuchen selbst.\n\nSie können die Aufgabe jederzeit pausieren oder löschen. Wenn Sie sie löschen oder wieder auf „Manuell“ stellen, werden sie und ihre gespeicherten Antworten sofort von unserem Server entfernt. Wenn Sie Ihr Konto schließen, werden alle entfernt.`,
    autoConsent: "Ich willige ein, dass der Server von CometRow diese Aufgabe speichert und liest, um sie im Hintergrund auszuführen.",
    documentTitle: "Diese Aufgabe enthält ein Dokument.",
    documentBody:
      "Der Text Ihres Dokuments wird mit der Aufgabe verschlüsselt auf unserem Server gespeichert und bei jeder Ausführung mitgesendet. Bevor er dieses Gerät verlässt, ersetzt CometRow E-Mail-Adressen, Telefonnummern, Bank-, Karten-, Steuer-, Versicherungs- und Ausweisnummern sowie gekennzeichnete Geburtsdaten durch Platzhalter. Namen, Adressen, Arbeitgeber, Schulen, Daten und alles, was in Worten geschrieben ist, bleiben, wie sie sind. Ein Lebenslauf enthält meist solche Angaben, und er kann auch Angaben zu Gesundheit, Religion, Staatsangehörigkeit oder Gewerkschaftszugehörigkeit enthalten. Hängen Sie nur an, was Sie für die Dauer der Aufgabe auf unserem Server gespeichert haben möchten.",
    documentConsent:
      "Ich willige ein, dass der Text dieses Dokuments, mit den oben genannten ersetzten Kennungen, auf dem Server von CometRow gespeichert und bei jeder Ausführung dieser Aufgabe mitgesendet wird, einschließlich der darin enthaltenen sensiblen Angaben.",
    cvTitle: "Diese Aufgabe scheint Angaben aus einem Lebenslauf zu enthalten.",
    cvBody:
      "Namen, Adressen, Arbeitgeber, Schulen, Daten und alles, was in Worten geschrieben ist, werden so, wie Sie es geschrieben haben, verschlüsselt auf unserem Server gespeichert und bei jeder Ausführung mitgesendet. Ein Lebenslauf kann auch Angaben zu Gesundheit, Religion, Staatsangehörigkeit oder Gewerkschaftszugehörigkeit enthalten.",
    cvConsent: "Ich willige ein, dass diese persönlichen Angaben auf dem Server von CometRow gespeichert und bei jeder Ausführung dieser Aufgabe mitgesendet werden.",
    healthTitle: "Diese Aufgabe scheint Gesundheit zu betreffen.",
    healthBody:
      "Gesundheitsdaten sind besonders geschützt. Als Hintergrundaufgabe werden sie verschlüsselt auf unserem Server gespeichert, und unser laufender Server kann sie lesen. CometRow gibt keine medizinische Beratung, und eine Antwort im Hintergrund wird von niemandem geprüft, bevor Sie sie lesen. Rufen Sie in dringenden Fällen die 112 oder Ihre Ärztin oder Ihren Arzt an; warten Sie nicht auf eine geplante Antwort.",
    healthConsent:
      "Ich willige ausdrücklich ein, dass der Server von CometRow diese Gesundheitsdaten speichert und verarbeitet, um die Aufgabe im Hintergrund auszuführen.",
    badgeLine: "Auf unserem Server gespeichert und von ihm lesbar. Löschen Sie die Aufgabe, um sie zu entfernen.",
    autoRunsFast: "Eine Hintergrundaufgabe mit dem Antwortmodus Auto läuft als Schnell.",
    attach: "Dokument anhängen",
    attachNote: "Ein Textdokument, auf diesem Gerät gelesen. Kennungen werden vor dem Senden ersetzt. Höchstens 30.000 Zeichen werden behalten.",
    attached: (name: string, characters: string, replaced: number) =>
      `${name} · ${characters} Zeichen${replaced ? ` · ${replaced} Kennungen ersetzt` : ""}`,
    attachShortened: "Das Dokument wurde auf 30.000 Zeichen gekürzt.",
    attachRemove: "Dokument entfernen",
    attachReading: "Das Dokument wird auf diesem Gerät gelesen …",
    attachStoredRemove: "Das mit dieser Aufgabe auf dem Server gespeicherte Dokument entfernen",
    errorIdentifiers:
      "Entfernen Sie E-Mail-Adressen, Telefonnummern, Bank- oder Ausweisnummern aus Name und Anweisung: Eine Hintergrundaufgabe wird ohne sie gespeichert.",
    cost: (units: number) =>
      units === 1 ? "Jede Ausführung zählt als 1 Anfrage Ihres Kontingents." : `Jede Ausführung zählt als ${units} Anfragen Ihres Kontingents.`,
    costUnknown: "Jede Ausführung zählt wie eine Nachricht gegen Ihr Kontingent.",
    create: "Anlegen",
    save: "Speichern",
    errorName: "Geben Sie der Aufgabe einen Namen.",
    errorNameLong: "Der Name darf höchstens 80 Zeichen haben.",
    errorInstruction: "Schreiben Sie, was CometRow tun soll.",
    errorInstructionLong: "Die Anweisung darf höchstens 2.000 Zeichen haben.",
    errorEvery: "Wählen Sie eine Zahl von 1 bis 31.",
    errorTime: "Wählen Sie eine Uhrzeit.",
    errorConsent: "Setzen Sie den Haken, um zuzustimmen, oder wählen Sie Manuell.",
    serverRefused: (message: string) => `Unser Server hat die Hintergrundaufgabe nicht angenommen: ${message}`,
    templatesIntro: "Beginnen Sie mit einer dieser Vorlagen. Vor dem Anlegen können Sie alles ändern.",
    useTemplate: "Vorlage verwenden",
    needsAuto: "Braucht eine Hintergrundaufgabe und die Websuche",
    templateWordName: "Jeden Tag ein neues deutsches Wort",
    templateWordText: "Jeden Morgen ein Wort mit Artikel, Bedeutung und Beispielsatz.",
    templateWordInstruction:
      "Gib mir ein neues deutsches Wort zum Lernen: das Wort mit Artikel, seine Bedeutung und einen kurzen Beispielsatz. Wähle ein Wort aus dem Alltag.",
    templateMealsName: "Essensideen für die Woche",
    templateMealsText: "Jeden Sonntag fünf einfache Abendessen und eine Einkaufsliste.",
    templateMealsInstruction: "Schlage mir fünf einfache Abendessen für diese Woche vor, mit einer gemeinsamen Einkaufsliste. Halte jedes Rezept kurz.",
    templateMoneyName: "Monatlicher Geld-Check",
    templateMoneyText: "Am Monatsersten eine kurze Checkliste für Konten und Abos.",
    templateMoneyInstruction:
      "Gib mir eine kurze Checkliste für meinen monatlichen Geld-Check: Kontoauszüge, Abos zum Kündigen, anstehende Rechnungen und Sparen.",
    templateJobsName: "Jobsuche nach meinem Lebenslauf",
    templateJobsText: "Jeden Morgen neue Stellenangebote, die zu Ihrem Lebenslauf passen. Läuft auf unserem Server mit einer Websuche.",
    templateJobsInstruction:
      "Finde Stellenangebote, die zum angehängten Lebenslauf passen. Nenne jedes neue Angebot in einer Zeile: Titel, Arbeitgeber, Ort, Link. Sage klar, wenn keines passt.",
    templateJobsSearch: "Stellenangebote [Ihr Beruf] [Ihre Stadt]",
    dueTitle: (count: number) => (count === 1 ? "1 geplante Aufgabe ist fällig" : `${count} geplante Aufgaben sind fällig`),
    dueRegion: "Fällige geplante Aufgaben",
    skip: "Diesmal überspringen",
    openScheduled: "Geplant öffnen",
    becameDue: (name: string) => `Geplante Aufgabe fällig: ${name}. Tippen Sie über dem Chat auf „Jetzt ausführen“.`,
    resultTitle: (name: string) => `${name} (Hintergrundaufgabe)`,
    resultSaved: (count: number) =>
      count === 1
        ? "1 Ergebnis einer Hintergrundaufgabe wurde in Ihren Unterhaltungen gespeichert."
        : `${count} Ergebnisse von Hintergrundaufgaben wurden in Ihren Unterhaltungen gespeichert.`,
    resultProblems: "Neues von Hintergrundaufgaben",
    resultNothingNew: (name: string, when: string) => `${name} ist am ${when} gelaufen und hat nichts Neues gefunden.`,
    resultFailed: (name: string, when: string, reason: string) => `${name} ist am ${when} nicht gelaufen: ${reason}`,
    resultSkipped: (name: string, when: string, reason: string) => `${name} wurde am ${when} übersprungen: ${reason}`,
    reasonUnknown: "es wurde kein Grund genannt",
    reason: (code: string) =>
      ({
        service_paused: "der Dienst wurde vom Betreiber angehalten",
        service_unavailable: "der geschützte KI-Dienst war nicht verfügbar",
        allowance_exhausted: "Ihr Anfragen-Kontingent war aufgebraucht",
        paused_allowance: "Ihr Kontingent war dreimal aufgebraucht, deshalb hat sich die Aufgabe pausiert. Setzen Sie sie fort, wenn Sie wieder Kontingent haben",
        daily_limit: "Ihr Tageslimit war erreicht",
        service_limit: "das Ausgabenlimit des Dienstes war erreicht",
        daily_runs: "ein Konto kann höchstens 3 Hintergrundausführungen am Tag haben",
        deployment_changed: "der KI-Dienst hat sich geändert und muss zuerst neu geprüft werden",
        search_failed: "die Websuche hat nicht funktioniert",
        search_unavailable: "die Websuche ist nicht verfügbar",
        search_daily_limit: "Ihre Websuchen für heute waren aufgebraucht",
        provider_refused: "der KI-Dienst hat die Anfrage abgelehnt",
        provider_unavailable: "der KI-Dienst hat nicht geantwortet",
        model_not_found: "das KI-Modell wird nicht mehr angeboten",
        timeout: "die Antwort hat zu lange gedauert",
        failed_unreadable: "die gespeicherte Aufgabe konnte nicht gelesen werden, deshalb hat sie sich pausiert",
      })[code] ?? code,
    dismiss: "Ausblenden",
    unknownTask: "Eine gelöschte Aufgabe",
    cardRegion: "Geplante Aufgabe anlegen?",
    cardTitle: "Geplante Aufgabe anlegen?",
    cardWhen: "Wann möchten Sie es?",
    cardLocked: "Geplante Aufgaben liegen in Ihrem verschlüsselten Tresor. Entsperren Sie zuerst Ihre gespeicherten Unterhaltungen oder senden Sie dies als normale Nachricht.",
    justSend: "Einfach senden",
    closeCard: "Schließen, ohne zu senden",
    fallbackName: "Geplante Aufgabe",
    eraseAlso: "Geplante Aufgaben werden ebenfalls gelöscht, Hintergrundaufgaben auch auf unserem Server.",
    cardCreated: (name: string) => `Geplante Aufgabe angelegt: ${name}. Nichts wurde gesendet.`,
    trigger: triggerDe,
    weekdayName: (day: number) => DE_DAYS[day],
    intro_secure:
      "Eine manuelle Aufgabe wird in Ihrem Konto gespeichert, verschlüsselt abgelegt, und ist nach der Anmeldung auf allen Ihren Geräten. Wenn sie fällig ist, zeigt CometRow sie hier und über dem Chat, und Sie tippen auf „Jetzt ausführen“. Solange CometRow geschlossen ist, läuft nichts.",
    intro_max:
      "Eine manuelle Aufgabe wird in Secure Max gespeichert, mit einem Schlüssel verschlüsselt, den nur Sie haben. Wenn sie fällig ist, zeigt CometRow sie hier und über dem Chat, und Sie tippen auf „Jetzt ausführen“. Solange CometRow geschlossen ist, läuft nichts.",
    locked_secure:
      "Geplante Aufgaben sind gerade nicht verfügbar: Die gespeicherten Daten Ihres Kontos sind noch nicht geladen. Versuchen Sie es gleich noch einmal.",
    locked_max: "Entsperren Sie Secure Max, um seine geplanten Aufgaben zu sehen und anzulegen.",
    deleteText_secure: "Die Aufgabe wird auf allen Ihren Geräten gelöscht. Das lässt sich nicht rückgängig machen.",
    deleteText_max: "Die Aufgabe wird auf allen Ihren Geräten gelöscht. Das lässt sich nicht rückgängig machen.",
    deleteBackgroundText_secure:
      "Die Aufgabe wird auf allen Ihren Geräten gelöscht, und ihre Kopie und wartende Ergebnisse werden von unserem Server gelöscht. Das lässt sich nicht rückgängig machen.",
    deleteBackgroundText_max:
      "Die Aufgabe wird auf allen Ihren Geräten gelöscht, und ihre Kopie und wartende Ergebnisse werden von unserem Server gelöscht. Das lässt sich nicht rückgängig machen.",
    modeManualText_secure: "CometRow zeigt die Aufgabe, wenn sie fällig ist, und Sie tippen auf „Jetzt ausführen“. In Ihrem Konto gespeichert.",
    modeManualText_max: "CometRow zeigt die Aufgabe, wenn sie fällig ist, und Sie tippen auf „Jetzt ausführen“. In Secure Max gespeichert.",
    cardLocked_secure:
      "Geplante Aufgaben sind gerade nicht verfügbar. Versuchen Sie es gleich noch einmal oder senden Sie dies als normale Nachricht.",
    cardLocked_max:
      "Geplante Aufgaben in Secure Max brauchen ein entsperrtes Secure Max. Entsperren Sie es zuerst oder senden Sie dies als normale Nachricht.",
  },
});
