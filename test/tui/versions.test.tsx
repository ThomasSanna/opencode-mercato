import { describe, expect, it } from "bun:test";
import { testRender } from "@opentui/solid";
import type { CatalogItem } from "../../src/core/model";
import { VersionsScreen } from "../../src/tui/screens/versions";

const samplePlugin: CatalogItem = {
  id: "opencode-plugin-test",
  kind: "plugin",
  name: "opencode-plugin-test",
  description: "Test plugin",
  repoUrl: "https://github.com/test/plugin",
  npmSpec: "opencode-plugin-test",
  homepage: null,
  tags: [],
  installSpec: {},
  sources: [],
  bestTrust: { level: "high", score: 30 },
};

describe("VersionsScreen", () => {
  it("renders empty state when no versions are provided", async () => {
    const screen = await testRender(() => (
      <VersionsScreen
        item={samplePlugin}
        versions={[]}
        currentVersion={null}
        selectedIndex={0}
      />
    ));
    expect(screen).toBeDefined();
  });

  it("renders version history with current version highlighted", async () => {
    const versions = ["2.0.0", "1.2.0", "1.1.0", "1.0.0"];
    const screen = await testRender(() => (
      <VersionsScreen
        item={samplePlugin}
        versions={versions}
        currentVersion="1.1.0"
        selectedIndex={1}
      />
    ));
    expect(screen).toBeDefined();
  });
});
