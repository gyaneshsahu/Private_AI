import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { lstat, readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';

// Inventory only: never copy credentials, databases or backup archives.
const root = process.cwd();
const output = resolve(root, '.local/migration/evidence-manifest.json');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const files = new Set(execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean));
async function collect(directory) {
  let entries;
  try { entries = await readdir(resolve(root, directory), { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') return; throw error; }
  for (const entry of entries) {
    const path = `${directory}/${entry.name}`;
    if (entry.isSymbolicLink()) throw Error(`Evidence link refused: ${path}`);
    if (entry.isDirectory()) await collect(path);
    else if (entry.isFile()) files.add(path);
  }
}
await collect('.local/experiment-runs');
await collect('.local/review-batches');
const records = [];
for (const file of [...files].sort()) {
  const path = resolve(root, file);
  if (relative(root, path).startsWith('..')) throw Error('Path outside checkout');
  const stat = await lstat(path);
  if (!stat.isFile() || stat.isSymbolicLink()) throw Error(`Regular file required: ${file}`);
  const bytes = await readFile(path);
  records.push({ path: file.replaceAll('\\', '/'), bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
}
if (process.argv.includes('--verify')) {
  const prior = JSON.parse(await readFile(output, 'utf8'));
  const expected = new Map(prior.files.map(row => [row.path, row.sha256]));
  const differences = records.filter(row => expected.get(row.path) !== row.sha256).map(row => row.path);
  const current = new Set(records.map(row => row.path));
  differences.push(...prior.files.filter(row => !current.has(row.path)).map(row => row.path));
  if (differences.length) { console.error(JSON.stringify({ matching: false, differences })); process.exitCode = 1; }
  else console.log(JSON.stringify({ matching: true, files: records.length }));
} else {
  await mkdir(resolve(root, '.local/migration'), { recursive: true });
  await writeFile(output, JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), commit: git('rev-parse', 'HEAD'), branch: git('branch', '--show-current'), dirty: !!git('status', '--porcelain'), scope: 'Tracked files plus local experiment runs and review batches; metadata only, not a backup or safety certification.', files: records }, null, 2));
  console.log(JSON.stringify({ manifest: '.local/migration/evidence-manifest.json', files: records.length }));
}
