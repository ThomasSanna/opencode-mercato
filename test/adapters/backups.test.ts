import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  listBackups,
  restoreBackup,
  type BackupEntry,
} from "../../src/adapters/backups";

describe("backups adapter", () => {
  let tmpDir: string;
  let globalDir: string;
  let localDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mercato-backups-test-"));
    globalDir = path.join(tmpDir, "global");
    localDir = path.join(tmpDir, "local");
    fs.mkdirSync(globalDir, { recursive: true });
    fs.mkdirSync(localDir, { recursive: true });
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it("lists empty when no backup files exist", () => {
    const backups = listBackups({
      cwd: localDir,
      env: { APPDATA: globalDir, HOME: globalDir },
      platform: "linux",
    });
    expect(backups).toEqual([]);
  });

  it("discovers standard and custom backup files sorted by timestamp", () => {
    const globalBak = path.join(globalDir, ".config", "opencode", "opencode.json.bak");
    fs.mkdirSync(path.dirname(globalBak), { recursive: true });
    fs.writeFileSync(globalBak, JSON.stringify({ plugin: ["old-plugin"] }), "utf8");

    const localBak = path.join(localDir, "opencode.json.bak");
    fs.writeFileSync(localBak, JSON.stringify({ plugin: ["local-plugin"] }), "utf8");

    const backups = listBackups({
      cwd: localDir,
      env: { HOME: globalDir },
      platform: "linux",
    });

    expect(backups.length).toBe(2);
    expect(backups.map((b) => b.scope)).toContain("global");
    expect(backups.map((b) => b.scope)).toContain("local");
  });

  it("restores backup atomically and creates a safety pre-restore backup", () => {
    const targetPath = path.join(localDir, "opencode.json");
    const backupPath = path.join(localDir, "opencode.json.bak");

    fs.writeFileSync(targetPath, JSON.stringify({ plugin: ["corrupted"] }), "utf8");
    fs.writeFileSync(backupPath, JSON.stringify({ plugin: ["healthy"] }), "utf8");

    const entry: BackupEntry = {
      id: "test-backup",
      filePath: backupPath,
      targetConfigPath: targetPath,
      scope: "local",
      timestamp: Date.now(),
      formattedDate: "2026-08-17 12:00:00",
      sizeBytes: 30,
      kindSummary: "Local Config",
    };

    const res = restoreBackup(entry);
    expect(res.success).toBe(true);
    expect(res.previousBackupPath).toBeDefined();
    expect(fs.existsSync(res.previousBackupPath!)).toBe(true);

    const restoredContent = JSON.parse(fs.readFileSync(targetPath, "utf8"));
    expect(restoredContent).toEqual({ plugin: ["healthy"] });
  });

  it("handles non-existent backup file safely", () => {
    const nonExistent = path.join(localDir, "missing.bak");
    const res = restoreBackup(nonExistent);
    expect(res.success).toBe(false);
    expect(res.message).toContain("does not exist");
  });
});
