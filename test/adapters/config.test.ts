import { describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  addMcpToConfig,
  addPluginToConfig,
  extractPackageName,
  extractPackageVersion,
  isMcpInConfig,
  isPluginInConfig,
  readConfigFile,
  removeMcpFromConfig,
  removePluginFromConfig,
  removeThemeFromConfig,
  setThemeInConfig,
  writeConfigFile,
} from "../../src/adapters/config";

describe("config adapter", () => {
  it("extractPackageName handles scoped and unscoped packages with and without versions", () => {
    expect(extractPackageName("my-plugin")).toBe("my-plugin");
    expect(extractPackageName("my-plugin@1.2.3")).toBe("my-plugin");
    expect(extractPackageName("@scope/my-plugin")).toBe("@scope/my-plugin");
    expect(extractPackageName("@scope/my-plugin@2.0.0-beta.1")).toBe("@scope/my-plugin");
  });

  it("extractPackageVersion handles scoped and unscoped packages", () => {
    expect(extractPackageVersion("my-plugin")).toBeNull();
    expect(extractPackageVersion("my-plugin@1.2.3")).toBe("1.2.3");
    expect(extractPackageVersion("@scope/my-plugin")).toBeNull();
    expect(extractPackageVersion("@scope/my-plugin@2.0.0-beta.1")).toBe("2.0.0-beta.1");
  });


  it("reads empty object if file does not exist", () => {
    const tmp = path.join(os.tmpdir(), `nonexistent-${Date.now()}.json`);
    expect(readConfigFile(tmp)).toEqual({});
  });

  it("reads and parses JSONC file with comments", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mercato-cfg-"));
    const filePath = path.join(tmpDir, "opencode.json");
    const jsoncContent = `
    // User configuration
    {
      "theme": "tokyonight",
      /* active plugins */
      "plugin": [
        "opencode-plugin-test"
      ]
    }
    `;
    fs.writeFileSync(filePath, jsoncContent, "utf8");

    const config = readConfigFile(filePath);
    expect(config.theme).toBe("tokyonight");
    expect(config.plugin).toEqual(["opencode-plugin-test"]);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("writes config atomically and creates a .bak file when target exists", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mercato-cfg-"));
    const filePath = path.join(tmpDir, "opencode.json");

    // First write
    const initialConfig = { theme: "initial" };
    const res1 = writeConfigFile(filePath, initialConfig);
    expect(res1.backupPath).toBeUndefined();
    expect(fs.existsSync(filePath)).toBe(true);

    // Second write (updates and creates backup)
    const updatedConfig = { theme: "updated" };
    const res2 = writeConfigFile(filePath, updatedConfig);
    expect(res2.backupPath).toBe(`${filePath}.bak`);
    expect(fs.existsSync(res2.backupPath!)).toBe(true);

    const bakContent = readConfigFile(res2.backupPath!);
    expect(bakContent.theme).toBe("initial");

    const newContent = readConfigFile(filePath);
    expect(newContent.theme).toBe("updated");

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("manages plugins: add, isPluginInConfig, update version, remove", () => {
    const config: Record<string, any> = {};

    expect(isPluginInConfig(config, "opencode-foo")).toBe(false);

    // Add plugin
    addPluginToConfig(config, "opencode-foo@1.0.0");
    expect(isPluginInConfig(config, "opencode-foo")).toBe(true);
    expect(isPluginInConfig(config, "opencode-foo@1.0.0")).toBe(true);
    expect(config.plugin).toEqual(["opencode-foo@1.0.0"]);

    // Update version
    addPluginToConfig(config, "opencode-foo@2.0.0");
    expect(config.plugin).toEqual(["opencode-foo@2.0.0"]);

    // Add another plugin
    addPluginToConfig(config, "@scope/bar@0.1.0");
    expect(config.plugin.length).toBe(2);

    // Remove first plugin
    const removed = removePluginFromConfig(config, "opencode-foo");
    expect(removed).toBe(true);
    expect(config.plugin).toEqual(["@scope/bar@0.1.0"]);
    expect(isPluginInConfig(config, "opencode-foo")).toBe(false);
  });

  it("manages MCP servers: add, isMcpInConfig, remove", () => {
    const config: Record<string, any> = {};

    expect(isMcpInConfig(config, "github")).toBe(false);

    const serverDef = {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-github"],
      env: { GITHUB_TOKEN: "abc" },
    };

    addMcpToConfig(config, "github", serverDef);
    expect(isMcpInConfig(config, "github")).toBe(true);
    expect(config.mcp.github.command).toBe("npx");

    const removed = removeMcpFromConfig(config, "github");
    expect(removed).toBe(true);
    expect(isMcpInConfig(config, "github")).toBe(false);
  });

  it("manages theme: set, remove", () => {
    const config: Record<string, any> = {};
    setThemeInConfig(config, "nord");
    expect(config.theme).toBe("nord");

    const removed = removeThemeFromConfig(config);
    expect(removed).toBe(true);
    expect(config.theme).toBeUndefined();
  });
});
