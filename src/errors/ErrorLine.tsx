// Error states (docs/error-states-20261126.md): the one line shown where an answer or an image
// would be when it failed or stopped. Plain words and no codes; it says what is safe and what was
// lost, and offers Retry. While the device is offline it says so, and Retry waits for the
// connection. An answer the user stopped is not an error: the same line, without the red.
import { useOnline } from "../ConnectionBanner";
import { Icon } from "../Icon";
import { useText } from "../i18n";
import { errorText } from "../text/errors";
import "./errors.css";

export function ErrorLine(props: {
  /** The answer's failure kind (shared/contracts.ts), or "image" for a picture that could not be made. */
  kind: string;
  /** Some of the answer arrived before it failed. */
  partial?: boolean;
  onRetry?: () => void;
}) {
  const t = useText(errorText);
  const online = useOnline();
  const image = props.kind === "image";
  const calm = props.kind === "stopped";
  const line = calm
    ? t.stopped
    : !online
      ? image
        ? t.imageOffline
        : t.offline
      : image
        ? t.image
        : props.kind === "timeout"
          ? t.timeout
          : props.kind === "busy" || props.kind === "capacity"
            ? t.busy
            : t.generic;
  const lost = image || calm ? "" : props.partial ? t.partKept : t.nothingArrived;
  return (
    <div className={calm ? "error-line calm" : "error-line"} role="status">
      <p>
        <strong>{line}</strong>
        {lost && <span> {lost}</span>}
        {!online && props.onRetry && <span> {t.whenOnline}</span>}
      </p>
      {props.onRetry && (
        <button type="button" disabled={!online} onClick={props.onRetry}>
          <Icon name="retry" />
          {t.retry}
        </button>
      )}
    </div>
  );
}
