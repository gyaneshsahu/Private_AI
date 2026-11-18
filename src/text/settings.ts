// The Settings tabs (SS-05, SS-15; docs/settings-structure-20261116.md) and the neutral line the
// sidebar shows while the Secure chats load. Sentences about where chats are kept reuse the mode
// texts (src/text/modes.ts, src/text/app.ts savedIntro); nothing here makes a new privacy claim.
import { defineText } from "./core";

export const settingsText = defineText({
  en: {
    general: "General",
    personalization: "Personalization",
    dataControls: "Data controls",
    security: "Security",
    account: "Account",
    whereSaved: "Where your chats are saved",
    signInMethods: "Sign-in methods",
    activeSessions: "Active sessions",
    downloadAccountData: "Download account data",
    deleteAccount: "Delete account",
    accountPageNote: "These links open your account page.",
    loadingChats: "Loading your chats…",
    signOutEverywhere: "Sign out everywhere",
    signOutEverywhereTitle: "Sign out everywhere?",
    signOutEverywhereText:
      "You are signed out on every device and browser, this one included. Use this if you lost a device or signed in on a computer that is not yours.",
    signOutEverywhereFailed: "The other devices could not be signed out. Try again in a minute.",
    cancel: "Cancel",
  },
  de: {
    general: "Allgemein",
    personalization: "Personalisierung",
    dataControls: "Datenverwaltung",
    security: "Sicherheit",
    account: "Konto",
    whereSaved: "Wo Ihre Chats gespeichert werden",
    signInMethods: "Anmeldemethoden",
    activeSessions: "Aktive Sitzungen",
    downloadAccountData: "Kontodaten herunterladen",
    deleteAccount: "Konto löschen",
    accountPageNote: "Diese Links öffnen Ihre Kontoseite.",
    loadingChats: "Ihre Chats werden geladen…",
    signOutEverywhere: "Überall abmelden",
    signOutEverywhereTitle: "Überall abmelden?",
    signOutEverywhereText:
      "Sie werden auf allen Geräten und in allen Browsern abgemeldet, auch hier. Nutzen Sie das, wenn Sie ein Gerät verloren haben oder sich an einem fremden Computer angemeldet haben.",
    signOutEverywhereFailed: "Die anderen Geräte konnten nicht abgemeldet werden. Versuchen Sie es in einer Minute erneut.",
    cancel: "Abbrechen",
  },
});
