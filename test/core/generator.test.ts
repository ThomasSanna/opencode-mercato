import { describe, expect, it } from "bun:test";
import {
  extractMcpConfig,
  generateAgentContent,
  generateCommandContent,
  generateSkillContent,
  generateWarnings,
  sanitizeIdentifier,
} from "../../src/core/generator";
import type { CatalogItem } from "../../src/core/model";

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

const sampleMcp: CatalogItem = {
  id: "sqlite-mcp",
  kind: "mcp",
  name: "sqlite-mcp",
  description: "SQLite MCP server",
  repoUrl: "https://github.com/test/sqlite-mcp",
  npmSpec: null,
  homepage: null,
  tags: [],
  installSpec: {
    cafe: {
      command: "uvx",
      args: ["mcp-server-sqlite", "--db-path", "test.db"],
    },
  },
  sources: [{ source: "cafe", trust: { level: "high", score: 30 }, rawId: "1", seenAt: 100 }],
  bestTrust: { level: "high", score: 30 },
};

describe("generator core", () => {
  it("sanitizeIdentifier produces clean kebab-case names", () => {
    expect(sanitizeIdentifier("My Awesome Plugin!")).toBe("my-awesome-plugin");
    expect(sanitizeIdentifier("  @scope/name  ")).toBe("scope-name");
  });

  it("extractMcpConfig parses installSpec command and args", () => {
    const config = extractMcpConfig(sampleMcp);
    expect(config.command).toBe("uvx");
    expect(config.args).toEqual(["mcp-server-sqlite", "--db-path", "test.db"]);
  });

  it("generates skill, agent, and command markdown files", () => {
    const skillMd = generateSkillContent(samplePlugin);
    expect(skillMd).toContain("---");
    expect(skillMd).toContain("name: opencode-plugin-test");

    const agentMd = generateAgentContent(samplePlugin);
    expect(agentMd).toContain("name: opencode-plugin-test");
    expect(agentMd).toContain("You are the opencode-plugin-test agent.");

    const cmdMd = generateCommandContent(samplePlugin);
    expect(cmdMd).toContain("# opencode-plugin-test");
  });

  it("generates appropriate warnings for community and executable extensions", () => {
    const warnings = generateWarnings(sampleMcp);
    expect(warnings.some((w) => w.severity === "caution")).toBe(true);
  });
});
