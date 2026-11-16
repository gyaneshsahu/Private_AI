// The Scheduled screen and its "New scheduled task" form (docs/scheduled-20261115.md), moved out of
// src/ScheduledPanel.tsx so it loads only when opened (SS-13). The due strip, the chat card and the
// background results stay there: they show on the first screen.
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { type AppStatus } from "../shared/contracts";
import { SCHEDULE_LIMITS, type ScheduledTask, type ScheduleUnit } from "../shared/scheduled-tasks";
import { MODE_NAMES } from "./answer-modes";
import { BackgroundTasksError, createBackgroundTask, deleteBackgroundTask, updateBackgroundTask } from "./background-tasks-client";
import { ATTACHMENT_LIMIT } from "./background-tasks-client";
import { DOCUMENT_ACCEPT } from "./document-formats";
import { extract } from "./documents";
import { createMaskingSession, findIdentifiers, type KeptIdentifier } from "./identifier-masking";
import { ConfirmDialog } from "./ConfirmDialog";
import { containDialogFocus } from "./dialog-focus";
import { Icon } from "./Icon";
import { useLang } from "./i18n";
import {
  addTask,
  defaultTrigger,
  dueTasks,
  editedTask,
  looksSensitive,
  newTask,
  removeTask,
  replaceTask,
  TaskError,
  taskProblem,
  type TaskFields,
} from "./scheduled";
import { calendarFile, downloadCalendar } from "./scheduled-ics";
import { forStorage, type Storage } from "./text/mode-copy";
import { RESULT_RETENTION_DAYS, scheduledText } from "./text/scheduled";
import { editedSearchText } from "./when-to-search";
import type { Vault } from "./vault";
import { changeTasks, costOf, fieldsOf, useScheduledTasks, when, type FormExtra, type TaskDraft } from "./ScheduledPanel";

function saveCalendar(tasks: ScheduledTask[], names: boolean, lang: "en" | "de") {
  const t = scheduledText[lang];
  downloadCalendar(
    calendarFile(tasks, { names, url: `${location.origin}/`, title: t.calendarTitle, description: t.calendarDescription }),
    tasks.length === 1 ? "cometrow-task.ics" : "cometrow-tasks.ics",
  );
}

/** The persistent mark of a task that runs on the server. */
export function BackgroundBadge() {
  const { lang } = useLang();
  const t = scheduledText[lang];
  return (
    <span className="background-badge" title={t.backgroundHint}>
      <Icon name="clock" />
      {t.background}
    </span>
  );
}

export function ScheduledPanel({
  vault,
  unlocked,
  status,
  busy,
  draft,
  onClose,
  onRun,
  storage,
}: {
  vault: Vault | null;
  unlocked: boolean;
  status?: AppStatus;
  busy: boolean;
  /** Open the form at once with these fields (chat card "Edit", a template from elsewhere). */
  draft?: TaskDraft;
  onClose: () => void;
  onRun: (task: ScheduledTask) => void;
  /** Where the tasks are kept; decides what the texts promise (src/text/mode-copy.ts). */
  storage?: Storage;
}) {
  const { lang } = useLang();
  const t = forStorage(scheduledText[lang], storage);
  const tasks = useScheduledTasks();
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const id = useId();
  const [tab, setTab] = useState<"yours" | "templates">("yours");
  const [form, setForm] = useState<TaskDraft | undefined>(draft);
  const [asking, setAsking] = useState<ScheduledTask>();
  const [names, setNames] = useState(false);
  const [message, setMessage] = useState("");
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const element = dialog.current;
    const trigger = document.activeElement as HTMLElement | null;
    element?.showModal();
    if (!draft) heading.current?.focus();
    return () => {
      element?.close();
      if (trigger?.isConnected && !trigger.matches(":disabled") && trigger.checkVisibility()) trigger.focus();
      else document.getElementById("message-input")?.focus();
    };
  }, []);
  const csrf = status?.csrf ?? "";
  const due = new Set(dueTasks(tasks, now).map((task) => task.id));
  const autoCount = tasks.filter((task) => task.mode === "auto").length;
  // The deployment may allow fewer than the contract's three (inference.backgroundTasks.maxAutoTasks).
  const maxAuto = Math.min(status?.backgroundTasks?.maxAutoTasks ?? SCHEDULE_LIMITS.maxAutoTasks, SCHEDULE_LIMITS.maxAutoTasks);
  const manual = tasks.filter((task) => task.mode === "manual");
  // Server first for a background task, then the vault; a refusal changes nothing.
  const apply = async (work: () => Promise<void>, done: string) => {
    if (!vault) return false;
    try {
      await work();
      setMessage(done);
      return true;
    } catch (error) {
      setMessage(error instanceof BackgroundTasksError ? t.serverRefused(error.message) : t.problem(taskProblem(error)));
      return false;
    }
  };
  async function submit(fields: TaskFields, existing: ScheduledTask | undefined, extra: FormExtra) {
    const consent = {
      version: status?.backgroundTasks?.consentVersion ?? "",
      acceptedAt: new Date().toISOString(),
      sensitive: extra.sensitive,
    };
    const attachment = extra.attachment ? { text: extra.attachment } : undefined;
    return apply(async () => {
      let task = existing ? editedTask(existing, fields) : newTask(fields);
      if (!existing && task.mode === "auto" && autoCount >= maxAuto) throw new TaskError("autoFull");
      if (task.mode === "auto" && existing?.mode !== "auto") task = await createBackgroundTask(csrf, task, consent, attachment);
      else if (task.mode === "auto")
        task = await updateBackgroundTask(csrf, task.id, {
          name: task.name,
          instruction: task.instruction,
          trigger: task.trigger,
          answerMode: task.answerMode,
          useSearch: task.useSearch,
          notify: task.notify,
          ...(task.searchText ? { searchText: task.searchText } : {}),
          // A new document needs the consent again; null removes the stored one. An extra consent
          // asked on this edit (CV or health words) is recorded on the server too.
          ...(attachment ? { attachment, consent } : extra.attachment === null ? { attachment: null } : {}),
          ...(!attachment && extra.sensitive ? { consent } : {}),
        });
      else if (existing?.mode === "auto") await deleteBackgroundTask(csrf, existing.id);
      try {
        // The document's masking map stays in the vault, to put its values back into results.
        await changeTasks(vault!, existing ? replaceTask(task) : addTask(task), extra.masks && attachment ? { [task.id]: extra.masks } : undefined);
      } catch (error) {
        // The vault refused: the new server copy must not stay behind without a record here.
        if (task.mode === "auto" && existing?.mode !== "auto") await deleteBackgroundTask(csrf, task.id).catch(() => {});
        throw error;
      }
      if (!existing && task.notify.calendar) saveCalendar([task], false, lang);
    }, existing ? t.saved : t.created);
  }
  const pause = (task: ScheduledTask) =>
    apply(async () => {
      const paused = !task.paused;
      if (task.mode === "auto") await updateBackgroundTask(csrf, task.id, { paused });
      const { paused: _was, ...rest } = task;
      await changeTasks(vault!, replaceTask(paused ? { ...rest, paused: true } : rest));
    }, task.paused ? t.resumed : t.pausedDone);
  const remove = (task: ScheduledTask) =>
    apply(async () => {
      if (task.mode === "auto")
        await deleteBackgroundTask(csrf, task.id).catch((error) => {
          // Already gone on the server: the vault copy may still go.
          if (!(error instanceof BackgroundTasksError && error.status === 404)) throw error;
        });
      await changeTasks(vault!, removeTask(task.id));
    }, t.deleted);
  const templates: { name: string; text: string; draft: TaskDraft; auto?: boolean }[] = [
    {
      name: t.templateWordName,
      text: t.templateWordText,
      draft: { name: t.templateWordName, instruction: t.templateWordInstruction, answerMode: "fast", trigger: { ...defaultTrigger(), time: "08:00" } },
    },
    {
      name: t.templateMealsName,
      text: t.templateMealsText,
      draft: {
        name: t.templateMealsName,
        instruction: t.templateMealsInstruction,
        trigger: { ...defaultTrigger(), unit: "week", weekday: 0, time: "10:00" },
      },
    },
    {
      name: t.templateMoneyName,
      text: t.templateMoneyText,
      draft: {
        name: t.templateMoneyName,
        instruction: t.templateMoneyInstruction,
        trigger: { ...defaultTrigger(), unit: "month", dayOfMonth: 1, time: "18:00" },
      },
    },
    {
      // The owner's test case: needs Auto and the search. Without them it opens as Manual.
      name: t.templateJobsName,
      text: t.templateJobsText,
      auto: true,
      draft: {
        name: t.templateJobsName,
        instruction: t.templateJobsInstruction,
        trigger: { ...defaultTrigger(), time: "07:00" },
        mode: status?.backgroundTasks ? "auto" : "manual",
        useSearch: !!status?.search,
        ...(status?.search ? { searchText: t.templateJobsSearch } : {}),
      },
    },
  ];
  const editing = form?.id ? tasks.find((task) => task.id === form.id) : undefined;
  return (
    <dialog
      ref={dialog}
      className="scheduled-dialog"
      onKeyDown={containDialogFocus}
      aria-labelledby={`${id}-title`}
      onCancel={(event) => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        onClose();
      }}
    >
      <header className="project-dialog-header">
        <h2 id={`${id}-title`} ref={heading} tabIndex={-1}>
          <Icon name="clock" />
          {t.title}
        </h2>
        <button type="button" className="icon-button" aria-label={t.close} onClick={onClose}>
          <Icon name="close" />
        </button>
      </header>
      <p className="muted scheduled-intro">{t.intro}</p>
      {!unlocked || !vault ? (
        <p className="scheduled-locked">{t.locked}</p>
      ) : (
        <>
          <div className="scheduled-bar">
            <div className="scheduled-tabs" role="group" aria-label={t.tabs}>
              {(["yours", "templates"] as const).map((name) => (
                <button key={name} type="button" aria-pressed={tab === name} onClick={() => setTab(name)}>
                  {name === "yours" ? t.yours : t.templates}
                </button>
              ))}
            </div>
            <button type="button" className="primary" onClick={() => setForm({})}>
              <Icon name="plus" />
              {t.newTask}
            </button>
          </div>
          <p className="scheduled-message" aria-live="polite">
            {message}
          </p>
          {tab === "templates" ? (
            <>
              <p className="muted">{t.templatesIntro}</p>
              <ul className="scheduled-templates">
                {templates.map((template) => (
                  <li key={template.name}>
                    <strong>{template.name}</strong>
                    <p className="muted">{template.text}</p>
                    {template.auto && (
                      <p className="scheduled-needs">
                        {template.auto && status?.backgroundTasks ? <BackgroundBadge /> : null} {t.needsAuto}
                        {!status?.backgroundTasks ? ` · ${t.notAvailable}` : ""}
                      </p>
                    )}
                    <button type="button" onClick={() => setForm(template.draft)} aria-label={`${t.useTemplate}: ${template.name}`}>
                      {t.useTemplate}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : !tasks.length ? (
            <div className="scheduled-empty">
              <h3>{t.emptyTitle}</h3>
              <p className="muted">{t.emptyText}</p>
              <div className="scheduled-actions">
                <button type="button" onClick={() => setForm({})}>
                  {t.setUp}
                </button>
                <button type="button" onClick={() => setTab("templates")}>
                  {t.templates}
                </button>
              </div>
            </div>
          ) : (
            <ul className="scheduled-list" aria-label={t.listLabel}>
              {tasks.map((task) => {
                const cost = costOf(status, task.answerMode, task.instruction);
                return (
                  <li key={task.id} className={due.has(task.id) ? "is-due" : undefined}>
                    <div className="scheduled-row-head">
                      <strong id={`task-${task.id}`}>{task.name}</strong>
                      {task.mode === "auto" ? <BackgroundBadge /> : <span className="scheduled-chip">{t.manual}</span>}
                      {task.paused && <span className="scheduled-chip">{t.paused}</span>}
                      {due.has(task.id) && <span className="scheduled-chip is-due">{t.dueNow}</span>}
                    </div>
                    {task.mode === "auto" && <p className="muted">{t.badgeLine}</p>}
                    <p>{t.trigger(task.trigger)}</p>
                    <p className="muted">
                      {task.paused ? t.paused : t.next(when(task.nextDueAt, lang))} ·{" "}
                      {task.lastRunAt ? t.lastRun(when(task.lastRunAt, lang)) : t.notRun}
                    </p>
                    <div className="scheduled-actions" role="group" aria-label={t.actionsFor(task.name)}>
                      {task.mode === "manual" && (
                        <button
                          type="button"
                          className={due.has(task.id) ? "primary" : undefined}
                          disabled={busy || !status?.inference.ready}
                          aria-describedby={`task-${task.id}`}
                          onClick={() => onRun(task)}
                        >
                          {t.runNow}
                          {cost !== undefined && <small> · {t.runCost(cost)}</small>}
                        </button>
                      )}
                      <button type="button" aria-describedby={`task-${task.id}`} onClick={() => setForm({ ...task })}>
                        {t.edit}
                      </button>
                      <button type="button" aria-describedby={`task-${task.id}`} onClick={() => void pause(task)}>
                        {task.paused ? t.resume : t.pause}
                      </button>
                      <button
                        type="button"
                        aria-describedby={`task-${task.id}`}
                        onClick={() => {
                          saveCalendar([task], names, lang);
                          setMessage(t.calendarSaved);
                        }}
                      >
                        {t.exportOne}
                      </button>
                      <button type="button" aria-describedby={`task-${task.id}`} onClick={() => setAsking(task)}>
                        {t.delete}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {tab === "yours" && !!tasks.length && (
            <div className="scheduled-foot">
              <label className="scheduled-check">
                <input type="checkbox" checked={names} onChange={(event) => setNames(event.target.checked)} />
                {t.namesInCalendar}
              </label>
              <p className="muted">{t.calendarNote}</p>
              <button
                type="button"
                disabled={!manual.length}
                onClick={() => {
                  saveCalendar(manual.filter((task) => !task.paused), names, lang);
                  setMessage(t.calendarSaved);
                }}
              >
                {t.exportAll}
              </button>
              <p className="muted">
                {t.counts(manual.length, SCHEDULE_LIMITS.maxManualTasks, autoCount, status?.backgroundTasks ? maxAuto : SCHEDULE_LIMITS.maxAutoTasks)}
              </p>
            </div>
          )}
          {form && (
            <TaskForm
              storage={storage}
              draft={form}
              existing={editing}
              status={status}
              autoFull={autoCount >= maxAuto && editing?.mode !== "auto"}
              loadMasks={async () => (editing?.mode === "auto" ? ((await vault.readTaskMasks())[editing.id] ?? []) : [])}
              onClose={() => setForm(undefined)}
              onSubmit={async (fields, extra) => {
                const ok = await submit(fields, editing, extra);
                if (ok) {
                  setForm(undefined);
                  setTab("yours");
                }
                return ok;
              }}
            />
          )}
          {asking && (
            <ConfirmDialog
              title={t.deleteTitle(asking.name)}
              text={asking.mode === "auto" ? t.deleteBackgroundText : t.deleteText}
              confirmLabel={t.delete}
              cancelLabel={t.cancel}
              fallback={() => heading.current}
              onClose={(confirmed) => {
                const task = asking;
                setAsking(undefined);
                if (confirmed) void remove(task);
              }}
            />
          )}
        </>
      )}
    </dialog>
  );
}

function TaskForm({
  draft,
  existing,
  status,
  autoFull,
  loadMasks,
  onClose,
  onSubmit,
  storage,
}: {
  draft: TaskDraft;
  existing?: ScheduledTask;
  status?: AppStatus;
  autoFull: boolean;
  /** The task's masking map so far (empty for a new task). */
  loadMasks: () => Promise<KeptIdentifier[]>;
  onClose: () => void;
  onSubmit: (fields: TaskFields, extra: FormExtra) => Promise<boolean>;
  storage?: Storage;
}) {
  const { lang } = useLang();
  const t = forStorage(scheduledText[lang], storage);
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const start = fieldsOf(draft);
  const [name, setName] = useState(start.name);
  const [instruction, setInstruction] = useState(start.instruction);
  const [answerMode, setAnswerMode] = useState(start.answerMode);
  const [unit, setUnit] = useState<ScheduleUnit>(start.trigger.unit);
  const [every, setEvery] = useState(String(start.trigger.every));
  const [weekday, setWeekday] = useState(start.trigger.weekday ?? new Date().getDay());
  const [dayOfMonth, setDayOfMonth] = useState(start.trigger.dayOfMonth ?? Math.min(new Date().getDate(), 28));
  const [time, setTime] = useState(start.trigger.time);
  const [inApp, setInApp] = useState(start.notify.inApp);
  const [calendar, setCalendar] = useState(start.notify.calendar);
  const autoOn = !!status?.backgroundTasks;
  const [mode, setMode] = useState(autoOn ? start.mode : "manual");
  const [useSearch, setUseSearch] = useState(!!status?.search && start.useSearch);
  const [searchText, setSearchText] = useState(start.searchText ?? "");
  // Consent is given at the choice, for this task: an existing background task already has it.
  const [consent, setConsent] = useState(existing?.mode === "auto");
  // The extra consents (docs/background-tasks-consent-draft-20261115.md): each unticked at first.
  const [documentConsent, setDocumentConsent] = useState(false);
  const [cvConsent, setCvConsent] = useState(false);
  const [healthConsent, setHealthConsent] = useState(false);
  // One document for a background task: extracted and masked on this device, never the file.
  const [document, setDocument] = useState<{ name: string; text: string; replaced: number; shortened: boolean; kept: KeptIdentifier[] }>();
  const [reading, setReading] = useState("");
  const [removeStored, setRemoveStored] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    element?.querySelector<HTMLElement>("input, textarea")?.focus();
    return () => element?.close();
  }, []);
  const auto = mode === "auto";
  const search = useMemo(() => editedSearchText(searchText, {}, lang), [searchText, lang]);
  const sensitive = looksSensitive(`${name}\n${instruction}\n${useSearch ? searchText : ""}\n${document?.text ?? ""}`);
  const asksDocument = auto && !!document;
  const asksCv = auto && !document && sensitive.cv;
  const asksHealth = auto && sensitive.health;
  // The server refuses identifiers in these fields; the document is masked by itself.
  const identifiers = auto && findIdentifiers(`${name}\n${instruction}\n${useSearch ? search.value : ""}`).length > 0;
  // On the server "Auto" runs as Fast; a search adds 1 unit and a document 2 (Agent A's weights).
  const cost = auto
    ? (() => {
        const base = costOf(status, answerMode === "thinking" ? "thinking" : "fast", instruction);
        return base === undefined ? undefined : base + (useSearch ? 1 : 0) + (document ? 2 : 0);
      })()
    : costOf(status, answerMode, instruction);
  const everyNumber = Number(every);
  async function readDocument(file: File) {
    setReading(t.attachReading);
    try {
      const extracted = await extract(file, new AbortController().signal, () => {});
      const whole = extracted.sources.map((source) => source.text).join("\n\n");
      // A replaced document continues the task's map, so placeholders in earlier results keep their values.
      const session = createMaskingSession(await loadMasks().catch(() => []));
      const masked = session.mask(whole);
      const text = masked.slice(0, ATTACHMENT_LIMIT);
      setDocument({
        name: file.name,
        text,
        replaced: new Set(text.match(/\{\{[A-Z-]+-\d+\}\}/g)).size,
        shortened: masked.length > ATTACHMENT_LIMIT,
        kept: [...session.kept],
      });
      setDocumentConsent(false);
      setReading("");
    } catch (error) {
      // Extraction messages are already in the interface language.
      setReading((error as Error).message);
    }
  }
  const errors = {
    name: !name.trim() ? t.errorName : name.trim().length > SCHEDULE_LIMITS.name ? t.errorNameLong : "",
    instruction: !instruction.trim()
      ? t.errorInstruction
      : instruction.trim().length > SCHEDULE_LIMITS.instruction
        ? t.errorInstructionLong
        : "",
    every: Number.isInteger(everyNumber) && everyNumber >= 1 && everyNumber <= 31 ? "" : t.errorEvery,
    time: /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? "" : t.errorTime,
    search: useSearch && search.problem ? (search.problem === "long" ? t.errorSearchLong : t.errorSearch) : "",
    identifiers: identifiers ? t.errorIdentifiers : "",
    consent: auto && !consent ? t.errorConsent : "",
    document: asksDocument && !documentConsent ? t.errorConsent : "",
    cv: asksCv && !cvConsent ? t.errorConsent : "",
    health: asksHealth && !healthConsent ? t.errorConsent : "",
  };
  const shown = (key: keyof typeof errors) => (tried ? errors[key] : "");
  const described = (key: keyof typeof errors) => (shown(key) ? { "aria-invalid": true, "aria-describedby": `${id}-${key}-error` } : {});
  const error = (key: keyof typeof errors) =>
    shown(key) ? (
      <p className="warning" id={`${id}-${key}-error`}>
        {shown(key)}
      </p>
    ) : null;
  const zone = start.trigger.timeZone;
  return (
    <dialog
      ref={dialog}
      className="scheduled-form-dialog"
      onKeyDown={containDialogFocus}
      aria-labelledby={`${id}-title`}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
    >
      <form
        noValidate
        onSubmit={async (event) => {
          event.preventDefault();
          setTried(true);
          const first = Object.entries(errors).find(([, text]) => text)?.[0];
          if (first) {
            // Focus the first field with a problem.
            requestAnimationFrame(() => dialog.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
            return;
          }
          setSaving(true);
          const ok = await onSubmit(
            {
              name: name.trim(),
              instruction: instruction.trim(),
              trigger: {
                every: everyNumber,
                unit,
                time,
                timeZone: zone,
                ...(unit === "week" ? { weekday } : {}),
                ...(unit === "month" ? { dayOfMonth } : {}),
              },
              mode,
              notify: { inApp, calendar },
              answerMode,
              useSearch,
              ...(useSearch ? { searchText: search.value } : {}),
              ...(existing?.paused ? { paused: true } : {}),
            },
            {
              sensitive: asksDocument || asksCv || asksHealth,
              ...(asksDocument ? { attachment: document!.text, masks: document!.kept } : auto && removeStored ? { attachment: null } : {}),
            },
          );
          setSaving(false);
          if (!ok) dialog.current?.querySelector<HTMLElement>("button[type=submit]")?.focus();
        }}
      >
        <h2 id={`${id}-title`}>{existing ? t.formEdit : t.formNew}</h2>
        <label htmlFor={`${id}-name`}>{t.name}</label>
        <input
          id={`${id}-name`}
          value={name}
          maxLength={SCHEDULE_LIMITS.name + 20}
          placeholder={t.namePlaceholder}
          onChange={(event) => setName(event.target.value)}
          {...described("name")}
        />
        {error("name")}
        <label htmlFor={`${id}-instruction`}>{t.instruction}</label>
        <textarea
          id={`${id}-instruction`}
          rows={5}
          value={instruction}
          placeholder={t.instructionPlaceholder}
          onChange={(event) => setInstruction(event.target.value)}
          {...described("instruction")}
        />
        <p className="muted scheduled-length">{t.length(instruction.trim().length, SCHEDULE_LIMITS.instruction)}</p>
        {error("instruction")}
        <label htmlFor={`${id}-answer`}>{t.answerMode}</label>
        <select id={`${id}-answer`} value={answerMode} onChange={(event) => setAnswerMode(event.target.value as TaskFields["answerMode"])}>
          {(["auto", "fast", "thinking"] as const).map((choice) => (
            <option key={choice} value={choice}>
              {MODE_NAMES[choice]}
            </option>
          ))}
        </select>
        <fieldset className="scheduled-trigger">
          <legend>{t.schedule}</legend>
          <div className="scheduled-trigger-row">
            <label>
              {t.repeat}
              <select value={unit} onChange={(event) => setUnit(event.target.value as ScheduleUnit)}>
                <option value="hour" disabled>
                  {t.hourly}
                </option>
                <option value="day">{t.daily}</option>
                <option value="week">{t.weekly}</option>
                <option value="month">{t.monthly}</option>
              </select>
            </label>
            <label>
              {t.every}
              <span className="scheduled-every">
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={31}
                  value={every}
                  onChange={(event) => setEvery(event.target.value)}
                  {...described("every")}
                />
                <span>{t.unitWord(unit, everyNumber)}</span>
              </span>
            </label>
            {unit === "week" && (
              <label>
                {t.weekday}
                <select value={weekday} onChange={(event) => setWeekday(Number(event.target.value))}>
                  {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                    <option key={day} value={day}>
                      {t.weekdayName(day)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {unit === "month" && (
              <label>
                {t.dayOfMonth}
                <select value={dayOfMonth} onChange={(event) => setDayOfMonth(Number(event.target.value))}>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              {t.time}
              <input type="time" value={time} required onChange={(event) => setTime(event.target.value)} {...described("time")} />
            </label>
          </div>
          {error("every")}
          {error("time")}
          <p className="muted">
            {t.timeZone(zone)} {t.shortestNote}
          </p>
        </fieldset>
        <fieldset className="scheduled-mode">
          <legend>{t.howItRuns}</legend>
          <label className="scheduled-choice">
            <input type="radio" name={`${id}-mode`} checked={mode === "manual"} onChange={() => setMode("manual")} />
            <span>
              <strong>{t.modeManual}</strong> {t.modeManualText}
            </span>
          </label>
          <label className="scheduled-choice">
            <input
              type="radio"
              name={`${id}-mode`}
              checked={mode === "auto"}
              disabled={!autoOn || autoFull}
              onChange={() => setMode("auto")}
            />
            <span>
              <strong>{t.modeAuto}</strong> {t.modeAutoText}
              {!autoOn ? <em> {t.notAvailable}</em> : autoFull ? <em> {t.problem("autoFull")}</em> : null}
            </span>
          </label>
          {auto && (
            <div className="scheduled-consent">
              <BackgroundBadge />
              {answerMode === "auto" && <p>{t.autoRunsFast}</p>}
              <div className="scheduled-attach">
                <input
                  ref={fileInput}
                  type="file"
                  hidden
                  accept={DOCUMENT_ACCEPT.replace(/,\.(png|jpe?g)\b/g, "")}
                  aria-label={t.attach}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) void readDocument(file);
                  }}
                />
                {document ? (
                  <p>
                    <Icon name="file" /> {t.attached(document.name, document.text.length.toLocaleString(lang), document.replaced)}{" "}
                    <button type="button" onClick={() => setDocument(undefined)}>
                      {t.attachRemove}
                    </button>
                  </p>
                ) : (
                  <button type="button" onClick={() => fileInput.current?.click()}>
                    <Icon name="file" />
                    {t.attach}
                  </button>
                )}
                <p className="muted">{reading || t.attachNote}</p>
                {document?.shortened && <p className="warning">{t.attachShortened}</p>}
                {existing?.mode === "auto" && !document && (
                  <label className="scheduled-check">
                    <input type="checkbox" checked={removeStored} onChange={(event) => setRemoveStored(event.target.checked)} />
                    {t.attachStoredRemove}
                  </label>
                )}
              </div>
              {error("identifiers")}
              <h3>{t.consentTitle}</h3>
              {t
                .consentBody(RESULT_RETENTION_DAYS)
                .split("\n\n")
                .map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              <label className="scheduled-check">
                <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} {...described("consent")} />
                {t.autoConsent}
              </label>
              {error("consent")}
              {asksDocument && (
                <>
                  <h3>{t.documentTitle}</h3>
                  <p>{t.documentBody}</p>
                  <label className="scheduled-check">
                    <input
                      type="checkbox"
                      checked={documentConsent}
                      onChange={(event) => setDocumentConsent(event.target.checked)}
                      {...described("document")}
                    />
                    {t.documentConsent}
                  </label>
                  {error("document")}
                </>
              )}
              {asksCv && (
                <>
                  <h3>{t.cvTitle}</h3>
                  <p>{t.cvBody}</p>
                  <label className="scheduled-check">
                    <input type="checkbox" checked={cvConsent} onChange={(event) => setCvConsent(event.target.checked)} {...described("cv")} />
                    {t.cvConsent}
                  </label>
                  {error("cv")}
                </>
              )}
              {asksHealth && (
                <>
                  <h3>{t.healthTitle}</h3>
                  <p>{t.healthBody}</p>
                  <label className="scheduled-check">
                    <input
                      type="checkbox"
                      checked={healthConsent}
                      onChange={(event) => setHealthConsent(event.target.checked)}
                      {...described("health")}
                    />
                    {t.healthConsent}
                  </label>
                  {error("health")}
                </>
              )}
            </div>
          )}
        </fieldset>
        <details className="scheduled-advanced">
          <summary>{t.advanced}</summary>
          <fieldset>
            <legend>{t.notifications}</legend>
            <label className="scheduled-check">
              <input type="checkbox" checked={inApp} onChange={(event) => setInApp(event.target.checked)} />
              {t.notifyInApp}
            </label>
            <label className="scheduled-check">
              <input type="checkbox" checked={calendar} onChange={(event) => setCalendar(event.target.checked)} />
              {t.notifyCalendar}
            </label>
            <label className="scheduled-check">
              <input type="checkbox" disabled />
              {t.notifyEmail} <em>({t.later})</em>
            </label>
            <label className="scheduled-check">
              <input type="checkbox" disabled />
              {t.notifyPush} <em>({t.later})</em>
            </label>
          </fieldset>
          {status?.search ? (
            <div>
              <label className="scheduled-check">
                <input type="checkbox" checked={useSearch} onChange={(event) => setUseSearch(event.target.checked)} />
                {t.search}
              </label>
              {useSearch && (
                <>
                  <p className="muted">{t.searchNote}</p>
                  <label htmlFor={`${id}-search`}>{t.searchText}</label>
                  <input
                    id={`${id}-search`}
                    value={searchText}
                    maxLength={400}
                    onChange={(event) => setSearchText(event.target.value)}
                    {...described("search")}
                  />
                  {search.value !== searchText.trim() && search.value && <p className="muted">{t.searchSent(search.value)}</p>}
                  {error("search")}
                </>
              )}
            </div>
          ) : (
            <p className="muted">{t.searchUnavailable}</p>
          )}
        </details>
        <p className="scheduled-cost">{cost !== undefined ? t.cost(cost) : t.costUnknown}</p>
        <div className="confirm-actions">
          <button type="button" onClick={onClose}>
            {t.cancel}
          </button>
          <button type="submit" className="primary" disabled={saving}>
            {existing ? t.save : t.create}
          </button>
        </div>
      </form>
    </dialog>
  );
}
