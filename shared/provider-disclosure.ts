/**
 * DRAFT, NEEDS OWNER APPROVAL. "Who processes your messages" for the privacy policy,
 * one entry per supported provider, written 12 November 2026 from documents read
 * directly (sources listed per entry). Shown only when the server sets the
 * `providerDisclosureDraft` flag (off in production); without it the policy text is
 * unchanged. Mirrored in docs/provider-disclosure-draft-20261112.md; a test keeps them equal.
 */
export type DisclosedProvider = "tinfoil" | "privatemode";

export const PROVIDER_DISCLOSURE_STATUS = "draft-needs-owner-approval";
export const PROVIDER_DISCLOSURE_HEADING = "Who processes your messages";

export const PROVIDER_DISCLOSURE: Record<
  DisclosedProvider,
  { text: string; sources: readonly string[] }
> = {
  tinfoil: {
    text: "Your messages are answered by our AI provider Tinfoil, Inc., San Francisco, USA, on its secure servers. Tinfoil processes them in the United States. This is a transfer outside the EU, covered by the EU Standard Contractual Clauses in Tinfoil's data processing agreement with us. Tinfoil states that it keeps records such as time, model and token counts, without the content of your messages, for 90 days, and longer for accounting records.",
    sources: [
      "Tinfoil data processing addendum of 12 October 2026, section 10 (processing outside the EU, including in the US; Standard Contractual Clauses)",
      "Tinfoil email reply of 22 October 2026 (metadata kept 90 days, longer for accounting records)",
    ],
  },
  privatemode: {
    text: "Your messages are answered by our AI provider Edgeless Systems GmbH, Bochum, Germany (Privatemode), on secure servers in the EU run by Scaleway (France) and Lyceum (Germany). Your messages are processed only in the EU and the European Economic Area. Edgeless states that it keeps records such as time and token counts, without the content of your messages, for up to 90 days, and token counts per account permanently for billing.",
    sources: [
      "Privatemode data processing agreement of 24 July 2026, sections 9 and 10 (sub-processors Scaleway and Lyceum; processing exclusively in the EU or EEA)",
      "Privatemode FAQ, read 11 November 2026 (metadata up to 90 days; token usage per API key stored permanently for billing)",
    ],
  },
};

export function providerDisclosureSection(provider: DisclosedProvider) {
  return {
    id: "processor",
    heading: PROVIDER_DISCLOSURE_HEADING,
    text: PROVIDER_DISCLOSURE[provider].text,
  } as const;
}
