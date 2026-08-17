import * as fs from "node:fs";
import * as path from "node:path";
import { computeContentHash } from "../core/versions";
import {
  extractPackageName,
  extractPackageVersion,
  readConfigFile,
  type OpenCodeConfig,
} from "./config";
import {
  getGlobalConfigPath,
  getLocalConfigPath,
  getScopeBaseDir,
  type PathResolutionOptions,
} from "./paths";

export interface ConfigSnapshot {
  globalConfigPath: string;
  localConfigPath: string;
  globalConfig: OpenCodeConfig;
  localConfig: OpenCodeConfig;
  installedPluginNames: string[];
  installedPluginVersions: Record<string, string | null>;
  disabledPluginNames: string[];
  configuredMcpServers: Record<string, { enabled?: boolean; command?: string }>;
  existingFiles: string[];
  fileHashes: Record<string, string>;
}


/**
 * Gathers a complete snapshot of current OpenCode configurations and files across scopes.
 */
export function loadConfigSnapshot(
  options: PathResolutionOptions = {}
): ConfigSnapshot {
  const globalConfigPath = getGlobalConfigPath(options);
  const localConfigPath = getLocalConfigPath(options);

  const globalConfig = readConfigFile(globalConfigPath);
  const localConfig = readConfigFile(localConfigPath);

  const installedPluginNames: string[] = [];
  const installedPluginVersions: Record<string, string | null> = {};
  const disabledPluginNames: string[] = [];

  const extractPlugins = (cfg: OpenCodeConfig) => {
    if (Array.isArray(cfg.plugin)) {
      for (const entry of cfg.plugin) {
        if (typeof entry === "string") {
          const pkgName = extractPackageName(entry);
          const version = extractPackageVersion(entry);
          installedPluginNames.push(pkgName);
          installedPluginVersions[pkgName] = version;
        }
      }
    }
  };

  extractPlugins(globalConfig);
  extractPlugins(localConfig);

  const configuredMcpServers: Record<
    string,
    { enabled?: boolean; command?: string }
  > = {};

  const extractMcp = (cfg: OpenCodeConfig) => {
    if (cfg.mcp && typeof cfg.mcp === "object" && !Array.isArray(cfg.mcp)) {
      for (const [key, val] of Object.entries(cfg.mcp)) {
        if (val && typeof val === "object") {
          const obj = val as Record<string, unknown>;
          configuredMcpServers[key.toLowerCase()] = {
            enabled: obj.enabled !== false,
            command: typeof obj.command === "string" ? obj.command : undefined,
          };
        }
      }
    }
  };

  extractMcp(globalConfig);
  extractMcp(localConfig);

  const existingFiles: string[] = [];
  const fileHashes: Record<string, string> = {};

  const scanDir = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    try {
      const walk = (current: string) => {
        const entries = fs.readdirSync(current, { withFileTypes: true });
        for (const entry of entries) {
          const full = path.join(current, entry.name);
          if (entry.isDirectory()) {
            walk(full);
          } else {
            const normalized = full.replace(/\\/g, "/");
            existingFiles.push(normalized);
            try {
              const content = fs.readFileSync(full, "utf8");
              fileHashes[normalized] = computeContentHash(content);
            } catch {
              // ignore unreadable file
            }
          }
        }
      };
      walk(dir);
    } catch {
      // ignore scan error
    }
  };

  scanDir(getScopeBaseDir("global", options));
  scanDir(getScopeBaseDir("local", options));

  return {
    globalConfigPath,
    localConfigPath,
    globalConfig,
    localConfig,
    installedPluginNames,
    installedPluginVersions,
    disabledPluginNames,
    configuredMcpServers,
    existingFiles,
    fileHashes,
  };
}

