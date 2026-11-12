Status: DRAFT, needs owner approval (12 November 2026)

# CometRow acceptable use — alpha

**Not legally reviewed.** Checklist rows B15/C6 (`docs/pre-alpha-checklist.md`). Gap filled: `docs/terms-draft-20261023.md` section 5 already has a one-paragraph rule. It does not name child abuse material, malware, scraping, emergencies, the supplier's rules, what happens on breach, or how to report. The text below is meant to replace that section 5 once approved. This file changes nothing on its own.

## Text for users

These rules apply to everyone using the CometRow alpha. They are short on purpose. If you are unsure whether something is allowed, ask us first.

**You may not use CometRow to:**

1. Break the law, or help anyone else break it.
2. Create, ask for, store or share sexual material involving children, or anything that exploits a child (grooming, trafficking, sextortion). We report this to the authorities.
3. Harass, threaten, defame, impersonate or deceive people, or discriminate against them unlawfully. Do not make sexual content about a real person without their consent.
4. Plan fraud or scams, or get help with terrorism, violence, weapons, explosives or chemical, biological, radiological or nuclear harm.
5. Write, improve or spread malware, ransomware, spyware, spam or botnets.
6. Try to break CometRow's security, the sealed server, or the limits and checks we build in. Do not try to get into another person's account or data. Do not get around sign-in, request limits or spending limits. Do not fake usage or check results. If you find a security hole, report it to us (see below) and do not use it.
7. Run automated scripts, bots or scrapers against CometRow, or send requests in bulk. One person, by hand, per account.
8. Make decisions about other people without care. If you use an answer about someone else (a tenant, an employee, a patient, a family member), check it yourself first, and stay within the law that protects them. CometRow's answers can be wrong.
9. Upload documents you have no right to use.

**Health and emergencies.** You can ask about health. CometRow is not a doctor and not an emergency service, and it cannot call for help. **In an emergency call 112.** For an urgent but not life-threatening medical problem in Germany, call the on-call doctor service, 116 117.

**Our AI supplier's rules apply too.** Your questions are answered on a sealed server run by Tinfoil, Inc. Tinfoil's acceptable use policy (https://tinfoil.sh/terms/aup) covers us and everyone we let use the service, so it covers you. Points 2 to 7 above cover the same ground. If the two ever differ, the stricter rule applies.

**What happens if the rules are broken.** Access to the alpha is by personal invitation. If you break these rules, we may pause your access while we look into it, or take back your invitation. Where we can, we tell you first and give the reason. For serious cases (points 2 and 4, or an attack on the service or on other users) we act at once and may tell the authorities. Repeated breaches can also get the whole service suspended by our supplier, which is why we take them seriously.

**How to report.** To report misuse, harmful answers or something that worries you, write to support@cometrow.com. To report a security hole or an incident, write to security@cometrow.com. You can also tell the operator directly, since you know them.

## Notes for the owner (not shown to users)

- **Tinfoil AUP, as read 12 November 2026** (page dated 12 October 2026). The page has no section numbers. The labels P1 to P12 below are ours, in page order. Re-check the page before publishing, and cite it by date, not by number.

  | Ours | Tinfoil prohibition (paraphrased) | Covered by point |
  | --- | --- | --- |
  | P1 | Child sexual abuse material, exploitation of minors | 2 |
  | P2 | Terrorism, extremism, trafficking, serious violence | 4 |
  | P3 | Weapons, explosives, CBRN | 4 |
  | P4 | Harassment, defamation, threats, impersonation, unlawful discrimination | 3 |
  | P5 | Fraud and scams | 4 |
  | P6 | Spam, malware, ransomware, spyware, botnets | 5 |
  | P7 | Bypassing security, unauthorised access, exploiting vulnerabilities | 6 |
  | P8 | Sexual content of real people without consent | 3 |
  | P9 | Deceptive synthetic media; hiding AI generation where disclosure is legally required | not in our list (*owner: add a line if image or media features ship*) |
  | P10 | Circumventing safety controls, filters, watermarking | 6 |
  | P11 | Attacking or overloading the service, other users' data, bypassing auth, rate limits, quotas, billing | 6, 7 |
  | P12 | Falsifying billing, usage, verification or attestation data | 6 |

  - **Flow-down:** the page applies to the customer and to anyone the customer allows to use the services. It has no separate end-user clause, so we pass it on through the sentence above.
  - **Security research:** the page welcomes good-faith security research (to security@tinfoil.sh). Our point 6 asks users to report to us rather than test. This is stricter, and on purpose for a 10-person alpha.
  - **Enforcement:** repeated violations can lead to suspension or a ban of *our* Tinfoil account, which takes the service down for every user.
  - Scraping (our point 7) and decisions about others (our point 8) are our own rules. They are not in Tinfoil's page.
- **How "pause or revoke" works today (from code, not tested on the hosted service):** the alpha allowlist is the `allowedEmails` list in the deployment config (`server/deployment-config.ts:17`, at most 10 addresses). Email sign-in accepts only listed addresses (`server/account-auth.ts:160-164`). To revoke, remove the address and redeploy. Sessions are configured for one hour (`server/account-auth.ts:263`). Whether removing an address ends a running session early, and whether Google sign-in checks the same list, is **unknown** and needs checking before this text promises anything. There is no in-app "pause" switch for one account. A pause is a revoke that is later undone.
- **Reporting addresses:** support@ and security@ come from the art. 30 draft and the imprint. Whether the support mailbox exists is **unknown** (art. 30 row 8: not set up, checklist R6). Do not publish this text until it does.
- The 112 / 116 117 sentence matches the in-app safety note (`src/App.tsx:1344`), which already says CometRow is not an emergency service.
