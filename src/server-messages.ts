// The server answers in English with fixed messages (busy, errors, refusals, notices). The browser
// shows them in the interface language; unknown text is shown as sent.
// tests/i18n-server-messages.test.ts scans server/**/*.ts and fails when a message has no German entry.
import type { Lang } from "./i18n";

const NOTHING_SENT = "Es wurde nichts gesendet.";

const GERMAN: Record<string, string> = {
  // Chat, busy and refusals
  "CometRow is busy checking the secure server. Please try again in a minute.":
    "CometRow prüft gerade den sicheren Server und ist ausgelastet. Bitte versuchen Sie es in einer Minute erneut.",
  "A request is already running for this account.":
    "Für dieses Konto läuft bereits eine Anfrage.",
  "Three requests are already running.": "Es laufen bereits drei Anfragen.",
  "No request allowance is available. No request was forwarded.": `Ihr Kontingent ist aufgebraucht. ${NOTHING_SENT}`,
  "The daily request limit is reached. It frees up within 24 hours. No request was forwarded.": `Das Tageslimit für Anfragen ist erreicht. Es wird innerhalb von 24 Stunden wieder frei. ${NOTHING_SENT}`,
  "This message is too large. No request was forwarded.": `Diese Nachricht ist zu groß. ${NOTHING_SENT}`,
  "The approved spending limit for this provider review is reached. No request was forwarded.": `Das freigegebene Ausgabenlimit für diese Anbieterprüfung ist erreicht. ${NOTHING_SENT}`,
  "Usage controls unavailable. No request was forwarded.": `Die Nutzungskontrolle ist nicht verfügbar. ${NOTHING_SENT}`,
  "Private chat is paused by the operator. No request was forwarded.": `Der private Chat ist vom Betreiber pausiert. ${NOTHING_SENT}`,
  "Protected inference is not qualified. No request was forwarded.": `Der sichere Server ist nicht freigegeben. ${NOTHING_SENT}`,
  "Protected inference is not qualified.": "Der sichere Server ist nicht freigegeben.",
  "Protected inference is temporarily unavailable. No request was forwarded.": `Der sichere Server ist vorübergehend nicht verfügbar. ${NOTHING_SENT}`,
  "Protected request interrupted. Retry explicitly if needed.":
    "Die geschützte Anfrage wurde unterbrochen. Senden Sie sie bei Bedarf selbst erneut.",
  "Encrypted provider response unavailable. No automatic retry was made.":
    "Die verschlüsselte Antwort des Anbieters ist nicht verfügbar. Es wurde nicht automatisch erneut versucht.",
  "Only a qualified answer mode and its models are accepted.":
    "Nur ein freigegebener Antwortmodus und seine Modelle werden angenommen.",
  "Only the qualified model is accepted.": "Nur das freigegebene Modell wird angenommen.",
  "Only encrypted requests to the qualified destination are accepted.":
    "Nur verschlüsselte Anfragen an das freigegebene Ziel werden angenommen.",
  "The approved deployment manifest is unavailable.":
    "Das freigegebene Bereitstellungsmanifest ist nicht verfügbar.",
  "Upstream unavailable.": "Der Anbieter ist nicht erreichbar.",
  "Service temporarily unavailable. No new request was started.":
    "Der Dienst ist vorübergehend nicht verfügbar. Es wurde keine neue Anfrage gestartet.",
  "Account verification is unavailable. No request was forwarded.": `Die Überprüfung des Kontos ist nicht verfügbar. ${NOTHING_SENT}`,
  // Sessions and limits
  "Cross-origin access denied.": "Zugriff von einer anderen Herkunft verweigert.",
  "Session expired. Reload the application.": "Die Sitzung ist abgelaufen. Bitte laden Sie die Seite neu.",
  "Session limit reached.": "Die Höchstzahl an Sitzungen ist erreicht.",
  "Request authorization failed.": "Die Anfrage konnte nicht autorisiert werden.",
  "Evaluation request limit reached.": "Das Anfragelimit für die Erprobung ist erreicht.",
  "Trial request limit reached.": "Das Anfragelimit für den Test ist erreicht.",
  "Session unavailable or request limit reached. Sign in again if expired.":
    "Die Sitzung ist nicht verfügbar oder das Anfragelimit ist erreicht. Melden Sie sich erneut an, falls sie abgelaufen ist.",
  "Individual access expired or revoked. Sign in again.":
    "Ihr Zugang ist abgelaufen oder wurde widerrufen. Bitte melden Sie sich erneut an.",
  "Sign out could not complete. Try again.":
    "Die Abmeldung konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut.",
  "Unsupported operation.": "Dieser Vorgang wird nicht unterstützt.",
  "Invalid request.": "Ungültige Anfrage.",
  "HTTPS application origin required.": "Die Anwendung muss über HTTPS aufgerufen werden.",
  "Restricted development deployment.": "Eingeschränkte Entwicklungsumgebung.",
  "Authenticated HTTPS ingress required.": "Ein authentifizierter HTTPS-Zugang ist erforderlich.",
  // Web search
  "Invalid disclosure. Use a short query or public HTTPS URL.":
    "Ungültige Freigabe. Verwenden Sie eine kurze Suchanfrage oder eine öffentliche HTTPS-Adresse.",
  "Search service is not configured. No query was sent.":
    "Die Websuche ist nicht eingerichtet. Es wurde keine Suchanfrage gesendet.",
  "Research could not complete. Approval may have expired, or the destination is unavailable, redirects, or exceeds safety limits. No automatic retry was made.":
    "Die Recherche konnte nicht abgeschlossen werden. Die Freigabe ist möglicherweise abgelaufen, oder das Ziel ist nicht erreichbar, leitet weiter oder überschreitet die Sicherheitsgrenzen. Es wurde nicht automatisch erneut versucht.",
  // Account and sign-in
  "Account access is paused for recovery verification.":
    "Der Zugang zum Konto ist für die Überprüfung der Wiederherstellung pausiert.",
  "Account access list is unavailable.": "Die Liste der Zugänge zum Konto ist nicht verfügbar.",
  "Account access verification is unavailable.":
    "Die Überprüfung des Kontozugangs ist nicht verfügbar.",
  "Account operation is not enabled.": "Dieser Kontovorgang ist nicht aktiviert.",
  "A valid email address is required.": "Eine gültige E-Mail-Adresse ist erforderlich.",
  "A verified permitted email identity is required.":
    "Eine bestätigte und zugelassene E-Mail-Adresse ist erforderlich.",
  "Another sign-in method change is in progress. Refresh before retrying.":
    "Eine andere Änderung der Anmeldemethoden läuft bereits. Aktualisieren Sie die Seite, bevor Sie es erneut versuchen.",
  "Closure could not be confirmed. Check account access before retrying.":
    "Die Schließung des Kontos konnte nicht bestätigt werden. Prüfen Sie den Kontozugang, bevor Sie es erneut versuchen.",
  "Code delivery could not be confirmed. Wait before requesting a new code.":
    "Der Versand des Codes konnte nicht bestätigt werden. Bitte warten Sie, bevor Sie einen neuen Code anfordern.",
  "Exact deletion confirmation required.": "Bitte bestätigen Sie das Löschen mit dem genauen Wortlaut.",
  "Export is unavailable right now.": "Der Export ist gerade nicht verfügbar.",
  "Passkey user verification required.": "Der Passkey verlangt eine Bestätigung durch Sie.",
  "Recovery completion could not be confirmed. Sign-in may still work; retry this step after the service recovers.":
    "Der Abschluss der Wiederherstellung konnte nicht bestätigt werden. Die Anmeldung funktioniert möglicherweise trotzdem; wiederholen Sie diesen Schritt, sobald der Dienst wieder verfügbar ist.",
  "Removal could not be confirmed. Refresh account access before retrying.":
    "Das Entfernen konnte nicht bestätigt werden. Aktualisieren Sie den Kontozugang, bevor Sie es erneut versuchen.",
  "Revocation could not be confirmed. Refresh account access before retrying.":
    "Der Widerruf konnte nicht bestätigt werden. Aktualisieren Sie den Kontozugang, bevor Sie es erneut versuchen.",
  "Same-origin callback required.": "Die Rückleitung muss von derselben Herkunft kommen.",
  "Secure same-origin account access required.":
    "Ein sicherer Kontozugang von derselben Herkunft ist erforderlich.",
  "Security-notice status is unavailable.": "Der Status der Sicherheitshinweise ist nicht verfügbar.",
  "Session identifier required.": "Eine Sitzungskennung ist erforderlich.",
  "Sign in again before adding a method.":
    "Bitte melden Sie sich erneut an, bevor Sie eine Methode hinzufügen.",
  "Sign in again before completing recovery.":
    "Bitte melden Sie sich erneut an, bevor Sie die Wiederherstellung abschließen.",
  "Sign in again before continuing billing.":
    "Bitte melden Sie sich erneut an, bevor Sie mit der Abrechnung fortfahren.",
  "Sign in again before linking an account.":
    "Bitte melden Sie sich erneut an, bevor Sie ein Konto verknüpfen.",
  "Sign in again to recover access.":
    "Bitte melden Sie sich erneut an, um den Zugang wiederherzustellen.",
  "Sign in again with an email code.": "Bitte melden Sie sich erneut mit einem E-Mail-Code an.",
  "Sign in again.": "Bitte melden Sie sich erneut an.",
  "Sign in to continue.": "Bitte melden Sie sich an, um fortzufahren.",
  "Sign in to download your data.": "Bitte melden Sie sich an, um Ihre Daten herunterzuladen.",
  "Sign in to manage access.": "Bitte melden Sie sich an, um Zugänge zu verwalten.",
  "Sign in to view notices.": "Bitte melden Sie sich an, um Hinweise anzuzeigen.",
  "Sign in with an email code before closing this account.":
    "Bitte melden Sie sich mit einem E-Mail-Code an, bevor Sie dieses Konto schließen.",
  "Sign-in codes only.": "Nur Anmeldecodes sind möglich.",
  "Sign-in is unavailable for this account.": "Die Anmeldung ist für dieses Konto nicht verfügbar.",
  "Sign-in method required.": "Eine Anmeldemethode ist erforderlich.",
  "Sign-in method setup could not be confirmed. Refresh account access.":
    "Die Einrichtung der Anmeldemethode konnte nicht bestätigt werden. Aktualisieren Sie den Kontozugang.",
  "Sign-in method setup is busy. Try again later.":
    "Die Einrichtung von Anmeldemethoden ist ausgelastet. Bitte versuchen Sie es später erneut.",
  "Sign-in options are unavailable. Try again later.":
    "Die Anmeldeoptionen sind nicht verfügbar. Bitte versuchen Sie es später erneut.",
  "Too many sign-in codes were sent to this address in the last hour. Try again later.":
    "In der letzten Stunde wurden zu viele Anmeldecodes an diese Adresse gesendet. Bitte versuchen Sie es später erneut.",
  "Use a synthetic .test address.": "Verwenden Sie eine synthetische .test-Adresse.",
  "Use account access management.": "Verwenden Sie die Verwaltung der Kontozugänge.",
  "Use the account HTTP boundary.": "Verwenden Sie die HTTP-Schnittstelle des Kontos.",
  "Use the authorization-code flow.": "Verwenden Sie den Ablauf mit Autorisierungscode.",
  "Use the configured identity-only sign-in flow.":
    "Verwenden Sie die eingerichtete Anmeldung nur zur Identifizierung.",
  "Verified client address required.": "Eine überprüfte Client-Adresse ist erforderlich.",
  // Better Auth 1.7.11 library messages (email code and its rate limit)
  "Invalid OTP": "Ungültiger Code",
  "OTP expired": "Der Code ist abgelaufen",
  "Too many attempts": "Zu viele Versuche",
  "Too many requests. Please try again later.":
    "Zu viele Anfragen. Bitte versuchen Sie es später erneut.",
  // Billing
  "A prior billing request is pending or uncertain. No duplicate was sent; support review is required.":
    "Eine frühere Abrechnungsanfrage ist offen oder unklar. Es wurde nichts doppelt gesendet; der Support muss sie prüfen.",
  "Billing could not be confirmed. No automatic retry was made.":
    "Die Abrechnung konnte nicht bestätigt werden. Es wurde nicht automatisch erneut versucht.",
  "Billing is paused for recovery verification.":
    "Die Abrechnung ist für die Überprüfung der Wiederherstellung pausiert.",
  "Billing management is unconfirmed. No repeat was sent; support review is required.":
    "Die Abrechnungsverwaltung ist unbestätigt. Es wurde nichts wiederholt gesendet; der Support muss sie prüfen.",
  "Billing management needs review.": "Die Abrechnungsverwaltung muss geprüft werden.",
  "Billing status unavailable. No payment or access status can be confirmed.":
    "Der Abrechnungsstatus ist nicht verfügbar. Weder Zahlung noch Zugang können bestätigt werden.",
  "Checkout outcome is unconfirmed. No duplicate was sent; refresh status or contact support.":
    "Das Ergebnis des Bezahlvorgangs ist unbestätigt. Es wurde nichts doppelt gesendet; aktualisieren Sie den Status oder wenden Sie sich an den Support.",
  "Checkout returned. Payment and access still require independent verification; no access was granted.":
    "Sie sind vom Bezahlvorgang zurück. Zahlung und Zugang müssen noch unabhängig überprüft werden; es wurde kein Zugang gewährt.",
  "Checkout state changed; refresh before continuing.":
    "Der Bezahlvorgang hat sich geändert; aktualisieren Sie die Seite, bevor Sie fortfahren.",
  "Choose an available rehearsal plan.": "Wählen Sie einen verfügbaren Probetarif.",
  "Customer association needs review.": "Die Zuordnung zum Kundenkonto muss geprüft werden.",
  "Customer creation is unconfirmed. No repeat was sent; support review is required.":
    "Das Anlegen des Kundenkontos ist unbestätigt. Es wurde nichts wiederholt gesendet; der Support muss es prüfen.",
  "Finish or expire the existing checkout before selecting another plan.":
    "Schließen Sie den laufenden Bezahlvorgang ab oder lassen Sie ihn ablaufen, bevor Sie einen anderen Tarif wählen.",
  "No billing customer is associated with this account.":
    "Diesem Konto ist kein Abrechnungskunde zugeordnet.",
  "Prior billing evidence needs review before another checkout.":
    "Frühere Abrechnungsnachweise müssen vor einem weiteren Bezahlvorgang geprüft werden.",
  "Provider outcome uncertain; support review required.":
    "Das Ergebnis beim Anbieter ist unklar; der Support muss es prüfen.",
  "The checkout expired. You may start a new one.":
    "Der Bezahlvorgang ist abgelaufen. Sie können einen neuen starten.",
  "The provider price does not match this plan. No checkout was created.":
    "Der Preis des Anbieters passt nicht zu diesem Tarif. Es wurde kein Bezahlvorgang angelegt.",
  "Receipt identity conflict; review required.":
    "Widerspruch bei der Zahlungsbestätigung; Prüfung erforderlich.",
  "Receipt unavailable.": "Die Zahlungsbestätigung ist nicht verfügbar.",
  "Invalid webhook body.": "Ungültiger Webhook-Inhalt.",
  "Unsupported event object.": "Nicht unterstütztes Ereignisobjekt.",
  "Webhook verification failed.": "Die Überprüfung des Webhooks ist fehlgeschlagen.",
};

// Messages with a number in them. Every number is carried over to the German text.
const PATTERNS: [RegExp, (...groups: string[]) => string][] = [
  [
    /^Not enough request allowance: this mode counts as (\d+) requests\. No request was forwarded\.$/,
    (n) => `Ihr Kontingent reicht nicht aus: Dieser Modus zählt als ${n} Anfragen. ${NOTHING_SENT}`,
  ],
];

export function serverMessage(text: string, lang: Lang): string {
  if (lang !== "de") return text;
  if (Object.hasOwn(GERMAN, text)) return GERMAN[text];
  for (const [pattern, german] of PATTERNS) {
    const match = pattern.exec(text);
    if (match) return german(...match.slice(1));
  }
  return text;
}
