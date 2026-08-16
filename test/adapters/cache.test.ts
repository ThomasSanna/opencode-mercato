import { afterAll, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CACHE_VERSION,
  DEFAULT_TTL_MS,
  cachePath,
  emptyCache,
  isFresh,
  loadCache,
  saveCache,
} from "../../src/adapters/cache";
import type { CacheShape } from "../../src/adapters/cache";

const dir = mkdtempSync(join(tmpdir(), "mercato-cache-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const sample = (over: Partial<CacheShape> = {}): CacheShape => ({
  ...emptyCache(),
  fetchedAt: Date.now() - 1,
  stale: false,
  ...over,
});

describe("emptyCache", () => {
  test("seeded meta for all three sources", () => {
    const c = emptyCache();
    expect(c.version).toBe(CACHE_VERSION);
    expect(Object.keys(c.sourceMeta).sort()).toEqual(["awesome", "cafe", "ecosystem"]);
    expect(c.sourceMeta.cafe).toEqual({ fetchedAt: null, lastError: null, itemCount: 0 });
  });
});

describe("save/load roundtrip", () => {
  test("persists and reloads identical shape", () => {
    const cache = sample();
    expect(existsSync(cachePath(dir))).toBe(false);
    saveCache(cache, dir);
    expect(existsSync(cachePath(dir))).toBe(true);
    expect(loadCache(dir)).toEqual(cache);
  });
});

describe("loadCache failure modes", () => {
  test("missing file returns null", () => {
    expect(loadCache(join(dir, "does-not-exist"))).toBeNull();
  });

  test("corrupt JSON returns null", () => {
    const p = cachePath(dir);
    writeFileSync(p, "{not json", "utf8");
    expect(loadCache(dir)).toBeNull();
  });

  test("wrong version returns null", () => {
    writeFileSync(cachePath(dir), JSON.stringify({ ...sample(), version: 2 }), "utf8");
    expect(loadCache(dir)).toBeNull();
  });
});

describe("isFresh", () => {
  test("within TTL is fresh, beyond is stale", () => {
    const fresh = sample({ fetchedAt: Date.now() - DEFAULT_TTL_MS + 1000 });
    const stale = sample({ fetchedAt: Date.now() - DEFAULT_TTL_MS - 1000 });
    expect(isFresh(fresh)).toBe(true);
    expect(isFresh(stale)).toBe(false);
  });

  test("null fetchedAt is never fresh", () => {
    expect(isFresh(sample({ fetchedAt: null }))).toBe(false);
  });
});

describe("atomicity", () => {
  test("no leftover tmp files after save", () => {
    saveCache(sample(), dir);
    const leftovers = readdirSync(dir).filter((f) => f.endsWith(".tmp"));
    expect(leftovers).toEqual([]);
  });
});