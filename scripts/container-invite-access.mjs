import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const id = randomUUID();
const volume = `privateai-access-${id}`;
const name = `privateai-access-${id}`;
const image = "privateai-evaluation";
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
const setup = (code) =>
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
    code,
  );
const execute = (code) =>
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
const base = String.raw`
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {request} from 'node:http';
const ids=JSON.parse(readFileSync('/registry/fixture.json','utf8'));
async function call(path,body,cookie='',forwarded='https') {
 return new Promise((resolve,reject)=>{
  const req=request('http://127.0.0.1:4173'+path,{method:body?'POST':'GET',headers:{Host:'privateai.example','X-Forwarded-Proto':forwarded,...(cookie?{Cookie:cookie}:{}),...(body?{Origin:'https://privateai.example','Content-Type':'application/x-www-form-urlencoded'}:{})}},res=>{
   let text='';res.on('data',c=>text+=c);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,text}));
  });req.setTimeout(5000,()=>req.destroy(new Error('Fixture timeout')));req.on('error',reject);req.end(body?new URLSearchParams(body).toString():undefined);
 });
}
const cookieOf=r=>r.headers['set-cookie'].find(c=>c.startsWith('privateai-access=')).split(';')[0];
async function login(id,password){return call('/auth/login',{id,password});}
`;
let created = false;
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
  setup(String.raw`
    import {InviteRegistry} from './server/invite-registry.ts';
    import {writeFileSync} from 'node:fs';
    const r=new InviteRegistry('/registry/invites.sqlite');
    const a=r.issue(Date.now()+3600000),b=r.issue(Date.now()+3600000);
    await r.register(a.id,a.token,'synthetic-initial-password');
    await r.register(b.id,b.token,'synthetic-other-password');
    writeFileSync('/registry/fixture.json',JSON.stringify({a:a.id,b:b.id}),{mode:0o600});r.close();
  `);
  docker(
    "run",
    "--detach",
    "--name",
    name,
    ...isolated,
    "-e",
    "PRIVATEAI_ORIGIN=https://privateai.example",
    "-e",
    "PRIVATEAI_INVITES_FILE=/registry/invites.sqlite",
    image,
  );
  const ready = () =>
    execute(
      base +
        String.raw`
    let ready=false;
    for(let i=0;i<100;i++){try{ready=(await call('/healthz')).status===200;}catch{}if(ready)break;await new Promise(r=>setTimeout(r,100));}
    assert(ready,'Packaged server did not become ready');
  `,
    );
  ready();
  execute(
    base +
      String.raw`
    assert.equal((await call('/api/status')).status,401);
    assert.equal((await call('/api/status',undefined,'','http')).status,403);
    const first=await login(ids.a,'synthetic-initial-password');assert.equal(first.status,303);
    const cookies=first.headers['set-cookie'].join(';');
    for(const flag of ['Secure','HttpOnly','SameSite=Strict'])assert(cookies.includes(flag));
    assert(first.headers['cache-control'].includes('no-store'));
    const alice=cookieOf(first),second=await login(ids.b,'synthetic-other-password');
    assert.equal(second.status,303);const bob=cookieOf(second);
    const status=await call('/api/status',undefined,alice);assert.equal(status.status,200);
    assert.equal(JSON.parse(status.text).inference.ready,false);
    const change=await call('/auth/password',{id:ids.a,password:'synthetic-initial-password',replacement:'synthetic-replaced-password',confirmation:'synthetic-replaced-password'},alice);
    assert.equal(change.status,303);
    assert.equal((await call('/api/status',undefined,alice)).status,401);
    assert.equal((await call('/api/status',undefined,bob)).status,200);
    const fresh=await login(ids.a,'synthetic-replaced-password');assert.equal(fresh.status,303);
    writeFileSync('/registry/cookies.json',JSON.stringify({alice:cookieOf(fresh),bob}),{mode:0o600});
  `,
  );
  execute(String.raw`
    import {InviteRegistry} from './server/invite-registry.ts';import{readFileSync}from'node:fs';
    const ids=JSON.parse(readFileSync('/registry/fixture.json','utf8'));const r=new InviteRegistry('/registry/invites.sqlite');r.revoke(ids.b);r.close();
  `);
  execute(
    base +
      String.raw`
    const c=JSON.parse(readFileSync('/registry/cookies.json','utf8'));
    assert.equal((await call('/api/status',undefined,c.bob)).status,401);
    assert.equal((await call('/api/status',undefined,c.alice)).status,200);
  `,
  );
  docker("restart", name);
  ready();
  execute(
    base +
      String.raw`
    const c=JSON.parse(readFileSync('/registry/cookies.json','utf8'));
    assert.equal((await call('/api/status',undefined,c.alice)).status,401);
    assert.equal((await login(ids.a,'synthetic-initial-password')).status,401);
    assert.equal((await login(ids.b,'synthetic-other-password')).status,401);
    const fresh=await login(ids.a,'synthetic-replaced-password');assert.equal(fresh.status,303);
    assert.equal((await call('/api/status',undefined,cookieOf(fresh))).status,200);
  `,
  );
  execute(
    "import{InviteRegistry}from'./server/invite-registry.ts';const r=new InviteRegistry('/registry/invites.sqlite');r.pause(true);r.close();",
  );
  docker("restart", name);
  ready();
  execute(
    base +
      String.raw`assert.equal((await login(ids.a,'synthetic-replaced-password')).status,401);assert.equal((await call('/api/status')).status,401);`,
  );
  const state = JSON.parse(docker("inspect", name))[0];
  if (state.State.OOMKilled || !state.State.Running)
    throw Error("Container resource failure");
  console.log(
    JSON.stringify({
      kind: "PACKAGED_INDIVIDUAL_ACCESS_REHEARSAL",
      imageId: state.Image,
      memoryLimitBytes: state.HostConfig.Memory,
      nanoCPUs: state.HostConfig.NanoCpus,
      secureCookies: true,
      passwordReplacement: true,
      revocation: true,
      restartInvalidatesSessions: true,
      registryPersists: true,
      pausedRestartDeniesLogin: true,
      oomKilled: false,
      network: "none",
      actualHostedTLS: false,
      capacityQualification: false,
    }),
  );
} catch {
  console.error(
    "Packaged individual-access rehearsal failed. Synthetic volume only; inspect the failing stage locally.",
  );
  process.exitCode = 1;
} finally {
  try {
    docker("rm", "--force", name);
  } catch {}
  if (created) docker("volume", "rm", volume);
}
