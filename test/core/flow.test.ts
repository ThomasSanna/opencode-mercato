import { describe, expect, it } from "bun:test";
import {
  backFromRestore,
  backFromSettings,
  backFromUpdates,
  backFromVersions,
  backToDetail,
  backToList,
  clampIndex,
  computeWindow,
  createInitialListState,
  cycleKindFilter,
  moveConfirmAction,
  moveDetailAction,
  moveRestoreSelection,
  moveSelection,
  moveSettingsSelection,
  moveUpdatesSelection,
  moveVersionsSelection,
  openConfirm,
  openDetail,
  openRestore,
  openSettings,
  openUpdates,
  openVersions,
  setKindFilter,
  setQuery,
  updateConfirmPlan,
} from "../../src/core/flow";

import type { InstallPlan } from "../../src/core/install-plan";
import type { CatalogItem } from "../../src/core/model";

function makeItem(overrides: Partial<CatalogItem> = {}): CatalogItem {
  return {
    id: "item-1",
    kind: "plugin",
    name: "Plugin One",
    description: "A description",
    repoUrl: "https://github.com/example/one",
    npmSpec: "opencode-plugin-one",
    homepage: null,
    tags: ["tools"],
    installSpec: {},
    sources: [
      {
        source: "cafe",
        trust: { level: "high", score: 30 },
        rawId: "1",
        seenAt: 1000,
      },
    ],
    bestTrust: { level: "high", score: 30 },
    ...overrides,
  };
}

function makePlan(item: CatalogItem): InstallPlan {
  return {
    item,
    scope: "global",
    targetConfigPath: "/path/opencode.json",
    targetFiles: [],
    configDiffs: [],
    warnings: [],
    conflict: "none",
    summary: "Install plan summary",
  };
}

describe("flow state machine", () => {
  it("createInitialListState sets defaults", () => {
    const s = createInitialListState();
    expect(s.screen).toBe("list");
    expect(s.query).toBe("");
    expect(s.kindFilter).toBe("all");
    expect(s.selectedIndex).toBe(0);
  });

  it("clampIndex handles out of bounds", () => {
    expect(clampIndex(-5, 10)).toBe(0);
    expect(clampIndex(15, 10)).toBe(9);
    expect(clampIndex(4, 10)).toBe(4);
    expect(clampIndex(0, 0)).toBe(0);
  });

  it("setQuery updates query and clamps selection", () => {
    const s = createInitialListState({ selectedIndex: 5 });
    const next = setQuery(s, "hello", 3);
    expect(next.query).toBe("hello");
    expect(next.selectedIndex).toBe(2);
  });

  it("setKindFilter resets selection to 0", () => {
    const s = createInitialListState({ selectedIndex: 4 });
    const next = setKindFilter(s, "plugin", 10);
    expect(next.kindFilter).toBe("plugin");
    expect(next.selectedIndex).toBe(0);
  });

  it("cycleKindFilter navigates kinds cyclically", () => {
    let s = createInitialListState();
    expect(s.kindFilter).toBe("all");
    s = cycleKindFilter(s, 1, 10);
    expect(s.kindFilter).toBe("plugin");
    s = cycleKindFilter(s, -1, 10);
    expect(s.kindFilter).toBe("all");
  });

  it("moveSelection clamps properly", () => {
    const s = createInitialListState();
    const sDown = moveSelection(s, 1, 5);
    expect(sDown.selectedIndex).toBe(1);
    const sUp = moveSelection(s, -1, 5);
    expect(sUp.selectedIndex).toBe(0);
  });

  it("openDetail and backToList transitions", () => {
    const listState = createInitialListState({ selectedIndex: 2 });
    const item = makeItem();
    const detailState = openDetail(listState, item);
    expect(detailState.screen).toBe("detail");
    expect(detailState.item).toBe(item);
    expect(detailState.selectedActionIndex).toBe(0);

    const backState = backToList(detailState);
    expect(backState.screen).toBe("list");
    expect(backState.selectedIndex).toBe(2);
  });

  it("confirm transitions: openConfirm, moveConfirmAction, updateConfirmPlan, backToDetail", () => {
    const listState = createInitialListState();
    const item = makeItem();
    const detailState = openDetail(listState, item);
    const plan = makePlan(item);

    const confirmState = openConfirm(detailState, plan, "global");
    expect(confirmState.screen).toBe("confirm");
    expect(confirmState.plan).toBe(plan);
    expect(confirmState.scope).toBe("global");
    expect(confirmState.selectedActionIndex).toBe(0);

    const moved = moveConfirmAction(confirmState, 1, 3);
    expect(moved.selectedActionIndex).toBe(1);

    const newPlan = { ...plan, scope: "local" as const };
    const updated = updateConfirmPlan(moved, newPlan, "local");
    expect(updated.scope).toBe("local");

    const back = backToDetail(updated);
    expect(back.screen).toBe("detail");
    expect(back.item).toBe(item);
  });

  it("computeWindow calculates slice bounds correctly", () => {
    expect(computeWindow(0, 0, 10)).toEqual({ start: 0, end: 0 });
    expect(computeWindow(2, 5, 10)).toEqual({ start: 0, end: 5 });
    expect(computeWindow(10, 50, 10)).toEqual({ start: 5, end: 15 });
    expect(computeWindow(48, 50, 10)).toEqual({ start: 40, end: 50 });
  });

  it("updates transitions: openUpdates, moveUpdatesSelection, backFromUpdates", () => {
    const listState = createInitialListState({ selectedIndex: 3 });
    const updatesState = openUpdates(listState);

    expect(updatesState.screen).toBe("updates");
    expect(updatesState.selectedIndex).toBe(0);
    expect(updatesState.previousListState).toBe(listState);

    const moved = moveUpdatesSelection(updatesState, 2, 5);
    expect(moved.selectedIndex).toBe(2);

    const back = backFromUpdates(moved);
    expect(back.screen).toBe("list");
    expect(back.selectedIndex).toBe(3);
  });

  it("versions transitions: openVersions, moveVersionsSelection, backFromVersions", () => {
    const listState = createInitialListState();
    const item = makeItem();
    const detailState = openDetail(listState, item);
    const versions = ["2.0.0", "1.1.0", "1.0.0"];

    const versionsState = openVersions(detailState, versions, "1.1.0");
    expect(versionsState.screen).toBe("versions");
    expect(versionsState.versions).toEqual(versions);
    expect(versionsState.currentVersion).toBe("1.1.0");
    expect(versionsState.selectedIndex).toBe(1);

    const moved = moveVersionsSelection(versionsState, 1, 3);
    expect(moved.selectedIndex).toBe(2);

    const back = backFromVersions(moved);
    expect(back.screen).toBe("detail");
    expect(back.item).toBe(item);
  });

  it("settings transitions: openSettings, moveSettingsSelection, backFromSettings", () => {
    const listState = createInitialListState({ selectedIndex: 1 });
    const settingsState = openSettings(listState);

    expect(settingsState.screen).toBe("settings");
    expect(settingsState.selectedIndex).toBe(0);
    expect(settingsState.previousListState).toBe(listState);

    const moved = moveSettingsSelection(settingsState, 3, 6);
    expect(moved.selectedIndex).toBe(3);

    const back = backFromSettings(moved);
    expect(back.screen).toBe("list");
    expect(back.selectedIndex).toBe(1);
  });

  it("restore transitions: openRestore, moveRestoreSelection, backFromRestore", () => {
    const listState = createInitialListState({ selectedIndex: 4 });
    const restoreState = openRestore(listState);

    expect(restoreState.screen).toBe("restore");
    expect(restoreState.selectedIndex).toBe(0);
    expect(restoreState.previousListState).toBe(listState);

    const moved = moveRestoreSelection(restoreState, 2, 4);
    expect(moved.selectedIndex).toBe(2);

    const back = backFromRestore(moved);
    expect(back.screen).toBe("list");
    expect(back.selectedIndex).toBe(4);
  });
});
