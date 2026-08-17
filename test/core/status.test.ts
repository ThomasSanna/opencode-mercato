import { describe, expect, it } from "bun:test";
import type { ConfigSnapshot } from "../../src/adapters/snapshot";
import type { CatalogItem } from "../../src/core/model";
import { getItemStatus, getLifecycleActions } from "../../src/core/status";

function makeItem(overrides: Partial<CatalogItem> = {}): CatalogItem {
  return {
    id: "test-item",
    kind: "plugin",
    name: "Test Item",
    description: "A test description",
    repoUrl: "https://github.com/example/test",
    npmSpec: "opencode-plugin-test",
    homepage: null,
    tags: ["test"],
    installSpec: {},
    sources: [
      {
        source: "cafe",
        trust: { level: "high", score: 30 },
        rawId: "c1",
        seenAt: 1000,
      },
    ],
    bestTrust: { level: "high", score: 30 },
    ...overrides,
  };
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


describe("status core", () => {
  it("determines plugin status: not-installed, enabled, disabled", () => {
    const pluginItem = makeItem({
      kind: "plugin",
      npmSpec: "opencode-my-plugin@1.0.0",
    });

    expect(getItemStatus(pluginItem, emptySnapshot)).toBe("not-installed");

    const enabledSnapshot: ConfigSnapshot = {
      ...emptySnapshot,
      installedPluginNames: ["opencode-my-plugin"],
    };
    expect(getItemStatus(pluginItem, enabledSnapshot)).toBe("enabled");

    const disabledSnapshot: ConfigSnapshot = {
      ...emptySnapshot,
      installedPluginNames: ["opencode-my-plugin"],
      disabledPluginNames: ["opencode-my-plugin"],
    };
    expect(getItemStatus(pluginItem, disabledSnapshot)).toBe("disabled");
  });

  it("determines MCP status: not-installed, enabled, disabled", () => {
    const mcpItem = makeItem({ kind: "mcp", name: "GitHub MCP" });

    expect(getItemStatus(mcpItem, emptySnapshot)).toBe("not-installed");

    const enabledSnapshot: ConfigSnapshot = {
      ...emptySnapshot,
      configuredMcpServers: {
        "github-mcp": { enabled: true, command: "npx" },
      },
    };
    expect(getItemStatus(mcpItem, enabledSnapshot)).toBe("enabled");

    const disabledSnapshot: ConfigSnapshot = {
      ...emptySnapshot,
      configuredMcpServers: {
        "github-mcp": { enabled: false, command: "npx" },
      },
    };
    expect(getItemStatus(mcpItem, disabledSnapshot)).toBe("disabled");
  });

  it("determines skill and agent status based on file presence", () => {
    const skillItem = makeItem({ kind: "skill", name: "Helper" });
    expect(getItemStatus(skillItem, emptySnapshot)).toBe("not-installed");

    const skillSnapshot: ConfigSnapshot = {
      ...emptySnapshot,
      existingFiles: ["/home/user/.config/opencode/skills/helper/SKILL.md"],
    };
    expect(getItemStatus(skillItem, skillSnapshot)).toBe("installed");

    const agentItem = makeItem({ kind: "agent", name: "Reviewer" });
    const agentSnapshot: ConfigSnapshot = {
      ...emptySnapshot,
      existingFiles: ["/project/.opencode/agent/reviewer.md"],
    };
    expect(getItemStatus(agentItem, agentSnapshot)).toBe("installed");
  });

  it("generates correct lifecycle actions according to status", () => {
    const item = makeItem({
      kind: "plugin",
      repoUrl: "https://github.com/a/b",
      npmSpec: "pkg",
    });

    const notInstalledActions = getLifecycleActions(item, "not-installed");
    expect(notInstalledActions.map((a) => a.id)).toEqual([
      "install",
      "versions",
      "repo",
      "npm",
      "back",
    ]);

    const enabledActions = getLifecycleActions(item, "enabled");
    expect(enabledActions.map((a) => a.id)).toEqual([
      "disable",
      "uninstall",
      "versions",
      "repo",
      "npm",
      "back",
    ]);

    const disabledActions = getLifecycleActions(item, "disabled");
    expect(disabledActions.map((a) => a.id)).toEqual([
      "enable",
      "uninstall",
      "versions",
      "repo",
      "npm",
      "back",
    ]);

    const updateActions = getLifecycleActions(item, "enabled", {
      itemId: item.id,
      kind: "plugin",
      currentVersion: "1.0.0",
      latestVersion: "1.1.0",
      updateState: "update-available",
      diffType: "minor",
      autoEligible: true,
    });
    expect(updateActions[0]).toEqual({
      id: "update",
      label: "Update to v1.1.0",
    });

    const skillItem = makeItem({
      kind: "skill",
      npmSpec: null,
      repoUrl: "https://github.com/a/b",
    });
    const installedSkillActions = getLifecycleActions(skillItem, "installed");
    expect(installedSkillActions.map((a) => a.id)).toEqual([
      "uninstall",
      "repo",
      "back",
    ]);
  });
});

