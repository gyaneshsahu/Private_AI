// Live check for memory across chats (docs/memory-20261114.md): sends a few synthetic questions
// through the Privatemode SDK, each once without and once with the memory block exactly as the app
// builds it (the app's own instructions and block wording), and prints the replies and the usage.
// NOT run by the agent: it needs the owner's key and calls Privatemode. Key from Windows Credential
// Manager, never printed. Synthetic memories only: nothing about a real person.
//
//   Invoke-WithPrivateAiSecret -Name PRIVATEMODE_API_KEY -Action {
//     npx tsx evaluation/privatemode/memory-probe.ts
//   }
//   ... --model glm-5.3          (default glm-5.3-flash, the Fast model)
//
// What to read in the output (the lead judges; the script does not score):
//   1. "de-relevant": the reply is in German and vegetarian, without saying "you told me" or "my notes".
//   2. "en-unrelated": the reply does not mention Leipzig or the dog. Memory must not leak into unrelated answers.
//   3. "en-asked": asked what it knows, the model may list the notes.
//   4. "de-question-en-note": the reply is in German although the note is English (the reply-language rule).
//   5. "masked": the reply treats {{EMAIL-1}} as a stand-in and repeats it unchanged.
//   6. `extraPromptTokens`: what the block costs per question (expected: under 150 tokens for two notes).
// Each call is billed as a chat request; 10 calls, a fraction of a cent in total.
import { PrivatemodeAI } from "privatemode-ai";
import { emptyConversation } from "../../shared/contracts";
import { composeContext, newMessage } from "../../src/conversation";
import { memoryBlock, type Memory } from "../../src/memory";

const apiKey = process.env.PRIVATEMODE_API_KEY;
if (!apiKey) throw Error("PRIVATEMODE_API_KEY not loaded");
const at = process.argv.indexOf("--model");
const model = at > 0 ? process.argv[at + 1] : "glm-5.3-flash";

const note = (text: string): Memory => ({ id: crypto.randomUUID(), text, at: new Date().toISOString() });
const CASES: { step: string; lang: "de" | "en"; question: string; notes: string[] }[] = [
  { step: "de-relevant", lang: "de", question: "Was kann ich heute Abend schnell kochen?", notes: ["Ich esse vegetarisch und vertrage keine Erdnüsse."] },
  { step: "en-unrelated", lang: "en", question: "Explain in two sentences how a heat pump works.", notes: ["Ich wohne in Leipzig.", "My dog is called Balu."] },
  { step: "en-asked", lang: "en", question: "What do you know about me?", notes: ["I work as a nurse on night shifts.", "My dog is called Balu."] },
  { step: "de-question-en-note", lang: "de", question: "Welche Sportart passt zu mir?", notes: ["I have a bad knee and I like being outdoors."] },
  { step: "masked", lang: "en", question: "Write one line I can put at the end of a letter with my email address.", notes: ["My email is {{EMAIL-1}}."] },
];

const client = new PrivatemodeAI({ apiKey, enableWasmLogging: false, openAIOptions: { maxRetries: 0 } });
try {
  await client.verify();
  await client.refreshSecret();
  for (const { step, lang, question, notes } of CASES) {
    const conversation = { ...emptyConversation(), messages: [newMessage("user", question)] };
    const tokens: number[] = [];
    for (const withNotes of [false, true]) {
      // The app's own messages (src/conversation.ts). In the app the block is added there too;
      // here it is added by hand because the build switch does not exist outside the browser build.
      const messages = composeContext(conversation, 100000, new Date(), undefined, lang);
      if (withNotes) messages[messages.length - 1].content = memoryBlock(notes.map(note)) + question;
      const started = performance.now();
      try {
        const chat = await client.chat.completions.create(
          { model, max_tokens: 400, messages } as never,
          { headers: { "privatemode-target-model": model } },
        );
        tokens.push(chat.usage?.prompt_tokens ?? Number.NaN);
        console.log(
          JSON.stringify({
            step,
            withNotes,
            notes: withNotes ? notes : [],
            question,
            ms: Math.round(performance.now() - started),
            finish: chat.choices[0]?.finish_reason,
            reply: chat.choices[0]?.message?.content,
            usage: chat.usage,
          }),
        );
      } catch (error) {
        const { status, message } = error as { status?: unknown; message?: unknown };
        console.log(JSON.stringify({ step, withNotes, model, failed: true, status, message }));
      }
    }
    if (tokens.length === 2) console.log(JSON.stringify({ step, extraPromptTokens: tokens[1] - tokens[0] }));
  }
  console.log(JSON.stringify({ step: "done" }));
} finally {
  client.close();
}
