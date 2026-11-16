import type { RequestAllowance } from "../shared/contracts";
import { AccountBilling } from "./AccountBilling";
import { useLang } from "./i18n";
import { usageText } from "./text/account";
import { modeCopyText, type Storage } from "./text/mode-copy";
import { UsageMeter } from "./UsageMeter";
import { developerView } from "./developer-view";
import {
  isActiveAllowance,
  meteredTokensSentence,
  periodEndLabel,
  publishedCostSentence,
  requestsRemainingHeading,
  requestsUsedSentence,
  settlementSentence,
  unmeteredSentence,
  type ActiveAllowance,
} from "./account-usage-format";

/** Request counts for the current period: the admission unit, not a bill. */
function PlanAllowance({ allowance }: { allowance: ActiveAllowance }) {
  const { lang } = useLang();
  const t = usageText[lang];
  return (
    <div className="panel" aria-label={t.planLabel}>
      <h3>{requestsRemainingHeading(allowance, lang)}</h3>
      <p>{requestsUsedSentence(allowance, lang)}</p>
      <p>
        {t.periodEnds}{" "}
        <time dateTime={allowance.resetsAt}>
          {periodEndLabel(allowance, lang === "de" ? "de-DE" : undefined, lang)}
        </time>
        . {t.newAllowance}
      </p>
      <p>{settlementSentence(allowance, lang)}</p>
      {allowance.state === "exhausted" && <p role="status">{t.exhausted}</p>}
      <p className="muted">{t.countsNote}</p>
    </div>
  );
}

/** Provider metering recorded for completed requests only. */
function MeteredUsage({ allowance }: { allowance: ActiveAllowance }) {
  const { lang } = useLang();
  const t = usageText[lang];
  return (
    <div className="panel" aria-label={t.tokensLabel}>
      <h3>{t.tokensHeading}</h3>
      <p>{meteredTokensSentence(allowance, lang)}</p>
      <p>{publishedCostSentence(allowance, lang)}</p>
      <p>{unmeteredSentence(allowance, lang)}</p>
      <p className="muted">{t.costBasis}</p>
    </div>
  );
}

function NoActivePlan() {
  const t = usageText[useLang().lang];
  return (
    <p role="status">
      {t.noActivePlan} {t.paidNotEnabled}
    </p>
  );
}

export function AccountUsagePage({
  allowance,
  consumer,
  busy,
  onManage,
  billing,
  metering,
  refresh,
  chatReady,
  storage,
}: {
  /** Where saved chats are kept: decides what the note about them promises (src/text/mode-copy.ts). */
  storage?: Storage;
  /** status.inference.ready: the provider note shows only when chat is not available. */
  chatReady?: boolean;
  /** Usage metering is on: the meter with features and the latest requests (docs/usage-metering-20261115.md). */
  metering?: boolean;
  /** Changes when the app's status reloads, so the meter reloads with it. */
  refresh?: unknown;
  allowance?: RequestAllowance;
  consumer?: boolean;
  busy?: boolean;
  onManage?: () => void;
  billing?: { csrf: string; onNavigate: (url: string) => void };
}) {
  const { lang } = useLang();
  const t = usageText[lang];
  return (
    <section className="content-view" aria-label={t.heading}>
      <h2>{t.heading}</h2>
      {billing && (
        <AccountBilling
          csrf={billing.csrf}
          busy={!!busy}
          onNavigate={billing.onNavigate}
        />
      )}
      {consumer && (
        <div className="panel">
          <p>{t.manageNote}</p>
          <button disabled={busy} onClick={onManage}>
            {t.manage}
          </button>
        </div>
      )}
      {metering && <UsageMeter refresh={refresh} />}
      {isActiveAllowance(allowance) ? (
        <>
          <PlanAllowance allowance={allowance} />
          {/* Provider tokens and cost are developer details, not the user's allowance. */}
          {developerView() && <MeteredUsage allowance={allowance} />}
        </>
      ) : (
        <NoActivePlan />
      )}
      <p>{storage === "secure" ? modeCopyText[lang].vaultNote_secure : t.vaultNote}</p>
      {chatReady === false && <p className="muted">{t.providerNote}</p>}
    </section>
  );
}
