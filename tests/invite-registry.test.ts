import { expect, it } from "vitest";
import { InviteRegistry } from "../server/invite-registry";
it("redeems once, checks passwords, expires and revokes each identity independently", async () => {
  let now = 10000000;
  const registry = new InviteRegistry(":memory:", () => now);
  try {
    const alice = registry.issue(now + 10000),
      bob = registry.issue(now + 20000);
    expect(
      await registry.register(alice.id, "wrong", "long synthetic password"),
    ).toBe(false);
    expect(
      await registry.register(alice.id, alice.token, "long synthetic password"),
    ).toBe(true);
    expect(
      await registry.register(
        alice.id,
        alice.token,
        "another synthetic password",
      ),
    ).toBe(false);
    expect(await registry.login(alice.id, "long synthetic password")).toBe(
      true,
    );
    expect(await registry.login(bob.id, "long synthetic password")).toBe(false);
    registry.revoke(alice.id);
    expect(await registry.login(alice.id, "long synthetic password")).toBe(
      false,
    );
    expect(registry.active(bob.id)).toBe(true);
    now += 20001;
    expect(registry.active(bob.id)).toBe(false);
    expect(
      await registry.register(bob.id, bob.token, "long synthetic password"),
    ).toBe(false);
  } finally {
    registry.close();
  }
});
it("keeps request limits tied to the invite across new sessions", () => {
  let now = 10000000;
  const registry = new InviteRegistry(":memory:", () => now);
  try {
    const invite = registry.issue(now + 7200000);
    for (let i = 0; i < 200; i++)
      expect(registry.allowRequest(invite.id)).toBe(true);
    expect(registry.allowRequest(invite.id)).toBe(false);
    now += 3600001;
    expect(registry.allowRequest(invite.id)).toBe(true);
  } finally {
    registry.close();
  }
});
