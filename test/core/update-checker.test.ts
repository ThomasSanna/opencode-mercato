import { describe, expect, it } from "bun:test";
import type { ConfigSnapshot } from "../../src/adapters/snapshot";
import type { CatalogItem } from "../../src/core/model";
import { evaluateCatalogUpdates } from "../../src/core/update-checker";
import { computeContentHash } from "../../src/core/versions";

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

const pluginItem: CatalogItem = {
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

const skillItem: CatalogItem = {
  id: "test-skill",
  kind: "skill",
  name: "test-skill",
  description: "Test skill",
  repoUrl: "https://github.com/test/skill",
  npmSpec: null,
  homepage: null,
  tags: [],
  installSpec: {},
  sources: [],
  bestTrust: { level: "medium", score: 20 },
};

describe("update-checker core", () => {
  it("evaluates plugin updates when installed and latest version is higher", () => {
    const snapshot: ConfigSnapshot = {
      ...emptySnapshot,
      installedPluginNames: ["opencode-plugin-test"],
      installedPluginVersions: { "opencode-plugin-test": "1.0.0" },
    };

    const npmMap = {
      "opencode-plugin-test": { latest: "1.1.0" },
    };

    const res = evaluateCatalogUpdates([pluginItem], snapshot, npmMap);
    expect(res.availableUpdates.length).toBe(1);
    expect(res.availableUpdates[0].item.id).toBe("opencode-plugin-test");
    expect(res.availableUpdates[0].info.updateState).toBe("update-available");
    expect(res.availableUpdates[0].info.diffType).toBe("minor");
  });

  it("evaluates skill updates based on content hashes", () => {
    const skillPath = "/local/.opencode/skills/test-skill/skill.md";
    const snapshot: ConfigSnapshot = {
      ...emptySnapshot,
      existingFiles: [skillPath],
      fileHashes: {
        [skillPath]: computeContentHash("old outdated content"),
      },
    };

    const res = evaluateCatalogUpdates([skillItem], snapshot);
    expect(res.availableUpdates.length).toBe(1);
    expect(res.availableUpdates[0].item.id).toBe("test-skill");
    expect(res.availableUpdates[0].info.diffType).toBe("content");
  });

  it("returns empty availableUpdates when all installed items are up-to-date", () => {
    const snapshot: ConfigSnapshot = {
      ...emptySnapshot,
      installedPluginNames: ["opencode-plugin-test"],
      installedPluginVersions: { "opencode-plugin-test": "1.1.0" },
    };

    const npmMap = {
      "opencode-plugin-test": { latest: "1.1.0" },
    };

    const res = evaluateCatalogUpdates([pluginItem], snapshot, npmMap);
    expect(res.availableUpdates.length).toBe(0);
    expect(res.updates["opencode-plugin-test"].updateState).toBe("up-to-date");
  });
});
