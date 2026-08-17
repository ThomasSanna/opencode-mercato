import { describe, expect, test } from "bun:test";
import {
  formatItemCount,
  formatSourceProvenance,
  KIND_TAB_LABELS,
  STRINGS,
} from "../../src/tui/strings";

describe("TUI user-facing strings", () => {
  test("defines all required command metadata", () => {
    expect(STRINGS.COMMAND_ID).toBe("mercato.open");
    expect(STRINGS.COMMAND_SLASH).toBe("mercato");
    expect(STRINGS.COMMAND_GROUP).toBe("Plugin Manager");
  });

  test("defines labels for all kind tabs", () => {
    expect(KIND_TAB_LABELS.all).toBe("All");
    expect(KIND_TAB_LABELS.plugin).toBe("Plugins");
    expect(KIND_TAB_LABELS.mcp).toBe("MCPs");
    expect(KIND_TAB_LABELS.skill).toBe("Skills");
    expect(KIND_TAB_LABELS.agent).toBe("Agents");
    expect(KIND_TAB_LABELS.theme).toBe("Themes");
    expect(KIND_TAB_LABELS.command).toBe("Commands");
  });

  test("defines lifecycle status strings and confirm headers", () => {
    expect(STRINGS.STATUS_INSTALLED).toBe("installed");
    expect(STRINGS.STATUS_ENABLED).toBe("enabled");
    expect(STRINGS.STATUS_DISABLED).toBe("disabled");
    expect(STRINGS.CONFIRM_HEADER).toBe("Installation Preview & Confirmation");
    expect(STRINGS.CONFIRM_ACTION_INSTALL).toBe("Confirm & Install");
  });

  test("defines updates and versions strings and badges", () => {
    expect(STRINGS.UPDATES_HEADER).toBe("Available Updates");
    expect(STRINGS.VERSIONS_HEADER).toBe("Version History & Downgrade");
    expect(STRINGS.ACTION_UPDATE).toBe("Update");
    expect(STRINGS.ACTION_VERSIONS).toBe("Version History / Downgrade");
    expect(STRINGS.BADGE_PATCH).toBe("patch");
    expect(STRINGS.BADGE_MINOR).toBe("minor");
    expect(STRINGS.BADGE_MAJOR).toBe("major");
    expect(STRINGS.BADGE_CONTENT).toBe("content");
  });

  test("defines settings and restore headers and shortcuts", () => {
    expect(STRINGS.SETTINGS_HEADER).toBe("Marketplace Settings");
    expect(STRINGS.RESTORE_HEADER).toBe("Configuration Backups & Restore Journal");
    expect(STRINGS.SHORTCUTS_SETTINGS).toContain("Toggle/Cycle");
    expect(STRINGS.SHORTCUTS_RESTORE).toContain("Restore");
    expect(STRINGS.SHORTCUTS_LIST).toContain("Settings");
    expect(STRINGS.SHORTCUTS_LIST).toContain("Restore");
  });

  test("formatItemCount formats count string correctly", () => {
    expect(formatItemCount(5, 10)).toBe("5 of 10 items");
    expect(formatItemCount(0, 0)).toBe("0 of 0 items");
  });

  test("formatSourceProvenance formats provenance string correctly", () => {
    expect(formatSourceProvenance("cafe", 30, "high")).toBe(
      "cafe (high, score: 30)"
    );
  });
});
