// German interface (owner, 13 November 2026): every screen outside App.tsx in a German browser at
// phone width. Offline: every /api call is answered here with synthetic data.
import { afterAll, beforeAll, it } from "vitest";
import { chromium, expect as ui, type Browser, type Page, type Route } from "@playwright/test";
import { createServer, type ViteDevServer } from "vite";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { warmDevServer } from "./fixtures/dev-server-warmup";

let vite: ViteDevServer;
let browser: Browser;
let port = 0;
const phone = { width: 390, height: 844 };
const user = { id: "u1", email: "alice@example.test" };
const now = "2026-11-13T09:00:00.000Z";

beforeAll(async () => {
  vite = await createServer({
    logLevel: "silent",
    cacheDir: "node_modules/.vite-i18n-screens-ui-test",
    server: { host: "127.0.0.1", port: 0, hmr: false },
  });
  await vite.listen();
  await warmDevServer(vite);
  // The account lab is a lazy chunk; compile it before the first navigation too.
  await vite.warmupRequest("/src/AccountLab.tsx");
  await vite.warmupRequest("/tests/fixtures/i18n-screens-entry.tsx");
  await vite.waitForRequestsIdle();
  const address = vite.httpServer!.address();
  if (!address || typeof address === "string") throw Error("No local port");
  port = address.port;
  browser = await chromium.launch({
    ...browserLaunchOptions(),
    // The account lab opens only on the hostname localhost; keep it on the IPv4 listener.
    args: ["--host-resolver-rules=MAP localhost 127.0.0.1"],
  });
}, 60_000);

afterAll(async () => {
  await browser?.close();
  await vite?.close();
});

type Api = (path: string, route: Route) => Promise<void> | void;

async function open(path: string, api: Api = (_, route) => route.abort(), locale = "de-DE") {
  const origin = `http://${path.includes("account-lab") ? "localhost" : "127.0.0.1"}:${port}`;
  const context = await browser.newContext({ locale, viewport: phone });
  context.setDefaultTimeout(10_000);
  const page = await context.newPage();
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    if (url.pathname.startsWith("/api/")) return api(url.pathname, route);
    if (url.pathname === "/i18n-screens")
      return route.fulfill({
        contentType: "text/html",
        body: await vite.transformIndexHtml(
          "/i18n-screens",
          `<!doctype html><html><head><meta charset="utf-8"></head><body><div id="root"></div><script type="module" src="/tests/fixtures/i18n-screens-entry.tsx"></script></body></html>`,
        ),
      });
    return route.continue();
  });
  await page.goto(origin + path, { timeout: 30_000 });
  return page;
}
const screen = (name: string, api?: Api) => open(`/i18n-screens?screen=${name}`, api);
const done = (page: Page) => page.context().close();

it("account lab sign-in, help and appearance are German", async () => {
  const page = await open("/?account-lab=1", (path, route) => {
    if (path === "/api/account/options")
      return route.fulfill({
        json: { synthetic: true, socialProviders: ["google"], emailEnabled: true, workspaceEnabled: true },
      });
    if (path === "/api/auth/get-session") return route.fulfill({ json: null });
    return route.abort();
  });
  try {
    await ui(page.getByRole("heading", { name: "Im Konto-Labor anmelden" })).toBeVisible();
    await ui(page.locator("html")).toHaveAttribute("lang", "de");
    await ui(page.getByLabel("Test-E-Mail-Adresse")).toBeVisible();
    await ui(page.getByRole("button", { name: "Testcode senden" })).toBeEnabled();
    await ui(page.getByRole("button", { name: "Weiter mit Google" })).toBeVisible();
    await ui(page.getByRole("button", { name: /Weiter mit Apple\s*Demnächst/ })).toBeDisabled();
    await ui(page.getByText("ODER", { exact: true })).toBeVisible();
    await ui(page.getByText(/^Synthetisches Konto-Labor/)).toBeVisible();
    await ui(page.getByLabel("Darstellung")).toContainText("Wie im System");
    await page.getByText("Datenschutz und Wiederherstellung des Kontos").click();
    await ui(page.getByText(/CometRow speichert Ihre E-Mail-Adresse/)).toBeVisible();
    // Help opens on the account area, in German, and the support note is German too.
    await page.getByText("Hilfe zur Anmeldung oder ein Problem melden").click();
    await ui(page.getByRole("heading", { name: "Hilfe und Problemmeldung" })).toBeVisible();
    await ui(page.getByText(/^Nutzen Sie eine Anmeldemethode/)).toBeVisible();
    const note = page.getByLabel("Ihre Support-Notiz prüfen");
    await ui(note).toHaveValue(/Bereich: Anmeldung oder Kontozugang/);
    await ui(note).toHaveValue(/Problem: Eine Funktion war nicht verfügbar/);
    await page.getByLabel("Was ist passiert").selectOption({ label: "Ein anderes Problem" });
    await ui(note).toHaveValue(/Problem: Ein anderes Problem/);
    // A local check of the synthetic address, shown in German.
    await page.getByLabel("Test-E-Mail-Adresse").fill("alice@example.com");
    await page.getByRole("button", { name: "Testcode senden" }).click();
    await ui(page.getByRole("status").filter({ hasText: "synthetische .test-E-Mail-Adresse" })).toBeVisible();
  } finally {
    await done(page);
  }
}, 60_000);

it("signed-in account lab: access, notices, export with a German server message, closure", async () => {
  const page = await open("/?account-lab=1", (path, route) => {
    if (path === "/api/account/options")
      return route.fulfill({
        json: { synthetic: true, socialProviders: ["google"], emailEnabled: true, workspaceEnabled: true },
      });
    if (path === "/api/auth/get-session") return route.fulfill({ json: { user } });
    if (path === "/api/account/access")
      return route.fulfill({
        json: {
          sessions: [
            { id: "11111111-1111-4111-8111-111111111111", createdAt: now, updatedAt: now, expiresAt: now, current: true },
            { id: "22222222-2222-4222-8222-222222222222", createdAt: now, updatedAt: now, expiresAt: now, current: false },
          ],
          passkeys: [{ id: "33333333-3333-4333-8333-333333333333", name: null, createdAt: now }],
          providers: [{ id: "44444444-4444-4444-8444-444444444444", providerId: "google" }],
        },
      });
    if (path === "/api/account/security-notices")
      return route.fulfill({
        json: {
          notices: [
            { id: "55555555-5555-4555-8555-555555555555", kind: "sign_in_recovery", createdAt: now, deliveryState: "accepted" },
          ],
        },
      });
    if (path === "/api/account/export")
      return route.fulfill({ status: 503, json: { error: "Account access is paused for recovery verification." } });
    return route.abort();
  });
  try {
    await ui(page.getByRole("heading", { name: "Ihr Testkonto" })).toBeVisible();
    await ui(page.getByText("Angemeldet als")).toContainText("alice@example.test");
    await ui(page.getByRole("link", { name: "Test-Arbeitsbereich öffnen" })).toBeVisible();
    await ui(page.getByRole("button", { name: "Mit Google verbunden" })).toBeDisabled();
    await ui(page.getByRole("button", { name: "Wiederherstellung der Anmeldung abschließen" })).toBeVisible();
    const notices = page.getByRole("region", { name: "Sicherheitshinweise" });
    await ui(notices).toContainText("Wiederherstellung der Anmeldung");
    await ui(notices).toContainText("Übermittlung angenommen; Zustellung ins Postfach nicht geprüft");
    await ui(notices).toContainText(/13\.11\.2026/);
    const access = page.getByRole("region", { name: "Kontozugang" });
    await ui(access.getByRole("heading", { name: "Aktive Sitzungen" })).toBeVisible();
    await ui(access).toContainText("Diese Sitzung");
    await ui(access.getByRole("button", { name: "Sitzung 22222222 abmelden" })).toBeVisible();
    await ui(access.getByRole("button", { name: "Unbenannter Passkey entfernen" })).toBeVisible();
    await ui(access.getByRole("button", { name: "Google entfernen" })).toBeVisible();
    await ui(page.getByRole("button", { name: "Test-Passkey hinzufügen" })).toBeVisible();
    await ui(page.getByRole("button", { name: "Abmelden", exact: true })).toBeVisible();
    const closure = page.getByRole("region", { name: "Testkonto löschen" });
    await ui(closure.getByLabel("Geben Sie zur Bestätigung DELETE TEST ACCOUNT ein")).toBeVisible();
    await ui(closure.getByRole("button", { name: "Testkonto schließen" })).toBeDisabled();
    const exporter = page.getByRole("region", { name: "Ihre Kontodaten herunterladen" });
    await exporter.getByRole("button", { name: "Kontodaten herunterladen" }).click();
    await ui(exporter.getByRole("status")).toHaveText(
      "Der Zugang zum Konto ist für die Überprüfung der Wiederherstellung pausiert.",
    );
  } finally {
    await done(page);
  }
}, 60_000);

it("account design preview is German, and English stays English", async () => {
  const page = await open("/?account-preview=1");
  try {
    await ui(page.getByRole("heading", { name: "Willkommen bei CometRow" })).toBeVisible();
    await page.getByRole("button", { name: "Weiter mit Google" }).click();
    await ui(page.getByRole("status")).toContainText("in dieser Vorschau nicht angebunden");
    await page.getByRole("button", { name: "Weiter mit E-Mail" }).click();
    await ui(page.getByRole("heading", { name: "Weiter mit E-Mail" })).toBeVisible();
    await ui(page.getByLabel("E-Mail-Adresse")).toHaveValue("you@example.test");
    await page.getByRole("button", { name: "Bestätigungsschritt ansehen" }).click();
    await ui(page.getByRole("heading", { name: "Prüfen Sie Ihre E-Mails" })).toBeVisible();
    await ui(page.getByText("Bestehende Konten und gespeicherte Unterhaltungen bleiben unverändert.")).toBeVisible();
  } finally {
    await done(page);
  }
  const english = await open("/?account-preview=1", undefined, "en-US");
  try {
    await ui(english.getByRole("heading", { name: "Welcome to CometRow" })).toBeVisible();
  } finally {
    await done(english);
  }
}, 60_000);

it("usage page and billing rehearsal: German counts, dates, prices and server refusals", async () => {
  const overview = {
    mode: "synthetic-rehearsal",
    plans: [{ id: "basic", name: "Basic", amountMinor: 999, currency: "EUR", interval: "month" }],
    customerBound: false,
    checkout: "not_started",
    portal: "not_started",
    customer: "not_started",
    reviewRequired: false,
    accessGranted: false,
  };
  const page = await screen("usage", (path, route) => {
    if (path === "/api/billing/overview") return route.fulfill({ json: overview });
    if (path === "/api/billing/checkout")
      return route.fulfill({
        status: 409,
        json: { error: "Finish or expire the existing checkout before selecting another plan." },
      });
    return route.abort();
  });
  try {
    await ui(page.getByRole("heading", { name: "Konto und Nutzung" })).toBeVisible();
    const plan = page.locator(`[aria-label="Tarif und Anfragen"]`);
    await ui(plan.getByRole("heading", { name: "42 Anfragen übrig" })).toBeVisible();
    await ui(plan).toContainText("8 von 50 Anfragen in diesem Zeitraum reserviert oder versucht.");
    await ui(plan).toContainText(/Zeitraum endet: 20\.11\.2026.*\. Ein neues Kontingent ist nicht garantiert\./);
    await ui(plan).toContainText("1 ausstehend oder vor der Abrechnung abgebrochen; 2 mit unsicherem Übertragungsergebnis.");
    const tokens = page.locator(`[aria-label="Tokens und Kosten"]`);
    await ui(tokens).toContainText("5 abgeschlossene Anfragen wurden gemessen: 12.345 Prompt-Tokens und 678 Antwort-Tokens.");
    await ui(tokens).toContainText("Veröffentlichte Kosten bisher: 0,0123 USD.");
    await ui(tokens).toContainText("3 abgerechnete Anfragen haben keine Messung");
    await ui(page.getByRole("button", { name: "Anmeldemethoden verwalten" })).toBeVisible();
    const billing = page.getByRole("region", { name: "Probelauf für Abonnements" });
    await ui(billing).toContainText("9,99 € / Monat — nur ein synthetischer Preis, kein Angebot zum Start.");
    await billing.getByRole("button", { name: "Test-Bezahlvorgang öffnen" }).click();
    await ui(billing.getByRole("status").first()).toHaveText(
      "Schließen Sie den laufenden Bezahlvorgang ab oder lassen Sie ihn ablaufen, bevor Sie einen anderen Tarif wählen.",
    );
    await ui(billing.getByRole("button", { name: "Test-Abrechnung verwalten" })).toBeDisabled();
  } finally {
    await done(page);
  }
}, 60_000);

it("help panel: German areas, guidance and support note", async () => {
  const page = await screen("support");
  try {
    await ui(page.getByRole("heading", { name: "Hilfe und Problemmeldung" })).toBeVisible();
    await page.getByLabel("Problembereich").selectOption({ label: "Nutzung oder Zahlung" });
    await ui(page.getByText(/^Ein Kontingent zählt Versuche/)).toBeVisible();
    await ui(page.getByLabel("Ihre Support-Notiz prüfen")).toHaveValue(
      /^CometRow Support-Notiz \(Format 1\)\nBereich: Nutzung oder Zahlung\nProblem: Eine Funktion war nicht verfügbar/,
    );
    await ui(page.getByRole("button", { name: "Support-Notiz kopieren" })).toBeVisible();
    await ui(page.getByText(/^Ein besetzter Support-Kontakt/)).toBeVisible();
  } finally {
    await done(page);
  }
}, 60_000);

it("navigation drawer is German", async () => {
  const page = await screen("nav");
  try {
    const drawer = page.getByRole("dialog", { name: "Navigation" });
    await ui(drawer.getByRole("button", { name: "Neue Unterhaltung" })).toContainText("Neuer Chat");
    await ui(drawer.getByRole("button", { name: "Neuer Inkognito-Chat" })).toContainText("Inkognito");
    await ui(drawer.getByRole("button", { name: "Navigation schließen" })).toBeVisible();
    await ui(drawer.getByPlaceholder("Diesen Tresor durchsuchen")).toBeVisible();
    await ui(drawer.getByRole("heading", { name: "Projekte" })).toBeVisible();
    await ui(drawer.getByRole("heading", { name: "Letzte Unterhaltungen" })).toBeVisible();
    await ui(drawer.getByRole("button", { name: "Zuletzt" })).toBeVisible();
    await ui(drawer.getByRole("button", { name: "Archiviert" })).toBeVisible();
    await drawer.getByLabel("Aktionen für Synthetic tax question").click();
    await ui(drawer.getByRole("button", { name: "Lösen" })).toBeVisible();
    await ui(drawer.getByLabel("Projekt für Synthetic tax question")).toContainText("Kein Projekt");
    await drawer.getByLabel("Kontomenü").click();
    await ui(drawer.getByRole("button", { name: "Konto und Nutzung" })).toBeVisible();
    await ui(drawer.getByRole("button", { name: "Einstellungen" })).toBeVisible();
    await ui(drawer.getByRole("button", { name: "Gespeichert · Datenverwaltung" })).toBeVisible();
    await ui(drawer.getByText("42 von 50 Anfragen übrig").first()).toBeVisible();
    await ui(drawer.getByText("Lokaler Tresor entsperrt · Dieses Gerät")).toBeVisible();
  } finally {
    await done(page);
  }
}, 60_000);

it("saved library, branches and context review are German", async () => {
  const page = await screen("library");
  try {
    const library = page.getByRole("region", { name: "Bibliothek gespeicherter Unterhaltungen" });
    await ui(library.getByLabel("Unterhaltungen sortieren")).toContainText("Neueste zuerst");
    await ui(library).toContainText("1 von 1 gespeicherten Unterhaltungen");
    await ui(library).toContainText(
      /13\.11\.2026 · 2 Nachrichten · 1 Anhänge · Nicht gesendeter Entwurf · Angeheftet · 2 Zweige/,
    );
    await ui(library.getByRole("button", { name: "Öffnen" })).toBeVisible();
    await library.getByLabel("Gespeicherte Unterhaltungen durchsuchen").fill("kein Treffer");
    await ui(library).toContainText("Keine passenden Unterhaltungen.");
    await ui(page.getByText("Zweige der Unterhaltung · 2 · Edit 1")).toBeVisible();
    await page.getByText("Zweige der Unterhaltung · 2 · Edit 1").click();
    await ui(page.getByRole("button", { name: "Zweig Original öffnen" })).toBeVisible();
    await ui(page.getByText(/1 Nachrichten · enthält einen unvollständigen Versuch/)).toBeVisible();
    const review = page.locator(".context-review");
    await ui(review).toContainText("Einbezogenen Kontext prüfen · 1 Nachrichten · 1 Quellenabschnitte");
    await ui(review).toContainText("Die Sendegrenze ist um 500 Zeichen überschritten.");
    await ui(review.getByRole("row", { name: "Anweisungen 1.200" })).toBeVisible();
    await ui(review).toContainText("1. Sie: Synthetic question about a deadline");
    await ui(review).toContainText("2. CometRow: Keine fertige Antwort · Unvollständig; immer ausgeschlossen");
    await ui(review).toContainText("synthetic-notice.pdf · 1 Quellenabschnitte");
  } finally {
    await done(page);
  }
}, 60_000);

it("vault backup and passphrase change are German", async () => {
  const page = await screen("vault");
  try {
    const backup = page.getByRole("region", { name: "Verschlüsselte Sicherung und Wiederherstellung" });
    await ui(backup.getByRole("button", { name: "Verschlüsselte Sicherung herunterladen" })).toBeEnabled();
    await ui(backup.getByLabel("Ursprüngliche Passphrase der Sicherung")).toBeDisabled();
    await ui(backup.getByRole("button", { name: "Als neue Kopien wiederherstellen" })).toBeDisabled();
    const security = page.getByRole("region", { name: "Sicherheit der Tresor-Passphrase" });
    await security.getByLabel("Neue Tresor-Passphrase", { exact: true }).fill("synthetic passphrase one");
    await security.getByLabel("Neue Tresor-Passphrase bestätigen").fill("synthetic passphrase two");
    await ui(security.getByRole("status")).toHaveText("Die neuen Passphrasen stimmen nicht überein.");
    await ui(security.getByRole("button", { name: "Passphrase ändern und sperren" })).toBeDisabled();
  } finally {
    await done(page);
  }
}, 60_000);

it("answers: evidence notice, citation page, code block, omitted image and table are German", async () => {
  const page = await screen("answer");
  try {
    await ui(page.getByText(/^Belege prüfen: 0 unbekannte Quellenverweise/)).toBeVisible();
    await ui(page.getByRole("button", { name: "example.com: Notice" })).toHaveText("example.com · S. 2");
    await ui(page.getByRole("button", { name: "Code kopieren" })).toBeEnabled();
    await ui(page.getByLabel("Codeblock: python")).toContainText("print(1234)");
    await ui(page.getByText("[Bild ausgelassen: Diagramm]")).toBeVisible();
    await ui(page.getByRole("region", { name: "Antworttabelle" })).toBeVisible();
  } finally {
    await done(page);
  }
}, 60_000);

it("photo to text dialog and its camera refusal are German", async () => {
  const page = await screen("photo");
  try {
    const dialog = page.getByRole("dialog", { name: "Foto zu Text" });
    await ui(dialog.getByRole("button", { name: "Foto zu Text schließen" })).toBeVisible();
    await ui(dialog.getByText("PNG oder JPEG von diesem Gerät, bis 10 MB.")).toBeVisible();
    await ui(dialog.getByRole("button", { name: "Foto auswählen" })).toBeVisible();
    await dialog.getByRole("button", { name: "Kamera verwenden" }).click();
    // Headless Chromium has no camera grant: whichever refusal comes, it is German.
    await ui(dialog.getByRole("alert")).toContainText(/Foto\.$/);
  } finally {
    await done(page);
  }
}, 60_000);
