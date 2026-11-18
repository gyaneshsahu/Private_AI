// Scheduled tasks (docs/scheduled-20261115.md): the "Due now" strip, the chat card and background
// results. The Scheduled screen and its form are in src/ScheduledScreen.tsx (loaded on demand).
// Manual tasks never leave the device. Auto tasks ("Background task") are changed on the server
// first (src/background-tasks-client.ts), then in the vault.
import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { emptyConversation, type AnswerMode, type AppStatus, type Qualification } from "../shared/contracts";
import { SCHEDULE_LIMITS, type ScheduledTask } from "../shared/scheduled-tasks";
import { autoMode, requestCost } from "./answer-modes";
import { collectBackgroundResults } from "./background-results";
import { deleteBackgroundTask } from "./background-tasks-client";
import { codeToolOn } from "./code-tool";
import { type KeptIdentifier } from "./identifier-masking";
import { newMessage } from "./conversation";
import { scheduledEnabled } from "./device-features";
import { Icon } from "./Icon";
import { useLang } from "./i18n";
import type { DetectedSchedule } from "./schedule-detection";
import { defaultTrigger, dueTasks, heldTasks, holdTasks, watchTasks, type TaskFields } from "./scheduled";
import { forStorage, type Storage } from "./text/mode-copy";
import { scheduledText } from "./text/scheduled";
import type { TaskMasks, Vault } from "./vault";

export const useScheduledTasks = () => useSyncExternalStore(watchTasks, heldTasks);
/** Holds the tasks while the vault is unlocked and drops them when it locks. Nothing with the switch off. */
export function useScheduledVault(vault: Vault | null, unlocked: boolean) {
  useEffect(() => {
    if (!unlocked || !vault || !scheduledEnabled()) return;
    vault.readTasks().then(holdTasks, () => {});
    return () => holdTasks([]);
  }, [vault, unlocked]);
  return useScheduledTasks();
}
/** One change, written to the vault first; the held list follows only when that worked. */
export async function changeTasks(vault: Vault, change: (list: ScheduledTask[]) => ScheduledTask[], masks?: TaskMasks) {
  holdTasks(await vault.writeTasks(change, masks));
}
/** "Delete everything on this device" also deletes the server copies of background tasks. */
export async function deleteServerCopies(status: AppStatus | undefined) {
  if (!status?.backgroundTasks) return;
  for (const task of heldTasks().filter((t) => t.mode === "auto"))
    await deleteBackgroundTask(status.csrf, task.id).catch(() => {});
}
/** The mode "Run now" asks in: the task's own choice; Auto is read on the device as for a message. */
export function runMode(task: ScheduledTask, status: AppStatus | undefined): AnswerMode | undefined {
  if (task.answerMode !== "auto") return task.answerMode;
  if (!status?.inference.qualification?.modes) return undefined;
  return autoMode({ ...emptyConversation(), messages: [newMessage("user", task.instruction)] }, codeToolOn(status));
}
export const costOf = (status: AppStatus | undefined, answerMode: TaskFields["answerMode"], instruction: string) => {
  const report: Qualification | undefined = status?.inference.qualification;
  return report ? requestCost(report, answerMode, emptyConversation(), codeToolOn(status), instruction || " ") : undefined;
};
const locale = (lang: string) => (lang === "de" ? "de-DE" : "en-GB");
export const when = (iso: string, lang: string) =>
  new Intl.DateTimeFormat(locale(lang), { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso),
  );

/**
 * What the form adds for a background task: whether an extra consent was given, and the masked
 * document text (a string), its removal (null) or nothing.
 */
export type FormExtra = { sensitive: boolean; attachment?: string | null; masks?: KeptIdentifier[] };
/** What the form opens with: a template, the chat card's reading, or an existing task. */
export type TaskDraft = Partial<TaskFields> & { id?: string };
export function draftFromDetection(found: DetectedSchedule, time: string, fallbackName: string): TaskDraft {
  const name = found.content ? found.content.charAt(0).toUpperCase() + found.content.slice(1) : fallbackName;
  return {
    name: name.slice(0, SCHEDULE_LIMITS.name),
    instruction: found.instruction.slice(0, SCHEDULE_LIMITS.instruction),
    trigger: {
      ...defaultTrigger(),
      every: found.every,
      unit: found.unit,
      time,
      ...(found.unit === "week" ? { weekday: found.weekday ?? new Date().getDay() } : {}),
      ...(found.unit === "month" ? { dayOfMonth: found.dayOfMonth ?? Math.min(new Date().getDate(), 28) } : {}),
    },
    mode: "manual",
  };
}
export const fieldsOf = (draft: TaskDraft): TaskFields => ({
  name: draft.name ?? "",
  instruction: draft.instruction ?? "",
  trigger: draft.trigger ?? defaultTrigger(),
  mode: draft.mode ?? "manual",
  notify: draft.notify ?? { inApp: true, calendar: false },
  answerMode: draft.answerMode ?? "auto",
  useSearch: draft.useSearch ?? false,
  ...(draft.searchText ? { searchText: draft.searchText } : {}),
  ...(draft.paused ? { paused: true } : {}),
});

/** "Due now" at the top of the chat: the Manual tasks whose time has come, with Run now. */
export function DueStrip({
  tasks,
  visible,
  busy,
  ready,
  status,
  problems,
  onRun,
  onSkip,
  onOpen,
  onDismissProblems,
  onBecameDue,
}: {
  tasks: readonly ScheduledTask[];
  visible: boolean;
  busy: boolean;
  ready: boolean;
  status?: AppStatus;
  problems: readonly string[];
  onRun: (task: ScheduledTask) => void;
  onSkip: (task: ScheduledTask) => void;
  onOpen: () => void;
  onDismissProblems: () => void;
  /** A task became due while the app is open (not at unlock): the app shows its one notice. */
  onBecameDue: (task: ScheduledTask) => void;
}) {
  const { lang } = useLang();
  const t = scheduledText[lang];
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const due = useMemo(() => dueTasks(tasks, now), [tasks, now]);
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    // The first list after an unlock is shown without a notice; later arrivals get one.
    if (!tasks.length) {
      seen.current = null;
      return;
    }
    const keys = new Set(due.map((task) => `${task.id}@${task.nextDueAt}`));
    if (seen.current)
      for (const task of due) if (!seen.current.has(`${task.id}@${task.nextDueAt}`) && task.notify.inApp) onBecameDue(task);
    seen.current = keys;
  }, [due, tasks.length]);
  if (!visible || (!due.length && !problems.length)) return null;
  return (
    <section className="due-strip" aria-label={t.dueRegion}>
      {!!due.length && (
        <>
          <div className="due-strip-head">
            <strong>
              <Icon name="clock" /> {t.dueTitle(due.length)}
            </strong>
            <button type="button" className="text-button" onClick={onOpen}>
              {t.openScheduled}
            </button>
          </div>
          <ul>
            {due.map((task) => {
              const cost = costOf(status, task.answerMode, task.instruction);
              return (
                <li key={task.id}>
                  <span id={`due-${task.id}`}>
                    <strong>{task.name}</strong> <span className="muted">{t.trigger(task.trigger)}</span>
                  </span>
                  <div className="scheduled-actions">
                    <button
                      type="button"
                      className="primary"
                      disabled={busy || !ready}
                      aria-describedby={`due-${task.id}`}
                      onClick={() => onRun(task)}
                    >
                      {t.runNow}
                      {cost !== undefined && <small> · {t.runCost(cost)}</small>}
                    </button>
                    <button type="button" disabled={busy} aria-describedby={`due-${task.id}`} onClick={() => onSkip(task)}>
                      {t.skip}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
      {!!problems.length && (
        <div className="due-problems">
          <strong>{t.resultProblems}</strong>
          <ul>
            {problems.map((text, index) => (
              <li key={index}>{text}</li>
            ))}
          </ul>
          <button type="button" onClick={onDismissProblems}>
            {t.dismiss}
          </button>
        </div>
      )}
    </section>
  );
}

/**
 * Above the composer when a message reads as a scheduling request: Create (stores a Manual task,
 * sends nothing), Edit (the form, prefilled) or Just send (the message goes as usual).
 */
export function ScheduleCard({
  found,
  unlocked,
  onCreate,
  onEdit,
  onSend,
  onClose,
  storage,
}: {
  found: DetectedSchedule;
  unlocked: boolean;
  onCreate: (fields: TaskFields) => void;
  onEdit: (draft: TaskDraft) => void;
  onSend: () => void;
  onClose: () => void;
  storage?: Storage;
}) {
  const { lang } = useLang();
  const t = forStorage(scheduledText[lang], storage);
  const id = useId();
  const [time, setTime] = useState(found.time ?? found.suggestedTime);
  const draft = draftFromDetection(found, /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : found.suggestedTime, t.fallbackName);
  const first = useRef<HTMLElement>(null);
  useEffect(() => first.current?.focus(), []);
  return (
    <div
      className="notice composer-note schedule-card"
      role="region"
      aria-label={t.cardRegion}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        onClose();
      }}
    >
      <p>
        <strong>{t.cardTitle}</strong>{" "}
        <span id={`${id}-summary`}>
          {[draft.name, t.trigger(draft.trigger!), t.manual].join(" · ")}
        </span>
      </p>
      {!found.time && (
        <label className="schedule-card-time">
          {t.cardWhen}
          <input
            ref={first as React.RefObject<HTMLInputElement>}
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
          />
        </label>
      )}
      {!unlocked && <p className="muted">{t.cardLocked}</p>}
      <div className="row">
        <button
          ref={found.time ? (first as React.RefObject<HTMLButtonElement>) : undefined}
          type="button"
          className="primary"
          disabled={!unlocked}
          aria-describedby={`${id}-summary`}
          onClick={() => onCreate(fieldsOf(draft))}
        >
          {t.create}
        </button>
        <button type="button" disabled={!unlocked} onClick={() => onEdit(draft)}>
          {t.edit}
        </button>
        <button type="button" onClick={onSend}>
          {t.justSend}
        </button>
        <button type="button" className="icon-button" aria-label={t.closeCard} onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
    </div>
  );
}

/**
 * Background results (Auto mode): fetched on unlock and every five minutes while the app is open,
 * each finished one saved into the vault as a new conversation and then acknowledged, so the
 * server deletes it. Failed and skipped runs are acknowledged too and listed plainly. Nothing
 * runs while the server's switch is off or the vault is locked.
 */
export function useBackgroundResults({
  vault,
  unlocked,
  status,
  onSaved,
}: {
  vault: Vault | null;
  unlocked: boolean;
  status?: AppStatus;
  onSaved: (count: number) => void;
}) {
  const { lang } = useLang();
  const [problems, setProblems] = useState<string[]>([]);
  const csrf = scheduledEnabled() && status?.backgroundTasks ? status.csrf : undefined;
  const saved = useRef(onSaved);
  saved.current = onSaved;
  useEffect(() => setProblems([]), [unlocked]);
  useEffect(() => {
    if (!csrf || !unlocked || !vault) return;
    let stopped = false;
    let running = false;
    const t = scheduledText[lang];
    const poll = async () => {
      if (running) return;
      running = true;
      try {
        const count = await collectBackgroundResults(
          vault,
          csrf,
          t,
          (iso) => when(iso, lang),
          (line) => setProblems((list) => [...list, line]),
          () => stopped,
        );
        if (count && !stopped) saved.current(count);
      } catch {
        /* The next poll tries again; nothing is acknowledged that was not saved. */
      } finally {
        running = false;
      }
    };
    void poll();
    const timer = setInterval(() => void poll(), 5 * 60_000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [csrf, unlocked, vault, lang]);
  return { problems, dismiss: () => setProblems([]) };
}
