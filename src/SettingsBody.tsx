// The Settings dialog's tabs and their content (SS-05, SS-15; docs/settings-structure-20261116.md).
// src/App.tsx keeps the <dialog>, its title, close button and focus handling, and closes Settings
// before anything here leaves it (another tab of the app, the account page, sign out).
import type { ReactNode } from "react";
import type { AppStatus, Conversation } from "../shared/contracts";
import { privacySummary } from "../shared/privacy-copy";
import { AccountUsage } from "./AccountUsage";
import { DataControls } from "./DataControls";
import { memoryEnabled } from "./device-features";
import type { HealthConsentChoice, HealthConsentRecord } from "./health-consent";
import { HealthConsentSetting } from "./HealthConsent";
import { germanEnabled, LanguageSwitch, useLang } from "./i18n";
import { Icon } from "./Icon";
import { MemorySettings } from "./MemorySettings";
import { LockIcon } from "./ModeBadge";
import { SecureMaxResetSetting } from "./SecureMaxResetSetting";
import { SecureMaxStartSetting } from "./SecureMaxStartSetting";
import { SyncSettings } from "./SyncScreens";
import { appText } from "./text/app";
import { forStorage, modeCopyText, type Storage } from "./text/mode-copy";
import { modesText } from "./text/modes";
import { settingsText } from "./text/settings";
import { syncText } from "./text/sync";
import { workspaceText } from "./text/workspace";
import type { Vault } from "./vault";

/** Sections of the account page (src/AccountLab.tsx) that Settings links to. */
export type AccountPart = "account-access" | "account-sessions" | "account-export" | "account-delete";

export function SettingsBody({
  section,
  onSection,
  appearance,
  onAppearance,
  status,
  secureOn,
  secureReady,
  syncOn,
  maxAvailable,
  unlocked,
  secureChats,
  onDeleteAllSecure,
  busy,
  healthConsent,
  onHealthConsent,
  memoryVault,
  memoryReady,
  memoryStorage,
  vault,
  onNotice,
  onSyncOpened,
  startInMax,
  onStartInMax,
  onResetMax,
  recentSignIn,
  onSavedTab,
  onArchived,
  onAccountPage,
  onSignOut,
}: {
  section: string;
  onSection: (id: string) => void;
  appearance: "system" | "light" | "dark";
  onAppearance: (value: "system" | "light" | "dark") => void;
  status?: AppStatus;
  secureOn: boolean;
  secureReady: boolean;
  syncOn: boolean;
  maxAvailable: boolean;
  /** The Secure Max (or, without Secure, the local) vault is unlocked on this device. */
  unlocked: boolean;
  /** The Secure chats for export and Delete all (DataControls). */
  secureChats: Conversation[];
  onDeleteAllSecure: () => Promise<void>;
  busy: boolean;
  healthConsent: HealthConsentRecord | undefined;
  onHealthConsent: (choice: HealthConsentChoice) => void;
  memoryVault: Vault | null;
  memoryReady: boolean;
  memoryStorage: Storage;
  /** The Secure Max (or local) vault, for Devices and sync. */
  vault: Vault | null;
  onNotice: (text: string) => void;
  onSyncOpened: (remember: boolean) => void;
  startInMax: boolean;
  onStartInMax: (on: boolean) => void;
  onResetMax: () => Promise<void>;
  recentSignIn: boolean;
  /** These close Settings first. */
  onSavedTab: () => void;
  /** Absent while no chat list is open (nothing to filter yet). */
  onArchived?: () => void;
  onAccountPage: (part: AccountPart) => void;
  onSignOut: () => void;
}) {
  const { lang } = useLang();
  const t = appText[lang];
  const s = settingsText[lang];
  const modes = modesText[lang];
  const storage: Storage = secureOn ? "secure" : "local";
  const tm = forStorage({ ...t, ...modeCopyText[lang] }, storage);
  const signedIn = !!status?.accountId;
  const tabs: [string, ReactNode, string][] = [
    ["general", <Icon name="sun" />, s.general],
    ...(memoryEnabled() ? [["personal", <Icon name="pin" />, s.personalization] as [string, ReactNode, string]] : []),
    ["data", <Icon name="file" />, s.dataControls],
    ["security", <Icon name="shield" />, s.security],
    // Secure Max gets the lock and its name; sync of the local vault (no Secure) keeps its own name.
    ...(maxAvailable
      ? [["sync", <LockIcon />, modes.maxLabel] as [string, ReactNode, string]]
      : syncOn
        ? [["sync", <Icon name="retry" />, syncText[lang].section] as [string, ReactNode, string]]
        : []),
    ["account", <Icon name="user" />, s.account],
  ];
  const current = tabs.find(([id]) => id === section) ?? tabs[0];
  const accountLine = status?.accountEmail ?? (status?.accountId ? t.signedInAccount(status.accountId) : t.localSession);
  return (
    <div className="settings-layout">
      <nav aria-label={t.settingsSections}>
        {tabs.map(([id, icon, label]) => (
          <button key={id} type="button" aria-current={current[0] === id ? "page" : undefined} onClick={() => onSection(id)}>
            {icon}
            {label}
          </button>
        ))}
      </nav>
      <section className="settings-content" aria-label={current[2]}>
        {/* Devices and sync without Secure Max has its own heading of the same name. */}
        {!(current[0] === "sync" && !maxAvailable) && <h3>{current[2]}</h3>}
        {current[0] === "general" && (
          <>
            <label htmlFor="chat-appearance">{t.sectionAppearance}</label>
            <select id="chat-appearance" value={appearance} onChange={(event) => onAppearance(event.target.value as typeof appearance)}>
              <option value="system">{t.themeSystem}</option>
              <option value="light">{t.themeLight}</option>
              <option value="dark">{t.themeDark}</option>
            </select>
            <p className="muted">{tm.appearanceNote}</p>
            {germanEnabled() && (
              <>
                <h4>{t.languageLabel}</h4>
                <LanguageSwitch className="language-switch settings-language" />
                <p className="muted">{t.languageNote}</p>
              </>
            )}
          </>
        )}
        {current[0] === "personal" && <MemorySettings vault={memoryVault} unlocked={memoryReady} storage={memoryStorage} />}
        {current[0] === "data" && (
          <>
            <h4>{s.whereSaved}</h4>
            {secureOn ? <p>{modes.secureLine}</p> : <p>{t.savedIntro}</p>}
            {maxAvailable && (
              <p className="settings-max-line">
                <LockIcon /> <strong>{modes.maxLabel}:</strong> {modes.maxLine}
              </p>
            )}
            {/* SS-01: the binding summary says "we never can" read: only true without Secure. */}
            <p>{secureOn ? modeCopyText[lang].privacySummary_secure : privacySummary(lang)}</p>
            {secureOn && <p className="muted">{modes.secureLong}</p>}
            {onArchived && (
              <p>
                <button type="button" className="text-button" onClick={onArchived}>
                  {workspaceText[lang].archivedChats}
                </button>
              </p>
            )}
            {/* Export and delete of the Secure chats (SS-03). Secure Max and the device vault keep their own controls in Saved. */}
            {secureReady && <DataControls conversations={secureChats} onDeleteAll={onDeleteAllSecure} erasesEverything={false} busy={busy} />}
            <p>
              <button type="button" onClick={onSavedTab}>
                {t.historyControls}
              </button>
            </p>
            {signedIn && (
              <p>
                <button type="button" className="text-button" onClick={() => onAccountPage("account-export")}>
                  {s.downloadAccountData}
                </button>
              </p>
            )}
            {status?.healthConsentDraft && <HealthConsentSetting record={healthConsent} onChoose={onHealthConsent} />}
            <p>{tm.footerNote}</p>
            {status?.inference.ready === false && <p className="muted">{t.privateChatGated}</p>}
          </>
        )}
        {current[0] === "security" && (
          <>
            {signedIn ? (
              <>
                <p className="muted">{s.accountPageNote}</p>
                <ul className="settings-links">
                  <li>
                    <button type="button" className="text-button" onClick={() => onAccountPage("account-access")}>
                      {s.signInMethods}
                    </button>
                  </li>
                  <li>
                    <button type="button" className="text-button" onClick={() => onAccountPage("account-sessions")}>
                      {s.activeSessions}
                    </button>
                  </li>
                </ul>
              </>
            ) : (
              <p>{t.localSession}</p>
            )}
            {/* The local vault's passphrase wording: not true of Secure. */}
            {!secureOn && <p>{t.recoverySeparate}</p>}
            {signedIn && (
              <button type="button" disabled={busy} onClick={onSignOut}>
                <Icon name="logout" />
                {workspaceText[lang].signOut}
              </button>
            )}
          </>
        )}
        {current[0] === "sync" && (
          <>
            {maxAvailable && <SecureMaxStartSetting value={startInMax} onChange={onStartInMax} />}
            {syncOn && <SyncSettings storage={storage} unlocked={unlocked} vault={vault} onNotice={onNotice} onOpened={onSyncOpened} />}
            {/* Only while unlocked here: the reset needs this device's proof (locked: Forgot passphrase with the recovery key).
                recentSignIn is a screen gate only. */}
            {maxAvailable && unlocked && <SecureMaxResetSetting onReset={onResetMax} recentSignIn={recentSignIn} />}
          </>
        )}
        {current[0] === "account" && (
          <>
            <p>{accountLine}</p>
            <AccountUsage
              allowance={status?.requestAllowance}
              metering={!!status?.metering}
              refresh={status}
              chatReady={status?.inference.ready}
              storage={storage}
            />
            {signedIn && (
              <p>
                <button type="button" className="text-button" onClick={() => onAccountPage("account-delete")}>
                  {s.deleteAccount}
                </button>
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
