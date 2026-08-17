import type { ConfigSnapshot } from "../adapters/snapshot";
import { sanitizeIdentifier } from "./install-plan";
import type { CatalogItem } from "./model";
import { extractPackageName, type ItemUpdateInfo } from "./versions";

export type ItemStatus = "not-installed" | "installed" | "enabled" | "disabled";

export interface LifecycleAction {
  id:
    | "install"
    | "update"
    | "versions"
    | "enable"
    | "disable"
    | "uninstall"
    | "repo"
    | "npm"
    | "homepage"
    | "back";
  label: string;
  url?: string;
}


/**
 * Computes the lifecycle status of a CatalogItem based on a configuration snapshot.
 */
export function getItemStatus(
  item: CatalogItem,
  snapshot: ConfigSnapshot
): ItemStatus {
  const idName = sanitizeIdentifier(item.name);

  switch (item.kind) {
    case "plugin": {
      const pkgName = item.npmSpec ? extractPackageName(item.npmSpec) : item.id;
      const isInstalled = snapshot.installedPluginNames.some(
        (name) => name === pkgName || name === item.id || name === item.name
      );
      if (!isInstalled) return "not-installed";
      const isDisabled = snapshot.disabledPluginNames.includes(pkgName);
      return isDisabled ? "disabled" : "enabled";
    }

    case "mcp": {
      const mcpKey = idName;
      const configured = snapshot.configuredMcpServers[mcpKey];
      if (!configured) return "not-installed";
      return configured.enabled === false ? "disabled" : "enabled";
    }

    case "theme": {
      const isGlobal =
        typeof snapshot.globalConfig.theme === "string" &&
        snapshot.globalConfig.theme.toLowerCase() === item.name.toLowerCase();
      const isLocal =
        typeof snapshot.localConfig.theme === "string" &&
        snapshot.localConfig.theme.toLowerCase() === item.name.toLowerCase();
      return isGlobal || isLocal ? "enabled" : "not-installed";
    }

    case "skill": {
      const match = snapshot.existingFiles.some((filePath) =>
        filePath.toLowerCase().endsWith(`/skills/${idName}/skill.md`)
      );
      return match ? "installed" : "not-installed";
    }

    case "agent": {
      const match = snapshot.existingFiles.some((filePath) =>
        filePath.toLowerCase().endsWith(`/agent/${idName}.md`)
      );
      return match ? "installed" : "not-installed";
    }

    case "command": {
      const match = snapshot.existingFiles.some((filePath) =>
        filePath.toLowerCase().endsWith(`/command/${idName}.md`)
      );
      return match ? "installed" : "not-installed";
    }
  }
}

/**
 * Returns available detail actions for a catalog item based on its status and update info.
 */
export function getLifecycleActions(
  item: CatalogItem,
  status: ItemStatus,
  updateInfo?: ItemUpdateInfo
): LifecycleAction[] {
  const actions: LifecycleAction[] = [];

  if (
    updateInfo &&
    (updateInfo.updateState === "update-available" ||
      updateInfo.updateState === "major-available")
  ) {
    const targetLabel = updateInfo.latestVersion
      ? `Update to v${updateInfo.latestVersion}`
      : "Update to latest";
    actions.push({ id: "update", label: targetLabel });
  }

  if (status === "not-installed") {
    actions.push({ id: "install", label: "Install" });
  } else if (status === "enabled") {
    if (item.kind === "plugin" || item.kind === "mcp") {
      actions.push({ id: "disable", label: "Disable" });
    }
    actions.push({ id: "uninstall", label: "Uninstall" });
  } else if (status === "disabled") {
    if (item.kind === "plugin" || item.kind === "mcp") {
      actions.push({ id: "enable", label: "Enable" });
    }
    actions.push({ id: "uninstall", label: "Uninstall" });
  } else if (status === "installed") {
    actions.push({ id: "uninstall", label: "Uninstall" });
  }

  if (item.kind === "plugin" || item.npmSpec) {
    actions.push({
      id: "versions",
      label: "Version History / Downgrade",
    });
  }


  if (item.repoUrl) {
    actions.push({
      id: "repo",
      label: `Open repository: ${item.repoUrl}`,
      url: item.repoUrl,
    });
  }

  if (item.npmSpec) {
    actions.push({
      id: "npm",
      label: `Open npm: ${item.npmSpec}`,
      url: `https://www.npmjs.com/package/${item.npmSpec}`,
    });
  }

  if (item.homepage) {
    actions.push({
      id: "homepage",
      label: `Open homepage: ${item.homepage}`,
      url: item.homepage,
    });
  }

  actions.push({ id: "back", label: "Back to list" });
  return actions;
}
