import { describe, expect, it } from "bun:test";
import * as os from "node:os";
import * as path from "node:path";
import {
  getGlobalConfigDir,
  getGlobalConfigPath,
  getLocalConfigDir,
  getLocalConfigPath,
  getScopeBaseDir,
  getScopeConfigPath,
  normalizePath,
} from "../../src/adapters/paths";

describe("paths adapter", () => {
  it("normalizes paths to forward slashes", () => {
    expect(normalizePath("C:\\Users\\Alice\\AppData\\Roaming\\opencode")).toBe(
      "C:/Users/Alice/AppData/Roaming/opencode"
    );
    expect(normalizePath("foo/bar/baz.json")).toBe("foo/bar/baz.json");
    expect(normalizePath("")).toBe("");
  });

  it("resolves global config dir on Windows using APPDATA", () => {
    const dir = getGlobalConfigDir({
      platform: "win32",
      env: { APPDATA: "C:\\Users\\Alice\\AppData\\Roaming" },
    });
    expect(dir).toBe(path.join("C:\\Users\\Alice\\AppData\\Roaming", "opencode"));
  });

  it("resolves global config dir on Windows using USERPROFILE fallback", () => {
    const dir = getGlobalConfigDir({
      platform: "win32",
      env: { USERPROFILE: "C:\\Users\\Bob" },
    });
    expect(dir).toBe(path.join("C:\\Users\\Bob", "AppData", "Roaming", "opencode"));
  });

  it("resolves global config dir on Windows with default fallback", () => {
    const dir = getGlobalConfigDir({
      platform: "win32",
      env: {},
    });
    expect(dir).toBe(path.join("C:\\Users\\Default\\AppData\\Roaming", "opencode"));
  });

  it("resolves global config dir on POSIX using XDG_CONFIG_HOME", () => {
    const dir = getGlobalConfigDir({
      platform: "linux",
      env: { XDG_CONFIG_HOME: "/custom/config" },
    });
    expect(dir).toBe(path.join("/custom/config", "opencode"));
  });

  it("resolves global config dir on POSIX using HOME fallback", () => {
    const dir = getGlobalConfigDir({
      platform: "linux",
      env: { HOME: "/home/user" },
    });
    expect(dir).toBe(path.join("/home/user", ".config", "opencode"));
  });

  it("resolves global config path ending in opencode.json", () => {
    const configPath = getGlobalConfigPath({
      platform: "linux",
      env: { HOME: "/home/user" },
    });
    expect(configPath).toBe(path.join("/home/user", ".config", "opencode", "opencode.json"));
  });

  it("resolves local config dir relative to cwd", () => {
    const cwd = "/projects/my-app";
    const dir = getLocalConfigDir({ cwd });
    expect(dir).toBe(path.join(cwd, ".opencode"));
  });

  it("resolves local config path defaulting to root opencode.json", () => {
    const cwd = "/projects/my-app";
    const configPath = getLocalConfigPath({ cwd });
    expect(configPath).toBe(path.join(cwd, "opencode.json"));
  });

  it("resolves scope config path and base dir according to scope parameter", () => {
    const env = { HOME: "/home/user" };
    const cwd = "/projects/my-app";
    const platform = "linux" as const;

    const globalCfg = getScopeConfigPath("global", { env, cwd, platform });
    const localCfg = getScopeConfigPath("local", { env, cwd, platform });
    expect(globalCfg).toBe(path.join("/home/user", ".config", "opencode", "opencode.json"));
    expect(localCfg).toBe(path.join("/projects/my-app", "opencode.json"));

    const globalBase = getScopeBaseDir("global", { env, cwd, platform });
    const localBase = getScopeBaseDir("local", { env, cwd, platform });
    expect(globalBase).toBe(path.join("/home/user", ".config", "opencode"));
    expect(localBase).toBe(path.join("/projects/my-app", ".opencode"));
  });
});
