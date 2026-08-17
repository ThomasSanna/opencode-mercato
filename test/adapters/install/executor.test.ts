import { describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { readConfigFile } from "../../../src/adapters/config";
import {
  executeInstallPlan,
  executeToggleMcp,
  executeUninstall,
} from "../../../src/adapters/install/executor";
import { createInstallPlan } from "../../../src/core/install-plan";
import type { CatalogItem } from "../../../src/core/model";

function makeItem(overrides: Partial<CatalogItem> = {}): CatalogItem {
  return {
    id: "test-plugin",
    kind: "plugin",
    name: "Test Plugin",
    description: "A test plugin",
    repoUrl: "https://github.com/example/test",
    npmSpec: "opencode-plugin-test@1.0.0",
    homepage: null,
    tags: ["plugin"],
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

describe("executor adapter", () => {
  it("executes install plan for plugin and updates config atomically", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mercato-exec-"));
    const configPath = path.join(tmpDir, "opencode.json");

    const item = makeItem({ kind: "plugin", npmSpec: "opencode-plugin-test@1.0.0" });
    const plan = createInstallPlan(item, "global", {
      targetConfigPath: configPath,
      baseDir: tmpDir,
      existingConfig: {},
    });

    const result = executeInstallPlan(plan);
    expect(result.ok).toBe(true);
    expect(fs.existsSync(configPath)).toBe(true);

    const savedConfig = readConfigFile(configPath);
    expect(savedConfig.plugin).toEqual(["opencode-plugin-test@1.0.0"]);

    // Uninstall
    const uninstRes = executeUninstall(item, "global", {
      env: { HOME: tmpDir },
      platform: "linux",
      cwd: tmpDir,
    });
    // config path in uninst uses paths resolver with HOME
    const customConfig = readConfigFile(configPath);
    expect(customConfig.plugin).toBeDefined();

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("executes install plan for MCP and supports toggle", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mercato-exec-"));
    const configPath = path.join(tmpDir, ".config", "opencode", "opencode.json");

    const item = makeItem({
      kind: "mcp",
      name: "postgres",
      npmSpec: "@modelcontextprotocol/server-postgres",
    });

    const plan = createInstallPlan(item, "global", {
      targetConfigPath: configPath,
      baseDir: path.join(tmpDir, ".config", "opencode"),
      existingConfig: {},
    });

    const result = executeInstallPlan(plan);
    expect(result.ok).toBe(true);

    const savedConfig = readConfigFile(configPath);
    expect(savedConfig.mcp.postgres.command).toBe("npx");

    // Toggle enabled state
    const toggleRes = executeToggleMcp(item, false, "global", {
      env: { HOME: tmpDir },
      platform: "linux",
    });
    expect(toggleRes.ok).toBe(true);

    const updatedConfig = readConfigFile(configPath);
    expect(updatedConfig.mcp.postgres.enabled).toBe(false);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("executes install plan for skill, writing SKILL.md atomically", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mercato-exec-"));
    const item = makeItem({
      kind: "skill",
      name: "commit-msg",
      description: "Generate commit message",
    });

    const plan = createInstallPlan(item, "local", {
      targetConfigPath: path.join(tmpDir, "opencode.json"),
      baseDir: tmpDir,
      existingConfig: {},
    });

    const result = executeInstallPlan(plan);
    expect(result.ok).toBe(true);

    const skillPath = path.join(tmpDir, "skills", "commit-msg", "SKILL.md");
    expect(fs.existsSync(skillPath)).toBe(true);
    const content = fs.readFileSync(skillPath, "utf8");
    expect(content).toContain("Generate commit message");

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("refuses installation on conflict without force flag", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mercato-exec-"));
    const configPath = path.join(tmpDir, "opencode.json");

    const item = makeItem({ kind: "plugin", npmSpec: "opencode-foo@2.0.0" });
    const plan = createInstallPlan(item, "global", {
      targetConfigPath: configPath,
      baseDir: tmpDir,
      existingConfig: { plugin: ["opencode-foo@1.0.0"] },
    });

    expect(plan.conflict).toBe("conflict");

    const resNoForce = executeInstallPlan(plan, { force: false });
    expect(resNoForce.ok).toBe(false);
    expect(resNoForce.error).toBe("CONFLICT");

    const resForce = executeInstallPlan(plan, { force: true });
    expect(resForce.ok).toBe(true);

    const updated = readConfigFile(configPath);
    expect(updated.plugin).toEqual(["opencode-foo@2.0.0"]);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
