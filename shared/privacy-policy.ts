import { PRIVACY_COPY, type PrivacySection } from "./privacy-copy";

/**
 * The in-app privacy policy page. It is built from the privacy statement so
 * the two can never disagree, plus the deletion path and contact sections.
 * Items the owner has not yet decided are stated as not yet named rather than
 * invented. `docs/privacy-policy-20261022.md` is generated from this file.
 */
export const POLICY_DATE = "22 October 2026";

export const POLICY_SECTIONS: readonly PrivacySection[] = [
  {
    id: "who",
    heading: "Who is responsible",
    text: "CometRow is run by its founder in Germany as an individual, not yet a registered company. The legal identity, postal address and privacy contact will be published here before anyone outside the founder is given access; until then they are not yet named.",
  },
  ...PRIVACY_COPY,
  {
    id: "delete",
    heading: "What you can delete, and how",
    text: "One saved conversation: open Saved and choose Delete next to it. Everything saved on this device: open Saved and use Delete everything on this device; it removes every saved conversation and project in this browser and locks the vault, and cannot be undone. Encrypted backup files you downloaded are ordinary files on your device; delete them yourself, and remember that any copy still opens with its original password. Your account: open the account page and choose Close account; this needs a fresh email code, so on a service where email delivery is switched off it is not available yet.",
  },
  {
    id: "cannot",
    heading: "What we cannot delete for you",
    text: "The secure server's short-term working memory, which clears on its own within minutes to a few hours and has no delete button. The provider's records of time, model and token counts, which the provider states it keeps for 90 days. Our own request records: which account asked, when, how many times, which model, and the published cost; how long we keep them is an owner decision not yet made and will be stated here when it is. Search-provider records of search text you approved, kept under that provider's policy.",
  },
  {
    id: "contact",
    heading: "Questions, requests and incidents",
    text: "A privacy contact and an incident contact are not yet named. Until they are published here, there is no public way to send a data request, and nobody outside the founder has access to the service. If you ever find a security problem, do not test it against other people's accounts.",
  },
  {
    id: "changes",
    heading: "Changes to this policy",
    text: "This policy describes the app exactly as built on the date above. When the app changes in a way that affects what happens to your data, this page changes with it in the same release, and the date is updated.",
  },
];

/**
 * Phrases that mark an owner decision still missing from the policy. The
 * production candidate build refuses to proceed while any is present
 * (scripts/policy-placeholders.ts); remove the phrase only together with the
 * decision it stands for.
 */
export const POLICY_PLACEHOLDERS = ["not yet named", "not yet made"] as const;

/** Every section still carrying a placeholder phrase, with the phrase. */
export function policyPlaceholders(): { id: string; phrase: string }[] {
  const found: { id: string; phrase: string }[] = [];
  for (const section of POLICY_SECTIONS)
    for (const phrase of POLICY_PLACEHOLDERS)
      if (section.text.toLowerCase().includes(phrase))
        found.push({ id: section.id, phrase });
  return found;
}

export function privacyPolicyText(): string {
  return (
    `CometRow privacy policy, ${POLICY_DATE}\n\n` +
    POLICY_SECTIONS.map(
      (section) => `${section.heading}\n${section.text}`,
    ).join("\n\n")
  );
}
