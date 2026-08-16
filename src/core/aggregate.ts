import type { Catalog, CatalogItem, SourceAdapter, SourceId, SourceItem } from "./model";
import { mergeCatalog } from "./merge";
import { normalizeSource } from "./normalize";
import { emptyCache, loadCache, saveCache, type CacheShape, type SourceMeta } from "../adapters/cache";

export interface AggregateResult {
  catalog: Catalog;
  sourceMeta: Record<SourceId, SourceMeta>;
  stale: boolean;
}

function groupBySource(items: SourceItem[]): Partial<Record<SourceId, SourceItem[]>> {
  const out: Partial<Record<SourceId, SourceItem[]>> = {};
  for (const item of items) {
    out[item.source] ??= [];
    out[item.source]!.push(item);
  }
  return out;
}

/**
 * Fetch every source (sequentially — three sources, no burst), normalize and
 * merge. A failing source keeps its previously cached items and records the
 * error; the others merge fresh (spec §9). Always persists atomically.
 * `fetchedAt` records the last refresh in which at least one source
 * succeeded; `stale` flags a refresh in which any source failed (spec §6).
 */
export async function refreshCatalog(adapters: readonly SourceAdapter[], dir?: string): Promise<AggregateResult> {
  const prev = loadCache(dir);
  const fresh: SourceItem[] = [];
  const sourceMeta = emptyCache().sourceMeta;
  let anySourceFailed = false;
  let anySourceSucceeded = false;
  for (const adapter of adapters) {
    const src = adapter.id;
    try {
      const raw = await adapter.fetch();
      const items = normalizeSource(raw);
      fresh.push(...items);
      sourceMeta[src] = { fetchedAt: raw.fetchedAt, lastError: null, itemCount: items.length };
      anySourceSucceeded = true;
    } catch (err) {
      anySourceFailed = true;
      const kept = prev?.sourceItems[src] ?? [];
      fresh.push(...kept);
      sourceMeta[src] = {
        fetchedAt: prev?.sourceMeta[src]?.fetchedAt ?? null,
        lastError: err instanceof Error ? err.message : String(err),
        itemCount: kept.length,
      };
    }
  }
  const items: CatalogItem[] = mergeCatalog(fresh);
  const fetchedAt = anySourceSucceeded ? Date.now() : (prev?.fetchedAt ?? null);
  const cache: CacheShape = { ...emptyCache(), fetchedAt, items, sourceItems: groupBySource(fresh), sourceMeta, stale: anySourceFailed };
  saveCache(cache, dir);
  return { catalog: { version: 1, items }, sourceMeta, stale: anySourceFailed };
}