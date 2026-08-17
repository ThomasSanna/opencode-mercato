import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { installFile, removeFile } from "../../../src/adapters/install/copy";

describe("copy adapter", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mercato-copy-test-"));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it("installs new file and creates parent directory automatically", () => {
    const target = path.join(tmpDir, "sub", "skill", "SKILL.md");
    const res = installFile(target, "# Skill Content");

    expect(res.ok).toBe(true);
    expect(res.filePath).toBe(target);
    expect(fs.existsSync(target)).toBe(true);
    expect(fs.readFileSync(target, "utf8")).toBe("# Skill Content");
  });

  it("returns ok without backup if existing content is identical", () => {
    const target = path.join(tmpDir, "agent.md");
    fs.writeFileSync(target, "hello world\n", "utf8");

    const res = installFile(target, "hello world");
    expect(res.ok).toBe(true);
    expect(res.backupPath).toBeUndefined();
  });

  it("refuses to overwrite conflicting existing file without force", () => {
    const target = path.join(tmpDir, "conflict.md");
    fs.writeFileSync(target, "old content", "utf8");

    const res = installFile(target, "new content", false);
    expect(res.ok).toBe(false);
    expect(res.error).toContain("already exists");
    expect(fs.readFileSync(target, "utf8")).toBe("old content");
  });

  it("overwrites conflicting file with backup when force is true", () => {
    const target = path.join(tmpDir, "force.md");
    fs.writeFileSync(target, "old content", "utf8");

    const res = installFile(target, "new content", true);
    expect(res.ok).toBe(true);
    expect(res.backupPath).toBeDefined();
    expect(fs.readFileSync(target, "utf8")).toBe("new content");
    expect(fs.readFileSync(res.backupPath!, "utf8")).toBe("old content");
  });

  it("removes existing file and cleans up empty parent directory", () => {
    const nestedDir = path.join(tmpDir, "empty_parent");
    const target = path.join(nestedDir, "to_delete.md");
    fs.mkdirSync(nestedDir, { recursive: true });
    fs.writeFileSync(target, "bye", "utf8");

    expect(removeFile(target)).toBe(true);
    expect(fs.existsSync(target)).toBe(false);
    expect(fs.existsSync(nestedDir)).toBe(false);
  });

  it("returns false when removing non-existent file", () => {
    const target = path.join(tmpDir, "non_existent.md");
    expect(removeFile(target)).toBe(false);
  });
});
