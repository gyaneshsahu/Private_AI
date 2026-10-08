import { assessRegistryRetention } from "../server/retention-assessment";
try {
  if (process.argv.slice(2).join(" ") !== "--preview") throw Error();
  console.log(
    JSON.stringify(
      assessRegistryRetention(process.env.PRIVATEAI_INVITES_FILE ?? ""),
      null,
      2,
    ),
  );
} catch {
  console.error(
    "Read-only retention preview failed. Use --preview with an existing valid PRIVATEAI_INVITES_FILE; no deletion was performed.",
  );
  process.exitCode = 1;
}
