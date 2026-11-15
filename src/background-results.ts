/**
 * Background results into the vault (Auto mode, docs/scheduled-20261115.md). Each finished result
 * is saved as a new conversation, with the original values of its task's masked document put back
 * exactly as chat does for its own answers, and only then acknowledged, so the server deletes it.
 * Two open tabs never save one result twice: a Web Lock lets one tab at a time do this, and the
 * conversation's id is the result's id, so the vault itself refuses a second save of the same
 * result (also where Web Locks are missing, or a saved result's acknowledgement was lost).
 */
import { emptyConversation } from "../shared/contracts";
import { ackBackgroundResult, listBackgroundResults } from "./background-tasks-client";
import { newMessage } from "./conversation";
import { createMaskingSession } from "./identifier-masking";
import { heldTasks, holdTasks, replaceTask } from "./scheduled";
import type { scheduledText } from "./text/scheduled";
import { ConversationDeletedError, VaultConflictError, type Vault } from "./vault";

type Words = (typeof scheduledText)["en"];
export const RESULTS_LOCK = "cometrow-background-results";

/** Saves and acknowledges the waiting results; returns how many were saved as conversations. */
export async function collectBackgroundResults(
  vault: Vault,
  csrf: string,
  t: Words,
  when: (iso: string) => string,
  onProblem: (line: string) => void,
  stopped: () => boolean = () => false,
): Promise<number> {
  const work = async () => {
    const results = await listBackgroundResults(csrf);
    const masks = results.some((result) => result.text) ? await vault.readTaskMasks() : {};
    const update = (change: ReturnType<typeof replaceTask>) => vault.writeTasks(change).then(holdTasks, () => {});
    let saved = 0;
    for (const result of results) {
      if (stopped() || !vault.unlocked) break;
      const task = heldTasks().find((item) => item.id === result.taskId);
      const name = task?.name ?? t.unknownTask;
      if (result.status === "done" && result.text) {
        const at = result.ranAt;
        try {
          await vault.save(
            {
              ...emptyConversation(),
              id: result.id,
              title: t.resultTitle(name).slice(0, 120),
              createdAt: at,
              messages: [
                { ...newMessage("user", task?.instruction ?? name), at },
                // The run's web results are not kept (as for a saved search): no sources to show.
                { ...newMessage("assistant", createMaskingSession(masks[result.taskId]).restore(result.text)), at, sourceSnapshot: [] },
              ],
            },
            null,
          );
          saved++;
          if (task) await update(replaceTask({ ...task, lastRunAt: at }));
        } catch (error) {
          // Saved before (another tab, or an acknowledgement that was lost) or deleted since: only the acknowledgement is missing.
          if (!(error instanceof VaultConflictError || error instanceof ConversationDeletedError)) throw error;
        }
      } else if (result.status === "done") {
        // The search found nothing new: no model request was made.
        onProblem(t.resultNothingNew(name, when(result.ranAt)));
        if (task) await update(replaceTask({ ...task, lastRunAt: result.ranAt }));
      } else {
        onProblem(
          (result.status === "skipped" ? t.resultSkipped : t.resultFailed)(
            name,
            when(result.ranAt),
            result.reason ? t.reason(result.reason) : t.reasonUnknown,
          ),
        );
        // The server paused the task itself: the vault copy shows it paused too.
        if (task && /^(paused_allowance|failed_unreadable)$/.test(result.reason ?? "")) await update(replaceTask({ ...task, paused: true }));
      }
      // Only after the result is saved (or shown): then the server deletes it.
      await ackBackgroundResult(csrf, result.id);
    }
    return saved;
  };
  const locks = typeof navigator === "undefined" ? undefined : navigator.locks;
  if (!locks) return work();
  // Another tab is at it right now: this one leaves the round to it.
  return locks.request(RESULTS_LOCK, { ifAvailable: true }, (lock) => (lock ? work() : 0));
}
