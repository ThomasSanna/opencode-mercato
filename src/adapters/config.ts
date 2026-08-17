import * as commentJson from "comment-json";
import * as fs from "node:fs";
import * as path from "node:path";

export interface McpServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  type?: string;
  enabled?: boolean;
  [key: string]: unknown;
}

export type OpenCodeConfig = Record<string, any>;

/**
 * Reads an OpenCode config file (JSON or JSONC) and parses it preserving comments.
 * Returns an empty object if the file does not exist.
 */
export function readConfigFile(filePath: string): OpenCodeConfig {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    if (!raw.trim()) {
      return {};
    }
    const parsed = commentJson.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as OpenCodeConfig;
    }
    return {};
  } catch (err) {
    throw new Error(
      `Failed to parse OpenCode configuration file at "${filePath}": ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
}

/**
 * Writes an OpenCode config file atomically with backup creation.
 */
export function writeConfigFile(
  filePath: string,
  config: OpenCodeConfig
): { backupPath?: string } {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let backupPath: string | undefined;
  if (fs.existsSync(filePath)) {
    backupPath = `${filePath}.bak`;
    fs.copyFileSync(filePath, backupPath);
  }

  const content = commentJson.stringify(config, null, 2) + "\n";
  const tempPath = `${filePath}.tmp.${process.pid}.${Date.now()}`;

  try {
    fs.writeFileSync(tempPath, content, "utf8");
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch {
        // ignore cleanup error
      }
    }
    throw new Error(
      `Failed to atomically write configuration to "${filePath}": ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  return { backupPath };
}

/**
 * Extracts base package name from an npm spec (e.g. "@scope/pkg@1.0.0" -> "@scope/pkg", "pkg@2.0" -> "pkg").
 */
export function extractPackageName(spec: string): string {
  const trimmed = spec.trim();
  if (trimmed.startsWith("@")) {
    const secondAt = trimmed.indexOf("@", 1);
    return secondAt === -1 ? trimmed : trimmed.slice(0, secondAt);
  }
  const firstAt = trimmed.indexOf("@");
  return firstAt === -1 ? trimmed : trimmed.slice(0, firstAt);
}

/**
 * Extracts pinned version from an npm spec (e.g. "@scope/pkg@1.0.0" -> "1.0.0", "pkg" -> null).
 */
export function extractPackageVersion(spec: string): string | null {
  const trimmed = spec.trim();
  if (trimmed.startsWith("@")) {
    const secondAt = trimmed.indexOf("@", 1);
    return secondAt === -1 ? null : trimmed.slice(secondAt + 1) || null;
  }
  const firstAt = trimmed.indexOf("@");
  return firstAt === -1 ? null : trimmed.slice(firstAt + 1) || null;
}


/**
 * Checks if a plugin spec or package is present in the config's plugin array.
 */
export function isPluginInConfig(
  config: OpenCodeConfig,
  pluginSpec: string
): boolean {
  if (!Array.isArray(config.plugin)) {
    return false;
  }
  const targetPkg = extractPackageName(pluginSpec);
  return config.plugin.some((entry: unknown) => {
    if (typeof entry !== "string") return false;
    return entry === pluginSpec || extractPackageName(entry) === targetPkg;
  });
}

/**
 * Adds or updates a plugin entry in the config's plugin array.
 */
export function addPluginToConfig(
  config: OpenCodeConfig,
  pluginSpec: string
): void {
  if (!Array.isArray(config.plugin)) {
    config.plugin = [];
  }

  const targetPkg = extractPackageName(pluginSpec);
  const existingIdx = config.plugin.findIndex((entry: unknown) => {
    return typeof entry === "string" && extractPackageName(entry) === targetPkg;
  });

  if (existingIdx >= 0) {
    config.plugin[existingIdx] = pluginSpec;
  } else {
    config.plugin.push(pluginSpec);
  }
}

/**
 * Removes a plugin entry from the config's plugin array.
 */
export function removePluginFromConfig(
  config: OpenCodeConfig,
  pluginSpec: string
): boolean {
  if (!Array.isArray(config.plugin)) {
    return false;
  }

  const targetPkg = extractPackageName(pluginSpec);
  const initialLength = config.plugin.length;
  config.plugin = config.plugin.filter((entry: unknown) => {
    if (typeof entry !== "string") return true;
    return entry !== pluginSpec && extractPackageName(entry) !== targetPkg;
  });

  return config.plugin.length < initialLength;
}

/**
 * Checks if an MCP server is configured in config.mcp.
 */
export function isMcpInConfig(config: OpenCodeConfig, name: string): boolean {
  if (!config.mcp || typeof config.mcp !== "object") {
    return false;
  }
  return Object.prototype.hasOwnProperty.call(config.mcp, name);
}

/**
 * Adds or updates an MCP server configuration in config.mcp.
 */
export function addMcpToConfig(
  config: OpenCodeConfig,
  name: string,
  serverDef: McpServerConfig | Record<string, unknown>
): void {
  if (!config.mcp || typeof config.mcp !== "object" || Array.isArray(config.mcp)) {
    config.mcp = {};
  }
  config.mcp[name] = serverDef;
}

/**
 * Removes an MCP server configuration from config.mcp.
 */
export function removeMcpFromConfig(
  config: OpenCodeConfig,
  name: string
): boolean {
  if (!config.mcp || typeof config.mcp !== "object") {
    return false;
  }
  if (Object.prototype.hasOwnProperty.call(config.mcp, name)) {
    delete config.mcp[name];
    return true;
  }
  return false;
}

/**
 * Sets the theme in the config.
 */
export function setThemeInConfig(
  config: OpenCodeConfig,
  themeName: string
): void {
  config.theme = themeName;
}

/**
 * Removes the theme from the config.
 */
export function removeThemeFromConfig(config: OpenCodeConfig): boolean {
  if (Object.prototype.hasOwnProperty.call(config, "theme")) {
    delete config.theme;
    return true;
  }
  return false;
}
