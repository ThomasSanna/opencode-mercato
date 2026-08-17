import { describe, expect, it } from "bun:test";
import { testRender } from "@opentui/solid";
import type { CatalogItem } from "../../src/core/model";
import { UpdatesScreen, type UpdateEntry } from "../../src/tui/screens/updates";

const samplePlugin: CatalogItem = {
  id: "opencode-plugin-test",
  kind: "plugin",
  name: "opencode-plugin-test",
  description: "Test plugin",
  repoUrl: "https://github.com/test/plugin",
  npmSpec: "opencode-plugin-test@1.0.0",
  homepage: null,
  tags: [],
  installSpec: {},
  sources: [],
  bestTrust: { level: "high", score: 30 },
};

describe("UpdatesScreen", () => {
  it("renders empty state when no updates are available", async () => {
    const screen = await testRender(() => (
      <UpdatesScreen
        updates={[]}
        selectedIndex={0}
      />
    ));
    expect(screen).toBeDefined();
  });

  it("renders list of available updates", async () => {
    const updates: UpdateEntry[] = [
      {
        item: samplePlugin,
        info: {
          itemId: samplePlugin.id,
          kind: "plugin",
          currentVersion: "1.0.0",
          latestVersion: "1.2.0",
          updateState: "update-available",
          diffType: "minor",
          autoEligible: true,
        },
      },
    ];

    const screen = await testRender(() => (
      <UpdatesScreen
        updates={updates}
        selectedIndex={0}
      />
    ));
    expect(screen).toBeDefined();
  });
});
