/**
 * Three-way merge rules for sync (docs/vault-sync-20261115.md, "Merge rules"). `base` is the last
 * version this device synced, `local` the device's current one, `remote` the server's newer one.
 * Pure functions: nothing is lost silently; when both sides changed the same element differently,
 * the newer one wins and the other is kept as a conflict copy (lists) or the newer edit wins per
 * message (conversations, branches kept).
 */
import type { Conversation, ConversationBranch, Message } from "../../shared/contracts";

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
type WithId = { id: string };

export interface ListRules<T> {
  /** True when `a` is newer than `b`; without it the remote side wins. */
  newer?: (a: T, b: T) => boolean;
  /** Settles a both-changed pair without a copy (for example a task run on two devices). */
  settle?: (local: T, remote: T) => T | undefined;
  /** The loser, kept under a new id. */
  copy: (loser: T) => T;
}

/** Merges two lists of elements with ids against their common base. */
export function mergeById<T extends WithId>(base: readonly T[], local: readonly T[], remote: readonly T[], rules: ListRules<T>) {
  const b = new Map(base.map((x) => [x.id, x]));
  const l = new Map(local.map((x) => [x.id, x]));
  const r = new Map(remote.map((x) => [x.id, x]));
  const ids = [...new Set([...remote.map((x) => x.id), ...local.map((x) => x.id)])];
  const merged: T[] = [];
  const copies: T[] = [];
  for (const id of ids) {
    const [bx, lx, rx] = [b.get(id), l.get(id), r.get(id)];
    const localChanged = !same(lx, bx),
      remoteChanged = !same(rx, bx);
    let pick: T | undefined;
    if (!localChanged) pick = rx;
    else if (!remoteChanged || same(lx, rx)) pick = lx;
    // Edited on one side, deleted on the other: the edit is kept.
    else if (!lx || !rx) pick = lx ?? rx;
    else {
      const settled = rules.settle?.(lx, rx);
      if (settled) pick = settled;
      else {
        const localWins = rules.newer?.(lx, rx) ?? false;
        pick = localWins ? lx : rx;
        copies.push(rules.copy(localWins ? rx : lx));
      }
    }
    if (pick) merged.push(pick);
  }
  return { merged: [...merged, ...copies], copies: copies.length };
}

/** Messages by id: union, the newer edit (by `at`) wins per message, remote order with local additions in place. */
export function mergeMessages(base: readonly Message[], local: readonly Message[], remote: readonly Message[]): Message[] {
  const b = new Map(base.map((m) => [m.id, m]));
  const l = new Map(local.map((m) => [m.id, m]));
  const r = new Map(remote.map((m) => [m.id, m]));
  const decide = (id: string): Message | undefined => {
    const [bx, lx, rx] = [b.get(id), l.get(id), r.get(id)];
    if (same(lx, bx)) return rx;
    if (same(rx, bx) || same(lx, rx)) return lx;
    if (!lx || !rx) return lx ?? rx;
    return (lx.at ?? "") > (rx.at ?? "") ? lx : rx;
  };
  const order = remote.map((m) => m.id);
  local.forEach((m, index) => {
    if (r.has(m.id)) return;
    // Deleted on the other side and unchanged here: it goes. Edited here: the edit is kept (review L4).
    if (b.has(m.id) && decide(m.id) === undefined) return;
    // Right after the nearest message before it here that is still there; when none of those is
    // left (all deleted elsewhere), after the rest rather than first (review L4).
    let before = -1;
    for (let i = index - 1; i >= 0 && before < 0; i--) before = order.indexOf(local[i].id);
    if (before < 0 && index > 0) before = order.length - 1;
    order.splice(before + 1, 0, m.id);
  });
  return order.map(decide).filter((m): m is Message => !!m);
}

type Branch = ConversationBranch;
function branchesOf(c: Conversation): { active: string; map: Map<string, Branch> } {
  const active = c.branches?.activeId ?? "main";
  const map = new Map<string, Branch>([
    [active, { id: active, label: c.branches?.activeLabel ?? "main", messages: c.messages, attachments: c.attachments, draft: c.draft ?? "" }],
  ]);
  for (const a of c.branches?.archived ?? []) map.set(a.id, a);
  return { active, map };
}
const pick3 = <T>(b: T, l: T, r: T): T => (same(l, b) ? r : same(r, b) ? l : r);
const attachmentRules: ListRules<Conversation["attachments"][number]> = { copy: (a) => ({ ...a, id: `${a.id}-copy` }) };

/**
 * A conversation edited on two devices: fields three-way (remote wins when both changed one),
 * messages by id with the newer edit winning, attachments by id, every branch kept.
 */
export function mergeConversation(base: Conversation | undefined, local: Conversation, remote: Conversation): Conversation {
  const empty: Conversation = { ...remote, messages: [], attachments: [], usage: [], branches: undefined };
  const B = branchesOf(base ?? empty),
    L = branchesOf(local),
    R = branchesOf(remote);
  const ids = [...new Set([R.active, ...R.map.keys(), L.active, ...L.map.keys()])];
  const branches = new Map<string, Branch>();
  for (const id of ids) {
    const [bx, lx, rx] = [B.map.get(id), L.map.get(id), R.map.get(id)];
    if (!lx || !rx) {
      const kept = same(lx, bx) ? rx : same(rx, bx) ? lx : (lx ?? rx);
      if (kept) branches.set(id, kept);
      continue;
    }
    branches.set(id, {
      ...rx,
      id,
      label: pick3(bx?.label, lx.label, rx.label) ?? rx.label,
      draft: pick3(bx?.draft, lx.draft, rx.draft) ?? rx.draft,
      messages: mergeMessages(bx?.messages ?? [], lx.messages, rx.messages),
      attachments: mergeById(bx?.attachments ?? [], lx.attachments, rx.attachments, attachmentRules).merged,
    });
  }
  let active = pick3(B.active, L.active, R.active);
  if (!branches.has(active)) active = branches.keys().next().value ?? "main";
  const current = branches.get(active) ?? { id: active, label: "main", messages: [], attachments: [], draft: "" };
  const out: Conversation = { ...remote };
  const fields = new Set([...Object.keys(local), ...Object.keys(remote), ...Object.keys(base ?? {})]);
  for (const key of fields) {
    if (["id", "messages", "attachments", "usage", "branches", "draft"].includes(key)) continue;
    const k = key as keyof Conversation;
    const value = pick3(base?.[k], local[k], remote[k]);
    if (value === undefined) delete out[k];
    else (out as unknown as Record<string, unknown>)[k] = value;
  }
  out.id = local.id;
  out.messages = current.messages;
  out.attachments = current.attachments;
  if (current.draft) out.draft = current.draft;
  else if (local.draft === undefined && remote.draft === undefined) delete out.draft;
  else out.draft = "";
  out.usage = local.usage.length > remote.usage.length ? local.usage : remote.usage;
  const archived = [...branches.values()].filter((x) => x.id !== active);
  if (local.branches || remote.branches) {
    out.branches = {
      activeId: active,
      activeLabel: current.label,
      archived: archived.map((x) => ({ ...x })),
    };
  } else delete out.branches;
  return out;
}
