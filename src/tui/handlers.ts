import type { KeyEvent } from "@opentui/core";
import type { BackupEntry } from "../adapters/backups";
import { executeInstallPlan } from "../adapters/install/executor";
import type { NpmInfo } from "../adapters/npm";
import {
  getScopeBaseDir,
  getScopeConfigPath,
  type InstallScope,
} from "../adapters/paths";
import type { ConfigSnapshot } from "../adapters/snapshot";
import {
  backFromRestore,
  backFromSettings,
  backFromUpdates,
  backFromVersions,
  backToDetail,
  moveConfirmAction,
  moveRestoreSelection,
  moveSettingsSelection,
  moveUpdatesSelection,
  moveVersionsSelection,
  openConfirm,
  openDetail,
  updateConfirmPlan,
  type FlowState,
} from "../core/flow";
import { createInstallPlan, type InstallPlan } from "../core/install-plan";
import type { CatalogItem } from "../core/model";
import {
  SETTING_DEFINITIONS,
  type MercatoSettings,
} from "../core/settings";
import type { CatalogUpdatesResult } from "../core/update-checker";
import {
  handleRestoreBackupAction,
  handleToggleSettingAction,
} from "./key-actions";
import { handleDetailKey, handleListKey } from "./screen-handlers";
import { getConfirmActions } from "./screens/confirm";

export function buildScopePlan(
  item: CatalogItem,
  scope: InstallScope,
  snapshot: ConfigSnapshot,
  targetVersion?: string
): InstallPlan {
  const targetConfigPath =
    scope === "global"
      ? snapshot.globalConfigPath || getScopeConfigPath("global")
      : snapshot.localConfigPath || getScopeConfigPath("local");
  const existingConfig =
    scope === "global" ? snapshot.globalConfig : snapshot.localConfig;
  const baseDir = getScopeBaseDir(scope);

  return createInstallPlan(
    item,
    scope,
    { targetConfigPath, baseDir, existingConfig },
    { targetVersion }
  );
}

export interface KeyHandlerContext {
  key: KeyEvent;
  flow: FlowState;
  setFlow: (f: FlowState) => void;
  filteredItems: readonly CatalogItem[];
  snapshot: ConfigSnapshot;
  refreshSnapshot: () => void;
  npmMap: Record<string, NpmInfo>;
  fetchNpmData: (pkg: string) => Promise<NpmInfo | null>;
  catalogUpdates: CatalogUpdatesResult;
  settings?: MercatoSettings;
  setSettings?: (s: MercatoSettings) => void;
  backups?: readonly BackupEntry[];
  refreshBackups?: () => void;
  showToast?: (msg: string) => void;
  onClose: () => void;
}

export function handleDialogKey(ctx: KeyHandlerContext): void {
  const {
    key,
    flow,
    setFlow,
    filteredItems,
    snapshot,
    refreshSnapshot,
    npmMap,
    fetchNpmData,
    catalogUpdates,
    settings,
    setSettings,
    backups = [],
    refreshBackups,
    showToast,
    onClose,
  } = ctx;

  const buildPlan = (item: CatalogItem, scope: InstallScope, ver?: string) =>
    buildScopePlan(item, scope, snapshot, ver);

  if (flow.screen === "list") {
    handleListKey(key, flow, setFlow, filteredItems, fetchNpmData, onClose);
  } else if (flow.screen === "detail") {
    handleDetailKey(
      key,
      flow,
      setFlow,
      snapshot,
      catalogUpdates,
      npmMap,
      settings,
      buildPlan,
      refreshSnapshot,
      refreshBackups,
      showToast
    );
  } else if (flow.screen === "confirm") {
    const actions = getConfirmActions(flow.plan);

    if (key.name === "escape") {
      setFlow(backToDetail(flow));
      return;
    }
    if (key.name === "tab") {
      const nextScope: InstallScope =
        flow.scope === "global" ? "local" : "global";
      const newPlan = buildScopePlan(flow.item, nextScope, snapshot);
      setFlow(updateConfirmPlan(flow, newPlan, nextScope));
      return;
    }
    if (key.name === "down") {
      setFlow(moveConfirmAction(flow, 1, actions.length));
      return;
    }
    if (key.name === "up") {
      setFlow(moveConfirmAction(flow, -1, actions.length));
      return;
    }
    if (key.name === "return" || key.name === "enter") {
      const action = actions[flow.selectedActionIndex];
      if (!action || action.id === "cancel") {
        setFlow(backToDetail(flow));
        return;
      }
      if (action.id === "scope") {
        const nextScope: InstallScope =
          flow.scope === "global" ? "local" : "global";
        const newPlan = buildScopePlan(flow.item, nextScope, snapshot);
        setFlow(updateConfirmPlan(flow, newPlan, nextScope));
        return;
      }
      if (action.id === "confirm") {
        const result = executeInstallPlan(flow.plan, { force: true });
        refreshSnapshot();
        refreshBackups?.();
        showToast?.(result.message);
        setFlow(backToDetail(flow));
      }
    }
  } else if (flow.screen === "updates") {
    const available = catalogUpdates.availableUpdates;
    if (key.name === "escape" || key.sequence === "u") {
      setFlow(backFromUpdates(flow));
      return;
    }
    if (key.name === "down") {
      setFlow(moveUpdatesSelection(flow, 1, available.length));
      return;
    }
    if (key.name === "up") {
      setFlow(moveUpdatesSelection(flow, -1, available.length));
      return;
    }
    if (key.name === "return" || key.name === "enter") {
      const selected = available[flow.selectedIndex];
      if (selected) {
        const defaultScope = settings?.defaultScope ?? "global";
        const targetVer = selected.info.latestVersion ?? undefined;
        const plan = buildScopePlan(selected.item, defaultScope, snapshot, targetVer);
        const detailState = openDetail(flow.previousListState, selected.item);
        setFlow(openConfirm(detailState, plan, defaultScope));
      }
    }
  } else if (flow.screen === "versions") {
    if (key.name === "escape") {
      setFlow(backFromVersions(flow));
      return;
    }
    if (key.name === "down") {
      setFlow(moveVersionsSelection(flow, 1, flow.versions.length));
      return;
    }
    if (key.name === "up") {
      setFlow(moveVersionsSelection(flow, -1, flow.versions.length));
      return;
    }
    if (key.name === "return" || key.name === "enter") {
      const chosenVer = flow.versions[flow.selectedIndex];
      if (chosenVer) {
        const defaultScope = settings?.defaultScope ?? "global";
        const plan = buildScopePlan(flow.item, defaultScope, snapshot, chosenVer);
        setFlow(openConfirm(flow.previousDetailState, plan, defaultScope));
      }
    }
  } else if (flow.screen === "settings") {
    if (key.name === "escape") {
      setFlow(backFromSettings(flow));
      return;
    }
    if (key.name === "down") {
      setFlow(moveSettingsSelection(flow, 1, SETTING_DEFINITIONS.length));
      return;
    }
    if (key.name === "up") {
      setFlow(moveSettingsSelection(flow, -1, SETTING_DEFINITIONS.length));
      return;
    }
    if (
      key.name === "return" ||
      key.name === "enter" ||
      key.name === "space" ||
      key.name === "left" ||
      key.name === "right"
    ) {
      if (settings && setSettings) {
        handleToggleSettingAction(flow.selectedIndex, settings, setSettings, showToast);
      }
    }
  } else if (flow.screen === "restore") {
    if (key.name === "escape") {
      setFlow(backFromRestore(flow));
      return;
    }
    if (key.name === "down") {
      setFlow(moveRestoreSelection(flow, 1, backups.length));
      return;
    }
    if (key.name === "up") {
      setFlow(moveRestoreSelection(flow, -1, backups.length));
      return;
    }
    if (key.name === "return" || key.name === "enter") {
      handleRestoreBackupAction(backups[flow.selectedIndex], refreshSnapshot, refreshBackups, showToast);
    }
  }
}
