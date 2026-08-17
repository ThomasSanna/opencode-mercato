import { describe, expect, test } from "bun:test";
import { testRender } from "@opentui/solid";
import type { CatalogItem } from "../../src/core/model";
import { DetailScreen, getDetailActions } from "../../src/tui/screens/detail";
import { ListScreen } from "../../src/tui/screens/list";

const mockItem: CatalogItem = {
  id: "https://github.com/foo/bar",
  kind: "plugin",
  name: "bar-plugin",
  description: "A wonderful plugin",
  repoUrl: "https://github.com/foo/bar",
  npmSpec: "opencode-bar",
  homepage: "https://bar.dev",
  tags: ["git", "tools"],
  installSpec: { cafe: {} },
  sources: [
    {
      source: "cafe",
      trust: { level: "high", score: 30 },
      rawId: "bar-plugin",
      seenAt: 1000,
    },
  ],
  bestTrust: { level: "high", score: 30 },
};

describe("TUI screens", () => {
  test("ListScreen renders with items", async () => {
    const screen = await testRender(() => (
      <ListScreen
        items={[mockItem]}
        totalCount={1}
        selectedIndex={0}
        query=""
        activeKind="all"
        itemStatuses={{ [mockItem.id]: "enabled" }}
        stale={false}
      />
    ));
    expect(screen).toBeDefined();
  });

  test("ListScreen renders empty state when no items match", async () => {
    const screen = await testRender(() => (
      <ListScreen
        items={[]}
        totalCount={1}
        selectedIndex={0}
        query="xyz"
        activeKind="plugin"
        stale={true}
      />
    ));
    expect(screen).toBeDefined();
  });

  test("getDetailActions extracts repo, npm, homepage, versions and back actions", () => {
    const actions = getDetailActions(mockItem, "not-installed");
    expect(actions.length).toBe(6);
    expect(actions[0].id).toBe("install");
    expect(actions[1].id).toBe("versions");
    expect(actions[2].id).toBe("repo");
    expect(actions[3].id).toBe("npm");
    expect(actions[4].id).toBe("homepage");
    expect(actions[5].id).toBe("back");
  });

  test("getDetailActions handles enabled and disabled lifecycle states", () => {
    const enabledActions = getDetailActions(mockItem, "enabled");
    expect(enabledActions[0].id).toBe("disable");
    expect(enabledActions[1].id).toBe("uninstall");
    expect(enabledActions[2].id).toBe("versions");

    const disabledActions = getDetailActions(mockItem, "disabled");
    expect(disabledActions[0].id).toBe("enable");
    expect(disabledActions[1].id).toBe("uninstall");
    expect(disabledActions[2].id).toBe("versions");
  });

  test("getDetailActions handles missing optional URLs", () => {
    const bareItem: CatalogItem = {
      ...mockItem,
      kind: "skill",
      repoUrl: null,
      npmSpec: null,
      homepage: null,
    };
    const actions = getDetailActions(bareItem, "not-installed");
    expect(actions.length).toBe(2);
    expect(actions[0].id).toBe("install");
    expect(actions[1].id).toBe("back");
  });


  test("DetailScreen renders with actions and status", async () => {
    const screen = await testRender(() => (
      <DetailScreen item={mockItem} selectedActionIndex={0} status="enabled" />
    ));
    expect(screen).toBeDefined();
  });
});
