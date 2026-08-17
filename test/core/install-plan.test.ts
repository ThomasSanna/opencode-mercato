import { describe, expect, it } from "bun:test";
import {
  createInstallPlan,
  extractMcpConfig,
  generateAgentContent,
  generateCommandContent,
  generateSkillContent,
  generateWarnings,
  sanitizeIdentifier,
} from "../../src/core/install-plan";
import type { CatalogItem } from "../../src/core/model";

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

describe("install-plan core", () => {
  it("sanitizeIdentifier sanitizes names into clean slug identifiers", () => {
    expect(sanitizeIdentifier("My Plugin!")).toBe("my-plugin");
    expect(sanitizeIdentifier("  @Scope / Pkg Name  ")).toBe("scope-pkg-name");
    expect(sanitizeIdentifier("---hello---world---")).toBe("hello-world");
  });

  it("extractMcpConfig derives command from installSpec or npmSpec", () => {
    const itemWithSpec = makeItem({
      kind: "mcp",
      installSpec: {
        cafe: {
          command: "uvx",
          args: ["mcp-server-git"],
          env: { FOO: "BAR" },
        },
      },
    });
    expect(extractMcpConfig(itemWithSpec)).toEqual({
      command: "uvx",
      args: ["mcp-server-git"],
      env: { FOO: "BAR" },
      type: undefined,
    });

    const itemNpm = makeItem({
      kind: "mcp",
      npmSpec: "@modelcontextprotocol/server-postgres",
    });
    expect(extractMcpConfig(itemNpm)).toEqual({
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-postgres"],
    });
  });

  it("generates markdown content with frontmatter for skills and agents", () => {
    const skillItem = makeItem({
      kind: "skill",
      name: "Commit Helper",
      description: "Generates commit messages",
    });
    const skillContent = generateSkillContent(skillItem);
    expect(skillContent).toContain("name: commit-helper");
    expect(skillContent).toContain("description: Generates commit messages");
    expect(skillContent).toContain("# Commit Helper");

    const agentItem = makeItem({
      kind: "agent",
      name: "Reviewer",
      description: "Reviews code changes",
    });
    const agentContent = generateAgentContent(agentItem);
    expect(agentContent).toContain("name: reviewer");
    expect(agentContent).toContain("You are the Reviewer agent.");

    const cmdItem = makeItem({
      kind: "command",
      name: "Deploy",
      description: "Deploys the app",
    });
    const cmdContent = generateCommandContent(cmdItem);
    expect(cmdContent).toContain("# Deploy");
  });

  it("generateWarnings flags low trust and kind-specific security cautions", () => {
    const highTrustPlugin = makeItem({
      kind: "plugin",
      bestTrust: { level: "high", score: 30 },
    });
    const w1 = generateWarnings(highTrustPlugin);
    expect(w1.some((w) => w.title === "Plugin Execution")).toBe(true);
    expect(w1.some((w) => w.title === "Community Extension")).toBe(false);

    const lowTrustMcp = makeItem({
      kind: "mcp",
      bestTrust: { level: "medium", score: 20 },
      npmSpec: "mcp-pkg",
    });
    const w2 = generateWarnings(lowTrustMcp);
    expect(w2.some((w) => w.title === "Community Extension")).toBe(true);
    expect(w2.some((w) => w.title === "MCP Command Execution")).toBe(true);
    expect(w2.find((w) => w.title === "MCP Command Execution")?.message).toContain(
      "npx -y mcp-pkg"
    );
  });

  it("creates install plan for plugin: no conflict, identical, and version conflict", () => {
    const item = makeItem({ kind: "plugin", npmSpec: "opencode-foo@1.0.0" });

    // Scenario 1: Clean install
    const plan1 = createInstallPlan(item, "global", {
      targetConfigPath: "/path/opencode.json",
      baseDir: "/path",
      existingConfig: {},
    });
    expect(plan1.conflict).toBe("none");
    expect(plan1.configDiffs).toEqual([
      {
        path: "plugin",
        action: "add",
        oldValue: undefined,
        newValue: "opencode-foo@1.0.0",
      },
    ]);

    // Scenario 2: Identical install
    const plan2 = createInstallPlan(item, "global", {
      targetConfigPath: "/path/opencode.json",
      baseDir: "/path",
      existingConfig: { plugin: ["opencode-foo@1.0.0"] },
    });
    expect(plan2.conflict).toBe("identical");

    // Scenario 3: Version conflict
    const plan3 = createInstallPlan(item, "global", {
      targetConfigPath: "/path/opencode.json",
      baseDir: "/path",
      existingConfig: { plugin: ["opencode-foo@0.9.0"] },
    });
    expect(plan3.conflict).toBe("conflict");
    expect(plan3.configDiffs[0].action).toBe("replace");
    expect(plan3.configDiffs[0].oldValue).toBe("opencode-foo@0.9.0");
  });

  it("creates install plan for MCP server", () => {
    const item = makeItem({
      kind: "mcp",
      name: "GitHub",
      npmSpec: "@modelcontextprotocol/server-github",
    });

    const plan = createInstallPlan(item, "local", {
      targetConfigPath: "/local/opencode.json",
      baseDir: "/local/.opencode",
      existingConfig: {},
    });

    expect(plan.scope).toBe("local");
    expect(plan.configDiffs[0].path).toBe("mcp.github");
    expect(plan.configDiffs[0].newValue).toEqual({
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-github"],
    });
  });

  it("creates install plan for skill with file existence and conflict check", () => {
    const item = makeItem({
      kind: "skill",
      name: "Test Skill",
      description: "Skill for testing",
    });

    // File doesn't exist
    const plan1 = createInstallPlan(item, "local", {
      targetConfigPath: "/local/opencode.json",
      baseDir: "/local/.opencode",
      existingConfig: {},
      checkFileExists: () => ({ exists: false }),
    });
    expect(plan1.conflict).toBe("none");
    expect(plan1.targetFiles.length).toBe(1);
    expect(plan1.targetFiles[0].action).toBe("create");
    expect(plan1.targetFiles[0].filePath).toBe("/local/.opencode/skills/test-skill/SKILL.md");

    // File exists with differing content
    const plan2 = createInstallPlan(item, "local", {
      targetConfigPath: "/local/opencode.json",
      baseDir: "/local/.opencode",
      existingConfig: {},
      checkFileExists: () => ({ exists: true, content: "different content" }),
    });
    expect(plan2.conflict).toBe("conflict");
    expect(plan2.targetFiles[0].action).toBe("update");
  });

  it("creates install plan for theme", () => {
    const item = makeItem({ kind: "theme", name: "tokyonight" });

    const plan = createInstallPlan(item, "global", {
      targetConfigPath: "/global/opencode.json",
      baseDir: "/global",
      existingConfig: { theme: "nord" },
    });

    expect(plan.conflict).toBe("conflict");
    expect(plan.configDiffs[0].path).toBe("theme");
    expect(plan.configDiffs[0].oldValue).toBe("nord");
    expect(plan.configDiffs[0].newValue).toBe("tokyonight");
  });

  it("handles targetVersion option for plugin update and downgrade", () => {
    const item = makeItem({
      kind: "plugin",
      npmSpec: "opencode-plugin-test@1.0.0",
    });

    // Upgrading or downgrading from currently installed version
    const plan = createInstallPlan(
      item,
      "global",
      {
        targetConfigPath: "/global/opencode.json",
        baseDir: "/global",
        existingConfig: { plugin: ["opencode-plugin-test@1.0.0"] },
      },
      { targetVersion: "1.2.0" }
    );

    expect(plan.conflict).toBe("none");
    expect(plan.configDiffs[0].action).toBe("replace");
    expect(plan.configDiffs[0].oldValue).toBe("opencode-plugin-test@1.0.0");
    expect(plan.configDiffs[0].newValue).toBe("opencode-plugin-test@1.2.0");
    expect(plan.summary).toContain("Update plugin from \"opencode-plugin-test@1.0.0\" to \"opencode-plugin-test@1.2.0\"");
  });

  it("handles scoped package names (@scope/pkg@ver) properly in install plans", () => {
    const item = makeItem({
      kind: "plugin",
      name: "@scope/pkg",
      npmSpec: "@scope/pkg@1.0.0",
    });

    const plan = createInstallPlan(
      item,
      "global",
      {
        targetConfigPath: "/global/opencode.json",
        baseDir: "/global",
        existingConfig: { plugin: ["@scope/pkg@1.0.0"] },
      },
      { targetVersion: "2.0.0" }
    );

    expect(plan.conflict).toBe("none");
    expect(plan.configDiffs[0].action).toBe("replace");
    expect(plan.configDiffs[0].oldValue).toBe("@scope/pkg@1.0.0");
    expect(plan.configDiffs[0].newValue).toBe("@scope/pkg@2.0.0");
  });
});

