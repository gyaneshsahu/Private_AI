// Under an answer: the mark that code ran on this device, and the code with its output for the
// user to read (collapsed until opened). Every error found in the arithmetic test was a misread
// rounding rule in otherwise correct code, so the code must be one tap away.
import type { Message } from "../shared/contracts";
import { CodeBlock } from "./CodeBlock";
import { useText } from "./i18n";
import { codeText } from "./text/code";

export function CodeRuns({ message }: { message: Message }) {
  const t = useText(codeText);
  const runs = message.codeRuns ?? [];
  if (!runs.length && !message.codeUnavailable) return null;
  return (
    <>
      {message.codeUnavailable ? (
        <p className="warning code-used" role="alert">
          {t.notRun}
        </p>
      ) : runs.some((run) => !run.error) ? (
        <p className="muted code-used">{t.used}</p>
      ) : (
        <p className="warning code-used" role="alert">
          {t.failed}
        </p>
      )}
      {runs.length > 0 && (
        <details className="code-runs">
          <summary>{t.show}</summary>
          {runs.map((run, index) => (
            <div key={index}>
              <CodeBlock text={run.code} language={t.code} complete>
                {run.code}
              </CodeBlock>
              {run.error && <p className="muted">{t.codeError}</p>}
              <CodeBlock text={run.output} language={t.output} complete>
                {run.output}
              </CodeBlock>
            </div>
          ))}
        </details>
      )}
    </>
  );
}

/** The answer's figures came out of code that ran without an error. */
export const calculatedWithCode = (message: Message) =>
  !message.codeUnavailable && !!message.codeRuns?.some((run) => !run.error);
