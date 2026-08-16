import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { CatalogItem, SourceId, SourceItem } from "../core/model";

export const CACHE_VERSION = 1 as const;
export const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

export interface SourceMeta {
  fetchedAt: number | null;
  lastError: string | null;
  itemCount: number;
}

export interface CacheShape {
  version: typeof CACHE_VERSION;
  fetchedAt: number | null;
  items: CatalogItem[];
  sourceItems: Partial<Record<SourceId, SourceItem[]>>;
  sourceMeta: Record<SourceId, SourceMeta>;
  stale: boolean;
}

const ALL_SOURCES: SourceId[] = ["cafe", "awesome", "ecosystem"];
const blankMeta = (): SourceMeta => ({ fetchedAt: null, lastError: null, itemCount: 0 });

/** Config dir per platform: %APPDATA%\opencode on Windows, ~/.config/opencode otherwise. */
export function cacheDir(): string {
  const base =
    process.platform === "win32"
      ? (process.env.APPDATA ?? join(homedir(), "AppData", "Roaming"))
      : (process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config"));
  return join(base, "opencode", "mercato");
}

export function cachePath(dir = cacheDir()): string {
  return join(dir, "cache.json");
}

export function emptyCache(): CacheShape {
  return {
    version: CACHE_VERSION,
    fetchedAt: null,
    items: [],
    sourceItems: {},
    sourceMeta: Object.fromEntries(ALL_SOURCES.map((s) => [s, blankMeta()])) as Record<SourceId, SourceMeta>,
    stale: false,
  };
}

function isValid(c: unknown): c is CacheShape {
  if (typeof c !== "object" || c === null) return false;
  const o = c as Record<string, unknown>;
  return o.version === CACHE_VERSION && Array.isArray(o.items) && typeof o.sourceMeta === "object" && o.sourceMeta !== null;
}

/** Null on missing file or corrupt content — corruption is treated as missing (spec §12). */
export function loadCache(dir?: string): CacheShape | null {
  const path = cachePath(dir);
  if (!existsSync(path)) return null;
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Atomic write: tmp file in the same directory, then rename into place. */
export function saveCache(cache: CacheShape, dir?: string): void {
  const d = dir ?? cacheDir();
  const path = cachePath(d);
  mkdirSync(d, { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(cache, null, 2), "utf8");
  renameSync(tmp, path);
}

export function isFresh(cache: CacheShape, ttlMs = DEFAULT_TTL_MS): boolean {
  return cache.fetchedAt !== null && Date.now() - cache.fetchedAt < ttlMs;
}