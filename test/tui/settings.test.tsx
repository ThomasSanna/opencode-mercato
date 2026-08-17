import { describe, expect, it } from "bun:test";
import { testRender } from "@opentui/solid";
import { DEFAULT_SETTINGS } from "../../src/core/settings";
import { SettingsScreen } from "../../src/tui/screens/settings";

describe("SettingsScreen", () => {
  it("renders settings list with default settings", async () => {
    const el = await testRender(() => (
      <SettingsScreen settings={DEFAULT_SETTINGS} selectedIndex={0} />
    ));
    expect(el).toBeDefined();
  });

  it("renders when navigating through options", async () => {
    const el = await testRender(() => (
      <SettingsScreen
        settings={{
          ...DEFAULT_SETTINGS,
          autoUpdate: false,
          cacheTtlHours: 12,
          defaultScope: "local",
        }}
        selectedIndex={2}
      />
    ));
    expect(el).toBeDefined();
  });
});
