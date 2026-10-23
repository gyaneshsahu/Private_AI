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
    text: "A web search only happens when you approve the exact search text shown to you. Recognised identifiers are removed from that text on your device first, and you are warned if it may still contain a name or other personal detail. That text is sent from our server to the search provider, which can read it and may keep it for up to 90 days; your own address is not sent. Search results and their links are shown only during the conversation and are never saved. The written answer built on them is kept in your saved history on this device; a reopened conversation says it came from a live search and offers to search again for current sources, which needs your approval again.",
  },
  {
    id: "notyet",
    heading: "What we cannot promise yet",
    text: "Private chat is switched on only after our checks of the secure server pass. Your browser, your device and anyone who can read your screen can see your conversations. If you lose your password, nobody can recover your saved history. There is no anonymous mode: we know which account asked, never what was asked. A broken or malicious update to this app could read content before it is sealed, which is why updates are published with their exact version.",
  },
];

/** Full statement as plain text, headings included, for in-app display and export. */
export function privacyText(): string {
  return PRIVACY_COPY.map(
    (section) => `${section.heading}\n${section.text}`,
  ).join("\n\n");
}

/** One sentence for the settings panel. */
export const PRIVACY_SUMMARY =
  "ID, bank and contact details stay on your device; everything else is sealed so only one checked secure server can read it, and we never can.";
