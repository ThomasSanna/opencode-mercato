import { describe, expect, it } from "bun:test";
import type { CatalogItem } from "../../src/core/model";
import { DEFAULT_SETTINGS } from "../../src/core/settings";
import {
  checkItemUpdate,
  compareSemver,
  computeContentHash,
  extractPackageName,
  extractPackageVersion,
  getUpdateState,
  isAutoUpdateEligible,
  parseSemver,
  semverDiff,
} from "../../src/core/versions";

const samplePlugin: CatalogItem = {
  id: "opencode-plugin-test",
  kind: "plugin",
  name: "opencode-plugin-test",
  description: "Test plugin",
  repoUrl: "https://github.com/test/plugin",
  npmSpec: "opencode-plugin-test",
  homepage: null,
  tags: [],
  installSpec: {},
  sources: [
    {
      source: "cafe",
      trust: { level: "high", score: 30 },
      rawId: "test-plugin",
      seenAt: 1000,
    },
  ],
  bestTrust: { level: "high", score: 30 },
};

const sampleSkill: CatalogItem = {
  id: "test-skill",
  kind: "skill",
  name: "test-skill",
  description: "Test skill",
  repoUrl: "https://github.com/test/skill",
  npmSpec: null,
  homepage: null,
  tags: [],
  installSpec: {},
  sources: [
    {
      source: "awesome",
      trust: { level: "medium", score: 20 },
      rawId: "test-skill",
      seenAt: 1000,
    },
  ],
  bestTrust: { level: "medium", score: 20 },
};

describe("Versions & SemVer engine", () => {
  describe("parseSemver", () => {
    it("parses standard semver strings", () => {
      const parsed = parseSemver("1.2.3");
      expect(parsed).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: undefined,
        build: undefined,
        raw: "1.2.3",
      });
    });

    it("parses semver with leading 'v'", () => {
      const parsed = parseSemver("v2.10.4");
      expect(parsed).toEqual({
        major: 2,
        minor: 10,
        patch: 4,
        prerelease: undefined,
        build: undefined,
        raw: "v2.10.4",
      });
    });

    it("parses semver with prerelease and build metadata", () => {
      const parsed = parseSemver("1.0.0-beta.2+20260817");
      expect(parsed).toEqual({
        major: 1,
        minor: 0,
        patch: 0,
        prerelease: "beta.2",
        build: "20260817",
        raw: "1.0.0-beta.2+20260817",
      });
    });

    it("handles loose versions like '2.1' or '3'", () => {
      expect(parseSemver("2.1")).toEqual({
        major: 2,
        minor: 1,
        patch: 0,
        prerelease: undefined,
        build: undefined,
        raw: "2.1",
      });
      expect(parseSemver("3")).toEqual({
        major: 3,
        minor: 0,
        patch: 0,
        prerelease: undefined,
        build: undefined,
        raw: "3",
      });
    });

    it("returns null for invalid semver strings", () => {
      expect(parseSemver("invalid")).toBeNull();
      expect(parseSemver("")).toBeNull();
      expect(parseSemver(null as unknown as string)).toBeNull();
    });

    it("extracts package names and versions accurately including scoped packages", () => {
      expect(extractPackageName("@scope/pkg@1.0.0")).toBe("@scope/pkg");
      expect(extractPackageName("@scope/pkg")).toBe("@scope/pkg");
      expect(extractPackageName("pkg@2.0.0")).toBe("pkg");
      expect(extractPackageName("pkg")).toBe("pkg");

      expect(extractPackageVersion("@scope/pkg@1.0.0")).toBe("1.0.0");
      expect(extractPackageVersion("@scope/pkg")).toBeNull();
      expect(extractPackageVersion("pkg@2.0.0")).toBe("2.0.0");
      expect(extractPackageVersion("pkg")).toBeNull();
    });
  });

  describe("compareSemver", () => {
    it("compares major, minor, and patch correctly", () => {
      expect(compareSemver("2.0.0", "1.9.9")).toBeGreaterThan(0);
      expect(compareSemver("1.1.0", "1.0.9")).toBeGreaterThan(0);
      expect(compareSemver("1.0.2", "1.0.1")).toBeGreaterThan(0);
      expect(compareSemver("1.0.0", "1.0.0")).toBe(0);
      expect(compareSemver("1.0.0", "2.0.0")).toBeLessThan(0);
    });

    it("handles prerelease precedence correctly", () => {
      // Normal release has higher precedence than prerelease
      expect(compareSemver("1.0.0", "1.0.0-alpha")).toBeGreaterThan(0);
      expect(compareSemver("1.0.0-alpha.1", "1.0.0-alpha")).toBeGreaterThan(0);
      expect(compareSemver("1.0.0-beta", "1.0.0-alpha")).toBeGreaterThan(0);
      expect(compareSemver("1.0.0-beta.2", "1.0.0-beta.10")).toBeLessThan(0);
    });
  });

  describe("semverDiff", () => {
    it("classifies major diffs", () => {
      expect(semverDiff("1.2.3", "2.0.0")).toBe("major");
    });

    it("classifies minor diffs", () => {
      expect(semverDiff("1.2.3", "1.3.0")).toBe("minor");
    });

    it("classifies patch diffs", () => {
      expect(semverDiff("1.2.3", "1.2.4")).toBe("patch");
    });

    it("classifies prerelease diffs", () => {
      expect(semverDiff("1.0.0-alpha", "1.0.0-beta")).toBe("prerelease");
    });

    it("classifies downgrades and identical versions", () => {
      expect(semverDiff("2.0.0", "1.9.0")).toBe("downgrade");
      expect(semverDiff("1.2.3", "1.2.3")).toBe("identical");
    });
  });

  describe("computeContentHash", () => {
    it("produces deterministic 16-character hashes ignoring CRLF differences", () => {
      const h1 = computeContentHash("# Title\r\nSome content");
      const h2 = computeContentHash("# Title\nSome content");
      expect(h1).toHaveLength(16);
      expect(h1).toBe(h2);
    });

    it("produces different hashes for differing content", () => {
      const h1 = computeContentHash("Hello");
      const h2 = computeContentHash("World");
      expect(h1).not.toBe(h2);
    });
  });

  describe("isAutoUpdateEligible", () => {
    it("allows patch and minor updates by default", () => {
      expect(isAutoUpdateEligible("1.0.0", "1.0.1")).toBe(true);
      expect(isAutoUpdateEligible("1.0.0", "1.1.0")).toBe(true);
    });

    it("rejects major updates when autoUpdateMajor is false", () => {
      expect(isAutoUpdateEligible("1.0.0", "2.0.0")).toBe(false);
    });

    it("allows major updates when autoUpdateMajor is true", () => {
      expect(
        isAutoUpdateEligible("1.0.0", "2.0.0", {
          ...DEFAULT_SETTINGS,
          autoUpdateMajor: true,
        })
      ).toBe(true);
    });

    it("rejects all updates when autoUpdate is disabled", () => {
      expect(
        isAutoUpdateEligible("1.0.0", "1.0.1", {
          ...DEFAULT_SETTINGS,
          autoUpdate: false,
        })
      ).toBe(false);
    });

    it("rejects downgrades", () => {
      expect(isAutoUpdateEligible("2.0.0", "1.0.0")).toBe(false);
    });
  });

  describe("getUpdateState", () => {
    it("returns up-to-date when versions match", () => {
      expect(getUpdateState("1.0.0", "1.0.0")).toBe("up-to-date");
    });

    it("returns update-available for patch/minor", () => {
      expect(getUpdateState("1.0.0", "1.0.1")).toBe("update-available");
      expect(getUpdateState("1.0.0", "1.2.0")).toBe("update-available");
    });

    it("returns major-available for major version jumps", () => {
      expect(getUpdateState("1.0.0", "2.0.0")).toBe("major-available");
    });

    it("returns downgrade-available when current is ahead of latest", () => {
      expect(getUpdateState("2.0.0", "1.0.0")).toBe("downgrade-available");
    });

    it("handles content hash update states", () => {
      expect(getUpdateState("hash1", "hash2")).toBe("update-available");
      expect(getUpdateState("hash1", "hash1")).toBe("up-to-date");
      expect(getUpdateState(null, "hash1")).toBe("unknown");
    });
  });

  describe("checkItemUpdate", () => {
    it("checks plugin updates with semver analysis", () => {
      const info = checkItemUpdate(samplePlugin, "1.0.0", "1.1.0");
      expect(info).toEqual({
        itemId: "opencode-plugin-test",
        kind: "plugin",
        currentVersion: "1.0.0",
        latestVersion: "1.1.0",
        updateState: "update-available",
        diffType: "minor",
        autoEligible: true,
      });
    });

    it("flags major plugin update as not auto-eligible by default", () => {
      const info = checkItemUpdate(samplePlugin, "1.0.0", "2.0.0");
      expect(info.updateState).toBe("major-available");
      expect(info.diffType).toBe("major");
      expect(info.autoEligible).toBe(false);
    });

    it("checks skill updates based on content hashes", () => {
      const info = checkItemUpdate(sampleSkill, "hash-a", "hash-b");
      expect(info.updateState).toBe("update-available");
      expect(info.diffType).toBe("content");
      expect(info.autoEligible).toBe(true);
    });

    it("recognizes up-to-date skill content hash", () => {
      const info = checkItemUpdate(sampleSkill, "hash-a", "hash-a");
      expect(info.updateState).toBe("up-to-date");
      expect(info.diffType).toBe("identical");
      expect(info.autoEligible).toBe(false);
    });
  });
});
