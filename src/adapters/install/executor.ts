import type { InstallPlan } from "../../core/install-plan";
import { sanitizeIdentifier } from "../../core/install-plan";
import type { CatalogItem, Kind } from "../../core/model";
import {
  addMcpToConfig,
  addPluginToConfig,
  type McpServerConfig,
  readConfigFile,
  removeMcpFromConfig,
  removePluginFromConfig,
  removeThemeFromConfig,
  setThemeInConfig,
  writeConfigFile,
} from "../config";
import {
  getScopeBaseDir,
  getScopeConfigPath,
  type InstallScope,
  type PathResolutionOptions,
} from "../paths";
import { installFile, removeFile } from "./copy";

export interface InstallResult {
  ok: boolean;
  message: string;
  backupPath?: string;
  error?: string;
}

export interface ExecuteOptions {
  force?: boolean;
}

/**
 * Executes an InstallPlan: applies file writes, JSONC config updates, and creates backups.
 */
export function executeInstallPlan(
  plan: InstallPlan,
  options: ExecuteOptions = {}
): InstallResult {
  if (plan.conflict === "conflict" && !options.force) {
    return {
      ok: false,
      message:
        plan.conflictDetails ??
        "Installation conflict detected. Explicit overwrite required.",
      error: "CONFLICT",
    };
  }

  let lastBackupPath: string | undefined;

  // 1. Apply file diffs
  for (const fileEntry of plan.targetFiles) {
    const fileRes = installFile(
      fileEntry.filePath,
      fileEntry.fullContent ?? "",
      options.force
    );
    if (!fileRes.ok) {
      return {
        ok: false,
        message: fileRes.error ?? `Failed to write file at ${fileEntry.filePath}`,
        error: "FILE_WRITE_FAILED",
      };
    }
    if (fileRes.backupPath) {
      lastBackupPath = fileRes.backupPath;
    }
  }

  // 2. Apply config diffs
  if (plan.configDiffs.length > 0) {
    try {
      const config = readConfigFile(plan.targetConfigPath);

      for (const diff of plan.configDiffs) {
        if (diff.path === "plugin") {
          addPluginToConfig(config, diff.newValue as string);
        } else if (diff.path.startsWith("mcp.")) {
          const mcpKey = diff.path.slice(4);
          addMcpToConfig(config, mcpKey, diff.newValue as McpServerConfig);
        } else if (diff.path === "theme") {
          setThemeInConfig(config, diff.newValue as string);
        }
      }

      const cfgRes = writeConfigFile(plan.targetConfigPath, config);
      if (cfgRes.backupPath) {
        lastBackupPath = cfgRes.backupPath;
      }
    } catch (err) {
      return {
        ok: false,
        message: `Failed to update configuration at ${plan.targetConfigPath}: ${
          err instanceof Error ? err.message : String(err)
        }`,
        error: "CONFIG_WRITE_FAILED",
      };
    }
  }

  return {
    ok: true,
    message: `Successfully installed "${plan.item.name}".`,
    backupPath: lastBackupPath,
  };
}

/**
 * Uninstalls a catalog item from the chosen scope.
 */
export function executeUninstall(
  item: CatalogItem,
  scope: InstallScope,
  options: PathResolutionOptions = {}
): InstallResult {
  const configPath = getScopeConfigPath(scope, options);
  const baseDir = getScopeBaseDir(scope, options);
  const idName = sanitizeIdentifier(item.name);
  let lastBackupPath: string | undefined;

  switch (item.kind) {
    case "plugin": {
      const pluginSpec = item.npmSpec ?? item.id;
      const config = readConfigFile(configPath);
      const removed = removePluginFromConfig(config, pluginSpec);
      if (removed) {
        const res = writeConfigFile(configPath, config);
        lastBackupPath = res.backupPath;
      }
      break;
    }

    case "mcp": {
      const config = readConfigFile(configPath);
      const removed = removeMcpFromConfig(config, idName);
      if (removed) {
        const res = writeConfigFile(configPath, config);
        lastBackupPath = res.backupPath;
      }
      break;
    }

    case "theme": {
      const config = readConfigFile(configPath);
      const removed = removeThemeFromConfig(config);
      if (removed) {
        const res = writeConfigFile(configPath, config);
        lastBackupPath = res.backupPath;
      }
      break;
    }

    case "skill": {
      const targetFile = `${baseDir}/skills/${idName}/SKILL.md`.replace(/\\/g, "/");
      removeFile(targetFile);
      break;
    }

    case "agent": {
      const targetFile = `${baseDir}/agent/${idName}.md`.replace(/\\/g, "/");
      removeFile(targetFile);
      break;
    }

    case "command": {
      const targetFile = `${baseDir}/command/${idName}.md`.replace(/\\/g, "/");
      removeFile(targetFile);
      break;
    }
  }

  return {
    ok: true,
    message: `Successfully uninstalled "${item.name}".`,
    backupPath: lastBackupPath,
  };
}

/**
 * Toggles an MCP server's enabled state in config.
 */
export function executeToggleMcp(
  item: CatalogItem,
  enabled: boolean,
  scope: InstallScope,
  options: PathResolutionOptions = {}
): InstallResult {
  const configPath = getScopeConfigPath(scope, options);
  const idName = sanitizeIdentifier(item.name);
  const config = readConfigFile(configPath);

  if (config.mcp && typeof config.mcp === "object" && !Array.isArray(config.mcp)) {
    const mcpMap = config.mcp as Record<string, McpServerConfig>;
    if (mcpMap[idName]) {
      mcpMap[idName].enabled = enabled;
      const res = writeConfigFile(configPath, config);
      return {
        ok: true,
        message: `MCP server "${idName}" is now ${enabled ? "enabled" : "disabled"}.`,
        backupPath: res.backupPath,
      };
    }
  }

  return {
    ok: false,
    message: `MCP server "${idName}" not found in configuration.`,
    error: "NOT_FOUND",
  };
}
