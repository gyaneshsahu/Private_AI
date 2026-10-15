import express from "express";
import { randomBytes } from "node:crypto";
import { z } from "zod";

const score = z.number().int().min(0).max(3);
export const temporaryGradeSchema = z
  .object({
    scores: z.tuple([score, score, score]).nullable(),
    useful: z.boolean(),
    issues: z
      .array(
        z.enum([
          "relevance",
          "dates",
          "conflict",
          "missing_information",
          "calculation",
          "units",
          "citation_support",
          "correction",
          "source_instruction",
          "unnecessary_block",
          "delivery",
        ]),
      )
      .max(11),
  })
  .strict();
export type TemporaryGrade = z.infer<typeof temporaryGradeSchema>;
export interface TemporaryReviewPayload {
  caseId: string;
  arm: string;
  completed: boolean;
  turns: Array<{ question: string; answer: string }>;
  sources: Array<{ title: string; text: string; url?: string }>;
}

// Public retrieved material stays in process memory. Only the returned closed
// grading fields may enter a persisted report; no free-text notes are accepted.
export async function startTemporaryReview(timeoutMs = 30 * 60 * 1000) {
  const app = express();
  const token = randomBytes(24).toString("hex");
  const base = `/review/${token}`;
  let origin = "";
  let payload: TemporaryReviewPayload | undefined;
  let version = 0;
  let resolveReady: (() => void) | undefined;
  let settle: ((grade: TemporaryGrade) => void) | undefined;
  let cancel: ((error: Error) => void) | undefined;
  let ready = false;
  app.use((_req, res, next) => {
    res.set({
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy":
        "default-src 'none'; script-src 'self'; connect-src 'self'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'",
    });
    next();
  });
  app.use(express.json({ limit: "4kb" }));
  app.get(base, (_req, res) =>
    res
      .type("html")
      .send(
        `<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Temporary research review</title><style>body{font:18px system-ui;max-width:900px;margin:24px auto;padding:16px}pre{white-space:pre-wrap;overflow-wrap:anywhere}label{display:block;margin:12px 0}button,select{font:inherit;padding:8px}article{border-top:1px solid #999;padding:16px 0}</style><h1>Temporary research review</h1><p>Read the original questions, every reply and source evidence here before grading. This page does not save passages or answers. The batch cannot advance without a completed review; waiting expires after 30 minutes. Scores are your human assessment; citation matching does not establish factual support.</p><button id="ready">I am present and ready to review</button><p id="status" role="status">No requests should start until you are ready.</p><main id="content"></main><form id="grade" hidden><fieldset><legend>Correctness / completeness / context (0–3)</legend>${["correctness", "completeness", "context"].map((k) => `<label for="score-${k}">${k}</label><select id="score-${k}" name="${k}" required><option value="">Choose</option>${[0, 1, 2, 3].map((n) => `<option>${n}</option>`).join("")}</select>`).join("")}</fieldset><label><input name="useful" type="checkbox">Useful answer delivered</label><fieldset><legend>Observed issues</legend>${["relevance", "dates", "conflict", "missing_information", "calculation", "units", "citation_support", "correction", "source_instruction", "unnecessary_block", "delivery"].map((k) => `<label><input type="checkbox" name="issue" value="${k}">${k.replaceAll("_", " ")}</label>`).join("")}</fieldset><button>Submit this assessment</button></form><script src="${base}/client.js"></script></html>`,
      ),
  );
  app.get(`${base}/client.js`, (_req, res) =>
    res.type("js").send(`
    const base=${JSON.stringify(base)};let version=-1, completed=false;
    const status=document.getElementById('status'), form=document.getElementById('grade'), content=document.getElementById('content');
    async function post(path,data){const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});if(!r.ok)throw Error('Review rejected; session may have ended.');}
    document.getElementById('ready').onclick=async()=>{await post('/ready',{});document.getElementById('ready').disabled=true;status.textContent='Ready. Waiting for the next answer.';};
    function text(tag,value){const el=document.createElement(tag);el.textContent=value;content.appendChild(el);}
    setInterval(async()=>{try{const r=await fetch(base+'/state',{cache:'no-store'});if(!r.ok)throw Error();const s=await r.json();if(s.version===version)return;version=s.version;content.replaceChildren();form.reset();form.hidden=!s.payload;if(!s.payload)return;const p=s.payload;completed=p.completed;text('h2',p.caseId+' / '+p.arm);for(const [i,t] of p.turns.entries()){text('h3','Turn '+(i+1));text('pre',t.question);text('pre',t.answer||'No completed answer');}text('h2','Retrieved evidence');for(const s of p.sources){text('h3',s.title);text('pre',s.text);if(s.url){const a=document.createElement('a');a.textContent='Open source';a.href=s.url;a.target='_blank';a.rel='noopener noreferrer';a.referrerPolicy='no-referrer';content.appendChild(a);}}for(const select of form.querySelectorAll('select'))select.disabled=!completed;status.textContent=completed?'Assess the latest reply in the full conversation.':'Incomplete delivery: numerical scores must remain blank.';}catch{status.textContent='Session unavailable. Do not assume your assessment was saved.';}},750);
    form.onsubmit=async e=>{e.preventDefault();const d=new FormData(form);try{await post('/grade',{version,grade:{scores:completed?['correctness','completeness','context'].map(k=>Number(d.get(k))):null,useful:d.has('useful'),issues:d.getAll('issue')}});content.replaceChildren();form.hidden=true;status.textContent='Assessment recorded; temporary content cleared.';}catch(e){status.textContent=e.message;}};
  `),
  );
  app.get(`${base}/state`, (_req, res) => res.json({ version, payload }));
  app.post(`${base}/ready`, (req, res) => {
    if (req.get("origin") !== origin) return res.sendStatus(403);
    ready = true;
    resolveReady?.();
    res.sendStatus(204);
  });
  app.post(`${base}/grade`, (req, res) => {
    if (req.get("origin") !== origin) return res.sendStatus(403);
    const parsed = temporaryGradeSchema.safeParse(req.body?.grade);
    if (
      !payload ||
      !settle ||
      req.body?.version !== version ||
      !parsed.success ||
      payload.completed !== (parsed.data.scores !== null) ||
      (!payload.completed && parsed.data.useful)
    )
      return res.sendStatus(400);
    const resolve = settle;
    settle = undefined;
    cancel = undefined;
    payload = undefined;
    version++;
    resolve(parsed.data);
    res.sendStatus(204);
  });
  // Do not let Express print malformed bodies or stack traces from review input.
  app.use(
    (
      _error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      res.sendStatus(400);
    },
  );
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw Error("Review listener unavailable");
  origin = `http://127.0.0.1:${address.port}`;
  return {
    url: origin + base,
    async waitUntilReady() {
      if (ready) return;
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () =>
            reject(Error("Reviewer not ready; no public requests permitted")),
          timeoutMs,
        );
        resolveReady = () => {
          clearTimeout(timer);
          resolve();
        };
      });
    },
    async assess(value: TemporaryReviewPayload): Promise<TemporaryGrade> {
      if (!ready || payload) throw Error("Review session unavailable");
      payload = {
        ...value,
        sources: value.sources.map((source) => {
          let url: string | undefined;
          try {
            const parsed = new URL(source.url ?? "");
            if (
              ["https:", "http:"].includes(parsed.protocol) &&
              !parsed.username &&
              !parsed.password
            )
              url = parsed.href;
          } catch {
            /* No link for invalid source URLs. */
          }
          return { ...source, url };
        }),
      };
      version++;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          payload = undefined;
          settle = undefined;
          cancel = undefined;
          version++;
          reject(Error("Review timed out; stop batch"));
        }, timeoutMs);
        settle = (grade) => {
          clearTimeout(timer);
          resolve(grade);
        };
        cancel = (error) => {
          clearTimeout(timer);
          reject(error);
        };
      });
    },
    async close() {
      payload = undefined;
      cancel?.(Error("Review session closed"));
      settle = undefined;
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    },
  };
}
