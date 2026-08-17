import { describe, expect, it } from "bun:test";
import {
  CACHE_TTL_OPTIONS,
  DEFAULT_SETTINGS,
  formatSettingValue,
  mergeSettings,
  parseSettings,
  SETTING_DEFINITIONS,
  toggleOrCycleSetting,
  type MercatoSettings,
} from "../../src/core/settings";

describe("MercatoSettings core", () => {
  it("provides default settings conforming to spec §9", () => {
    expect(DEFAULT_SETTINGS.autoUpdate).toBe(true);
    expect(DEFAULT_SETTINGS.autoUpdateMajor).toBe(false);
    expect(DEFAULT_SETTINGS.cacheTtlHours).toBe(24);
    expect(DEFAULT_SETTINGS.defaultScope).toBe("global");
    expect(DEFAULT_SETTINGS.checkUpdatesOnOpen).toBe(true);
    expect(DEFAULT_SETTINGS.replaceNativeManager).toBe(true);
  });

  it("provides complete metadata definitions for all settings", () => {
    expect(SETTING_DEFINITIONS.length).toBe(6);
    const keys = SETTING_DEFINITIONS.map((d) => d.key);
    expect(keys).toContain("autoUpdate");
    expect(keys).toContain("autoUpdateMajor");
    expect(keys).toContain("cacheTtlHours");
    expect(keys).toContain("defaultScope");
    expect(keys).toContain("checkUpdatesOnOpen");
    expect(keys).toContain("replaceNativeManager");
  });

  it("parses valid settings correctly", () => {
    const raw = {
      autoUpdate: false,
      autoUpdateMajor: true,
      cacheTtlHours: 12,
      defaultScope: "local",
      checkUpdatesOnOpen: false,
      replaceNativeManager: false,
    };

    const parsed = parseSettings(raw);
    expect(parsed).toEqual({
      autoUpdate: false,
      autoUpdateMajor: true,
      cacheTtlHours: 12,
      defaultScope: "local",
      checkUpdatesOnOpen: false,
      replaceNativeManager: false,
    });
  });

  it("falls back to defaults for missing, invalid, or nullish properties", () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings([])).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings("invalid")).toEqual(DEFAULT_SETTINGS);

    const partial = {
      autoUpdate: false,
      cacheTtlHours: -5,
      defaultScope: "unknown-scope",
    };

    const parsed = parseSettings(partial);
    expect(parsed.autoUpdate).toBe(false);
    expect(parsed.autoUpdateMajor).toBe(DEFAULT_SETTINGS.autoUpdateMajor);
    expect(parsed.cacheTtlHours).toBe(DEFAULT_SETTINGS.cacheTtlHours);
    expect(parsed.defaultScope).toBe("global");
    expect(parsed.checkUpdatesOnOpen).toBe(DEFAULT_SETTINGS.checkUpdatesOnOpen);
    expect(parsed.replaceNativeManager).toBe(DEFAULT_SETTINGS.replaceNativeManager);
  });

  it("merges partial overrides onto base settings", () => {
    const base: MercatoSettings = {
      ...DEFAULT_SETTINGS,
      defaultScope: "local",
    };

    const merged = mergeSettings(base, {
      autoUpdateMajor: true,
      cacheTtlHours: 48,
    });

    expect(merged.defaultScope).toBe("local");
    expect(merged.autoUpdateMajor).toBe(true);
    expect(merged.cacheTtlHours).toBe(48);
    expect(merged.autoUpdate).toBe(true);
  });

  it("toggles boolean settings correctly", () => {
    let s = { ...DEFAULT_SETTINGS };
    s = toggleOrCycleSetting(s, "autoUpdate");
    expect(s.autoUpdate).toBe(false);
    s = toggleOrCycleSetting(s, "autoUpdate");
    expect(s.autoUpdate).toBe(true);

    s = toggleOrCycleSetting(s, "autoUpdateMajor");
    expect(s.autoUpdateMajor).toBe(true);

    s = toggleOrCycleSetting(s, "checkUpdatesOnOpen");
    expect(s.checkUpdatesOnOpen).toBe(false);

    s = toggleOrCycleSetting(s, "replaceNativeManager");
    expect(s.replaceNativeManager).toBe(false);
  });

  it("cycles discrete settings (scope and cache TTL)", () => {
    let s = { ...DEFAULT_SETTINGS };
    s = toggleOrCycleSetting(s, "defaultScope");
    expect(s.defaultScope).toBe("local");
    s = toggleOrCycleSetting(s, "defaultScope");
    expect(s.defaultScope).toBe("global");

    expect(s.cacheTtlHours).toBe(24);
    s = toggleOrCycleSetting(s, "cacheTtlHours");
    expect(s.cacheTtlHours).toBe(48);
    s = toggleOrCycleSetting(s, "cacheTtlHours");
    expect(s.cacheTtlHours).toBe(6);
    s = toggleOrCycleSetting(s, "cacheTtlHours");
    expect(s.cacheTtlHours).toBe(12);
    s = toggleOrCycleSetting(s, "cacheTtlHours");
    expect(s.cacheTtlHours).toBe(24);
  });

  it("formats setting values for TUI display", () => {
    expect(formatSettingValue(DEFAULT_SETTINGS, "autoUpdate")).toBe("ON");
    expect(
      formatSettingValue({ ...DEFAULT_SETTINGS, autoUpdate: false }, "autoUpdate")
    ).toBe("OFF");
    expect(formatSettingValue(DEFAULT_SETTINGS, "cacheTtlHours")).toBe("24h");
    expect(formatSettingValue(DEFAULT_SETTINGS, "defaultScope")).toBe("global");
  });
});
