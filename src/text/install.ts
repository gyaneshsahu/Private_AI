// The home-screen app (docs/pwa-20261125.md): the row in Settings.
import { defineText } from "./core";

export const installText = defineText({
  en: {
    heading: "CometRow on your home screen",
    intro: "Add CometRow to your home screen. It then opens like an app, in its own window.",
    install: "Install CometRow",
    installed: "CometRow was added.",
    appleSteps: "In Safari, tap the Share button, then “Add to Home Screen”.",
  },
  de: {
    heading: "CometRow auf Ihrem Startbildschirm",
    intro: "Fügen Sie CometRow zu Ihrem Startbildschirm hinzu. Es öffnet sich dann wie eine App, in einem eigenen Fenster.",
    install: "CometRow installieren",
    installed: "CometRow wurde hinzugefügt.",
    appleSteps: "Tippen Sie in Safari auf „Teilen“ und dann auf „Zum Home-Bildschirm“.",
  },
});
