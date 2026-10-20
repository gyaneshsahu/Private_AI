import { readFile, writeFile } from "node:fs/promises";

const source = (await readFile("Dockerfile", "utf8")).replaceAll("\r\n", "\n");
const marker = "\nFROM node:24-bookworm-slim AS runtime\n";
if (source.split(marker).length !== 2)
  throw Error("Docker stage structure changed; review Render packaging.");
const generated =
  source.split(marker)[0] + '\nCMD ["/etc/secrets/render-config.json"]\n';
if (process.argv.includes("--check")) {
  if (
    (await readFile("Dockerfile.render", "utf8")).replaceAll("\r\n", "\n") !==
    generated
  )
    throw Error(
      "Dockerfile.render is stale. Run node scripts/render-dockerfile.mjs.",
    );
} else {
  await writeFile("Dockerfile.render", generated);
}
