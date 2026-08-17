import { describe, expect, it } from "bun:test";
import { KeyEvent } from "@opentui/core";
import type { BackupEntry } from "../../src/adapters/backups";
import type { ConfigSnapshot } from "../../src/adapters/snapshot";
import type { FlowState, ListState } from "../../src/core/flow";
import type { CatalogItem } from "../../src/core/model";
import { DEFAULT_SETTINGS, type MercatoSettings } from "../../src/core/settings";
import { buildScopePlan, handleDialogKey } from "../../src/tui/handlers";

function makeKey(name: string, sequence = name): KeyEvent {
  return new KeyEvent({
    name,
    sequence,
    ctrl: false,
    meta: false,
    shift: false,
    option: false,
    number: false,
    raw: sequence,
    eventType: "press",
    source: "raw",
  });
}

const emptySnapshot: ConfigSnapshot = {
  globalConfigPath: "/global/opencode.json",
  localConfigPath: "/local/opencode.json",
  globalConfig: {},
  localConfig: {},
  installedPluginNames: [],
  installedPluginVersions: {},
  disabledPluginNames: [],
  configuredMcpServers: {},
  existingFiles: [],
  fileHashes: {},
};

const samplePlugin: CatalogItem = {
  id: "opencode-plugin-test",
  kind: "plugin",
  name: "opencode-plugin-test",
  description: "Test plugin",
  repoUrl: "https://github.com/test/plugin",
  npmSpec: "opencode-plugin-test@1.0.0",
  homepage: null,
  tags: [],
  installSpec: {},
  sources: [],
  bestTrust: { level: "high", score: 30 },
};

describe("TUI handlers", () => {
  it("buildScopePlan builds global and local plans with optional targetVersion", () => {
    const plan = buildScopePlan(samplePlugin, "global", emptySnapshot, "1.2.0");
    expect(plan.scope).toBe("global");
    expect(plan.configDiffs[0].newValue).toBe("opencode-plugin-test@1.2.0");
  });

  it("handleDialogKey navigates to updates on 'u' keypress in list screen", () => {
    let flowState: FlowState = {
      screen: "list",
      query: "",
      kindFilter: "all",
      selectedIndex: 0,
    };

    handleDialogKey({
      key: makeKey("u"),
      flow: flowState,
      setFlow: (next) => {
        flowState = next;
      },
      filteredItems: [samplePlugin],
      snapshot: emptySnapshot,
      refreshSnapshot: () => {},
      npmMap: {},
      fetchNpmData: async () => null,
      catalogUpdates: { updates: {}, availableUpdates: [] },
      onClose: () => {},
    });

    const screenName: string = (flowState as FlowState).screen;
    expect(screenName).toBe("updates");
  });

  it("handleDialogKey navigates to settings on 's' keypress and toggles options", () => {
    let flowState: FlowState = {
      screen: "list",
      query: "",
      kindFilter: "all",
      selectedIndex: 0,
    };

    handleDialogKey({
      key: makeKey("s"),
      flow: flowState,
      setFlow: (next) => {
        flowState = next;
      },
      filteredItems: [samplePlugin],
      snapshot: emptySnapshot,
      refreshSnapshot: () => {},
      npmMap: {},
      fetchNpmData: async () => null,
      catalogUpdates: { updates: {}, availableUpdates: [] },
      onClose: () => {},
    });

    const screenName: string = (flowState as FlowState).screen;
    expect(screenName).toBe("settings");

    let currentSettings: MercatoSettings = { ...DEFAULT_SETTINGS };
    let toastMessage = "";

    handleDialogKey({
      key: makeKey("return"),
      flow: flowState,
      setFlow: (next) => {
        flowState = next;
      },
      filteredItems: [samplePlugin],
      snapshot: emptySnapshot,
      refreshSnapshot: () => {},
      npmMap: {},
      fetchNpmData: async () => null,
      catalogUpdates: { updates: {}, availableUpdates: [] },
      settings: currentSettings,
      setSettings: (s) => {
        currentSettings = s;
      },
      showToast: (msg) => {
        toastMessage = msg;
      },
      onClose: () => {},
    });

    expect(currentSettings.autoUpdate).toBe(false);
    expect(toastMessage).toContain("Settings");
  });

  it("handleDialogKey navigates to restore on 'r' keypress in list screen", () => {
    let flowState: FlowState = {
      screen: "list",
      query: "",
      kindFilter: "all",
      selectedIndex: 0,
    };

    const mockBackup: BackupEntry = {
      id: "b1",
      filePath: "/path/bak",
      targetConfigPath: "/path/target",
      scope: "global",
      timestamp: Date.now(),
      formattedDate: "2026-08-17 12:00:00",
      sizeBytes: 10,
      kindSummary: "Backup",
    };

    handleDialogKey({
      key: makeKey("r"),
      flow: flowState,
      setFlow: (next) => {
        flowState = next;
      },
      filteredItems: [samplePlugin],
      snapshot: emptySnapshot,
      refreshSnapshot: () => {},
      npmMap: {},
      fetchNpmData: async () => null,
      catalogUpdates: { updates: {}, availableUpdates: [] },
      backups: [mockBackup],
      onClose: () => {},
    });

    const screenName: string = (flowState as FlowState).screen;
    expect(screenName).toBe("restore");
  });

  it("handleDialogKey handles escape to close in list screen", () => {
    let closed = false;
    const flowState: ListState = {
      screen: "list",
      query: "",
      kindFilter: "all",
      selectedIndex: 0,
    };

    handleDialogKey({
      key: makeKey("escape"),
      flow: flowState,
      setFlow: () => {},
      filteredItems: [samplePlugin],
      snapshot: emptySnapshot,
      refreshSnapshot: () => {},
      npmMap: {},
      fetchNpmData: async () => null,
      catalogUpdates: { updates: {}, availableUpdates: [] },
      onClose: () => {
        closed = true;
      },
    });

    expect(closed).toBe(true);
  });
});
