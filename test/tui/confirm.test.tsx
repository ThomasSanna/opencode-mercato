import { describe, expect, it } from "bun:test";
import { testRender } from "@opentui/solid";
import { createInstallPlan } from "../../src/core/install-plan";
import type { CatalogItem } from "../../src/core/model";
import { ConfirmScreen, getConfirmActions } from "../../src/tui/screens/confirm";

function makeItem(overrides: Partial<CatalogItem> = {}): CatalogItem {
  return {
    id: "test-plugin",
    kind: "plugin",
    name: "Test Plugin",
    description: "A test plugin",
    repoUrl: "https://github.com/example/test",
    npmSpec: "opencode-plugin-test",
    homepage: null,
    tags: ["tools"],
    installSpec: {},
    sources: [
      {
        source: "cafe",
        trust: { level: "high", score: 30 },
        rawId: "c1",
        seenAt: 1000,
      },
    ],
    bestTrust: { level: "high", score: 30 },
    ...overrides,
  };
}

describe("ConfirmScreen", () => {
  it("getConfirmActions generates confirm, scope switch, and cancel actions", () => {
    const item = makeItem();
    const plan = createInstallPlan(item, "global", {
      targetConfigPath: "/path/opencode.json",
      baseDir: "/path",
      existingConfig: {},
    });

    const actions = getConfirmActions(plan);
    expect(actions.length).toBe(3);
    expect(actions[0].id).toBe("confirm");
    expect(actions[1].id).toBe("scope");
    expect(actions[2].id).toBe("cancel");
    expect(actions[1].label).toContain("Global");
  });

  it("ConfirmScreen renders without throwing", async () => {
    const item = makeItem({
      kind: "mcp",
      name: "postgres",
      npmSpec: "@modelcontextprotocol/server-postgres",
    });
    const plan = createInstallPlan(item, "local", {
      targetConfigPath: "/local/opencode.json",
      baseDir: "/local",
      existingConfig: {},
    });

    const screen = await testRender(() => (
      <ConfirmScreen plan={plan} selectedActionIndex={0} />
    ));
    expect(screen).toBeDefined();
  });
});
