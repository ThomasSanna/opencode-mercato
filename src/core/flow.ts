import type { InstallPlan, InstallScope } from "./install-plan";
import type { CatalogItem } from "./model";
import { KIND_FILTER_LIST, type KindFilter } from "./search";
import { clampIndex, computeWindow, type WindowResult } from "./window";
import type {
  ConfirmState,
  DetailState,
  ListState,
  RestoreState,
  SettingsState,
  UpdatesState,
  VersionsState,
} from "./flow-types";

export * from "./flow-types";
export { clampIndex, computeWindow, type WindowResult };

export function createInitialListState(
  options: Partial<Omit<ListState, "screen">> = {}
): ListState {
  return {
    screen: "list",
    query: options.query ?? "",
    kindFilter: options.kindFilter ?? "all",
    selectedIndex: options.selectedIndex ?? 0,
  };
}

export function setQuery(
  state: ListState,
  query: string,
  totalItems: number
): ListState {
  return {
    ...state,
    query,
    selectedIndex: clampIndex(state.selectedIndex, totalItems),
  };
}

export function setKindFilter(
  state: ListState,
  kindFilter: KindFilter,
  totalItems: number
): ListState {
  return {
    ...state,
    kindFilter,
    selectedIndex: clampIndex(0, totalItems),
  };
}

export function nextKindFilter(current: KindFilter): KindFilter {
  const idx = KIND_FILTER_LIST.indexOf(current);
  if (idx === -1) return "all";
  const nextIdx = (idx + 1) % KIND_FILTER_LIST.length;
  return KIND_FILTER_LIST[nextIdx];
}

export function prevKindFilter(current: KindFilter): KindFilter {
  const idx = KIND_FILTER_LIST.indexOf(current);
  if (idx === -1) return "all";
  const prevIdx = (idx - 1 + KIND_FILTER_LIST.length) % KIND_FILTER_LIST.length;
  return KIND_FILTER_LIST[prevIdx];
}

export function cycleKindFilter(
  state: ListState,
  direction: 1 | -1,
  totalItems: number
): ListState {
  const next =
    direction === 1
      ? nextKindFilter(state.kindFilter)
      : prevKindFilter(state.kindFilter);
  return setKindFilter(state, next, totalItems);
}

export function moveSelection(
  state: ListState,
  delta: number,
  totalItems: number
): ListState {
  return {
    ...state,
    selectedIndex: clampIndex(state.selectedIndex + delta, totalItems),
  };
}

export function openDetail(
  listState: ListState,
  item: CatalogItem
): DetailState {
  return {
    screen: "detail",
    item,
    selectedActionIndex: 0,
    previousListState: listState,
  };
}

export function moveDetailAction(
  state: DetailState,
  delta: number,
  actionCount: number
): DetailState {
  return {
    ...state,
    selectedActionIndex: clampIndex(
      state.selectedActionIndex + delta,
      actionCount
    ),
  };
}

export function backToList(state: DetailState): ListState {
  return state.previousListState;
}

export function openConfirm(
  detailState: DetailState,
  plan: InstallPlan,
  scope: InstallScope = "global"
): ConfirmState {
  return {
    screen: "confirm",
    item: detailState.item,
    plan,
    scope,
    selectedActionIndex: 0,
    previousDetailState: detailState,
  };
}

export function moveConfirmAction(
  state: ConfirmState,
  delta: number,
  actionCount: number
): ConfirmState {
  return {
    ...state,
    selectedActionIndex: clampIndex(
      state.selectedActionIndex + delta,
      actionCount
    ),
  };
}

export function updateConfirmPlan(
  state: ConfirmState,
  newPlan: InstallPlan,
  newScope: InstallScope
): ConfirmState {
  return {
    ...state,
    plan: newPlan,
    scope: newScope,
  };
}

export function backToDetail(state: ConfirmState): DetailState {
  return state.previousDetailState;
}

export function openUpdates(listState: ListState): UpdatesState {
  return {
    screen: "updates",
    selectedIndex: 0,
    previousListState: listState,
  };
}

export function backFromUpdates(state: UpdatesState): ListState {
  return state.previousListState;
}

export function moveUpdatesSelection(
  state: UpdatesState,
  delta: number,
  totalItems: number
): UpdatesState {
  return {
    ...state,
    selectedIndex: clampIndex(state.selectedIndex + delta, totalItems),
  };
}

export function openVersions(
  detailState: DetailState,
  versions: string[],
  currentVersion: string | null
): VersionsState {
  const initialIndex = currentVersion
    ? Math.max(0, versions.indexOf(currentVersion))
    : 0;

  return {
    screen: "versions",
    item: detailState.item,
    versions,
    currentVersion,
    selectedIndex: initialIndex,
    previousDetailState: detailState,
  };
}

export function backFromVersions(state: VersionsState): DetailState {
  return state.previousDetailState;
}

export function moveVersionsSelection(
  state: VersionsState,
  delta: number,
  totalItems: number
): VersionsState {
  return {
    ...state,
    selectedIndex: clampIndex(state.selectedIndex + delta, totalItems),
  };
}

export function openSettings(listState: ListState): SettingsState {
  return {
    screen: "settings",
    selectedIndex: 0,
    previousListState: listState,
  };
}

export function backFromSettings(state: SettingsState): ListState {
  return state.previousListState;
}

export function moveSettingsSelection(
  state: SettingsState,
  delta: number,
  totalItems: number
): SettingsState {
  return {
    ...state,
    selectedIndex: clampIndex(state.selectedIndex + delta, totalItems),
  };
}

export function openRestore(listState: ListState): RestoreState {
  return {
    screen: "restore",
    selectedIndex: 0,
    previousListState: listState,
  };
}

export function backFromRestore(state: RestoreState): ListState {
  return state.previousListState;
}

export function moveRestoreSelection(
  state: RestoreState,
  delta: number,
  totalItems: number
): RestoreState {
  return {
    ...state,
    selectedIndex: clampIndex(state.selectedIndex + delta, totalItems),
  };
}
