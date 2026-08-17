import type { KeyEvent } from "@opentui/core";
import type { BackupEntry } from "../adapters/backups";
import type { NpmInfo } from "../adapters/npm";
import type { InstallScope } from "../adapters/paths";
import type { ConfigSnapshot } from "../adapters/snapshot";
import {
  backFromRestore,
  backFromSettings,
  backFromUpdates,
  backFromVersions,
  backToDetail,
  backToList,
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
  setQuery,
  updateConfirmPlan,
  type ConfirmState,
  type DetailState,
  type FlowState,
  type ListState,
  type RestoreState,
  type SettingsState,
  type UpdatesState,
  type VersionsState,
} from "../core/flow";
import type { CatalogItem } from "../core/model";
import { SETTING_DEFINITIONS, type MercatoSettings } from "../core/settings";
import { getItemStatus } from "../core/status";
import type { InstallPlan } from "../core/install-plan";
import { extractPackageName } from "../core/versions";
import type { CatalogUpdatesResult } from "../core/update-checker";
import {
  handleRestoreBackupAction,
  handleToggleMcpAction,
  handleToggleSettingAction,
  handleUninstallAction,
} from "./key-actions";
import { getConfirmActions } from "./screens/confirm";
import { getDetailActions } from "./screens/detail";

export function handleListKey(
  key: KeyEvent,
  flow: ListState,
  setFlow: (f: FlowState) => void,
  filteredItems: readonly CatalogItem[],
  fetchNpmData: (pkg: string) => Promise<NpmInfo | null>,
  onClose: () => void
): void {
  if (key.name === "escape") {
    onClose();
    return;
  }
  if (key.name === "down") {
    setFlow(moveSelection(flow, 1, filteredItems.length));
    return;
  }
  if (key.name === "up") {
    setFlow(moveSelection(flow, -1, filteredItems.length));
    return;
  }
  if (key.name === "tab") {
    const dir = key.shift ? -1 : 1;
    setFlow(cycleKindFilter(flow, dir, filteredItems.length));
    return;
  }
  if (key.sequence === "u" && !key.ctrl && !key.meta && flow.query === "") {
    setFlow(openUpdates(flow));
    return;
  }
  if (key.sequence === "s" && !key.ctrl && !key.meta && flow.query === "") {
    setFlow(openSettings(flow));
    return;
  }
  if (key.sequence === "r" && !key.ctrl && !key.meta && flow.query === "") {
    setFlow(openRestore(flow));
    return;
  }
  if (key.name === "return" || key.name === "enter") {
    const selectedItem = filteredItems[flow.selectedIndex];
    if (selectedItem) {
      setFlow(openDetail(flow, selectedItem));
      if (selectedItem.kind === "plugin" || selectedItem.npmSpec) {
        const pkg = selectedItem.npmSpec
          ? extractPackageName(selectedItem.npmSpec)
          : selectedItem.id;
        void fetchNpmData(pkg);
      }
    }
    return;
  }
  if (key.name === "backspace") {
    setFlow(setQuery(flow, flow.query.slice(0, -1), filteredItems.length));
    return;
  }
  if (key.sequence && key.sequence.length === 1 && !key.ctrl && !key.meta) {
    setFlow(setQuery(flow, flow.query + key.sequence, filteredItems.length));
    return;
  }
}

export function handleDetailKey(
  key: KeyEvent,
  flow: DetailState,
  setFlow: (f: FlowState) => void,
  snapshot: ConfigSnapshot,
  catalogUpdates: CatalogUpdatesResult,
  npmMap: Record<string, NpmInfo>,
  settings: MercatoSettings | undefined,
  buildPlan: (item: CatalogItem, scope: InstallScope, ver?: string) => InstallPlan,
  refreshSnapshot: () => void,
  refreshBackups?: () => void,
  showToast?: (msg: string) => void
): void {
  const status = getItemStatus(flow.item, snapshot);
  const updateInfo = catalogUpdates.updates[flow.item.id];
  const actions = getDetailActions(flow.item, status, updateInfo);

  if (key.name === "escape") {
    setFlow(backToList(flow));
    return;
  }
  if (key.name === "down") {
    setFlow(moveDetailAction(flow, 1, actions.length));
    return;
  }
  if (key.name === "up") {
    setFlow(moveDetailAction(flow, -1, actions.length));
    return;
  }
  if (key.name === "return" || key.name === "enter") {
    const action = actions[flow.selectedActionIndex];
    if (!action || action.id === "back") {
      setFlow(backToList(flow));
      return;
    }
    const defaultScope = settings?.defaultScope ?? "global";
    if (action.id === "install") {
      const plan = buildPlan(flow.item, defaultScope);
      setFlow(openConfirm(flow, plan, defaultScope));
      return;
    }
    if (action.id === "update") {
      const targetVer = updateInfo?.latestVersion ?? undefined;
      const plan = buildPlan(flow.item, defaultScope, targetVer);
      setFlow(openConfirm(flow, plan, defaultScope));
      return;
    }
    if (action.id === "versions") {
      const pkg = flow.item.npmSpec
        ? extractPackageName(flow.item.npmSpec)
        : flow.item.id;
      const info = npmMap[pkg];
      const versions = info?.versions ? [...info.versions].reverse() : [];
      const curVer = updateInfo?.currentVersion ?? null;
      setFlow(openVersions(flow, versions, curVer));
      return;
    }
    if (action.id === "uninstall") {
      const isLocal =
        (Array.isArray(snapshot.localConfig.plugin) &&
          snapshot.localConfig.plugin.some(
            (p) =>
              typeof p === "string" &&
              extractPackageName(p) === extractPackageName(flow.item.npmSpec ?? flow.item.id)
          )) ||
        (snapshot.localConfig.mcp &&
          typeof snapshot.localConfig.mcp === "object" &&
          Object.prototype.hasOwnProperty.call(
            snapshot.localConfig.mcp,
            flow.item.name.toLowerCase()
          ));
      const targetScope: InstallScope = isLocal ? "local" : "global";
      handleUninstallAction(
        flow.item,
        refreshSnapshot,
        refreshBackups,
        showToast,
        targetScope
      );
      return;
    }
    if (action.id === "enable" || action.id === "disable") {
      const isLocal =
        snapshot.localConfig.mcp &&
        typeof snapshot.localConfig.mcp === "object" &&
        Object.prototype.hasOwnProperty.call(
          snapshot.localConfig.mcp,
          flow.item.name.toLowerCase()
        );
      const targetScope: InstallScope = isLocal ? "local" : "global";
      handleToggleMcpAction(
        flow.item,
        action.id === "enable",
        refreshSnapshot,
        refreshBackups,
        showToast,
        targetScope
      );
      return;
    }
    if (action.url) {
      showToast?.(`URL: ${action.url}`);
    }
  }
}
