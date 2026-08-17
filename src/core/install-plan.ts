import {
  extractMcpConfig,
  generateAgentContent,
  generateCommandContent,
  generateSkillContent,
  generateWarnings,
  sanitizeIdentifier,
  type McpDefinition,
  type PlanWarning,
  type WarningSeverity,
} from "./generator";
import type { CatalogItem, Kind, SourceId } from "./model";
import { extractPackageName } from "./versions";

export type {
  McpDefinition,
  PlanWarning,
  WarningSeverity,
};
export {
  extractMcpConfig,
  generateAgentContent,
  generateCommandContent,
  generateSkillContent,
  generateWarnings,
  sanitizeIdentifier,
};

export type InstallScope = "global" | "local";

export interface ConfigDiffEntry {
  path: string;
  action: "add" | "remove" | "replace";
  oldValue?: unknown;
  newValue?: unknown;
}

export interface FileDiffEntry {
  filePath: string;
  action: "create" | "update" | "delete";
  contentPreview?: string;
  fullContent?: string;
}

export type ConflictType = "none" | "identical" | "conflict";

export interface InstallPlan {
  item: CatalogItem;
  scope: InstallScope;
  targetConfigPath: string;
  targetFiles: FileDiffEntry[];
  configDiffs: ConfigDiffEntry[];
  warnings: PlanWarning[];
  conflict: ConflictType;
  conflictDetails?: string;
  summary: string;
}

export interface ExistingFileCheck {
  exists: boolean;
  content?: string;
}

export interface ExistingStateContext {
  targetConfigPath: string;
  baseDir: string;
  existingConfig: Record<string, unknown>;
  checkFileExists?: (filePath: string) => ExistingFileCheck;
}

export interface InstallPlanOptions {
  targetVersion?: string;
}


/**
 * Computes an InstallPlan for any CatalogItem given the target scope and current environment state.
 */
export function createInstallPlan(
  item: CatalogItem,
  scope: InstallScope,
  context: ExistingStateContext,
  options: InstallPlanOptions = {}
): InstallPlan {
  const warnings = generateWarnings(item);
  const targetConfigPath = context.targetConfigPath;
  const config = context.existingConfig;
  const checkFile = context.checkFileExists ?? (() => ({ exists: false }));

  const configDiffs: ConfigDiffEntry[] = [];
  const targetFiles: FileDiffEntry[] = [];
  let conflict: ConflictType = "none";
  let conflictDetails: string | undefined;
  let summary = "";

  const idName = sanitizeIdentifier(item.name);

  switch (item.kind) {
    case "plugin": {
      const basePkg = item.npmSpec ? extractPackageName(item.npmSpec) : item.id;
      const pluginSpec = options.targetVersion
        ? `${basePkg}@${options.targetVersion}`
        : (item.npmSpec ?? item.id);
      summary = `Install plugin "${pluginSpec}" into ${scope} config`;

      const currentPlugins = Array.isArray(config.plugin) ? config.plugin : [];
      const hasExact = currentPlugins.includes(pluginSpec);
      const hasPkg = currentPlugins.some(
        (p: unknown) =>
          typeof p === "string" &&
          (p === pluginSpec || extractPackageName(p) === basePkg)
      );

      const existingSpec = hasPkg
        ? (currentPlugins.find(
            (p: unknown) =>
              typeof p === "string" &&
              extractPackageName(p) === basePkg
          ) as string)
        : undefined;

      if (hasExact) {
        conflict = "identical";
        conflictDetails = `Plugin "${pluginSpec}" is already configured in ${scope} config.`;
      } else if (hasPkg) {
        if (options.targetVersion) {
          conflict = "none";
          summary = `Update plugin from "${existingSpec}" to "${pluginSpec}" in ${scope} config`;
        } else {
          conflict = "conflict";
          conflictDetails = `A different version of plugin "${pluginSpec}" is already configured in ${scope} config.`;
        }
      }

      configDiffs.push({
        path: "plugin",
        action: hasPkg ? "replace" : "add",
        oldValue: existingSpec,
        newValue: pluginSpec,
      });
      break;
    }


    case "mcp": {
      const mcpDef = extractMcpConfig(item);
      const serverKey = idName;
      summary = `Configure MCP server "${serverKey}" in ${scope} config`;

      const existingMcp =
        config.mcp && typeof config.mcp === "object"
          ? (config.mcp as Record<string, unknown>)[serverKey]
          : undefined;


      if (existingMcp) {
        const isIdentical =
          JSON.stringify(existingMcp) === JSON.stringify(mcpDef);
        if (isIdentical) {
          conflict = "identical";
          conflictDetails = `MCP server "${serverKey}" is already configured with identical settings.`;
        } else {
          conflict = "conflict";
          conflictDetails = `MCP server "${serverKey}" already exists with different settings.`;
        }
      }

      configDiffs.push({
        path: `mcp.${serverKey}`,
        action: existingMcp ? "replace" : "add",
        oldValue: existingMcp,
        newValue: mcpDef,
      });
      break;
    }

    case "skill": {
      const targetFilePath = `${context.baseDir}/skills/${idName}/SKILL.md`.replace(/\\/g, "/");
      summary = `Create skill file at ${targetFilePath}`;
      const content = generateSkillContent(item);
      const fileStatus = checkFile(targetFilePath);

      if (fileStatus.exists) {
        if (fileStatus.content?.trim() === content.trim()) {
          conflict = "identical";
          conflictDetails = `Skill "${idName}" already exists at ${targetFilePath} with identical content.`;
        } else {
          conflict = "conflict";
          conflictDetails = `Skill "${idName}" already exists at ${targetFilePath} with different content.`;
        }
      }

      targetFiles.push({
        filePath: targetFilePath,
        action: fileStatus.exists ? "update" : "create",
        contentPreview: content.slice(0, 200),
        fullContent: content,
      });
      break;
    }

    case "agent": {
      const targetFilePath = `${context.baseDir}/agent/${idName}.md`.replace(/\\/g, "/");
      summary = `Create agent file at ${targetFilePath}`;
      const content = generateAgentContent(item);
      const fileStatus = checkFile(targetFilePath);

      if (fileStatus.exists) {
        if (fileStatus.content?.trim() === content.trim()) {
          conflict = "identical";
          conflictDetails = `Agent "${idName}" already exists at ${targetFilePath} with identical content.`;
        } else {
          conflict = "conflict";
          conflictDetails = `Agent "${idName}" already exists at ${targetFilePath} with different content.`;
        }
      }

      targetFiles.push({
        filePath: targetFilePath,
        action: fileStatus.exists ? "update" : "create",
        contentPreview: content.slice(0, 200),
        fullContent: content,
      });
      break;
    }

    case "command": {
      const targetFilePath = `${context.baseDir}/command/${idName}.md`.replace(/\\/g, "/");
      summary = `Create command file at ${targetFilePath}`;
      const content = generateCommandContent(item);
      const fileStatus = checkFile(targetFilePath);

      if (fileStatus.exists) {
        if (fileStatus.content?.trim() === content.trim()) {
          conflict = "identical";
          conflictDetails = `Command "${idName}" already exists at ${targetFilePath} with identical content.`;
        } else {
          conflict = "conflict";
          conflictDetails = `Command "${idName}" already exists at ${targetFilePath} with different content.`;
        }
      }

      targetFiles.push({
        filePath: targetFilePath,
        action: fileStatus.exists ? "update" : "create",
        contentPreview: content.slice(0, 200),
        fullContent: content,
      });
      break;
    }

    case "theme": {
      summary = `Set active theme to "${item.name}" in ${scope} config`;
      const currentTheme = config.theme;

      if (currentTheme === item.name) {
        conflict = "identical";
        conflictDetails = `Theme is already set to "${item.name}".`;
      } else if (currentTheme) {
        conflict = "conflict";
        conflictDetails = `Theme is currently set to "${currentTheme}".`;
      }

      configDiffs.push({
        path: "theme",
        action: currentTheme ? "replace" : "add",
        oldValue: currentTheme,
        newValue: item.name,
      });
      break;
    }
  }

  return {
    item,
    scope,
    targetConfigPath,
    targetFiles,
    configDiffs,
    warnings,
    conflict,
    conflictDetails,
    summary,
  };
}
