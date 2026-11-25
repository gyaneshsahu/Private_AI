// The Render bridge passes a visitor address to the app only from the one header the owner
// named after the live check, and /edge-check never reveals an address.
import { expect, it } from "vitest";
import { EDGE_CHECK_ADDRESS, edgeCheck, edgeClientIp } from "../server/render-bridge";

it("takes the visitor address only from the named header, as one plain IP", () => {
  const raw = ["Host", "app.cometrow.com", "CF-Connecting-IP", "198.51.100.7", "X-Forwarded-For", "192.0.2.1"];
  expect(edgeClientIp(raw, undefined)).toBeUndefined();
  expect(edgeClientIp(raw, "cf-connecting-ip")).toBe("198.51.100.7");
  expect(edgeClientIp(raw, "true-client-ip")).toBeUndefined();
  expect(edgeClientIp(["cf-connecting-ip", "2001:db8::1"], "cf-connecting-ip")).toBe("2001:db8::1");
  // Sent twice, a list, a zone id or not an address: no address, so the shared limit applies.
  for (const bad of [["cf-connecting-ip", "198.51.100.7", "cf-connecting-ip", "198.51.100.8"], ["cf-connecting-ip", "198.51.100.7, 10.0.0.1"], ["cf-connecting-ip", "fe80::1%eth0"], ["cf-connecting-ip", "localhost"]])
    expect(edgeClientIp(bad, "cf-connecting-ip")).toBeUndefined();
});

it("the edge check says only whether each header arrived and whether the script's own value got through", () => {
  expect(edgeCheck(["cf-connecting-ip", "198.51.100.7"])).toEqual({
    "cf-connecting-ip": { present: true, forgeable: false },
    "true-client-ip": { present: false, forgeable: false },
  });
  expect(edgeCheck(["True-Client-IP", EDGE_CHECK_ADDRESS])["true-client-ip"]).toEqual({ present: true, forgeable: true });
  expect(JSON.stringify(edgeCheck(["cf-connecting-ip", "198.51.100.7"]))).not.toContain("198.51.100.7");
});

it("the app never holds the visitor's real address: the rate limit counts a keyed stand-in", async () => {
  const { visitorStandIn } = await import("../server/authenticated-ingress");
  const { isIPv6 } = await import("node:net");
  const a = visitorStandIn("198.51.100.7", "k".repeat(32))!;
  expect(isIPv6(a)).toBe(true);
  expect(a).not.toContain("198");
  expect(visitorStandIn("198.51.100.7", "k".repeat(32))).toBe(a); // the same visitor, the same bucket
  expect(visitorStandIn("198.51.100.8", "k".repeat(32))).not.toBe(a);
  expect(visitorStandIn("198.51.100.7", "other-key".repeat(4))).not.toBe(a);
  // Better Auth may count an IPv6 address by its first 64 bits: those must differ too.
  expect(visitorStandIn("198.51.100.8", "k".repeat(32))!.slice(0, 19)).not.toBe(a.slice(0, 19));
  expect(visitorStandIn("198.51.100.7", undefined)).toBeNull();
});
