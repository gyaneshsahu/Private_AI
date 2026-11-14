import { lazy, Suspense, useState } from "react";
import type { Conversation } from "../shared/contracts";
import { pdfExportEnabled } from "./device-features";
import { useText } from "./i18n";
import { deviceText } from "./text/device-features";

const PdfExport = lazy(() => import("./pdf-export"));

/**
 * "Export as PDF". With `answer` (an index into the messages) it exports that answer and the
 * question before it; without, the whole open conversation. Renders nothing while the feature is off.
 */
export function PdfExportButton({
  conversation,
  answer,
  disabled,
}: {
  conversation: Conversation;
  answer?: number;
  disabled: boolean;
}) {
  const t = useText(deviceText);
  // Counts exports: a new key opens the dialog again even if a browser never reported it closed.
  const [run, setRun] = useState(0);
  if (!pdfExportEnabled()) return null;
  const messages =
    answer === undefined
      ? conversation.messages
      : conversation.messages.slice(
          conversation.messages[answer - 1]?.role === "user" ? answer - 1 : answer,
          answer + 1,
        );
  return (
    <>
      <button disabled={disabled} onClick={() => setRun((n) => Math.abs(n) + 1)}>
        {answer === undefined ? t.exportConversation : t.exportPdf}
      </button>
      {run > 0 && (
        <Suspense>
          <PdfExport
            key={run}
            title={conversation.title}
            createdAt={conversation.createdAt}
            messages={messages}
            done={() => setRun((n) => -n)}
          />
        </Suspense>
      )}
    </>
  );
}
