import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  getSettingsFilePath,
  loadSettings,
  saveSettings,
} from "../../src/adapters/settings";
import { DEFAULT_SETTINGS } from "../../src/core/settings";

describe("settings adapter", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mercato-settings-test-"));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it("resolves default and custom settings file paths", () => {
    const defaultPath = getSettingsFilePath({
      platform: "linux",
      env: { HOME: tmpDir },
    });
    expect(defaultPath).toBe(path.join(tmpDir, ".config", "opencode", "mercato.json"));

    const customPath = getSettingsFilePath({
      customPath: path.join(tmpDir, "custom-settings.json"),
    });
    expect(customPath).toBe(path.join(tmpDir, "custom-settings.json"));
  });

  it("returns default settings when file does not exist or is empty", () => {
    const customPath = path.join(tmpDir, "non-existent.json");
    expect(loadSettings({ customPath })).toEqual(DEFAULT_SETTINGS);

    fs.writeFileSync(customPath, "   \n", "utf8");
    expect(loadSettings({ customPath })).toEqual(DEFAULT_SETTINGS);
  });

  it("safely falls back to defaults if file contains malformed JSON", () => {
    const customPath = path.join(tmpDir, "malformed.json");
    fs.writeFileSync(customPath, "{ not json }", "utf8");
    expect(loadSettings({ customPath })).toEqual(DEFAULT_SETTINGS);
  });

  it("saves settings atomically and reloads them accurately", () => {
    const customPath = path.join(tmpDir, "sub", "mercato.json");
    const newSettings = {
      ...DEFAULT_SETTINGS,
      autoUpdate: false,
      cacheTtlHours: 12,
      defaultScope: "local" as const,
    };

    saveSettings(newSettings, { customPath });
    expect(fs.existsSync(customPath)).toBe(true);

    const loaded = loadSettings({ customPath });
    expect(loaded).toEqual(newSettings);
  });
});
