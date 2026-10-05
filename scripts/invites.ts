import { InviteRegistry } from "../server/invite-registry";
const file = process.env.PRIVATEAI_INVITES_FILE;
if (!file)
  throw new Error(
    "Set PRIVATEAI_INVITES_FILE to a private local database path outside Git.",
  );
const [action, value] = process.argv.slice(2);
if (action !== "issue" && action !== "revoke")
  throw new Error("Use issue <hours> or revoke <access-id>.");
if (action === "issue" && !process.stdout.isTTY)
  throw new Error(
    "Issue invitations only in an interactive terminal. Never redirect invitation codes to logs or files.",
  );
const registry = new InviteRegistry(file);
try {
  if (action === "revoke") {
    if (!value || !/^[a-f0-9-]{36}$/.test(value))
      throw new Error("Provide the access ID.");
    registry.revoke(value);
    console.log(
      "Access revoked. New requests are denied; active responses are closed within one second.",
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
