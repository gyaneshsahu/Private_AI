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

it("admission by mode: the gateway needs an address, the plain bridge takes none, the checked bridge takes a stand-in or none", async () => {
  const { admittedAddress, visitorStandIn } = await import("../server/authenticated-ingress");
  const key = "k".repeat(32);
  // The gateway with mutual TLS: exactly as before this change.
  expect(admittedAddress("client-ip", undefined, "203.0.113.8")).toBe("203.0.113.8");
  expect(admittedAddress("client-ip", undefined, "::ffff:203.0.113.8")).toBe("203.0.113.8");
  for (const bad of [undefined, "", "localhost", "fe80::1%eth0", "203.0.113.8, 10.0.0.1", "1".repeat(46)])
    expect(() => admittedAddress("client-ip", undefined, bad), String(bad)).toThrow("Invalid edge metadata");
  // The Render bridge without a checked header: exactly as before; an address is a reason to refuse.
  expect(admittedAddress("shared", "shared", undefined)).toBeNull();
  expect(() => admittedAddress("shared", "shared", "203.0.113.8")).toThrow();
  expect(() => admittedAddress("shared", undefined, undefined)).toThrow();
  expect(() => admittedAddress("shared", "client-ip", undefined)).toThrow();
  // The Render bridge with a checked header: no address means the shared limit; an address becomes its stand-in.
  expect(admittedAddress("shared-ip", "shared", undefined, key)).toBeNull();
  expect(admittedAddress("shared-ip", "shared", "203.0.113.8", key)).toBe(visitorStandIn("203.0.113.8", key));
  expect(admittedAddress("shared-ip", "shared", "::ffff:203.0.113.8", key)).toBe(visitorStandIn("203.0.113.8", key));
  expect(admittedAddress("shared-ip", "shared", "203.0.113.8", key)).not.toContain("203");
  expect(() => admittedAddress("shared-ip", undefined, "203.0.113.8", key)).toThrow();
  for (const bad of ["localhost", "fe80::1%eth0", "203.0.113.8, 10.0.0.1"]) expect(() => admittedAddress("shared-ip", "shared", bad, key), bad).toThrow();
  // Without a key there is no stand-in, so the shared limit applies: a real address is never kept.
  expect(admittedAddress("shared-ip", "shared", "203.0.113.8", undefined)).toBeNull();
});
