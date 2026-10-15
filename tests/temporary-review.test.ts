import { expect, it } from "vitest";
import { startTemporaryReview } from "../evaluation/temporary-review";

it("requires reviewer readiness and persists only typed grades, clearing content after assessment", async () => {
  const review = await startTemporaryReview(1000);
  const origin = new URL(review.url).origin;
  const payload = {
    caseId: "synthetic",
    arm: "candidate",
    completed: true,
    turns: [{ question: "SYNTHETIC question", answer: "SYNTHETIC answer" }],
    sources: [{ title: "SYNTHETIC", text: "SYNTHETIC evidence" }],
  };
  const post = (path: string, body: unknown, requestOrigin = origin) =>
    fetch(review.url + path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: requestOrigin },
      body: JSON.stringify(body),
    });
  try {
    const malformed = await fetch(review.url + "/grade", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: "SYNTHETIC_MALFORMED_BODY",
    });
    expect(malformed.status).toBe(400);
    expect(await malformed.text()).not.toContain("SYNTHETIC_MALFORMED_BODY");
    await expect(review.assess(payload)).rejects.toThrow();
    expect((await post("/ready", {}, "https://other.example")).status).toBe(
      403,
    );
    const ready = review.waitUntilReady();
    expect((await post("/ready", {})).status).toBe(204);
    await ready;
    const pending = review.assess(payload);
    const stateResponse = await fetch(review.url + "/state");
    expect(stateResponse.headers.get("cache-control")).toBe("no-store");
    const state = await stateResponse.json();
    const grade = {
      scores: [3, 2, 3],
      useful: true,
      issues: ["missing_information"],
    };
    expect(
      (
        await post("/grade", {
          version: state.version,
          grade: { ...grade, answer: "must not persist" },
        })
      ).status,
    ).toBe(400);
    expect(
      (await post("/grade", { version: state.version - 1, grade })).status,
    ).toBe(400);
    expect(
      (await post("/grade", { version: state.version, grade })).status,
    ).toBe(204);
    expect(await pending).toEqual(grade);
    expect(
      (await (await fetch(review.url + "/state")).json()).payload,
    ).toBeUndefined();
    expect(
      (await post("/grade", { version: state.version, grade })).status,
    ).toBe(400);
    const missing = review.assess({ ...payload, completed: false });
    const second = await (await fetch(review.url + "/state")).json();
    expect(
      (await post("/grade", { version: second.version, grade })).status,
    ).toBe(400);
    const unscored = { scores: null, useful: false, issues: ["delivery"] };
    expect(
      (await post("/grade", { version: second.version, grade: unscored }))
        .status,
    ).toBe(204);
    expect(await missing).toEqual(unscored);
  } finally {
    await review.close();
  }
});

it("expires unseen content without treating a missing review as acceptance", async () => {
  const review = await startTemporaryReview(25);
  try {
    await expect(review.waitUntilReady()).rejects.toThrow("not ready");
    await fetch(review.url + "/ready", {
      method: "POST",
      headers: { Origin: new URL(review.url).origin },
    });
    await expect(
      review.assess({
        caseId: "synthetic",
        arm: "baseline",
        completed: true,
        turns: [],
        sources: [],
      }),
    ).rejects.toThrow("timed out");
    expect(
      (await (await fetch(review.url + "/state")).json()).payload,
    ).toBeUndefined();
  } finally {
    await review.close();
  }
});
