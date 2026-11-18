// CometRow terms of use, English and German. DRAFT for the legal read (18 November 2026), not yet
// approved by a lawyer. Accepted with the Privacy Policy by one line on the sign-in page; the
// version accepted is recorded (shared/legal-versions.ts). Sources: docs/terms-draft-20261023.md,
// docs/acceptable-use-draft-20261112.md (and -de-), docs/age-rule-draft-20261112.md (and -de-),
// docs/image-creation-20261117.md, docs/owner-decisions.md (free, invite-only alpha).
// Served at /terms (server/legal-pages.ts). Plain text: a heading line, then the section text;
// sections are separated by a blank line, and never contain one.
import type { Lang } from "../src/i18n";
import { LEGAL_IDENTITY, identityDe } from "./legal-identity";
import { TERMS_VERSION } from "./legal-versions";

export const TERMS_DATE = "18 November 2026";
export const TERMS_DATE_DE = "18. November 2026";

interface TermsSection {
  heading: string;
  text: string;
}

function sectionsEn(): TermsSection[] {
  const id = LEGAL_IDENTITY;
  return [
    {
      heading: "1. Who provides CometRow",
      text: `CometRow is provided by ${id.operatorName}, ${id.legalForm}, ${id.addressLines.join(", ")}, ${id.country} (“we”). Contact: ${id.supportContactEmail}. The imprint has the full details.`,
    },
    {
      heading: "2. These terms",
      text: `These terms apply to your use of CometRow. You accept them, together with the Privacy Policy, by continuing on the sign-in page, which says: “By continuing, you agree to our Terms and Privacy Policy.” We record which version you accepted (this is version ${TERMS_VERSION}) and when. The Privacy Policy explains what happens to your data; on data matters it takes precedence. [For the legal read: whether this line and a link incorporate the terms validly (§§ 305 ff. BGB).]`,
    },
    {
      heading: "3. An invite-only alpha",
      text: "CometRow is in an invite-only test phase (alpha). Only people we have invited personally can sign in. The alpha is free. Features may be switched on, changed or switched off during the alpha, and some may not work as expected. [For the legal read: what the rules on digital products (§§ 327 ff. BGB) require for a free alpha.]",
    },
    {
      heading: "4. Who may use CometRow",
      text: "You must be 18 or older to use CometRow. By accepting your invitation and signing in, you confirm that you are. If we learn that an account belongs to someone under 18, we close it and delete its data. One person per account; do not share your account.",
    },
    {
      heading: "5. Your account and sign-in",
      text: `You sign in with “Continue with Google”, using the email address you were invited with; sign-in with an email code may follow later. Keep access to your sign-in to yourself. A session ends after 1 hour without use. If you think someone else is using your account, tell us at once at ${id.incidentContactEmail}. [For the legal read: responsibility for use of the account by others.]`,
    },
    {
      heading: "6. Acceptable use",
      text: [
        "You may not use CometRow to:",
        "1. Break the law, or help anyone else break it.",
        "2. Create, ask for, store or share sexual material involving children, or anything that exploits a child (grooming, trafficking, sextortion). We report this to the authorities.",
        "3. Harass, threaten, defame, impersonate or deceive people, or discriminate against them unlawfully. Do not make sexual content about a real person without their consent.",
        "4. Plan fraud or scams, or get help with terrorism, violence, weapons, explosives or chemical, biological, radiological or nuclear harm.",
        "5. Write, improve or spread malware, ransomware, spyware, spam or botnets.",
        "6. Try to break CometRow's security, the sealed server, or the limits and checks we build in. Do not try to get into another person's account or data. Do not get around sign-in, request limits or spending limits. Do not fake usage or check results. If you find a security hole, report it to us and do not use it.",
        "7. Run automated scripts, bots or scrapers against CometRow, or send requests in bulk. One person, by hand, per account.",
        "8. Make decisions about other people without care. If you use an answer about someone else, check it yourself first, and stay within the law that protects them.",
        "9. Upload documents or pictures you have no right to use.",
        "10. Use image creation to depict real people without their consent, to create sexual content involving anyone under 18 or any non-consensual intimate imagery, or to deceive, for example by passing off a created image as a real photo.",
        "Our AI provider's usage rules apply as well; if they differ from these, the stricter rule applies. [For the legal read: link the current AI provider's usage rules (the alpha uses Privatemode) and check how they pass on to users.]",
        "If you break these rules, we may pause your access while we look into it, or end it. Where we can, we tell you first and give the reason. For serious cases (points 2, 4 and 10, or an attack on the service or on other users) we act at once and may tell the authorities.",
        `To report misuse or a harmful answer, write to ${id.supportContactEmail}; to report a security hole, write to ${id.incidentContactEmail}.`,
      ].join("\n"),
    },
    {
      heading: "7. AI answers can be wrong",
      text: "Answers and images are made by an AI. Answers can be wrong, incomplete or out of date, even when they sound sure. Check important answers, especially on health, law, tax and money, before you rely on them. CometRow is not a doctor, lawyer, tax adviser or financial adviser. It is not an emergency service and cannot call for help: in an emergency call 112; for an urgent but not life-threatening medical problem in Germany, call the on-call doctor service, 116 117.",
    },
    {
      heading: "8. Your content stays yours",
      text: "What you write and upload stays yours. You allow us only what is needed to run the features you use, for example to send your message to the AI provider for an answer and to store your saved chats in the mode you chose. We do not use your content for advertising or to train any AI. You may use the answers and images you create, at your own responsibility. You must have the right to use what you upload. [For the legal read: rights in AI answers and created images, and the image provider's terms.]",
    },
    {
      heading: "9. Allowances and limits",
      text: "Your account has an allowance: a number of requests in a period, with a daily cap, and separate daily limits for voice, pictures and image creation. Some requests count more than one, for example Thinking answers; the app shows how much is left. When an allowance is used up, you wait until it renews. We may change allowances and limits during the alpha; the current numbers are shown in the app.",
    },
    {
      heading: "10. Secure and Secure Max",
      text: "Secure is the default: your saved chats are encrypted with a key we hold for your account, so you can use them on every device. Secure Max is optional: only your devices hold the key. If you lose your passphrase and your recovery key, your Secure Max content is lost for good, and we cannot recover it. Keep your recovery key safe.",
    },
    {
      heading: "11. Availability and changes",
      text: "We provide CometRow as it is during the alpha. We do not promise that it is always available or free of errors. We may change, pause or end features, models, partners and the alpha itself, and we tell you about important changes in the app. When these terms change in substance, their version changes and your next sign-in asks you to accept the new version. [For the legal read: notice period and how users can object to changed terms (§ 308 Nr. 5 BGB).]",
    },
    {
      heading: "12. Ending your account",
      text: `You can close your account at any time on the account page, or by writing to ${id.supportContactEmail}. We then delete it as described in the Privacy Policy. We may end your access if you break these terms, or when the alpha ends; where we can, we tell you in advance so you can download your data. [To confirm: closing on the account page needs an email code, which is not available while email sign-in is off.] [For the legal read: notice periods.]`,
    },
    {
      heading: "13. Liability",
      text: "[For the legal read: this whole section, given that the alpha is free.] We are liable without limit for intent and gross negligence, for injury to life, body or health, and under the Product Liability Act. For slight negligence we are liable only for breach of essential duties, limited to the foreseeable, typical damage. Nothing in these terms limits your statutory rights as a consumer.",
    },
    {
      heading: "14. Law",
      text: "German law applies. If you are a consumer, this does not take away the protection of the mandatory law of the country where you live. [For the legal read: venue, and the statement on consumer dispute resolution (§ 36 VSBG), which the imprint also covers.]",
    },
    {
      heading: "15. Contact",
      text: `Support: ${id.supportContactEmail}. Privacy requests: ${id.privacyContactEmail}. Security incidents: ${id.incidentContactEmail}.`,
    },
  ];
}

function sectionsDe(): TermsSection[] {
  const id = identityDe();
  return [
    {
      heading: "1. Wer CometRow anbietet",
      text: `CometRow wird angeboten von ${id.operatorName}, ${id.legalForm}, ${id.addressLines.join(", ")}, ${id.country} („wir“). Kontakt: ${id.supportContactEmail}. Alle Angaben stehen im Impressum.`,
    },
    {
      heading: "2. Diese Bedingungen",
      text: `Diese Bedingungen gelten für Ihre Nutzung von CometRow. Sie nehmen sie zusammen mit der Datenschutzerklärung an, indem Sie auf der Anmeldeseite fortfahren, auf der steht: „Indem Sie fortfahren, stimmen Sie unseren Nutzungsbedingungen und unserer Datenschutzerklärung zu.“ Wir speichern, welche Version Sie angenommen haben (dies ist Version ${TERMS_VERSION}), und wann. Die Datenschutzerklärung erklärt, was mit Ihren Daten geschieht; in Datenfragen hat sie Vorrang. [Für die rechtliche Prüfung: ob diese Zeile mit einem Link die Bedingungen wirksam einbezieht (§§ 305 ff. BGB).]`,
    },
    {
      heading: "3. Eine Alpha-Version nur auf Einladung",
      text: "CometRow befindet sich in einer Testphase nur auf Einladung (Alpha). Nur Personen, die wir persönlich eingeladen haben, können sich anmelden. Die Alpha ist kostenlos. Funktionen können während der Alpha eingeschaltet, geändert oder abgeschaltet werden, und manche funktionieren vielleicht nicht wie erwartet. [Für die rechtliche Prüfung: was die Regeln über digitale Produkte (§§ 327 ff. BGB) für eine kostenlose Alpha verlangen.]",
    },
    {
      heading: "4. Wer CometRow nutzen darf",
      text: "Sie müssen mindestens 18 Jahre alt sein, um CometRow zu nutzen. Indem Sie Ihre Einladung annehmen und sich anmelden, bestätigen Sie, dass Sie es sind. Wenn wir erfahren, dass ein Konto einer Person unter 18 Jahren gehört, schließen wir es und löschen seine Daten. Eine Person pro Konto; teilen Sie Ihr Konto nicht.",
    },
    {
      heading: "5. Ihr Konto und die Anmeldung",
      text: `Sie melden sich mit „Weiter mit Google“ an, mit der E-Mail-Adresse, mit der Sie eingeladen wurden; die Anmeldung mit einem E-Mail-Code kann später folgen. Behalten Sie den Zugang zu Ihrer Anmeldung für sich. Eine Sitzung endet nach 1 Stunde ohne Nutzung. Wenn Sie glauben, dass jemand anderes Ihr Konto nutzt, sagen Sie es uns sofort unter ${id.incidentContactEmail}. [Für die rechtliche Prüfung: Verantwortung für die Nutzung des Kontos durch andere.]`,
    },
    {
      heading: "6. Zulässige Nutzung",
      text: [
        "Sie dürfen CometRow nicht verwenden, um:",
        "1. gegen das Gesetz zu verstoßen oder anderen dabei zu helfen.",
        "2. sexuelle Inhalte, an denen Kinder beteiligt sind, oder irgendetwas, das ein Kind ausbeutet (Grooming, Menschenhandel, Sextortion), zu erstellen, anzufordern, zu speichern oder zu teilen. Wir melden das den Behörden.",
        "3. Menschen zu belästigen, zu bedrohen, zu verleumden, sich als jemand anderes auszugeben, Menschen zu täuschen oder sie rechtswidrig zu benachteiligen. Erstellen Sie keine sexuellen Inhalte über eine reale Person ohne deren Einwilligung.",
        "4. Betrug oder Betrugsmaschen zu planen oder sich Hilfe bei Terrorismus, Gewalt, Waffen, Sprengstoffen oder chemischen, biologischen, radiologischen oder nuklearen Schäden zu holen.",
        "5. Schadsoftware, Ransomware, Spyware, Spam oder Botnetze zu schreiben, zu verbessern oder zu verbreiten.",
        "6. zu versuchen, die Sicherheit von CometRow, den versiegelten Server oder die von uns eingebauten Grenzen und Prüfungen zu überwinden. Versuchen Sie nicht, in das Konto oder an die Daten einer anderen Person zu gelangen. Umgehen Sie nicht die Anmeldung, Anfragegrenzen oder Ausgabengrenzen. Fälschen Sie keine Nutzung und keine Prüfergebnisse. Wenn Sie eine Sicherheitslücke finden, melden Sie sie uns und nutzen Sie sie nicht.",
        "7. automatisierte Skripte, Bots oder Scraper gegen CometRow einzusetzen oder Anfragen massenhaft zu senden. Eine Person, von Hand, pro Konto.",
        "8. ohne Sorgfalt Entscheidungen über andere Menschen zu treffen. Wenn Sie eine Antwort über eine andere Person verwenden, prüfen Sie sie zuerst selbst und halten Sie sich an das Recht, das diese Person schützt.",
        "9. Dokumente oder Bilder hochzuladen, die Sie nicht verwenden dürfen.",
        "10. mit der Bilderstellung reale Personen ohne deren Einwilligung darzustellen, sexuelle Inhalte mit Personen unter 18 Jahren oder intime Bilder ohne Einwilligung zu erstellen oder zu täuschen, etwa indem Sie ein erstelltes Bild als echtes Foto ausgeben.",
        "Die Nutzungsregeln unseres KI-Anbieters gelten ebenfalls; wenn sie sich von diesen unterscheiden, gilt die strengere Regel. [Für die rechtliche Prüfung: die Nutzungsregeln des aktuellen KI-Anbieters verlinken (die Alpha nutzt Privatemode) und prüfen, wie sie an die Nutzer weitergegeben werden.]",
        "Wenn Sie gegen diese Regeln verstoßen, können wir Ihren Zugang pausieren, während wir die Sache prüfen, oder ihn beenden. Wo wir können, sagen wir es Ihnen vorher und nennen den Grund. In schweren Fällen (Punkte 2, 4 und 10 oder ein Angriff auf den Dienst oder auf andere Nutzer) handeln wir sofort und können die Behörden informieren.",
        `Um Missbrauch oder eine schädliche Antwort zu melden, schreiben Sie an ${id.supportContactEmail}; um eine Sicherheitslücke zu melden, schreiben Sie an ${id.incidentContactEmail}.`,
      ].join("\n"),
    },
    {
      heading: "7. KI-Antworten können falsch sein",
      text: "Antworten und Bilder werden von einer KI erstellt. Antworten können falsch, unvollständig oder veraltet sein, auch wenn sie sicher klingen. Prüfen Sie wichtige Antworten, besonders zu Gesundheit, Recht, Steuern und Geld, bevor Sie sich darauf verlassen. CometRow ist kein Arzt, kein Anwalt, kein Steuerberater und kein Finanzberater. Es ist kein Notdienst und kann keine Hilfe rufen: Im Notfall rufen Sie 112 an; bei einem dringenden, aber nicht lebensbedrohlichen medizinischen Problem in Deutschland rufen Sie den ärztlichen Bereitschaftsdienst an, 116 117.",
    },
    {
      heading: "8. Ihre Inhalte bleiben Ihre",
      text: "Was Sie schreiben und hochladen, bleibt Ihres. Sie erlauben uns nur, was nötig ist, um die Funktionen zu betreiben, die Sie nutzen, zum Beispiel Ihre Nachricht für eine Antwort an den KI-Anbieter zu senden und Ihre gespeicherten Chats in dem von Ihnen gewählten Modus zu speichern. Wir nutzen Ihre Inhalte nicht für Werbung und nicht zum Training einer KI. Sie dürfen die Antworten und Bilder, die Sie erstellen, auf eigene Verantwortung verwenden. Sie müssen das Recht haben, das zu verwenden, was Sie hochladen. [Für die rechtliche Prüfung: Rechte an KI-Antworten und erstellten Bildern sowie die Bedingungen des Bildanbieters.]",
    },
    {
      heading: "9. Kontingente und Grenzen",
      text: "Ihr Konto hat ein Kontingent: eine Zahl von Anfragen in einem Zeitraum, mit einer Tagesgrenze, und eigene Tagesgrenzen für Sprache, Bilder und die Bilderstellung. Manche Anfragen zählen mehr als eine, zum Beispiel Antworten mit Nachdenken; die App zeigt, wie viel übrig ist. Wenn ein Kontingent aufgebraucht ist, warten Sie, bis es sich erneuert. Wir können Kontingente und Grenzen während der Alpha ändern; die aktuellen Zahlen zeigt die App.",
    },
    {
      heading: "10. Secure und Secure Max",
      text: "Secure ist der Standard: Ihre gespeicherten Chats werden mit einem Schlüssel verschlüsselt, den wir für Ihr Konto halten, damit Sie sie auf jedem Gerät nutzen können. Secure Max ist freiwillig: Nur Ihre Geräte haben den Schlüssel. Wenn Sie Ihre Passphrase und Ihren Wiederherstellungsschlüssel verlieren, sind Ihre Inhalte in Secure Max endgültig verloren, und wir können sie nicht wiederherstellen. Bewahren Sie Ihren Wiederherstellungsschlüssel sicher auf.",
    },
    {
      heading: "11. Verfügbarkeit und Änderungen",
      text: "Wir stellen CometRow während der Alpha so bereit, wie es ist. Wir versprechen nicht, dass es immer verfügbar oder fehlerfrei ist. Wir können Funktionen, Modelle, Partner und die Alpha selbst ändern, pausieren oder beenden, und wir informieren Sie in der App über wichtige Änderungen. Wenn sich diese Bedingungen wesentlich ändern, ändert sich ihre Version, und Ihre nächste Anmeldung bittet Sie, die neue Version anzunehmen. [Für die rechtliche Prüfung: Ankündigungsfrist und wie Nutzer geänderten Bedingungen widersprechen können (§ 308 Nr. 5 BGB).]",
    },
    {
      heading: "12. Ihr Konto beenden",
      text: `Sie können Ihr Konto jederzeit auf der Kontoseite schließen oder indem Sie an ${id.supportContactEmail} schreiben. Wir löschen es dann, wie in der Datenschutzerklärung beschrieben. Wir können Ihren Zugang beenden, wenn Sie gegen diese Bedingungen verstoßen oder wenn die Alpha endet; wo wir können, sagen wir es Ihnen vorher, damit Sie Ihre Daten herunterladen können. [Zu bestätigen: Das Schließen auf der Kontoseite braucht einen E-Mail-Code, der nicht verfügbar ist, solange die Anmeldung per E-Mail ausgeschaltet ist.] [Für die rechtliche Prüfung: Fristen.]`,
    },
    {
      heading: "13. Haftung",
      text: "[Für die rechtliche Prüfung: dieser ganze Abschnitt, da die Alpha kostenlos ist.] Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit, bei Verletzung von Leben, Körper oder Gesundheit und nach dem Produkthaftungsgesetz. Bei leichter Fahrlässigkeit haften wir nur für die Verletzung wesentlicher Pflichten, begrenzt auf den vorhersehbaren, typischen Schaden. Nichts in diesen Bedingungen schränkt Ihre gesetzlichen Rechte als Verbraucher ein.",
    },
    {
      heading: "14. Recht",
      text: "Es gilt deutsches Recht. Wenn Sie Verbraucher sind, entzieht Ihnen das nicht den Schutz der zwingenden Vorschriften des Landes, in dem Sie leben. [Für die rechtliche Prüfung: Gerichtsstand und die Erklärung zur Verbraucherstreitbeilegung (§ 36 VSBG), die auch im Impressum steht.]",
    },
    {
      heading: "15. Kontakt",
      text: `Support: ${id.supportContactEmail}. Datenschutzanfragen: ${id.privacyContactEmail}. Sicherheitsvorfälle: ${id.incidentContactEmail}.`,
    },
  ];
}

/** The terms as plain text: a title line with the version, then one block per section. */
export function termsText(lang: Lang = "en"): string {
  const de = lang === "de";
  const title = de
    ? `CometRow Nutzungsbedingungen, ${TERMS_DATE_DE}, Version ${TERMS_VERSION} (Entwurf für die rechtliche Prüfung)`
    : `CometRow terms of use, ${TERMS_DATE}, version ${TERMS_VERSION} (draft for the legal read)`;
  return [title, ...(de ? sectionsDe() : sectionsEn()).map((s) => `${s.heading}\n${s.text}`)].join("\n\n");
}
