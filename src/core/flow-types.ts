import type { InstallPlan, InstallScope } from "./install-plan";
import type { CatalogItem } from "./model";
import type { KindFilter } from "./search";

export type ScreenName =
  | "list"
  | "detail"
  | "confirm"
  | "updates"
  | "versions"
  | "settings"
  | "restore"
  | "exit";

export interface ListState {
  readonly screen: "list";
  readonly query: string;
  readonly kindFilter: KindFilter;
  readonly selectedIndex: number;
}

export interface DetailState {
  readonly screen: "detail";
  readonly item: CatalogItem;
  readonly selectedActionIndex: number;
  readonly previousListState: ListState;
}

export interface ConfirmState {
  readonly screen: "confirm";
  readonly item: CatalogItem;
  readonly plan: InstallPlan;
  readonly scope: InstallScope;
  readonly selectedActionIndex: number;
  readonly previousDetailState: DetailState;
}

export interface UpdatesState {
  readonly screen: "updates";
  readonly selectedIndex: number;
  readonly previousListState: ListState;
}

export interface VersionsState {
  readonly screen: "versions";
  readonly item: CatalogItem;
  readonly versions: string[];
  readonly currentVersion: string | null;
  readonly selectedIndex: number;
  readonly previousDetailState: DetailState;
}

export interface SettingsState {
  readonly screen: "settings";
  readonly selectedIndex: number;
  readonly previousListState: ListState;
}

export interface RestoreState {
  readonly screen: "restore";
  readonly selectedIndex: number;
  readonly previousListState: ListState;
}

export interface ExitState {
  readonly screen: "exit";
}

export type FlowState =
  | ListState
  | DetailState
  | ConfirmState
  | UpdatesState
  | VersionsState
  | SettingsState
  | RestoreState
  | ExitState;
