import {
  executeInstallPlan,
  executeToggleMcp,
  executeUninstall,
} from "../adapters/install/executor";
import { saveSettings } from "../adapters/settings";
import { restoreBackup, type BackupEntry } from "../adapters/backups";
import type { ConfigSnapshot } from "../adapters/snapshot";
import type { CatalogItem } from "../core/model";
import {
  SETTING_DEFINITIONS,
  toggleOrCycleSetting,
  type MercatoSettings,
} from "../core/settings";
import { STRINGS } from "./strings";

export function handleUninstallAction(
  item: CatalogItem,
  refreshSnapshot: () => void,
  refreshBackups?: () => void,
  showToast?: (msg: string) => void
): void {
  const res = executeUninstall(item, "global");
  refreshSnapshot();
  refreshBackups?.();
  showToast?.(res.message);
}

export function handleToggleMcpAction(
  item: CatalogItem,
  enable: boolean,
  refreshSnapshot: () => void,
  refreshBackups?: () => void,
  showToast?: (msg: string) => void
): void {
  const res = executeToggleMcp(item, enable, "global");
  refreshSnapshot();
  refreshBackups?.();
  showToast?.(res.message);
}

export function handleToggleSettingAction(
  selectedIndex: number,
  settings: MercatoSettings,
  setSettings: (s: MercatoSettings) => void,
  showToast?: (msg: string) => void
): void {
  const def = SETTING_DEFINITIONS[selectedIndex];
  if (!def) return;
  const next = toggleOrCycleSetting(settings, def.key);
  setSettings(next);
  try {
    saveSettings(next);
  } catch {
    // ignore
  }
  showToast?.(STRINGS.TOAST_SETTINGS_SAVED);
}

export function handleRestoreBackupAction(
  backup: BackupEntry | undefined,
  refreshSnapshot: () => void,
  refreshBackups?: () => void,
  showToast?: (msg: string) => void
): void {
  if (!backup) return;
  const res = restoreBackup(backup);
  refreshSnapshot();
  refreshBackups?.();
  showToast?.(res.message);
}
