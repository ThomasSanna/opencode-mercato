import { describe, expect, it, mock } from "bun:test";
import type { BackupEntry } from "../../src/adapters/backups";
import type { CatalogItem } from "../../src/core/model";
import { DEFAULT_SETTINGS, type MercatoSettings } from "../../src/core/settings";
import {
  handleRestoreBackupAction,
  handleToggleMcpAction,
  handleToggleSettingAction,
  handleUninstallAction,
} from "../../src/tui/key-actions";

const samplePlugin: CatalogItem = {
  id: "opencode-sample-plugin",
  kind: "plugin",
  name: "opencode-sample-plugin",
  description: "Sample plugin",
  repoUrl: "https://github.com/sample/plugin",
  npmSpec: "opencode-sample-plugin",
  homepage: null,
  tags: [],
  installSpec: {},
  sources: [],
  bestTrust: { level: "high", score: 90 },
};

describe("TUI key-actions", () => {
  it("handleUninstallAction executes uninstall and triggers refreshes", () => {
    let snapshotRefreshed = false;
    let backupsRefreshed = false;
    let toastMessage = "";

    handleUninstallAction(
      samplePlugin,
      () => {
        snapshotRefreshed = true;
      },
      () => {
        backupsRefreshed = true;
      },
      (msg) => {
        toastMessage = msg;
      }
    );

    expect(snapshotRefreshed).toBe(true);
    expect(backupsRefreshed).toBe(true);
    expect(toastMessage).toBeDefined();
  });

  it("handleToggleMcpAction executes toggle and triggers refreshes", () => {
    let snapshotRefreshed = false;
    let backupsRefreshed = false;
    let toastMessage = "";

    const mcpItem: CatalogItem = {
      ...samplePlugin,
      kind: "mcp",
      name: "sample-mcp",
    };

    handleToggleMcpAction(
      mcpItem,
      true,
      () => {
        snapshotRefreshed = true;
      },
      () => {
        backupsRefreshed = true;
      },
      (msg) => {
        toastMessage = msg;
      }
    );

    expect(snapshotRefreshed).toBe(true);
    expect(backupsRefreshed).toBe(true);
    expect(toastMessage).toBeDefined();
  });

  it("handleToggleSettingAction toggles setting value and notifies via toast", () => {
    let updatedSettings: MercatoSettings = DEFAULT_SETTINGS;
    let toastMessage = "";

    // index 0 is autoUpdate (boolean)
    handleToggleSettingAction(
      0,
      DEFAULT_SETTINGS,
      (s) => {
        updatedSettings = s;
      },
      (msg) => {
        toastMessage = msg;
      }
    );

    expect(updatedSettings.autoUpdate).toBe(!DEFAULT_SETTINGS.autoUpdate);
    expect(toastMessage).toContain("Settings saved");
  });

  it("handleRestoreBackupAction restores backup and triggers refreshes", () => {
    let snapshotRefreshed = false;
    let backupsRefreshed = false;
    let toastMessage = "";

    const backup: BackupEntry = {
      id: "backup-2026-08-17-120000",
      filePath: "/test/backup.json.bak",
      targetConfigPath: "/test/opencode.json",
      timestamp: Date.now(),
      formattedDate: "2026-08-17 12:00:00",
      sizeBytes: 128,
      kindSummary: "plugin",
      scope: "global",
    };

    handleRestoreBackupAction(
      backup,
      () => {
        snapshotRefreshed = true;
      },
      () => {
        backupsRefreshed = true;
      },
      (msg) => {
        toastMessage = msg;
      }
    );

    expect(snapshotRefreshed).toBe(true);
    expect(backupsRefreshed).toBe(true);
    expect(toastMessage).toBeDefined();
  });

  it("handleRestoreBackupAction handles undefined backup safely", () => {
    let called = false;
    handleRestoreBackupAction(undefined, () => {
      called = true;
    });
    expect(called).toBe(false);
  });
});
