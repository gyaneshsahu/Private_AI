import { useState } from "react";

export function VaultSecurity({
  busy,
  blocked,
  onChange,
}: {
  busy: boolean;
  blocked: boolean;
  onChange: (current: string, next: string) => Promise<void>;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const disabled = busy || blocked;
  return (
    <section className="panel" aria-label="Vault passphrase security">
      <h3>Change vault passphrase</h3>
      <p>Choose a different passphrase of at least 12 characters.</p>
      {blocked && (
        <p role="status">
          Some saved snapshots could not be read. Passphrase changes are
          unavailable so those records stay untouched. Keep your existing
          backups.
        </p>
      )}
      <p>
        Updates all saved conversations in this browser together, then locks
        this vault and clears this workspace. Other open tabs receive a lock
        notification. Save work in every tab first. Account sign-in is separate.
      </p>
      <p>
        Older downloaded backups still need their original passphrase. This
        cannot revoke those copies or recover a forgotten passphrase. Make a
        fresh encrypted backup after changing it.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (
            disabled ||
            !acknowledged ||
            !current ||
            next.length < 12 ||
            next === current ||
            next !== confirmation
          )
            return;
          const oldSecret = current,
            newSecret = next;
          setCurrent("");
          setNext("");
          setConfirmation("");
          setAcknowledged(false);
          void onChange(oldSecret, newSecret);
        }}
      >
        <label>
          Current vault passphrase
          <input
            type="password"
            autoComplete="off"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            disabled={disabled}
            required
          />
        </label>
        <label>
          New vault passphrase
          <input
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            disabled={disabled}
            minLength={12}
            required
          />
        </label>
        <label>
          Confirm new vault passphrase
          <input
            type="password"
            autoComplete="new-password"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            disabled={disabled}
            minLength={12}
            required
          />
        </label>
        {confirmation && confirmation !== next && (
          <p role="status">The new passphrases do not match.</p>
        )}
        <label className="row">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            disabled={disabled}
          />
          I have saved work I need in every open tab; older backups keep their
          original passphrase.
        </label>
        <button
          disabled={
            disabled ||
            !current ||
            !acknowledged ||
            next.length < 12 ||
            next === current ||
            next !== confirmation
          }
        >
          Change passphrase and lock
        </button>
      </form>
    </section>
  );
}
