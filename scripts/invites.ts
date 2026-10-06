import {
  backupRegistry,
  stageRegistryRecovery,
} from "../server/registry-backup";
import { InviteRegistry } from "../server/invite-registry";
const file = process.env.PRIVATEAI_INVITES_FILE;
if (!file)
  throw new Error(
    "Set PRIVATEAI_INVITES_FILE to a private local database path outside Git.",
  );
const [action, value] = process.argv.slice(2);
if (
  ![
    "issue",
    "revoke",
    "list",
    "pause",
    "resume",
    "backup",
    "stage-recovery",
  ].includes(action)
)
  throw new Error(
    "Use issue <hours>, revoke <access-id>, list, pause, resume, backup <private-directory>, or stage-recovery <private-directory>.",
  );
if (action === "issue" && !process.stdout.isTTY)
  throw new Error(
    "Issue invitations only in an interactive terminal. Never redirect invitation codes to logs or files.",
  );
if (action === "backup" || action === "stage-recovery") {
  if (!value || process.argv.slice(2).length !== 2)
    throw new Error(
      "Provide one existing private absolute destination directory outside Git.",
    );
  const operation =
    action === "backup" ? backupRegistry : stageRegistryRecovery;
  console.log(JSON.stringify(await operation(file, value), null, 2));
} else {
  const registry = new InviteRegistry(file);
  try {
    if (action === "revoke") {
      if (!value || !/^[a-f0-9-]{36}$/.test(value))
        throw new Error("Provide the access ID.");
      if (!registry.revoke(value))
        throw new Error("Access ID was not found; no access was changed.");
      console.log(
        "Access revoked. New requests are denied; active responses are closed within one second.",
      );
    } else if (action === "list") {
      console.log(
        JSON.stringify(
          { paused: registry.paused, invitations: registry.list() },
          null,
          2,
        ),
      );
    } else if (action === "pause" || action === "resume") {
      registry.pause(action === "pause");
      console.log(
        action === "pause"
          ? "Individual trial access paused. Active responses close within approximately one second."
          : "Individual trial access resumed. Revoked and expired invitations remain blocked.",
      );
    } else {
      const hours = Number(value);
      if (!Number.isFinite(hours) || hours <= 0 || hours > 720)
        throw new Error("Use 1–720 hours.");
      const invite = registry.issue(Date.now() + Math.round(hours * 3600000));
      console.log(
        `Access ID: ${invite.id}\nOne-use invitation code: ${invite.token}\nAccess expires: ${new Date(invite.expires).toISOString()}\nDeliver privately; do not paste into chat, Git or logs.`,
      );
    }
  } finally {
    registry.close();
  }
}
