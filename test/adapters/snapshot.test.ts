import { describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { writeConfigFile } from "../../src/adapters/config";
import { loadConfigSnapshot } from "../../src/adapters/snapshot";

describe("snapshot adapter", () => {
  it("extracts installed plugin names and pinned versions", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mercato-snap-"));
    const configDir = path.join(tmpDir, ".config", "opencode");
    const configFile = path.join(configDir, "opencode.json");

    writeConfigFile(configFile, {
      plugin: ["my-plugin@1.2.0", "@scope/another-plugin", "unpinned-plugin"],
      mcp: {
        git: {
          command: "npx",
          args: ["-y", "@mcp/git"],
          enabled: true,
        },
      },
    });

    const snapshot = loadConfigSnapshot({
      platform: "linux",
      env: { HOME: tmpDir },
      cwd: tmpDir,
    });

    expect(snapshot.installedPluginNames).toContain("my-plugin");
    expect(snapshot.installedPluginNames).toContain("@scope/another-plugin");
    expect(snapshot.installedPluginVersions["my-plugin"]).toBe("1.2.0");
    expect(snapshot.installedPluginVersions["@scope/another-plugin"]).toBeNull();
    expect(snapshot.configuredMcpServers["git"]).toBeDefined();
    expect(snapshot.configuredMcpServers["git"].enabled).toBe(true);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("scans files and calculates content hashes", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mercato-snap-"));
    const skillDir = path.join(tmpDir, ".opencode", "skills", "test-skill");
    fs.mkdirSync(skillDir, { recursive: true });
    const skillFile = path.join(skillDir, "SKILL.md");
    fs.writeFileSync(skillFile, "# Test Skill\nDescription here", "utf8");

    const snapshot = loadConfigSnapshot({
      platform: "linux",
      env: { HOME: tmpDir },
      cwd: tmpDir,
    });

    const normPath = skillFile.replace(/\\/g, "/");
    expect(snapshot.existingFiles).toContain(normPath);
    expect(snapshot.fileHashes[normPath]).toBeDefined();
    expect(snapshot.fileHashes[normPath]).toHaveLength(16);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
