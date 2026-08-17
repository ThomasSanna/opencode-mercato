import type { InstallScope } from "./install-plan";

export interface MercatoSettings {
  autoUpdate: boolean;
  autoUpdateMajor: boolean;
  cacheTtlHours: number;
  defaultScope: InstallScope;
  checkUpdatesOnOpen: boolean;
  replaceNativeManager: boolean;
}

export const DEFAULT_SETTINGS: MercatoSettings = {
  autoUpdate: true,
  autoUpdateMajor: false,
  cacheTtlHours: 24,
  defaultScope: "global",
  checkUpdatesOnOpen: true,
  replaceNativeManager: true,
};

export const CACHE_TTL_OPTIONS: readonly number[] = [6, 12, 24, 48];

export interface SettingDefinition {
  key: keyof MercatoSettings;
  label: string;
  description: string;
  type: "boolean" | "cycle";
  options?: readonly unknown[];
}

export const SETTING_DEFINITIONS: readonly SettingDefinition[] = [
  {
    key: "autoUpdate",
    label: "Auto-Update (Patch & Minor)",
    description:
      "Automatically mark safe patch and minor updates as eligible for installation.",
    type: "boolean",
  },
  {
    key: "autoUpdateMajor",
    label: "Auto-Update (Major)",
    description:
      "Include major version breaking changes in automatic update eligibility.",
    type: "boolean",
  },
  {
    key: "cacheTtlHours",
    label: "Catalog Cache TTL",
    description:
      "Duration in hours before the offline catalog cache is considered stale.",
    type: "cycle",
    options: CACHE_TTL_OPTIONS,
  },
  {
    key: "defaultScope",
    label: "Default Install Scope",
    description:
      "Default target configuration: Global (%APPDATA%/~/.config) or Local project (.opencode).",
    type: "cycle",
    options: ["global", "local"] as const,
  },
  {
    key: "checkUpdatesOnOpen",
    label: "Check Updates on Open",
    description:
      "Automatically query NPM metadata for installed extensions when opening Mercato.",
    type: "boolean",
  },
  {
    key: "replaceNativeManager",
    label: "Replace Native Plugin Manager",
    description:
      "Deactivate internal:plugin-manager and handle extension management entirely.",
    type: "boolean",
  },
];

/**
 * Validates and parses raw settings input into a typed MercatoSettings object,
 * safely falling back to defaults for missing or invalid properties.
 */
export function parseSettings(raw: unknown): MercatoSettings {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_SETTINGS };
  }

  const obj = raw as Record<string, unknown>;

  const autoUpdate =
    typeof obj.autoUpdate === "boolean"
      ? obj.autoUpdate
      : DEFAULT_SETTINGS.autoUpdate;

  const autoUpdateMajor =
    typeof obj.autoUpdateMajor === "boolean"
      ? obj.autoUpdateMajor
      : DEFAULT_SETTINGS.autoUpdateMajor;

  const cacheTtlHours =
    typeof obj.cacheTtlHours === "number" &&
    Number.isFinite(obj.cacheTtlHours) &&
    obj.cacheTtlHours > 0
      ? obj.cacheTtlHours
      : DEFAULT_SETTINGS.cacheTtlHours;

  const defaultScope: InstallScope =
    obj.defaultScope === "local" || obj.defaultScope === "global"
      ? obj.defaultScope
      : DEFAULT_SETTINGS.defaultScope;

  const checkUpdatesOnOpen =
    typeof obj.checkUpdatesOnOpen === "boolean"
      ? obj.checkUpdatesOnOpen
      : DEFAULT_SETTINGS.checkUpdatesOnOpen;

  const replaceNativeManager =
    typeof obj.replaceNativeManager === "boolean"
      ? obj.replaceNativeManager
      : DEFAULT_SETTINGS.replaceNativeManager;

  return {
    autoUpdate,
    autoUpdateMajor,
    cacheTtlHours,
    defaultScope,
    checkUpdatesOnOpen,
    replaceNativeManager,
  };
}

/**
 * Merges partial settings overrides onto an existing base settings object.
 */
export function mergeSettings(
  base: MercatoSettings,
  overrides: Partial<MercatoSettings>
): MercatoSettings {
  return parseSettings({
    ...base,
    ...overrides,
  });
}

/**
 * Toggles a boolean setting or cycles through discrete options for a non-boolean setting.
 */
export function toggleOrCycleSetting(
  settings: MercatoSettings,
  key: keyof MercatoSettings
): MercatoSettings {
  switch (key) {
    case "autoUpdate":
      return { ...settings, autoUpdate: !settings.autoUpdate };
    case "autoUpdateMajor":
      return { ...settings, autoUpdateMajor: !settings.autoUpdateMajor };
    case "checkUpdatesOnOpen":
      return { ...settings, checkUpdatesOnOpen: !settings.checkUpdatesOnOpen };
    case "replaceNativeManager":
      return {
        ...settings,
        replaceNativeManager: !settings.replaceNativeManager,
      };
    case "defaultScope":
      return {
        ...settings,
        defaultScope: settings.defaultScope === "global" ? "local" : "global",
      };
    case "cacheTtlHours": {
      const idx = CACHE_TTL_OPTIONS.indexOf(settings.cacheTtlHours);
      const nextIdx =
        idx === -1 ? 0 : (idx + 1) % CACHE_TTL_OPTIONS.length;
      return { ...settings, cacheTtlHours: CACHE_TTL_OPTIONS[nextIdx]! };
    }
  }
}

/**
 * Formats a setting value for human-readable display in the TUI.
 */
export function formatSettingValue(
  settings: MercatoSettings,
  key: keyof MercatoSettings
): string {
  const val = settings[key];
  if (typeof val === "boolean") {
    return val ? "ON" : "OFF";
  }
  if (key === "cacheTtlHours") {
    return `${val}h`;
  }
  return String(val);
}
