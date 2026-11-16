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
  },
});
