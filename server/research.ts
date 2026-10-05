import { randomBytes } from "node:crypto";
import { lookup } from "node:dns/promises";
import { Agent, fetch } from "undici";
import ipaddr from "ipaddr.js";
import { load } from "cheerio";
import { z } from "zod";
import {
  proxyConfigured,
  serviceDispatcher,
  publicFetchHosts,
  approvedProxyHost,
} from "./network";
import {
  disclosureSchema,
  type Disclosure,
  type Source,
} from "../shared/contracts";

export function publicAddress(address: string) {
  try {
    const ip = ipaddr.process(address);
    return ip.range() === "unicast";
  } catch {
    return false;
  }
}
export function pageUrl(value: string) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    url.hash ||
    url.hostname.endsWith(".") ||
    !url.hostname.includes(".")
  )
    throw new Error(
      "Use a public HTTPS URL without credentials, fragments or custom ports.",
    );
  return url;
}
export class Approvals {
  private records = new Map<
    string,
    { session: string; request: Disclosure; expires: number }
  >();
  constructor(private now = Date.now) {}
  issue(session: string, input: unknown) {
    const request = disclosureSchema.parse(input);
    if (request.kind === "page") pageUrl(request.value);
    for (const [id, record] of this.records)
      if (record.expires <= this.now()) this.records.delete(id);
    if (this.records.size >= 100)
      throw new Error("Too many pending approvals. Try again in five minutes.");
    const id = randomBytes(24).toString("hex");
    this.records.set(id, { session, request, expires: this.now() + 300000 });
    // Expiry also removes plaintext from the process map when no further requests arrive.
    setTimeout(() => this.records.delete(id), 300000).unref();
    return {
      id,
      request,
      recipient:
        request.kind === "search"
          ? "Brave Search API"
          : new URL(request.value).hostname,
    };
  }
  consume(session: string, id: string) {
    const record = this.records.get(id);
    if (!record || record.session !== session || record.expires <= this.now())
      throw new Error(
        "Approval is missing or expired. Review the disclosure again.",
      );
    this.records.delete(id);
    return record.request;
  }
  revoke(session: string, id: string) {
    if (this.records.get(id)?.session === session) this.records.delete(id);
  }
}
async function boundedText(
  response: Awaited<ReturnType<typeof fetch>>,
  max = 2 * 1024 * 1024,
) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body.");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > max) throw new Error("Public page exceeds the 2 MB limit.");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  return Buffer.concat(chunks).toString("utf8");
}
export function extractPublicText(raw: string, contentType: string) {
  // A text document may contain literal markup, entities and meaningful line breaks.
  // Parsing it as HTML would silently change the evidence supplied to the model.
  if (/^text\/plain(?:;|$)/i.test(contentType))
    return { text: raw.trim(), title: "" };
  if (!/^text\/html(?:;|$)/i.test(contentType))
    throw new Error("Only public HTML and plain-text pages are supported.");
  const $ = load(raw);
  $("script,style,noscript,iframe,form,svg,nav,footer").remove();
  // Keep adjacent paragraphs and table cells from merging into different facts.
  $("br").replaceWith("\n");
  $("td,th").append("\t");
  $("p,div,section,article,li,tr,h1,h2,h3,h4,h5,h6,pre").append("\n");
  return {
    text: $("body")
      .text()
      .replace(/[ \t]+/g, " ")
      .replace(/ *\n */g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
    title: $("title").text().slice(0, 200),
  };
}
export async function fetchPage(
  value: string,
  signal?: AbortSignal,
): Promise<Source[]> {
  const url = pageUrl(value);
  let direct: Agent | undefined;
  if (proxyConfigured) {
    // The proxy owns DNS, so client-side DNS pinning cannot establish SSRF protection.
    // Only operator-reviewed public hosts are available in this restricted mode.
    if (!approvedProxyHost(url.hostname, publicFetchHosts))
      throw new Error("Public host has not been approved for proxy retrieval.");
  } else {
    const addresses = await lookup(url.hostname, { all: true });
    if (!addresses.length || addresses.some((a) => !publicAddress(a.address)))
      throw new Error("Private and reserved network destinations are blocked.");
    direct = new Agent({
      connect: {
        lookup: (_host, options, callback) => {
          if (options.all) callback(null, addresses);
          else callback(null, addresses[0].address, addresses[0].family);
        },
      },
    });
  }
  try {
    const response = await fetch(url, {
      dispatcher: direct ?? serviceDispatcher,
      redirect: "manual",
      headers: {
        Accept: "text/html,text/plain",
        "User-Agent": "PrivateAI-Evaluation/0.1",
      },
      signal: AbortSignal.any([
        AbortSignal.timeout(15000),
        ...(signal ? [signal] : []),
      ]),
    });
    if (response.status >= 300 && response.status < 400) {
      await response.body?.cancel();
      throw new Error(
        "This page redirects. No redirected request was made; approve the destination separately.",
      );
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error("Public page could not be retrieved.");
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (!/^(text\/html|text\/plain)(;|$)/i.test(contentType)) {
      await response.body?.cancel();
      throw new Error("Only public HTML and plain-text pages are supported.");
    }
    const raw = await boundedText(response);
    const { text, title } = extractPublicText(raw, contentType);
    if (!text || text.length > 60000)
      throw new Error(
        "Page is empty or exceeds the text limit. Choose a smaller source.",
      );
    return [
      {
        id: randomBytes(6).toString("hex"),
        title: title || url.hostname,
        text,
        url: url.href,
        retrievedAt: new Date().toISOString(),
      },
    ];
  } finally {
    await direct?.destroy();
  }
}
export async function searchWeb(
  query: string,
  key: string,
  signal?: AbortSignal,
): Promise<Source[]> {
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", "5");
  const response = await fetch(url, {
    dispatcher: serviceDispatcher,
    headers: { "X-Subscription-Token": key, Accept: "application/json" },
    redirect: "error",
    signal: AbortSignal.any([
      AbortSignal.timeout(15000),
      ...(signal ? [signal] : []),
    ]),
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(
      "Search provider unavailable. No automatic retry was made.",
    );
  }
  try {
    const data = z.object({
      error: z.never().optional(),
      web: z.object({ results: z.array(z.object({
        title: z.string().min(1).max(10000),
        url: z.string().url().max(2000),
        description: z.string().min(1).max(60000),
      })).max(100) }),
    }).parse(JSON.parse(await boundedText(response)));
    return data.web.results.slice(0, 5).map((result) => {
      const title = load(result.title).text().trim();
      const excerpt = load(result.description).text().trim();
      if (!title || title.length > 2000 || !excerpt || excerpt.length > 59900)
        throw new Error("Invalid excerpt");
      return {
        id: randomBytes(6).toString("hex"),
        title,
        url: pageUrl(result.url).href,
        text: `Search excerpt only (full page not fetched): ${excerpt}`,
        retrievedAt: new Date().toISOString(),
      };
    });
  } catch {
    throw new Error("Search returned invalid source information. No automatic retry was made.");
  }
}
