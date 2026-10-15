import { it, expect } from "vitest";
import { chromium, expect as ui } from "@playwright/test";
import { startTemporaryReview } from "../evaluation/temporary-review";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";

it("lets a reviewer read all turns, grade explicitly, then clears temporary content without browser storage", async () => {
  const review = await startTemporaryReview(15000);
  const browser = await chromium.launch(browserLaunchOptions());
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(5000);
    page.on("pageerror", (e) => console.log(e.message));
    await page.goto(review.url);
    const ready = review.waitUntilReady();
    await page
      .getByRole("button", { name: "I am present and ready to review" })
      .click();
    await ready;
    const pending = review.assess({
      caseId: "synthetic",
      arm: "candidate",
      completed: true,
      turns: [
        {
          question: "SYNTHETIC first question",
          answer: "SYNTHETIC first answer",
        },
        {
          question: "SYNTHETIC correction",
          answer: "SYNTHETIC revised answer",
        },
      ],
      sources: [
        {
          title: "Synthetic source",
          text: "SYNTHETIC evidence <img src=x>",
          url: "javascript:alert(1)",
        },
      ],
    });
    void pending.catch(() => {});
    await ui(
      page.getByText("SYNTHETIC first question", { exact: true }),
    ).toBeVisible();
    await ui(
      page.getByText("SYNTHETIC revised answer", { exact: true }),
    ).toBeVisible();
    await ui(page.locator("img")).toHaveCount(0);
    await ui(page.getByRole("link")).toHaveCount(0);
    for (const name of ["correctness", "completeness", "context"])
      await page.getByLabel(name, { exact: true }).selectOption("2");
    await page.getByLabel("Useful answer delivered").check();
    await page.getByRole("button", { name: "Submit this assessment" }).click();
    expect(await pending).toEqual({
      scores: [2, 2, 2],
      useful: true,
      issues: [],
    });
    await ui(
      page.getByText("SYNTHETIC revised answer", { exact: true }),
    ).toHaveCount(0);
    expect(
      await page.evaluate(() => ({
        local: localStorage.length,
        session: sessionStorage.length,
      })),
    ).toEqual({ local: 0, session: 0 });
    await page.setViewportSize({ width: 360, height: 800 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } finally {
    await browser.close();
    await review.close();
  }
}, 30000);
