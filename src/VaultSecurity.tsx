import { useState } from "react";
import { useText } from "./i18n";
import { vaultSecurityText } from "./text/vault-ui";

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
  const t = useText(vaultSecurityText);
  return (
    <section className="panel" aria-label={t.label}>
      <h3>{t.heading}</h3>
      <p>{t.intro}</p>
      {blocked && <p role="status">{t.blocked}</p>}
      <p>{t.updates}</p>
      <p>{t.older}</p>
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
          {t.current}
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
          {t.next}
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
          {t.confirm}
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
          <p role="status">{t.mismatch}</p>
        )}
        <label className="row">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            disabled={disabled}
          />
          {t.acknowledge}
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
          {t.submit}
        </button>
      </form>
    </section>
  );
}
