// Account pages: sign-in lab, access, export, closure, billing rehearsal, usage, theme and preview.
import { defineText } from "./core";

export const accountLabText = defineText({
  en: {
    noticePending: "Queued; not submitted",
    noticeDispatching: "Submission started; result not confirmed",
    noticeAccepted: "Submission accepted; inbox delivery not verified",
    noticeUncertain: "Submission uncertain; review required before any resend",
    noticeBlocked: "Submission blocked; review required",
    noticeSent: "Historical sent marker; inbox delivery not verified",
    providerFailed:
      "Provider sign-in or linking did not complete. Your existing sign-in methods are unchanged.",
    syntheticNotRunning: "The synthetic account service is not running here.",
    signInUnavailable:
      "Account sign-in is not available here yet. No information has been submitted.",
    unconfirmed:
      "The sign-in or account-change result is unconfirmed. Check sign-in status before trying another action. No automatic retry was made.",
    notAdmitted:
      "Account service is temporarily unavailable. This action was not started. Try again later; no automatic retry was made.",
    deliveryUnconfirmed:
      "Code delivery could not be confirmed. If a delayed code arrives, enter it below. Wait before requesting another code; no automatic retry was made.",
    passkeyOptions:
      "Passkey preparation is unavailable. No verification was submitted. Try again later or use email.",
    passkeyNotCompleted:
      "Passkey verification did not complete. You can try again or use email. No automatic retry was made.",
    actionFailed:
      "This action could not complete. Check the code or use another sign-in method. No automatic retry was made.",
    bannerSynthetic:
      "Synthetic account lab · .test addresses only. No real email, provider login or private chat.",
    bannerEarly: "Early access preparation · Private chat is not available.",
    closeSignIn: "Close sign-in",
    headingTestAccount: "Your test account",
    headingAccount: "Your account",
    headingLab: "Sign in to the account lab",
    headingLogin: "Log in or sign up",
    introSession: "Sign-in access is separate from your encrypted vault.",
    introLogin: "Chat, explore ideas and work with your files.",
    signedInAs: "Signed in as",
    openTestWorkspace: "Open test workspace",
    openWorkspace: "Open workspace",
    connect: (linked: boolean, name: string) => `${linked ? "Connected to" : "Connect"} ${name}`,
    recoveryNotConfirmed:
      "Recovery was not confirmed. Sign in again and retry this step; do not assume other sessions were revoked.",
    recoveryComplete: (synthetic: boolean) =>
      `Sign-in recovery complete. Other sessions were signed out. Check the security-notice status below${synthetic ? "; this lab sends no real email" : ""}. Linked credentials and vault encryption are unchanged.`,
    finishRecovery: "Finish sign-in recovery",
    recoveryNote:
      "Recovery requires working email delivery. After signing in again with email, finish recovery to close other sessions. Use Account access below to remove a lost passkey or linked provider after verifying email.",
    securityNotices: "Security notices",
    methodRemoved: "Sign-in method removed",
    signInRecovery: "Sign-in recovery",
    testPasskeyAdded: "Test passkey added.",
    passkeyAdded: "Passkey added.",
    addTestPasskey: "Add test passkey",
    addPasskey: "Add passkey",
    otherTestSessionsRevoked: "Other test sessions revoked.",
    signOutOtherTest: "Sign out other test sessions",
    signedOut: "Signed out.",
    signOut: "Sign out",
    accountClosed: (synthetic: boolean) =>
      `${synthetic ? "Test account" : "Account"} closed; all sessions were signed out. Credential purge is not scheduled. Local saved history and retained usage records were not erased.`,
    verifyEmailNotice:
      "Sign in with an email code, then remove the affected method under Account access.",
    useTestEmail: "Use a synthetic .test email address.",
    testCodeAvailable: "A test code is available in the test harness. No email was sent.",
    codeAccepted: "Code request accepted. Check your email; delivery may take a moment.",
    continueWith: (name: string) => `Continue with ${name}`,
    comingSoon: "Coming soon",
    or: "OR",
    testEmailAddress: "Test email address",
    emailAddress: "Email address",
    verificationCode: "Verification code",
    verifyTestCode: "Verify test code",
    verifyCode: "Verify code",
    sendTestCode: "Send test code",
    continueEmail: "Continue with email",
    emailUnavailable: "Email sign-in and recovery are not available yet. Use Google to sign in.",
    useAnotherEmail: "Use another email",
    statusChecked:
      "Sign-in status checked. Review the account shown before continuing; this check does not prove whether an email was delivered or a provider change completed.",
    statusUnavailable:
      "Sign-in status is still unavailable. Keep this page open and check again later; no action was replayed.",
    checkStatus: "Check sign-in status",
    working: "Working…",
    usePasskey: "Use a passkey",
    signInTestPasskey: "Sign in with a test passkey",
    signInPasskey: "Sign in with a passkey",
    privacySummary: "Privacy and account recovery",
    privacySynthetic:
      "Social buttons, when available, use synthetic provider fixtures only. ",
    privacyBody:
      "CometRow stores your email address, provider identifiers, passkey public credentials and session records. Email sign-in requires an email-delivery provider. Social sign-in, when enabled, shares your verified email and provider identity with CometRow; the provider learns that you signed in here. No chat content is part of sign-in. Recovering sign-in cannot recover a lost vault passphrase. Private-data chat remains unavailable.",
    helpSummary: "Help with sign-in or reporting a problem",
  },
  de: {
    noticePending: "In der Warteschlange; nicht übermittelt",
    noticeDispatching: "Übermittlung gestartet; Ergebnis nicht bestätigt",
    noticeAccepted: "Übermittlung angenommen; Zustellung ins Postfach nicht geprüft",
    noticeUncertain: "Übermittlung unsicher; vor einem erneuten Senden ist eine Prüfung nötig",
    noticeBlocked: "Übermittlung gesperrt; Prüfung nötig",
    noticeSent: "Früherer Versandvermerk; Zustellung ins Postfach nicht geprüft",
    providerFailed:
      "Die Anmeldung oder Verknüpfung beim Anbieter wurde nicht abgeschlossen. Ihre bisherigen Anmeldemethoden sind unverändert.",
    syntheticNotRunning: "Der synthetische Kontodienst läuft hier nicht.",
    signInUnavailable:
      "Die Anmeldung zum Konto ist hier noch nicht verfügbar. Es wurden keine Angaben übermittelt.",
    unconfirmed:
      "Das Ergebnis der Anmeldung oder Kontoänderung ist nicht bestätigt. Prüfen Sie den Anmeldestatus, bevor Sie etwas anderes versuchen. Es wurde nicht automatisch wiederholt.",
    notAdmitted:
      "Der Kontodienst ist vorübergehend nicht verfügbar. Diese Aktion wurde nicht gestartet. Bitte versuchen Sie es später erneut; es wurde nicht automatisch wiederholt.",
    deliveryUnconfirmed:
      "Die Zustellung des Codes konnte nicht bestätigt werden. Wenn ein verspäteter Code eintrifft, geben Sie ihn unten ein. Warten Sie, bevor Sie einen neuen Code anfordern; es wurde nicht automatisch wiederholt.",
    passkeyOptions:
      "Der Passkey kann gerade nicht vorbereitet werden. Es wurde keine Überprüfung übermittelt. Versuchen Sie es später erneut oder nutzen Sie E-Mail.",
    passkeyNotCompleted:
      "Die Passkey-Überprüfung wurde nicht abgeschlossen. Sie können es erneut versuchen oder E-Mail nutzen. Es wurde nicht automatisch wiederholt.",
    actionFailed:
      "Diese Aktion konnte nicht abgeschlossen werden. Prüfen Sie den Code oder nutzen Sie eine andere Anmeldemethode. Es wurde nicht automatisch wiederholt.",
    bannerSynthetic:
      "Synthetisches Konto-Labor · nur .test-Adressen. Keine echte E-Mail, keine Anmeldung beim Anbieter und kein privater Chat.",
    bannerEarly: "Vorbereitung des frühen Zugangs · Privater Chat ist nicht verfügbar.",
    closeSignIn: "Anmeldung schließen",
    headingTestAccount: "Ihr Testkonto",
    headingAccount: "Ihr Konto",
    headingLab: "Im Konto-Labor anmelden",
    headingLogin: "Anmelden oder registrieren",
    introSession: "Der Anmeldezugang ist von Ihrem verschlüsselten Tresor getrennt.",
    introLogin: "Chatten Sie, entwickeln Sie Ideen und arbeiten Sie mit Ihren Dateien.",
    signedInAs: "Angemeldet als",
    openTestWorkspace: "Test-Arbeitsbereich öffnen",
    openWorkspace: "Arbeitsbereich öffnen",
    connect: (linked: boolean, name: string) => (linked ? `Mit ${name} verbunden` : `${name} verbinden`),
    recoveryNotConfirmed:
      "Die Wiederherstellung wurde nicht bestätigt. Melden Sie sich erneut an und wiederholen Sie diesen Schritt; gehen Sie nicht davon aus, dass andere Sitzungen abgemeldet wurden.",
    recoveryComplete: (synthetic: boolean) =>
      `Die Wiederherstellung der Anmeldung ist abgeschlossen. Andere Sitzungen wurden abgemeldet. Prüfen Sie unten den Status des Sicherheitshinweises${synthetic ? "; dieses Labor sendet keine echte E-Mail" : ""}. Verknüpfte Anmeldedaten und die Verschlüsselung des Tresors sind unverändert.`,
    finishRecovery: "Wiederherstellung der Anmeldung abschließen",
    recoveryNote:
      "Die Wiederherstellung setzt eine funktionierende E-Mail-Zustellung voraus. Schließen Sie die Wiederherstellung nach der erneuten Anmeldung per E-Mail ab, um andere Sitzungen zu beenden. Unter „Kontozugang“ können Sie nach der Bestätigung Ihrer E-Mail-Adresse einen verlorenen Passkey oder einen verknüpften Anbieter entfernen.",
    securityNotices: "Sicherheitshinweise",
    methodRemoved: "Anmeldemethode entfernt",
    signInRecovery: "Wiederherstellung der Anmeldung",
    testPasskeyAdded: "Test-Passkey hinzugefügt.",
    passkeyAdded: "Passkey hinzugefügt.",
    addTestPasskey: "Test-Passkey hinzufügen",
    addPasskey: "Passkey hinzufügen",
    otherTestSessionsRevoked: "Andere Testsitzungen wurden abgemeldet.",
    signOutOtherTest: "Andere Testsitzungen abmelden",
    signedOut: "Abgemeldet.",
    signOut: "Abmelden",
    accountClosed: (synthetic: boolean) =>
      `${synthetic ? "Testkonto" : "Konto"} geschlossen; alle Sitzungen wurden abgemeldet. Eine Löschung der Anmeldedaten ist nicht geplant. Der lokal gespeicherte Verlauf und aufbewahrte Nutzungsdaten wurden nicht gelöscht.`,
    verifyEmailNotice:
      "Melden Sie sich mit einem E-Mail-Code an und entfernen Sie dann die betroffene Methode unter „Kontozugang“.",
    useTestEmail: "Verwenden Sie eine synthetische .test-E-Mail-Adresse.",
    testCodeAvailable: "Ein Testcode liegt in der Testumgebung bereit. Es wurde keine E-Mail gesendet.",
    codeAccepted:
      "Die Code-Anfrage wurde angenommen. Prüfen Sie Ihre E-Mails; die Zustellung kann einen Moment dauern.",
    continueWith: (name: string) => `Weiter mit ${name}`,
    comingSoon: "Demnächst",
    or: "ODER",
    testEmailAddress: "Test-E-Mail-Adresse",
    emailAddress: "E-Mail-Adresse",
    verificationCode: "Bestätigungscode",
    verifyTestCode: "Testcode bestätigen",
    verifyCode: "Code bestätigen",
    sendTestCode: "Testcode senden",
    continueEmail: "Weiter mit E-Mail",
    emailUnavailable:
      "Anmeldung und Wiederherstellung per E-Mail sind noch nicht verfügbar. Melden Sie sich mit Google an.",
    useAnotherEmail: "Andere E-Mail-Adresse verwenden",
    statusChecked:
      "Der Anmeldestatus wurde geprüft. Prüfen Sie das angezeigte Konto, bevor Sie fortfahren; diese Prüfung belegt nicht, ob eine E-Mail zugestellt oder eine Änderung beim Anbieter abgeschlossen wurde.",
    statusUnavailable:
      "Der Anmeldestatus ist weiterhin nicht verfügbar. Lassen Sie diese Seite geöffnet und prüfen Sie es später erneut; es wurde keine Aktion wiederholt.",
    checkStatus: "Anmeldestatus prüfen",
    working: "Bitte warten…",
    usePasskey: "Passkey verwenden",
    signInTestPasskey: "Mit einem Test-Passkey anmelden",
    signInPasskey: "Mit einem Passkey anmelden",
    privacySummary: "Datenschutz und Wiederherstellung des Kontos",
    privacySynthetic:
      "Die Schaltflächen für Anbieter nutzen, sofern verfügbar, nur synthetische Testdaten. ",
    privacyBody:
      "CometRow speichert Ihre E-Mail-Adresse, Kennungen der Anbieter, die öffentlichen Daten Ihrer Passkeys und Sitzungsdaten. Die Anmeldung per E-Mail setzt einen E-Mail-Versanddienst voraus. Die Anmeldung über einen Anbieter teilt, sofern aktiviert, Ihre bestätigte E-Mail-Adresse und Ihre Identität beim Anbieter mit CometRow; der Anbieter erfährt, dass Sie sich hier angemeldet haben. Chat-Inhalte sind nicht Teil der Anmeldung. Die Wiederherstellung der Anmeldung kann eine verlorene Tresor-Passphrase nicht wiederherstellen. Chat mit privaten Daten ist weiterhin nicht verfügbar.",
    helpSummary: "Hilfe zur Anmeldung oder ein Problem melden",
  },
});

export const accountAccessText = defineText({
  en: {
    unavailable: "Account access is unavailable. Refresh before changing access.",
    verifyAgain:
      "Verify your email again before removing a method. Each verification permits one removal for five minutes.",
    inProgress:
      "Another sign-in method change is in progress. Wait for it to finish, then refresh before retrying.",
    removed:
      "Sign-in method removed and other sessions signed out. Email sign-in remains available; a security notice is queued. Your vault is unchanged.",
    revoked: "Session signed out. This cannot erase copies already on another device.",
    unconfirmed:
      "The result could not be confirmed. Refresh account access before retrying; no automatic retry was made.",
    heading: "Account access",
    sessionsNote:
      "Sessions show sign-in times, not verified device names. We do not retain device fingerprints or location. Activity times are approximate.",
    refreshFailed:
      "Refresh failed. Account changes remain unavailable until status can be checked.",
    refresh: "Refresh account access",
    activeSessions: "Active sessions",
    thisSession: "This session",
    otherSession: "Other session",
    confirmThis: "Sign out this session?",
    confirmOther: "Sign out this other session?",
    signOutThis: "Sign out this session",
    signOutSession: (id: string) => `Sign out session ${id}`,
    methods: "Sign-in methods",
    emailDisabled:
      "Email delivery is disabled. Recovery and sign-in method removal are unavailable.",
    removalNote:
      "Removal requires working email delivery and a new email-code sign-in and signs out other sessions. Removing a provider here does not revoke its permissions on the provider's website.",
    verifyForRemoval: "Verify email for removal",
    unnamedPasskey: "Unnamed passkey",
    removeLabel: (label: string) => `Remove ${label}`,
    confirmRemove: (label: string) =>
      `Remove ${label} from CometRow and sign out other sessions? Your email sign-in and encrypted vault stay unchanged.`,
    remove: "Remove",
    updating: "Updating account access…",
    checking: "Checking account access…",
  },
  de: {
    unavailable: "Der Kontozugang ist nicht verfügbar. Aktualisieren Sie, bevor Sie den Zugang ändern.",
    verifyAgain:
      "Bestätigen Sie Ihre E-Mail-Adresse erneut, bevor Sie eine Methode entfernen. Jede Bestätigung erlaubt eine Entfernung innerhalb von fünf Minuten.",
    inProgress:
      "Eine andere Änderung der Anmeldemethoden läuft gerade. Warten Sie, bis sie abgeschlossen ist, und aktualisieren Sie dann, bevor Sie es erneut versuchen.",
    removed:
      "Die Anmeldemethode wurde entfernt und andere Sitzungen wurden abgemeldet. Die Anmeldung per E-Mail bleibt verfügbar; ein Sicherheitshinweis ist vorgemerkt. Ihr Tresor ist unverändert.",
    revoked:
      "Die Sitzung wurde abgemeldet. Kopien, die sich bereits auf einem anderen Gerät befinden, werden dadurch nicht gelöscht.",
    unconfirmed:
      "Das Ergebnis konnte nicht bestätigt werden. Aktualisieren Sie den Kontozugang, bevor Sie es erneut versuchen; es wurde nicht automatisch wiederholt.",
    heading: "Kontozugang",
    sessionsNote:
      "Sitzungen zeigen Anmeldezeiten, keine geprüften Gerätenamen. Wir speichern weder Geräte-Fingerabdrücke noch Standorte. Aktivitätszeiten sind ungefähr.",
    refreshFailed:
      "Die Aktualisierung ist fehlgeschlagen. Kontoänderungen bleiben gesperrt, bis der Status geprüft werden kann.",
    refresh: "Kontozugang aktualisieren",
    activeSessions: "Aktive Sitzungen",
    thisSession: "Diese Sitzung",
    otherSession: "Andere Sitzung",
    confirmThis: "Diese Sitzung abmelden?",
    confirmOther: "Diese andere Sitzung abmelden?",
    signOutThis: "Diese Sitzung abmelden",
    signOutSession: (id: string) => `Sitzung ${id} abmelden`,
    methods: "Anmeldemethoden",
    emailDisabled:
      "Der E-Mail-Versand ist deaktiviert. Wiederherstellung und das Entfernen von Anmeldemethoden sind nicht verfügbar.",
    removalNote:
      "Das Entfernen setzt eine funktionierende E-Mail-Zustellung und eine neue Anmeldung mit E-Mail-Code voraus und meldet andere Sitzungen ab. Wenn Sie hier einen Anbieter entfernen, werden seine Berechtigungen auf der Website des Anbieters nicht widerrufen.",
    verifyForRemoval: "E-Mail-Adresse für das Entfernen bestätigen",
    unnamedPasskey: "Unbenannter Passkey",
    removeLabel: (label: string) => `${label} entfernen`,
    confirmRemove: (label: string) =>
      `${label} aus CometRow entfernen und andere Sitzungen abmelden? Ihre Anmeldung per E-Mail und Ihr verschlüsselter Tresor bleiben unverändert.`,
    remove: "Entfernen",
    updating: "Kontozugang wird aktualisiert…",
    checking: "Kontozugang wird geprüft…",
  },
});

export const accountDeletionText = defineText({
  en: {
    titleTest: "Delete test account",
    titleClose: "Close account",
    intro:
      "This closes account access and signs out every session. Verify your email again first. Account reopening is not available.",
    retention:
      "Credential deletion is prepared for a seven-day retention period, but no automatic purge or backup deletion is active. Usage records remain for reconciliation. Saved conversations in this browser, other devices, exports and provider records are not erased here. Delete local snapshots in Saved before closing the account. No real subscription is connected here yet.",
    reauth: "Sign out and sign in with a new email code before closing the account.",
    inProgress: "Another account change is in progress. Refresh before retrying.",
    unconfirmed:
      "Closure could not be confirmed. Check account access before retrying. No automatic retry was made.",
    typeToConfirm: (phrase: string) => `Type ${phrase} to confirm`,
    closeTest: "Close test account",
    close: "Close account",
    reload: "Reload account status",
    closing: "Closing account…",
  },
  de: {
    titleTest: "Testkonto löschen",
    titleClose: "Konto schließen",
    intro:
      "Damit wird der Zugang zum Konto geschlossen und jede Sitzung abgemeldet. Bestätigen Sie vorher Ihre E-Mail-Adresse erneut. Ein geschlossenes Konto kann nicht wieder geöffnet werden.",
    retention:
      "Die Löschung der Anmeldedaten ist für eine Aufbewahrungsfrist von sieben Tagen vorbereitet, aber weder eine automatische Löschung noch die Löschung von Sicherungen ist aktiv. Nutzungsdaten bleiben für den Abgleich erhalten. Gespeicherte Unterhaltungen in diesem Browser, auf anderen Geräten, Exporte und Daten beim Anbieter werden hier nicht gelöscht. Löschen Sie lokale Stände unter „Gespeichert“, bevor Sie das Konto schließen. Hier ist noch kein echtes Abonnement verbunden.",
    reauth:
      "Melden Sie sich ab und mit einem neuen E-Mail-Code wieder an, bevor Sie das Konto schließen.",
    inProgress:
      "Eine andere Kontoänderung läuft gerade. Aktualisieren Sie, bevor Sie es erneut versuchen.",
    unconfirmed:
      "Die Schließung konnte nicht bestätigt werden. Prüfen Sie den Kontozugang, bevor Sie es erneut versuchen. Es wurde nicht automatisch wiederholt.",
    typeToConfirm: (phrase: string) => `Geben Sie zur Bestätigung ${phrase} ein`,
    closeTest: "Testkonto schließen",
    close: "Konto schließen",
    reload: "Kontostatus neu laden",
    closing: "Konto wird geschlossen…",
  },
});

export const accountExportText = defineText({
  en: {
    heading: "Download your account data",
    body: "One file with the records this service holds about your account: your account identity and contact email, sign-in methods (never their secret keys or tokens), active sessions, security notices, request and usage records with their published cost, billing operations and any closure request. It contains no conversations, documents or search text, because the service does not store them (search text you approve passes through it on the way to the search provider); use the encrypted backup under Saved for those.",
    unavailable: "Export is unavailable.",
    downloaded: "Your account data file was downloaded.",
    failed: "Export could not be completed.",
    button: "Download account data",
  },
  de: {
    heading: "Ihre Kontodaten herunterladen",
    body: "Eine Datei mit den Daten, die dieser Dienst zu Ihrem Konto speichert: Ihre Kontoidentität und Kontakt-E-Mail-Adresse, Anmeldemethoden (niemals deren geheime Schlüssel oder Tokens), aktive Sitzungen, Sicherheitshinweise, Anfrage- und Nutzungsdaten mit ihren veröffentlichten Kosten, Abrechnungsvorgänge und einen etwaigen Antrag auf Schließung. Sie enthält keine Unterhaltungen, Dokumente oder Suchtexte, weil der Dienst diese nicht speichert (Suchtext, den Sie freigeben, läuft auf dem Weg zum Suchanbieter durch ihn hindurch); nutzen Sie dafür die verschlüsselte Sicherung unter „Gespeichert“.",
    unavailable: "Der Export ist nicht verfügbar.",
    downloaded: "Die Datei mit Ihren Kontodaten wurde heruntergeladen.",
    failed: "Der Export konnte nicht abgeschlossen werden.",
    button: "Kontodaten herunterladen",
  },
});

export const billingText = defineText({
  en: {
    statusUnavailableRefresh: "Billing status unavailable. Refresh before continuing.",
    notConfirmed: "Billing could not be confirmed.",
    refreshToCheck: "Refresh status to check the result.",
    notComplete: "Billing could not complete. No automatic retry was made.",
    heading: "Subscription rehearsal",
    intro:
      "This is a synthetic billing test. No real payment is collected and no chat access is granted.",
    returnedCancel:
      "You returned without completing checkout. An existing checkout may still be open.",
    returned:
      "You returned from billing. A return link does not confirm payment or activate access.",
    stripe:
      "Opening checkout or billing management sends you to Stripe. CometRow does not receive card details or send conversation content to billing.",
    price: (amount: string, interval: "month" | "year") =>
      `${amount} / ${interval} — synthetic price only; not a launch offer.`,
    continueCheckout: "Continue or check checkout",
    openCheckout: "Open test checkout",
    hold: "A billing operation needs verification. Another checkout will not be sent. Contact support before trying again.",
    manage: "Manage test billing",
    refreshed: "Status refreshed. Paid access remains disabled.",
    unavailable: "Billing status unavailable.",
    refresh: "Refresh billing status",
    checking: "Checking billing…",
    separate:
      "Request allowance and provider privacy approval are separate from billing. Cancellation and refunds follow the reviewed provider configuration; no such policy is active here.",
  },
  de: {
    statusUnavailableRefresh:
      "Der Abrechnungsstatus ist nicht verfügbar. Aktualisieren Sie, bevor Sie fortfahren.",
    notConfirmed: "Die Abrechnung konnte nicht bestätigt werden.",
    refreshToCheck: "Aktualisieren Sie den Status, um das Ergebnis zu prüfen.",
    notComplete:
      "Die Abrechnung konnte nicht abgeschlossen werden. Es wurde nicht automatisch wiederholt.",
    heading: "Probelauf für Abonnements",
    intro:
      "Dies ist ein synthetischer Abrechnungstest. Es wird keine echte Zahlung eingezogen und kein Chat-Zugang gewährt.",
    returnedCancel:
      "Sie sind zurückgekehrt, ohne den Bezahlvorgang abzuschließen. Ein bestehender Bezahlvorgang kann noch offen sein.",
    returned:
      "Sie sind von der Abrechnung zurückgekehrt. Ein Rückkehr-Link bestätigt keine Zahlung und schaltet keinen Zugang frei.",
    stripe:
      "Der Bezahlvorgang und die Verwaltung der Abrechnung öffnen Stripe. CometRow erhält keine Kartendaten und sendet keine Inhalte von Unterhaltungen an die Abrechnung.",
    price: (amount: string, interval: "month" | "year") =>
      `${amount} / ${interval === "month" ? "Monat" : "Jahr"} — nur ein synthetischer Preis, kein Angebot zum Start.`,
    continueCheckout: "Bezahlvorgang fortsetzen oder prüfen",
    openCheckout: "Test-Bezahlvorgang öffnen",
    hold: "Ein Abrechnungsvorgang muss überprüft werden. Es wird kein weiterer Bezahlvorgang gesendet. Wenden Sie sich an den Support, bevor Sie es erneut versuchen.",
    manage: "Test-Abrechnung verwalten",
    refreshed: "Status aktualisiert. Bezahlter Zugang bleibt deaktiviert.",
    unavailable: "Der Abrechnungsstatus ist nicht verfügbar.",
    refresh: "Abrechnungsstatus aktualisieren",
    checking: "Abrechnung wird geprüft…",
    separate:
      "Das Kontingent und die Datenschutzfreigabe des Anbieters sind von der Abrechnung getrennt. Kündigung und Erstattungen richten sich nach der geprüften Konfiguration des Anbieters; hier ist keine solche Regelung aktiv.",
  },
});

/** Request counts and metering (src/account-usage-format.ts) plus the usage page around them. */
export const usageText = defineText({
  en: {
    noActivePlan: "No plan is active for this account yet.",
    costBasis:
      "Cost is at published rates for completed requests only; interrupted requests are billed by the provider but cannot be counted here.",
    remaining: (n: string) => `${n} requests remaining`,
    used: (used: string, limit: string) =>
      `${used} of ${limit} requests reserved or attempted in this period.`,
    settlement: (pending: string, uncertain: string) =>
      `${pending} pending or interrupted before settlement; ${uncertain} with an uncertain transport outcome.`,
    noMetered: "No request was metered in this period, so no token counts can be shown.",
    metered: (n: string, one: boolean, prompt: string, completion: string) =>
      `${n} completed ${one ? "request was" : "requests were"} metered: ${prompt} prompt tokens and ${completion} completion tokens.`,
    noCost: "No published cost has been reported for this period yet.",
    cost: (cost: string) => `Published cost so far: ${cost}.`,
    unmetered: (n: string, one: boolean) =>
      `${n} settled ${one ? "request has" : "requests have"} no metering (interrupted, uncertain, or not reported by the provider).`,
    unknown: "unknown",
    planLabel: "Plan and requests",
    periodEnds: "Period ends:",
    newAllowance: "A new allowance is not guaranteed.",
    exhausted:
      "Request allowance exhausted. Another request will not be forwarded under this allowance.",
    countsNote:
      "Request counts are the admission unit, not token charges or completed-answer counts. Interrupted attempts remain counted. Account information refreshes when you return to this window and every 30 seconds.",
    tokensLabel: "Tokens and cost",
    tokensHeading: "Tokens and cost this period",
    paidNotEnabled: "Paid subscriptions are not enabled.",
    heading: "Account and usage",
    manageNote:
      "Manage your sign-in methods and account access. Paid subscriptions are not enabled.",
    manage: "Manage sign-in methods",
    vaultNote:
      "Saved conversation encryption is separate from sign-in. Your vault passphrase cannot currently be recovered; saved history stays in this browser.",
    providerNote:
      "Provider qualification is still required before private chat is available. An allowance does not approve a provider or guarantee an answer.",
  },
  de: {
    noActivePlan: "Für dieses Konto ist noch kein Tarif aktiv.",
    costBasis:
      "Die Kosten gelten zu veröffentlichten Preisen nur für abgeschlossene Anfragen; abgebrochene Anfragen stellt der Anbieter ebenfalls in Rechnung, sie können hier aber nicht gezählt werden.",
    remaining: (n: string) => `${n} Anfragen übrig`,
    used: (used: string, limit: string) =>
      `${used} von ${limit} Anfragen in diesem Zeitraum reserviert oder versucht.`,
    settlement: (pending: string, uncertain: string) =>
      `${pending} ausstehend oder vor der Abrechnung abgebrochen; ${uncertain} mit unsicherem Übertragungsergebnis.`,
    noMetered:
      "In diesem Zeitraum wurde keine Anfrage gemessen, daher können keine Token-Zahlen angezeigt werden.",
    metered: (n: string, one: boolean, prompt: string, completion: string) =>
      `${n} abgeschlossene ${one ? "Anfrage wurde" : "Anfragen wurden"} gemessen: ${prompt} Prompt-Tokens und ${completion} Antwort-Tokens.`,
    noCost: "Für diesen Zeitraum wurden noch keine veröffentlichten Kosten gemeldet.",
    cost: (cost: string) => `Veröffentlichte Kosten bisher: ${cost}.`,
    unmetered: (n: string, one: boolean) =>
      `${n} ${one ? "abgerechnete Anfrage hat" : "abgerechnete Anfragen haben"} keine Messung (abgebrochen, unsicher oder vom Anbieter nicht gemeldet).`,
    unknown: "unbekannt",
    planLabel: "Tarif und Anfragen",
    periodEnds: "Zeitraum endet:",
    newAllowance: "Ein neues Kontingent ist nicht garantiert.",
    exhausted:
      "Das Kontingent ist aufgebraucht. Weitere Anfragen werden mit diesem Kontingent nicht weitergeleitet.",
    countsNote:
      "Gezählt werden zugelassene Anfragen, keine Token-Kosten und keine fertigen Antworten. Abgebrochene Versuche bleiben gezählt. Die Kontoangaben werden aktualisiert, wenn Sie zu diesem Fenster zurückkehren, und alle 30 Sekunden.",
    tokensLabel: "Tokens und Kosten",
    tokensHeading: "Tokens und Kosten in diesem Zeitraum",
    paidNotEnabled: "Bezahlte Abonnements sind nicht aktiviert.",
    heading: "Konto und Nutzung",
    manageNote:
      "Verwalten Sie Ihre Anmeldemethoden und den Zugang zu Ihrem Konto. Bezahlte Abonnements sind nicht aktiviert.",
    manage: "Anmeldemethoden verwalten",
    vaultNote:
      "Die Verschlüsselung gespeicherter Unterhaltungen ist von der Anmeldung getrennt. Ihre Tresor-Passphrase kann derzeit nicht wiederhergestellt werden; der gespeicherte Verlauf bleibt in diesem Browser.",
    providerNote:
      "Bevor privater Chat verfügbar ist, muss der Anbieter noch geprüft werden. Ein Kontingent gibt keinen Anbieter frei und garantiert keine Antwort.",
  },
});

export const themeText = defineText({
  en: {
    appearance: "Appearance",
    system: "System theme",
    light: "Light",
    dark: "Dark",
    loadingAccount: "Loading account…",
  },
  de: {
    appearance: "Darstellung",
    system: "Wie im System",
    light: "Hell",
    dark: "Dunkel",
    loadingAccount: "Konto wird geladen…",
  },
});

export const accountPreviewText = defineText({
  en: {
    brandLabel: "CometRow workspace",
    previewStatus: "Preview status",
    banner:
      "Design preview · Sign-in is not connected. No account is created and no email is sent.",
    welcome: "Welcome to CometRow",
    continueEmail: "Continue with email",
    checkEmail: "Check your email",
    introChoose: "A space to think, explore and create.",
    introEmail: "Sign in or create an account with a one-time code.",
    introCode: "This is the planned verification step. No code has been sent.",
    googleNotice:
      "Google sign-in is not connected in this preview. The live flow will ask you to choose a Google account and approve the requested identity information.",
    continueGoogle: "Continue with Google",
    or: "or",
    emailAddress: "Email address",
    emailHelp: "Synthetic example only. This preview does not collect an address.",
    previewStep: "Preview verification step",
    otherOptions: "Other sign-in options",
    codeNote:
      "A short-lived, one-use code will verify your email before you can access an account. You can add a passkey after signing in.",
    codeSmall: "Verification, resend limits and account recovery are not active in this preview.",
    backToEmail: "Back to email",
    privacySummary: "How sign-in affects your privacy",
    privacy1:
      "Planned account data: your email address, linked sign-in identifiers, passkey public credentials and session/security records. Google or Apple learns that you sign in to CometRow. The email-delivery provider processes your address and sign-in messages.",
    privacy2:
      "Sign-in providers will not receive your conversations through this sign-in flow. We will not request access to your mail, contacts or files. Apple’s Hide My Email can supply a relay address.",
    privacy3:
      "Passkeys use your device or credential manager. CometRow does not receive your fingerprint or face scan.",
    privacy4:
      "Account recovery restores sign-in access. It cannot recover a lost vault passphrase or local encrypted history. Accounts with matching emails will not be silently merged.",
    privacy5:
      "These are design commitments. Provider configuration, retention terms and the final privacy notice still need review before activation. Private-data chat remains gated separately.",
    footer: "Existing accounts and saved conversations are unchanged.",
  },
  de: {
    brandLabel: "CometRow-Arbeitsbereich",
    previewStatus: "Status der Vorschau",
    banner:
      "Designvorschau · Die Anmeldung ist nicht angebunden. Es wird kein Konto erstellt und keine E-Mail gesendet.",
    welcome: "Willkommen bei CometRow",
    continueEmail: "Weiter mit E-Mail",
    checkEmail: "Prüfen Sie Ihre E-Mails",
    introChoose: "Ein Ort zum Nachdenken, Entdecken und Gestalten.",
    introEmail: "Melden Sie sich mit einem Einmalcode an oder erstellen Sie ein Konto.",
    introCode: "Dies ist der geplante Bestätigungsschritt. Es wurde kein Code gesendet.",
    googleNotice:
      "Die Anmeldung mit Google ist in dieser Vorschau nicht angebunden. Im echten Ablauf wählen Sie ein Google-Konto und stimmen der Weitergabe der angefragten Identitätsangaben zu.",
    continueGoogle: "Weiter mit Google",
    or: "oder",
    emailAddress: "E-Mail-Adresse",
    emailHelp: "Nur ein synthetisches Beispiel. Diese Vorschau erfasst keine Adresse.",
    previewStep: "Bestätigungsschritt ansehen",
    otherOptions: "Andere Anmeldeoptionen",
    codeNote:
      "Ein kurzlebiger Einmalcode bestätigt Ihre E-Mail-Adresse, bevor Sie auf ein Konto zugreifen können. Nach der Anmeldung können Sie einen Passkey hinzufügen.",
    codeSmall:
      "Bestätigung, Grenzen für erneutes Senden und Wiederherstellung des Kontos sind in dieser Vorschau nicht aktiv.",
    backToEmail: "Zurück zur E-Mail",
    privacySummary: "Wie sich die Anmeldung auf Ihren Datenschutz auswirkt",
    privacy1:
      "Geplante Kontodaten: Ihre E-Mail-Adresse, verknüpfte Anmeldekennungen, die öffentlichen Daten Ihrer Passkeys sowie Sitzungs- und Sicherheitsdaten. Google oder Apple erfährt, dass Sie sich bei CometRow anmelden. Der E-Mail-Versanddienst verarbeitet Ihre Adresse und die Anmeldenachrichten.",
    privacy2:
      "Anmeldeanbieter erhalten über diesen Anmeldeablauf keine Unterhaltungen. Wir fragen keinen Zugriff auf Ihre E-Mails, Kontakte oder Dateien an. „E-Mail-Adresse verbergen“ von Apple kann eine Weiterleitungsadresse bereitstellen.",
    privacy3:
      "Passkeys nutzen Ihr Gerät oder Ihren Passwortmanager. CometRow erhält weder Ihren Fingerabdruck noch Ihren Gesichtsscan.",
    privacy4:
      "Die Wiederherstellung des Kontos stellt den Anmeldezugang wieder her. Eine verlorene Tresor-Passphrase oder den lokalen verschlüsselten Verlauf kann sie nicht wiederherstellen. Konten mit gleicher E-Mail-Adresse werden nicht stillschweigend zusammengeführt.",
    privacy5:
      "Dies sind Zusagen für das Design. Die Konfiguration der Anbieter, die Aufbewahrungsfristen und die endgültige Datenschutzerklärung müssen vor der Aktivierung noch geprüft werden. Chat mit privaten Daten bleibt gesondert gesperrt.",
    footer: "Bestehende Konten und gespeicherte Unterhaltungen bleiben unverändert.",
  },
});
