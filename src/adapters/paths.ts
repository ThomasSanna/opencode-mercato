import * as fs from "node:fs";
import * as path from "node:path";

export type InstallScope = "global" | "local";

export interface PathResolutionOptions {
  cwd?: string;
  env?: Record<string, string | undefined>;
  platform?: NodeJS.Platform;
}

/**
 * Normalizes a file system path to use standard forward slashes,
 * resolving redundant dots and keeping drive letters or root intact.
 */
export function normalizePath(p: string): string {
  if (!p) return "";
  return p.replace(/\\/g, "/");
}

/**
 * Returns the global OpenCode configuration directory for the given platform and environment.
 * Windows: %APPDATA%\opencode (fallback %USERPROFILE%\AppData\Roaming\opencode)
 * POSIX / macOS / Linux: $XDG_CONFIG_HOME/opencode or ~/.config/opencode
 */
export function getGlobalConfigDir(options: PathResolutionOptions = {}): string {
  const env = options.env ?? process.env;
  const platform = options.platform ?? process.platform;

  if (platform === "win32") {
    const userProfile = env.USERPROFILE ?? env.HOME;
    if (userProfile) {
      const dotConfig = path.join(userProfile, ".config", "opencode");
      if (fs.existsSync(dotConfig)) {
        return dotConfig;
      }
    }
    const appData =
      env.APPDATA ??
      (env.USERPROFILE
        ? path.join(env.USERPROFILE, "AppData", "Roaming")
        : "C:\\Users\\Default\\AppData\\Roaming");
    return path.join(appData, "opencode");
  }

  const xdg = env.XDG_CONFIG_HOME;
  if (xdg && xdg.trim().length > 0) {
    return path.join(xdg, "opencode");
  }

  const home = env.HOME ?? "~";
  return path.join(home, ".config", "opencode");
}

/**
 * Returns the global opencode.json path.
 */
export function getGlobalConfigPath(options: PathResolutionOptions = {}): string {
  return path.join(getGlobalConfigDir(options), "opencode.json");
}

/**
 * Returns the local project .opencode directory.
 */
export function getLocalConfigDir(options: PathResolutionOptions = {}): string {
  const cwd = options.cwd ?? process.cwd();
  return path.join(cwd, ".opencode");
}

/**
 * Returns the local opencode.json path for a project.
 * Prefers ./opencode.json if present; otherwise returns ./.opencode/opencode.json.
 */
export function getLocalConfigPath(options: PathResolutionOptions = {}): string {
  const cwd = options.cwd ?? process.cwd();
  const rootJson = path.join(cwd, "opencode.json");
  const dotJson = path.join(cwd, ".opencode", "opencode.json");

  if (fs.existsSync(rootJson)) {
    return rootJson;
  }
  if (fs.existsSync(dotJson)) {
    return dotJson;
  }
  return rootJson;
}

/**
 * Resolves the configuration path for the chosen scope.
 */
export function getScopeConfigPath(
  scope: InstallScope,
  options: PathResolutionOptions = {}
): string {
  return scope === "global"
    ? getGlobalConfigPath(options)
    : getLocalConfigPath(options);
}

/**
 * Resolves the base directory for file assets (skills, agents, commands) for the chosen scope.
 */
export function getScopeBaseDir(
  scope: InstallScope,
  options: PathResolutionOptions = {}
): string {
  return scope === "global"
    ? getGlobalConfigDir(options)
    : getLocalConfigDir(options);
}
