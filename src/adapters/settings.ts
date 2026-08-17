import * as fs from "node:fs";
import * as path from "node:path";
import {
  DEFAULT_SETTINGS,
  parseSettings,
  type MercatoSettings,
} from "../core/settings";
import { getGlobalConfigDir, type PathResolutionOptions } from "./paths";

export interface SettingsAdapterOptions extends PathResolutionOptions {
  customPath?: string;
}

/**
 * Returns the path to the persistent mercato.json settings file.
 */
export function getSettingsFilePath(options: SettingsAdapterOptions = {}): string {
  if (options.customPath) {
    return options.customPath;
  }
  return path.join(getGlobalConfigDir(options), "mercato.json");
}

/**
 * Loads and parses Mercato settings from disk, safely falling back to defaults.
 */
export function loadSettings(options: SettingsAdapterOptions = {}): MercatoSettings {
  const filePath = getSettingsFilePath(options);
  if (!fs.existsSync(filePath)) {
    return { ...DEFAULT_SETTINGS };
  }

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    if (!raw.trim()) {
      return { ...DEFAULT_SETTINGS };
    }
    const parsed = JSON.parse(raw);
    return parseSettings(parsed);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Persists Mercato settings to disk atomically.
 */
export function saveSettings(
  settings: MercatoSettings,
  options: SettingsAdapterOptions = {}
): void {
  const filePath = getSettingsFilePath(options);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const content = JSON.stringify(settings, null, 2) + "\n";
  const tempPath = `${filePath}.tmp.${process.pid}.${Date.now()}`;

  try {
    fs.writeFileSync(tempPath, content, "utf8");
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch {
        // ignore cleanup failure
      }
    }
    throw new Error(
      `Failed to save Mercato settings to "${filePath}": ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
}
