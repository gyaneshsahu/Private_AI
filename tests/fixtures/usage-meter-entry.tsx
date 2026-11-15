// Usage meter checks (tests/usage-meter-ui.test.ts): the account menu with its compact meter, the
// full meter on the usage page and the cost line under a calculation with code. The meter data
// comes from a faked GET /api/usage/meter; ?meter=error makes it fail.
import React from "react";
import { createRoot } from "react-dom/client";
import type { AppStatus, Message } from "../../shared/contracts";
import { LangProvider } from "../../src/i18n";
import { CodeRuns } from "../../src/CodeRuns";
import { AccountUsagePage } from "../../src/AccountUsagePage";
import { WorkspaceNavigation } from "../../src/WorkspaceNavigation";
import "../../src/styles.css";
import "../../src/chat-design.css";

const noop = () => {};
const status: AppStatus = {
  csrf: "SYNTHETIC",
  accountId: "synthetic-account",
  inference: { ready: true, reason: "OFFLINE ONLY" },
  search: false,
  metering: { plan: "alpha", weightsVersion: 1 },
};
const answer: Message = {
  id: "a1",
  role: "assistant",
  text: "Synthetic answer.",
  status: "complete",
  included: true,
  mode: "fast",
  codeRuns: [{ code: "print(2 + 2)", output: "4" }],
  codeSteps: 2,
};

createRoot(document.getElementById("root")!).render(
  <LangProvider>
    <div className="app-shell chat-design">
      <WorkspaceNavigation
        open
        collapsed={false}
        onClose={noop}
        onCollapse={noop}
        onExpand={noop}
        conversations={[]}
        projects={[]}
        unlocked
        busy={false}
        newDisabled={false}
        currentId=""
        onOpen={noop}
        onNew={noop}
        onNewIncognito={noop}
        onNavigate={noop}
        onSettings={noop}
        onSignOut={noop}
        onCreateProject={async () => undefined}
        onEditProject={async () => false}
        onOrganize={noop}
        status={status}
      />
      <main className="main-panel">
        <article className="message assistant">
          <CodeRuns message={answer} />
        </article>
        <AccountUsagePage metering refresh={status} />
      </main>
    </div>
  </LangProvider>,
);
