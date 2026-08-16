import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SourceAdapter, SourceId, SourceRaw } from "../../src/core/model";
import { loadCache } from "../../src/adapters/cache";
import { refreshCatalog } from "../../src/core/aggregate";

const dir = mkdtempSync(join(tmpdir(), "mercato-aggregate-"));
const emptyDir = mkdtempSync(join(tmpdir(), "mercato-aggregate-empty-"));
afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
  rmSync(emptyDir, { recursive: true, force: true });
});

const fake = (id: SourceId, payload: unknown, fail = false): SourceAdapter => ({
  id,
  async fetch(): Promise<SourceRaw> {
    if (fail) throw new Error(`boom-${id}`);
    return { source: id, payload, fetchedAt: 1000 };
  },
});

const CAFE = {
  status: "success",
  value: [
    { _id: "c1", type: "plugin", productId: "p1", displayName: "P One", description: "A", repoUrl: "https://github.com/me/p1", tags: ["x"] },
    { _id: "c2", type: "mcp-server", productId: "m1", displayName: "Mcp One", description: "M", repoUrl: "https://github.com/me/m1" },
  ],
};

const AWESOME = [
  { productId: "p1", type: "plugins", displayName: "P One", repoUrl: "https://github.com/me/p1/", tagline: "B", tags: ["y"] },
  { productId: "ag1", type: "agents", displayName: "A Gent", repoUrl: "https://github.com/me/ag", description: "AG" },
];

const ECOSYSTEM = `## Plugins
| Name | Description |
| --- | --- |
| [P One](https://github.com/me/p1) | C |
## Projects
| Name | Description |
| --- | --- |
| [Proj](https://example.com/p) | P |
## Agents
| Name | Description |
| --- | --- |
| [Agentic](https://github.com/me/agentic) | AG2 |
`;

describe("refreshCatalog", () => {
  test("full success: merges, persists, reports per-source meta", async () => {
    const res = await refreshCatalog([fake("cafe", CAFE), fake("awesome", AWESOME), fake("ecosystem", ECOSYSTEM)], dir);
    expect(res.stale).toBe(false);
    expect(res.catalog.items).toHaveLength(4); // p1 merged ×3, m1, ag, agentic
    const p1 = res.catalog.items.find((i) => i.repoUrl === "https://github.com/me/p1")!;
    expect(p1.sources.map((s) => s.source)).toEqual(["cafe", "awesome", "ecosystem"]);
    expect(p1.bestTrust).toEqual({ level: "high", score: 30 });
    expect(res.sourceMeta.cafe.itemCount).toBe(2);
    const cached = loadCache(dir)!;
    expect(cached.items).toEqual(res.catalog.items);
    expect(Object.keys(cached.sourceItems).sort()).toEqual(["awesome", "cafe", "ecosystem"]);
  });

  test("partial failure keeps prior items for the failed source", async () => {
    await refreshCatalog([fake("cafe", CAFE), fake("awesome", AWESOME), fake("ecosystem", ECOSYSTEM)], dir);
    const res2 = await refreshCatalog([fake("cafe", CAFE, true), fake("awesome", AWESOME), fake("ecosystem", ECOSYSTEM)], dir);
    expect(res2.sourceMeta.cafe.lastError).toBe("boom-cafe");
    expect(res2.sourceMeta.cafe.itemCount).toBe(2); // kept from previous run
    const p1 = res2.catalog.items.find((i) => i.repoUrl === "https://github.com/me/p1")!;
    expect(p1.sources.map((s) => s.source)).toEqual(["cafe", "awesome", "ecosystem"]);
  });

  test("all fail with no cache: empty catalog with errors, still persisted", async () => {
    const res = await refreshCatalog([fake("cafe", {}, true), fake("awesome", {}, true), fake("ecosystem", {}, true)], emptyDir);
    expect(res.catalog.items).toHaveLength(0);
    expect(res.sourceMeta.cafe.lastError).toBe("boom-cafe");
    const cached = loadCache(emptyDir)!;
    expect(cached.items).toEqual([]);
  });
});