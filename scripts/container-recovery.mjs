import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
const id = randomUUID(),
  name = `privateai-recovery-${id}`,
  volume = name,
  image = "privateai-evaluation";
const started = performance.now();
const env = { ...process.env };
for (const key of [
  "DOCKER_HOST",
  "DOCKER_CONTEXT",
  "DOCKER_TLS",
  "DOCKER_TLS_VERIFY",
  "DOCKER_CERT_PATH",
])
  delete env[key];
const docker = (...args) =>
  execFileSync(
    "docker",
    [
      process.platform === "win32"
        ? "--host=npipe:////./pipe/dockerDesktopLinuxEngine"
        : "--host=unix:///var/run/docker.sock",
      ...args,
    ],
    {
      env,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 60000,
    },
  );
const isolated = [
  "--network=none",
  "--read-only",
  "--tmpfs",
  "/tmp",
  "--cap-drop=ALL",
  "--security-opt=no-new-privileges",
  "--memory=512m",
  "--memory-swap=512m",
  "--cpus=0.5",
  "--mount",
  `type=volume,source=${volume},target=/registry`,
];
const exec = (code) =>
  docker(
    "exec",
    name,
    "node",
    "--import",
    "tsx",
    "--input-type=module",
    "-e",
    code,
  );
const http = String.raw`
import assert from 'node:assert/strict';
import {request} from 'node:http';
import {readFileSync,writeFileSync} from 'node:fs';
const ids=JSON.parse(readFileSync('/registry/fixture.json','utf8'));
async function call(path,body,cookie='') { return new Promise((resolve,reject)=>{
const q=request('http://127.0.0.1:4173'+path,{method:body?'POST':'GET',headers:{Host:'privateai.example','X-Forwarded-Proto':'https',...(cookie?{Cookie:cookie}:{}),...(body?{Origin:'https://privateai.example','Content-Type':'application/x-www-form-urlencoded'}:{})}},r=>{let text='';r.on('data',c=>text+=c);r.on('end',()=>resolve({status:r.statusCode,headers:r.headers,text}));});q.setTimeout(5000,()=>q.destroy(Error('timeout')));q.on('error',reject);q.end(body?new URLSearchParams(body).toString():undefined);}); }
`;
let created = false,
  stage = "VOLUME";
try {
  docker("volume", "create", volume);
  created = true;
  docker(
    "run",
    "--rm",
    "--network=none",
    "--user=0",
    "--mount",
    `type=volume,source=${volume},target=/registry`,
    "--entrypoint",
    "node",
    image,
    "-e",
    "const f=require('node:fs');f.chownSync('/registry',1000,1000);f.chmodSync('/registry',0o700)",
  );
  stage = "ENCRYPT_AND_LOSE_SOURCE";
  docker(
    "run",
    "--rm",
    ...isolated,
    "--entrypoint",
    "node",
    image,
    "--import",
    "tsx",
    "--input-type=module",
    "-e",
    String.raw`
    import assert from 'node:assert/strict';
    import {execFileSync} from 'node:child_process';
    import {writeFileSync,rmSync,renameSync,existsSync} from 'node:fs';
    import {InviteRegistry} from './server/invite-registry.ts';
    import {encryptRegistry,restoreEncryptedRegistry} from './server/encrypted-registry.ts';
    const source='/registry/disposable-source.sqlite', archive='/registry/snapshot.age';
    const r=new InviteRegistry(source);
    const a=r.issue(Date.now()+3600000),b=r.issue(Date.now()+3600000);
    await r.register(a.id,a.token,'synthetic-recovery-password');
    await r.register(b.id,b.token,'synthetic-second-password');
    r.allowRequest(a.id);
    let key=execFileSync('/usr/bin/age-keygen',[],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).match(/AGE-SECRET-KEY-1[0-9A-Z]+/)[0];
    const recipient=execFileSync('/usr/bin/age-keygen',['-y'],{input:key+'\n',encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
    writeFileSync(archive,await encryptRegistry(source,recipient,'/usr/bin/age'),{mode:0o600});
    r.revoke(b.id); r.close();
    for(const suffix of ['','-wal','-shm']) rmSync(source+suffix,{force:true});
    assert(!existsSync(source));
    const restored=await restoreEncryptedRegistry(archive,key,'/usr/bin/age','/registry'); key='';
    assert(restored.paused&&restored.restoredAccountsRevoked);
    renameSync(restored.directory+'/invites.sqlite','/registry/recovered.sqlite');
    writeFileSync('/registry/fixture.json',JSON.stringify({a:a.id,b:b.id}),{mode:0o600});
  `,
  );
  stage = "START_RESTORED_SERVICE";
  docker(
    "run",
    "--detach",
    "--name",
    name,
    ...isolated,
    "-e",
    "PRIVATEAI_ORIGIN=https://privateai.example",
    "-e",
    "PRIVATEAI_INVITES_FILE=/registry/recovered.sqlite",
    image,
  );
  const ready = () =>
    exec(
      http +
        `let ready=false;for(let i=0;i<100;i++){try{ready=(await call('/healthz')).status===200;}catch{}if(ready)break;await new Promise(r=>setTimeout(r,100));}assert(ready);`,
    );
  ready();
  stage = "DENY_STALE_CREDENTIALS";
  exec(
    http +
      String.raw`
    assert.equal((await call('/api/status')).status,401);
    assert.equal((await call('/auth/login',{id:ids.a,password:'synthetic-recovery-password'})).status,401);
    assert.equal((await call('/auth/login',{id:ids.b,password:'synthetic-second-password'})).status,401);
  `,
  );
  stage = "EXPLICIT_SYNTHETIC_REISSUE";
  exec(String.raw`
    import {InviteRegistry} from './server/invite-registry.ts'; import {readFileSync,writeFileSync} from 'node:fs';
    const ids=JSON.parse(readFileSync('/registry/fixture.json','utf8')),r=new InviteRegistry('/registry/recovered.sqlite');
    r.pause(false);const fresh=r.issue(Date.now()+3600000);await r.register(fresh.id,fresh.token,'synthetic-new-access-password');
    ids.fresh=fresh.id;writeFileSync('/registry/fixture.json',JSON.stringify(ids),{mode:0o600});r.close();
  `);
  exec(
    http +
      String.raw`
    assert.equal((await call('/auth/login',{id:ids.a,password:'synthetic-recovery-password'})).status,401);
    assert.equal((await call('/auth/login',{id:ids.b,password:'synthetic-second-password'})).status,401);
    const login=await call('/auth/login',{id:ids.fresh,password:'synthetic-new-access-password'});assert.equal(login.status,303);
    const cookie=login.headers['set-cookie'].find(c=>c.startsWith('privateai-access=')).split(';')[0];
    writeFileSync('/registry/stale-session.txt',cookie,{mode:0o600});
    const status=await call('/api/status',null,cookie);assert.equal(status.status,200);assert.equal(JSON.parse(status.text).inference.ready,false);
  `,
  );
  stage = "RESTART";
  docker("restart", name);
  ready();
  exec(
    http +
      String.raw`assert.equal((await call('/api/status',null,readFileSync('/registry/stale-session.txt','utf8'))).status,401);assert.equal((await call('/auth/login',{id:ids.fresh,password:'synthetic-new-access-password'})).status,303);`,
  );
  console.log(
    JSON.stringify({
      kind: "PACKAGED_ENCRYPTED_SERVICE_RECOVERY",
      result: "PASS",
      imageId: JSON.parse(docker("inspect", name))[0].Image,
      elapsedMs: Math.round(performance.now() - started),
      sourceRemoved: true,
      restoredPaused: true,
      oldCredentialsDeniedAfterResume: true,
      freshSyntheticAccess: true,
      restartInvalidatesSessions: true,
      inferenceGated: true,
      network: "none",
      hostedTLS: false,
      productionCutover: false,
    }),
  );
} catch {
  console.error(
    JSON.stringify({
      kind: "PACKAGED_ENCRYPTED_SERVICE_RECOVERY",
      result: "FAIL",
      stage,
    }),
  );
  process.exitCode = 1;
} finally {
  try {
    docker("rm", "--force", name);
  } catch {}
  if (created) docker("volume", "rm", volume);
}
