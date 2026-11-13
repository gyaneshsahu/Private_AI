// Status lines and errors from sending a message (verification, transport, stream, calculator,
// checked formats). The English is the wording tests already expect; keep it byte-identical.
import { defineText } from "./core";

const notSent = "Es wurde nichts gesendet.";
const noRetry = "Es wurde nicht automatisch erneut versucht.";

export const chatErrorText = defineText({
  en: {
    receiving: "Receiving a protected response…",
    preparingTransport: "Preparing encrypted transport…",
    explaining: "Explaining the calculated result…",
    oneContract: "Choose one response contract. Nothing was sent.",
    tooLargeCalculator:
      "Selected context including calculator tools is too large. Nothing was sent.",
    tooLargeChecked:
      "Selected context including the checked response contract is too large. Nothing was sent.",
    needsSources: "The research evidence experiment requires retrieved sources.",
    tooLargeResearch:
      "Selected context including the research contract is too large. Nothing was sent.",
    tooLargeSchema:
      "Selected context including the response schema is too large. Nothing was sent.",
    tooLargeProtocol:
      "Selected context including calculator protocol is too large. Nothing was sent.",
    calculationStopped: "Calculation stopped.",
    deploymentChangedCalculation: "Deployment changed during calculation.",
    continuationStopped:
      "Calculation continuation stopped. No automatic retry was made.",
    explanationStopped: "Explanation stopped.",
    timedOut: "Response timed out.",
    outputLimit: "The response reached its output limit before completing.",
    rateLimited:
      "The protected service is limiting requests. No answer was received.",
    unavailable: "The protected service is unavailable. No answer was received.",
    rejected:
      "The protected service did not accept this request and gave no answer.",
    modelNotFound:
      "The AI model for this answer mode is not available on the secure server. No answer was received, and no other model was used in its place.",
    incomplete: "Response incomplete.",
    partialExcluded: (reason: string) =>
      `${reason} Partial answers are excluded from future context. No automatic retry was made.`,
    operationTimedOut: "Operation timed out.",
    operationStopped: "Operation stopped.",
    operationFailed: "Protected operation failed.",
    busy: "CometRow is busy checking the secure server. Please try again in a minute. Nothing was sent.",
    loadingLibraries: "Loading inference libraries…",
    fetchingManifest: "Fetching the approved deployment manifest…",
    manifestUnavailable: "Deployment manifest unavailable.",
    manifestMismatch:
      "The deployment manifest does not match the reviewed provider configuration. Nothing was sent.",
    verifyingDestination: "Verifying the protected destination…",
    deploymentDiffers:
      "The provider's deployment differs from the reviewed one. Nothing was sent.",
    connectionClosed: "The verified connection was closed. Nothing was sent.",
    noCacheSalt: "No prompt-cache salt for this account. Nothing was sent.",
    serverMismatch:
      "The checked server does not match the reviewed provider configuration. Nothing was sent.",
    fetchingAttestation: "Fetching attestation…",
    unexpectedDestination: "Unexpected verification destination. Nothing was sent.",
    checkingServer: "Checking the secure server…",
    evidenceUnavailable: "Verification evidence unavailable.",
    calcDecimal: "Use decimal numbers, without commas or currency symbols.",
    divideByZero: "Cannot divide by zero.",
    unsupportedCalculation: "Unsupported calculation.",
    branchChoose: "Choose a user message and enter its replacement.",
    branchLimit:
      "This conversation has 20 branches. Start a new conversation to continue; existing branches were kept.",
    branchGone: "That branch is no longer available.",
    billingTimeout:
      "Billing response timed out. The outcome is unconfirmed; refresh status before continuing. No automatic retry was made.",
    structuredNeedsContract:
      "Structured assisted output requires the assisted contract. Nothing was sent.",
    checkedWithheld:
      "Answer withheld because its calculation or source record could not be validated. No automatic retry was made.",
    calculationNotValidated:
      "Calculation could not be validated. No automatic retry was made.",
    calculatorNeedsUsage:
      "Calculator prototype requires final usage; no retry was made.",
    continuationBudget:
      "Calculation continuation exceeds context budget; no continuation sent.",
    explanationIncomplete:
      "Calculation explanation incomplete; no automatic retry was made.",
    researchInvalid:
      "Research returned invalid source information. Nothing was added; no automatic retry was made.",
    researchConflict:
      "Research returned conflicting source identifiers. Nothing was added; no automatic retry was made.",
    researchWithheld:
      "Research answer withheld: its required evidence format could not be validated. No automatic retry was made.",
  },
  de: {
    receiving: "Geschützte Antwort wird empfangen…",
    preparingTransport: "Verschlüsselte Übertragung wird vorbereitet…",
    explaining: "Das berechnete Ergebnis wird erklärt…",
    oneContract: `Wählen Sie ein einziges Antwortformat. ${notSent}`,
    tooLargeCalculator: `Der ausgewählte Kontext ist mit den Rechenwerkzeugen zu groß. ${notSent}`,
    tooLargeChecked: `Der ausgewählte Kontext ist mit dem geprüften Antwortformat zu groß. ${notSent}`,
    needsSources: "Der Versuch mit Recherche-Nachweisen braucht abgerufene Quellen.",
    tooLargeResearch: `Der ausgewählte Kontext ist mit dem Rechercheformat zu groß. ${notSent}`,
    tooLargeSchema: `Der ausgewählte Kontext ist mit dem Antwortschema zu groß. ${notSent}`,
    tooLargeProtocol: `Der ausgewählte Kontext ist mit dem Rechenprotokoll zu groß. ${notSent}`,
    calculationStopped: "Berechnung angehalten.",
    deploymentChangedCalculation:
      "Die Bereitstellung des Servers hat sich während der Berechnung geändert.",
    continuationStopped: `Die Fortsetzung der Berechnung wurde angehalten. ${noRetry}`,
    explanationStopped: "Erklärung angehalten.",
    timedOut: "Zeitüberschreitung bei der Antwort.",
    outputLimit: "Die Antwort hat ihre Längengrenze erreicht, bevor sie fertig war.",
    rateLimited: "Der geschützte Dienst begrenzt gerade die Anfragen. Es kam keine Antwort.",
    unavailable: "Der geschützte Dienst ist nicht erreichbar. Es kam keine Antwort.",
    rejected:
      "Der geschützte Dienst hat diese Anfrage nicht angenommen und keine Antwort gegeben.",
    modelNotFound:
      "Das KI-Modell für diesen Antwortmodus ist auf dem sicheren Server nicht verfügbar. Es kam keine Antwort, und es wurde kein anderes Modell an seiner Stelle verwendet.",
    incomplete: "Antwort unvollständig.",
    partialExcluded: (reason: string) =>
      `${reason} Teilantworten werden nicht als Kontext weiterverwendet. ${noRetry}`,
    operationTimedOut: "Zeitüberschreitung des Vorgangs.",
    operationStopped: "Vorgang angehalten.",
    operationFailed: "Der geschützte Vorgang ist fehlgeschlagen.",
    busy: `CometRow ist gerade mit der Prüfung des sicheren Servers ausgelastet. Bitte versuchen Sie es in einer Minute erneut. ${notSent}`,
    loadingLibraries: "Die Programmbibliotheken für die Antwort werden geladen…",
    fetchingManifest: "Das freigegebene Bereitstellungsmanifest wird abgerufen…",
    manifestUnavailable: "Das Bereitstellungsmanifest ist nicht verfügbar.",
    manifestMismatch: `Das Bereitstellungsmanifest passt nicht zur freigegebenen Anbieterkonfiguration. ${notSent}`,
    verifyingDestination: "Das geschützte Ziel wird überprüft…",
    deploymentDiffers: `Die Bereitstellung des Anbieters weicht von der geprüften ab. ${notSent}`,
    connectionClosed: `Die überprüfte Verbindung wurde geschlossen. ${notSent}`,
    noCacheSalt: `Für dieses Konto fehlt der Schlüssel für den Antwort-Zwischenspeicher. ${notSent}`,
    serverMismatch: `Der überprüfte Server passt nicht zur freigegebenen Anbieterkonfiguration. ${notSent}`,
    fetchingAttestation: "Der Prüfnachweis wird abgerufen…",
    unexpectedDestination: `Unerwartetes Ziel der Überprüfung. ${notSent}`,
    checkingServer: "Der sichere Server wird geprüft…",
    evidenceUnavailable: "Der Nachweis der Überprüfung ist nicht verfügbar.",
    calcDecimal:
      "Verwenden Sie Zahlen mit Punkt als Dezimalzeichen, ohne Tausendertrennzeichen und Währungszeichen.",
    divideByZero: "Durch null kann nicht geteilt werden.",
    unsupportedCalculation: "Diese Berechnung wird nicht unterstützt.",
    branchChoose: "Wählen Sie eine Ihrer Nachrichten und geben Sie den neuen Text ein.",
    branchLimit:
      "Diese Unterhaltung hat 20 Zweige. Beginnen Sie eine neue Unterhaltung, um weiterzumachen; die vorhandenen Zweige bleiben erhalten.",
    branchGone: "Dieser Zweig ist nicht mehr verfügbar.",
    billingTimeout: `Die Antwort zur Abrechnung kam nicht rechtzeitig. Das Ergebnis ist unbestätigt; aktualisieren Sie den Status, bevor Sie fortfahren. ${noRetry}`,
    structuredNeedsContract: `Strukturierte unterstützte Ausgabe braucht das unterstützte Antwortformat. ${notSent}`,
    checkedWithheld: `Antwort zurückgehalten, weil ihre Berechnung oder ihr Quellennachweis nicht überprüft werden konnte. ${noRetry}`,
    calculationNotValidated: `Die Berechnung konnte nicht überprüft werden. ${noRetry}`,
    calculatorNeedsUsage:
      "Der Rechner-Prototyp braucht die abschließende Verbrauchsangabe; es wurde nicht erneut versucht.",
    continuationBudget:
      "Die Fortsetzung der Berechnung überschreitet den Kontextrahmen; es wurde keine Fortsetzung gesendet.",
    explanationIncomplete:
      "Die Erklärung der Berechnung ist unvollständig; es wurde nicht automatisch erneut versucht.",
    researchInvalid:
      "Die Recherche lieferte ungültige Quellenangaben. Es wurde nichts hinzugefügt; es wurde nicht automatisch erneut versucht.",
    researchConflict:
      "Die Recherche lieferte widersprüchliche Quellenkennungen. Es wurde nichts hinzugefügt; es wurde nicht automatisch erneut versucht.",
    researchWithheld: `Rechercheantwort zurückgehalten: Das vorgeschriebene Nachweisformat konnte nicht überprüft werden. ${noRetry}`,
  },
});
