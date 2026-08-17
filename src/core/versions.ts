import { createHash } from "node:crypto";
import type { CatalogItem, Kind } from "./model";
import { DEFAULT_SETTINGS, type MercatoSettings } from "./settings";

export interface SemVer {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  build?: string;
  raw: string;
}

export type VersionDiffType =
  | "major"
  | "minor"
  | "patch"
  | "prerelease"
  | "content"
  | "identical"
  | "downgrade"
  | "unknown";

export type UpdateState =
  | "up-to-date"
  | "update-available"
  | "major-available"
  | "downgrade-available"
  | "unknown";

export interface ItemUpdateInfo {
  itemId: string;
  kind: Kind;
  currentVersion: string | null;
  latestVersion: string | null;
  updateState: UpdateState;
  diffType: VersionDiffType;
  autoEligible: boolean;
}

const SEMVER_REGEX =
  /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

/**
 * Parses a semantic version string into a structured SemVer object.
 */
export function parseSemver(versionStr: string): SemVer | null {
  if (!versionStr || typeof versionStr !== "string") return null;

  const trimmed = versionStr.trim();
  const match = SEMVER_REGEX.exec(trimmed);
  if (!match) {
    // Attempt standard loose parsing e.g. "1" -> "1.0.0", "1.2" -> "1.2.0"
    const looseMatch = /^v?(\d+)(?:\.(\d+))?$/.exec(trimmed);
    if (looseMatch) {
      const major = parseInt(looseMatch[1] ?? "0", 10);
      const minor = parseInt(looseMatch[2] ?? "0", 10);
      return {
        major,
        minor,
        patch: 0,
        raw: trimmed,
      };
    }
    return null;
  }

  const majorStr = match[1];
  const minorStr = match[2];
  const patchStr = match[3];
  if (majorStr === undefined || minorStr === undefined || patchStr === undefined) {
    return null;
  }

  const major = parseInt(majorStr, 10);
  const minor = parseInt(minorStr, 10);
  const patch = parseInt(patchStr, 10);

  return {
    major,
    minor,
    patch,
    prerelease: match[4],
    build: match[5],
    raw: trimmed,
  };
}

/**
 * Compares two prerelease identifier arrays according to SemVer 2.0.0 rules.
 */
function comparePrerelease(a?: string, b?: string): number {
  if (!a && !b) return 0;
  if (!a && b) return 1; // Normal version has higher precedence than prerelease
  if (a && !b) return -1;
  if (!a || !b) return 0;

  const partsA = a.split(".");
  const partsB = b.split(".");
  const maxLen = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < maxLen; i++) {
    const pA = partsA[i];
    const pB = partsB[i];

    if (pA === undefined) return -1;
    if (pB === undefined) return 1;
    if (pA === pB) continue;

    const numA = Number(pA);
    const numB = Number(pB);
    const isNumA = !Number.isNaN(numA) && /^\d+$/.test(pA);
    const isNumB = !Number.isNaN(numB) && /^\d+$/.test(pB);

    if (isNumA && isNumB) {
      return numA - numB;
    }
    if (isNumA && !isNumB) {
      return -1; // Numeric identifiers have lower precedence than alphanumeric
    }
    if (!isNumA && isNumB) {
      return 1;
    }

    return pA.localeCompare(pB);
  }

  return 0;
}

/**
 * Compares two semantic version strings or objects.
 * Returns > 0 if v1 > v2, < 0 if v1 < v2, and 0 if v1 === v2.
 */
export function compareSemver(
  v1: string | SemVer,
  v2: string | SemVer
): number {
  const sem1 = typeof v1 === "string" ? parseSemver(v1) : v1;
  const sem2 = typeof v2 === "string" ? parseSemver(v2) : v2;

  if (!sem1 && !sem2) return 0;
  if (!sem1) return -1;
  if (!sem2) return 1;

  if (sem1.major !== sem2.major) return sem1.major - sem2.major;
  if (sem1.minor !== sem2.minor) return sem1.minor - sem2.minor;
  if (sem1.patch !== sem2.patch) return sem1.patch - sem2.patch;

  return comparePrerelease(sem1.prerelease, sem2.prerelease);
}

/**
 * Determines the diff type between a current version and target version.
 */
export function semverDiff(current: string, target: string): VersionDiffType {
  const c = parseSemver(current);
  const t = parseSemver(target);

  if (!c || !t) return "unknown";

  const cmp = compareSemver(t, c);
  if (cmp === 0) return "identical";
  if (cmp < 0) return "downgrade";

  if (t.major > c.major) return "major";
  if (t.minor > c.minor) return "minor";
  if (t.patch > c.patch) return "patch";
  if (t.prerelease !== c.prerelease) return "prerelease";

  return "identical";
}

/**
 * Computes a deterministic short content hash (first 16 hex chars of SHA-256).
 */
export function computeContentHash(content: string): string {
  return createHash("sha256")
    .update(content.trim().replace(/\r\n/g, "\n"))
    .digest("hex")
    .slice(0, 16);
}

/**
 * Checks if a target version is eligible for automatic update under current settings.
 */
export function isAutoUpdateEligible(
  currentVersion: string,
  targetVersion: string,
  settings: MercatoSettings = DEFAULT_SETTINGS
): boolean {
  if (!settings.autoUpdate) return false;

  const diff = semverDiff(currentVersion, targetVersion);
  if (diff === "patch" || diff === "minor") return true;
  if (diff === "major") return settings.autoUpdateMajor;

  return false;
}

/**
 * Derives the UpdateState between a current version (or hash) and latest version.
 */
export function getUpdateState(
  current: string | null,
  latest: string | null
): UpdateState {
  if (!current || !latest) return "unknown";
  if (current === latest) return "up-to-date";

  const cSem = parseSemver(current);
  const lSem = parseSemver(latest);

  if (!cSem || !lSem) {
    // Non-semver or content hashes
    return current !== latest ? "update-available" : "up-to-date";
  }

  const diff = semverDiff(current, latest);
  if (diff === "identical") return "up-to-date";
  if (diff === "major") return "major-available";
  if (diff === "minor" || diff === "patch" || diff === "prerelease") {
    return "update-available";
  }
  if (diff === "downgrade") return "downgrade-available";

  return "unknown";
}

/**
 * Evaluates the full update information for a catalog item.
 */
export function checkItemUpdate(
  item: CatalogItem,
  installedVersionOrHash: string | null,
  latestVersionOrHash: string | null,
  settings: MercatoSettings = DEFAULT_SETTINGS
): ItemUpdateInfo {
  const updateState = getUpdateState(
    installedVersionOrHash,
    latestVersionOrHash
  );

  let diffType: VersionDiffType = "unknown";
  let autoEligible = false;

  if (installedVersionOrHash && latestVersionOrHash) {
    if (
      item.kind === "plugin" ||
      (item.kind === "mcp" && item.npmSpec) ||
      (item.kind === "theme" && item.npmSpec)
    ) {
      diffType = semverDiff(installedVersionOrHash, latestVersionOrHash);
      autoEligible = isAutoUpdateEligible(
        installedVersionOrHash,
        latestVersionOrHash,
        settings
      );
    } else {
      // Content-based comparison for skills, agents, commands, or local themes
      if (installedVersionOrHash === latestVersionOrHash) {
        diffType = "identical";
        autoEligible = false;
      } else {
        diffType = "content";
        autoEligible = settings.autoUpdate;
      }
    }
  }

  return {
    itemId: item.id,
    kind: item.kind,
    currentVersion: installedVersionOrHash,
    latestVersion: latestVersionOrHash,
    updateState,
    diffType,
    autoEligible,
  };
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
