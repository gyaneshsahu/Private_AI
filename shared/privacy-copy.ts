/**
 * The one plain-language statement of what CometRow does with your data.
 * The app's privacy panel renders it and the website copies it verbatim
 * (docs/privacy-copy-20261022.md); a test keeps the two identical. Every
 * sentence must be true of the shipped product on the day it is shown, so
 * change this file only together with the behaviour it describes.
 */
export interface PrivacySection {
  id: string;
  heading: string;
  text: string;
}

export const PRIVACY_COPY: readonly PrivacySection[] = [
  {
    id: "device",
    heading: "What stays on your device",
    text: "Before anything is sent, CometRow looks for ID numbers, bank account and card numbers, tax and insurance numbers, passport or ID card numbers next to their label, phone numbers, email addresses and dates of birth next to their label. It replaces each one with a stand-in like {{IBAN-1}} and keeps the real value on your device. The answer comes back with the real values put back in, and a note under the answer tells you what was kept. Names, addresses and other facts written in your own words are not recognised; treat them as part of the sealed question below. An incognito chat is never saved on this device, and disappearing messages are deleted from this device after the time you choose; neither changes what the secure server or our records hold.",
  },
  {
    id: "sealed",
    heading: "What is sealed and sent",
    text: "The rest of your question, your selected files and the earlier messages you included are locked in your browser so that only one secure server can open them. The server is a sealed computer with a protected graphics processor. Before each request your browser checks that it is talking to an approved sealed release; that check is partial today: it cannot tell whether the approval was later withdrawn or how old the evidence is, and the company has given no date for a fuller browser check. Our own systems pass the locked package along and cannot open it.",
  },
  {
    id: "ours",
    heading: "What we can see",
    text: "We can see that your account asked something, when, how many times, which model answered, and afterwards how long the question and answer were and what they cost at published rates. We never see what you asked or what was answered. There is no anonymous mode: every request comes from a signed-in account, incognito chats included, so we only ever know that your account asked, never what. We keep no copy of your conversations; saved history lives only on your device, locked with a password we do not have.",
  },
  {
    id: "provider",
    heading: "What the secure server keeps",
    text: "The company that runs the secure server states that it does not keep your question or answer after the reply is sent and does not use them to train any AI. It keeps a short-term working memory inside the sealed server that can hold parts of recent questions until it clears on its own, usually within minutes, sometimes hours; there is no button that empties it, no promised maximum time, and the company has said it does not plan to add one. It keeps records such as time, model and token counts, without content; the company states it keeps these for 90 days, longer for accounting records.",
  },
  {
    id: "limits",
    heading: "Spending and limits",
    text: "Your plan allows a set number of requests, and only one request runs at a time per account. Spending limits on the secure server are soft: a request that is already running finishes and is billed even if a limit is reached while it runs.",
  },
  {
    id: "research",
    heading: "When you search the web",
    text: "A web search only happens when you approve the exact search text shown to you, in Research or by tapping a search suggestion, or when you have switched on automatic search. Recognised identifiers are removed from that text on your device first, and you are warned if it may still contain a name or other personal detail. That text is sent from our server to the search provider, which can read it and may keep it for up to 90 days; your own address is not sent. Under the same approval, our server also opens the top result page, preferring an official site, and reads its text. That site sees our server's address, not yours. If the page address contains a recognised personal detail, the page is opened without the part that holds it, or not at all. The page text is used only for answers in that conversation and is never saved. If you switch on automatic search, a question that looks time-sensitive is searched without asking each time: recognised identifiers are removed on your device first and the exact text sent is shown to you. The setting is off until you switch it on and is kept only on this device. Search results and their links are shown only during the conversation and are never saved. The written answer built on them is kept in your saved history on this device; a reopened conversation says it came from a live search and offers to search again for current sources, which needs your approval again.",
  },
  {
    id: "notyet",
    heading: "What we cannot promise yet",
    text: "Private chat is switched on only after our checks of the secure server pass. Your browser, your device and anyone who can read your screen can see your conversations. If you lose your password, nobody can recover your saved history. There is no anonymous mode: we know which account asked, never what was asked. A broken or malicious update to this app could read content before it is sealed, which is why updates are published with their exact version.",
  },
];

export type PrivacyProvider = "tinfoil" | "privatemode";

/**
 * DRAFT, NEEDS OWNER APPROVAL (D17). The sections whose provider claims differ for
 * Privatemode: D17's four sentences (cache, metadata retention, spending limits, browser
 * check) plus the fifth from the Stage 3 plan ("What we can see": token counts reach us
 * locked). Sources per claim: docs/provider-promises-20261112.md; old and new side by
 * side in docs/privacy-wording-privatemode-20261112.md. Every other section is shared,
 * except one automatic-search sentence in "When you search the web" (13 November).
 */
export const PRIVATEMODE_PRIVACY_STATUS = "draft-needs-owner-approval";
const PRIVATEMODE_SECTIONS: Readonly<Record<string, string>> = {
  sealed:
    "The rest of your question, your selected files and the earlier messages you included are locked in your browser so that only one secure server can open them. The server is a sealed computer with a protected graphics processor. When you start chatting and again at least every 10 minutes, your browser checks the sealed computer against a release we approved; that check is partial: it does not cover the graphics processor, which the company states it checks on its own side before your question can be opened, and we have not yet confirmed whether the browser check notices an approval that was later withdrawn. Our own systems pass the locked package along and cannot open it.",
  ours:
    "We can see that your account asked something, when, how many times and which model answered. We do not see how long the question and answer were or what each one cost: your browser shows you those counts, but they reach our systems locked. We never see what you asked or what was answered. There is no anonymous mode: every request comes from a signed-in account, incognito chats included, so we only ever know that your account asked, never what. We keep no copy of your conversations; saved history lives only on your device, locked with a password we do not have.",
  provider:
    "The company that runs the secure server states that it does not keep your question or answer after the reply is sent and does not use them to train any AI. It keeps a short-term working memory inside the sealed server that can hold parts of recent questions; each account's memory is kept apart with its own secret, so another account cannot reuse it or tell what it holds. There is no button that empties it and no promised maximum time. It keeps records such as time and token counts, without content; the company states it keeps these for up to 90 days, and keeps token counts per key permanently for billing. We use one key for all accounts, so those permanent counts are not linked to your account.",
  limits:
    "Your plan allows a set number of requests, and only one request runs at a time per account. We also set limits on our key at the secure server; the company states that it enforces them there, so new requests are refused once a limit is reached.",
  // 13 November: automatic search also covers German rules, fees and deadlines. The approved
  // Tinfoil text is left unchanged for the owner to approve (docs/german-rules-20261113.md).
  research: PRIVACY_COPY.find((s) => s.id === "research")!.text.replace(
    "a question that looks time-sensitive is searched",
    "a question that looks time-sensitive or is about rules, fees or deadlines is searched",
  ),
};

/** The statement for the provider in use; Tinfoil's is the approved text, unchanged. */
export function privacyCopy(provider: PrivacyProvider = "tinfoil"): readonly PrivacySection[] {
  if (provider === "tinfoil") return PRIVACY_COPY;
  return PRIVACY_COPY.map((section) =>
    PRIVATEMODE_SECTIONS[section.id]
      ? { ...section, text: PRIVATEMODE_SECTIONS[section.id] }
      : section,
  );
}

/** Full statement as plain text, headings included, for in-app display and export. */
export function privacyText(provider: PrivacyProvider = "tinfoil"): string {
  return privacyCopy(provider)
    .map((section) => `${section.heading}\n${section.text}`)
    .join("\n\n");
}

/** One sentence for the settings panel. */
export const PRIVACY_SUMMARY =
  "ID, bank and contact details stay on your device; everything else is sealed so only one checked secure server can read it, and we never can.";
