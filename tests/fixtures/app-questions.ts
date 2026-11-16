// The app asks its own questions (src/App.tsx `ask`, a ConfirmDialog) where it used window.confirm
// before 16 November. For tests that answered every browser question the same way: this answers the
// browser's and the app's questions (discard changes, stop the answer, replace the canvas, sign out
// with unsent changes) alike. Tests about a question itself click its buttons instead.
import type { Page } from "@playwright/test";
import { questionText } from "../../src/text/questions";
import { accountAccessText } from "../../src/text/account";
import { accountConfirmText } from "../../src/text/account-confirm";

const titles = (["en", "de"] as const).flatMap((lang) => {
  const q = questionText[lang];
  const a = accountAccessText[lang];
  // The account page's questions (src/AccountAccess.tsx) too: sign out a session, remove a method.
  return [q.discardTitle, q.stopTitle, q.canvasTitle, q.signOutTitle, a.confirmThis, a.confirmOther, accountConfirmText[lang].removeTitle];
});

function answer([titles, yes]: [string[], boolean]) {
  const click = () => {
    for (const dialog of document.querySelectorAll("dialog.confirm-dialog[open]"))
      if (titles.includes(dialog.querySelector("h2")?.textContent ?? ""))
        dialog.querySelector<HTMLButtonElement>(yes ? ".danger-button" : ".confirm-actions button:not(.danger-button)")?.click();
  };
  new MutationObserver(click).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ["open"] });
}

/** Answers the one open app question (Cancel or its confirm button). */
export const answerQuestion = (page: Page, yes: boolean) =>
  page.locator("dialog.confirm-dialog[open]").locator(yes ? ".danger-button" : ".confirm-actions button:not(.danger-button)").click();

/** Answers the app's question if one opens within a moment (where the old test accepted a browser question that may not come). */
export async function answerIfAsked(page: Page, yes: boolean) {
  const open = page.locator("dialog.confirm-dialog[open]");
  if (await open.waitFor({ timeout: 2000 }).then(() => true, () => false)) await answerQuestion(page, yes);
}

export async function answerQuestions(page: Page, yes = true) {
  page.on("dialog", (dialog) => void (yes ? dialog.accept() : dialog.dismiss()));
  await page.addInitScript(answer, [titles, yes] as [string[], boolean]);
  // Already on a page: watch it too.
  if (page.url() !== "about:blank") await page.evaluate(answer, [titles, yes] as [string[], boolean]);
}
