import { describe, expect, test } from "bun:test";
import { testRender } from "@opentui/solid";
import { KeyEvent } from "@opentui/core";
import type { BackupEntry } from "../../src/adapters/backups";
import type { ConfigSnapshot } from "../../src/adapters/snapshot";
import type { CatalogItem } from "../../src/core/model";
import { DEFAULT_SETTINGS } from "../../src/core/settings";
import { MercatoDialog } from "../../src/tui/dialog";

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

const mockItems: CatalogItem[] = [
  {
    id: "https://github.com/foo/bar",
    kind: "plugin",
    name: "bar-plugin",
    description: "A wonderful plugin",
    repoUrl: "https://github.com/foo/bar",
    npmSpec: "opencode-bar",
    homepage: "https://bar.dev",
    tags: ["git", "tools"],
    installSpec: { cafe: {} },
    sources: [
      {
        source: "cafe",
        trust: { level: "high", score: 30 },
        rawId: "bar-plugin",
        seenAt: 1000,
      },
    ],
    bestTrust: { level: "high", score: 30 },
  },
  {
    id: "https://github.com/foo/mcp-server",
    kind: "mcp",
    name: "server-mcp",
    description: "MCP server description",
    repoUrl: "https://github.com/foo/mcp-server",
    npmSpec: null,
    homepage: null,
    tags: ["mcp"],
    installSpec: { awesome: {} },
    sources: [
      {
        source: "awesome",
        trust: { level: "medium", score: 20 },
        rawId: "server-mcp",
        seenAt: 1000,
      },
    ],
    bestTrust: { level: "medium", score: 20 },
  },
];

const mockBackup: BackupEntry = {
  id: "b1",
  filePath: "/path/bak",
  targetConfigPath: "/path/target",
  scope: "global",
  timestamp: Date.now(),
  formattedDate: "2026-08-17 12:00:00",
  sizeBytes: 10,
  kindSummary: "Global Backup",
};

describe("MercatoDialog component", () => {
  test("renders initial list screen with provided items", async () => {
    let closed = false;
    let toastMessage = "";

    const rendered = await testRender(() => (
      <MercatoDialog
        onClose={() => {
          closed = true;
        }}
        showToast={(msg) => {
          toastMessage = msg;
        }}
        initialItems={mockItems}
        initialStale={false}
        initialSnapshot={emptySnapshot}
        initialSettings={DEFAULT_SETTINGS}
        initialBackups={[mockBackup]}
      />
    ));

    expect(rendered).toBeDefined();
    expect(closed).toBe(false);
  });

  test("handles key events on the dialog", async () => {
    let closed = false;
    let toastMsg = "";

    const rendered = await testRender(() => (
      <MercatoDialog
        onClose={() => {
          closed = true;
        }}
        showToast={(msg) => {
          toastMsg = msg;
        }}
        initialItems={mockItems}
        initialSnapshot={emptySnapshot}
        initialSettings={DEFAULT_SETTINGS}
        initialBackups={[mockBackup]}
      />
    ));

    expect(rendered).toBeDefined();

    rendered.renderer.keyInput.emit("keypress", makeKey("down"));
    rendered.renderer.keyInput.emit("keypress", makeKey("tab"));
    rendered.renderer.keyInput.emit("keypress", makeKey("b"));
    rendered.renderer.keyInput.emit("keypress", makeKey("backspace"));
    rendered.renderer.keyInput.emit("keypress", makeKey("enter"));
    rendered.renderer.keyInput.emit("keypress", makeKey("escape"));
  });

  test("handles settings and restore transitions via keypress", async () => {
    const rendered = await testRender(() => (
      <MercatoDialog
        onClose={() => {}}
        initialItems={mockItems}
        initialSnapshot={emptySnapshot}
        initialSettings={DEFAULT_SETTINGS}
        initialBackups={[mockBackup]}
      />
    ));

    expect(rendered).toBeDefined();

    // Navigate to settings with 's'
    rendered.renderer.keyInput.emit("keypress", makeKey("s"));
    rendered.renderer.keyInput.emit("keypress", makeKey("return"));
    rendered.renderer.keyInput.emit("keypress", makeKey("escape"));

    // Navigate to restore with 'r'
    rendered.renderer.keyInput.emit("keypress", makeKey("r"));
    rendered.renderer.keyInput.emit("keypress", makeKey("escape"));
  });
});
