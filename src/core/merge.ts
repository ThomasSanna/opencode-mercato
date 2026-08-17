import type { CatalogItem, SourceId, SourceItem } from "./model";
import { SOURCE_TRUST, bestTrust } from "./trust";

/** Source preference for first-non-null field resolution (spec §4). */
const SOURCE_PREFERENCE: SourceId[] = ["cafe", "awesome", "ecosystem"];

/** Canonical URL: trimmed, scheme added if missing, host lowercased, www dropped, query sorted. */
export function normalizeRepoUrl(url: string): string {
  let u = url.trim();
  if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) u = `https://${u}`;
  const parsed = new URL(u);
  parsed.protocol = parsed.protocol.toLowerCase();
  parsed.host = parsed.host.replace(/^www\./, "").toLowerCase();
  parsed.pathname = parsed.pathname
    .replace(/\/+$/, "")
    .replace(/\.git$/i, "")
    .toLowerCase();
  const params = [...new URLSearchParams(parsed.search).entries()].sort((a, b) => a[0].localeCompare(b[0]));
  parsed.search = params.length > 0 ? `?${params.map(([k, v]) => `${k}=${v}`).join("&")}` : "";
  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "");
}

/** Merge key: normalized repoUrl, else npm name, else name@source (spec §4). */
export function canonicalKey(item: SourceItem): string {
  if (item.repoUrl !== null) {
    try {
      return normalizeRepoUrl(item.repoUrl);
    } catch {
      // malformed URL → fall through to npm/name key (never brick the merge)
    }
  }
  if (item.npmSpec !== null) return `npm:${item.npmSpec.toLowerCase()}`;
  return `${item.name.toLowerCase()}@${item.source}`;
}

function longest(values: string[]): string {
  let best = values[0] ?? "";
  for (const v of values) {
    if (v.length > best.length) best = v;
  }
  return best;
}

function firstNonNull<T>(values: T[]): T | null {
  for (const v of values) {
    if (v !== null && v !== undefined) return v;
  }
  return null;
}

/** One provenance per source; sources ordered by preference, seenAt from the source fetch. */
function buildSources(group: SourceItem[]): CatalogItem["sources"] {
  const seen = new Set<SourceId>();
  const out: CatalogItem["sources"] = [];
  for (const src of SOURCE_PREFERENCE) {
    const match = group.find((i) => i.source === src);
    if (match === undefined || seen.has(src)) continue;
    seen.add(src);
    out.push({ source: src, trust: { ...SOURCE_TRUST[src] }, rawId: match.rawId, seenAt: match.fetchedAt });
  }
  return out;
}

function resolveGroup(group: SourceItem[]): CatalogItem {
  const ordered = [...group].sort(
    (a, b) => SOURCE_PREFERENCE.indexOf(a.source) - SOURCE_PREFERENCE.indexOf(b.source),
  );
  const sources = buildSources(group);
  const installSpec = {} as Record<SourceId, unknown>;
  const seenInstall = new Set<SourceId>();
  for (const srcItem of group) {
    if (seenInstall.has(srcItem.source)) continue;
    seenInstall.add(srcItem.source);
    installSpec[srcItem.source] = srcItem.installSpec;
  }
  return {
    id: canonicalKey(ordered[0]!),
    kind: ordered[0]!.kind,
    name: longest(ordered.map((i) => i.name)),
    description: longest(ordered.map((i) => i.description)),
    repoUrl: firstNonNull(ordered.map((i) => i.repoUrl)),
    npmSpec: firstNonNull(ordered.map((i) => i.npmSpec)),
    homepage: firstNonNull(ordered.map((i) => i.homepage)),
    tags: [...new Set(group.flatMap((i) => i.tags))].sort(),
    installSpec,
    sources,
    bestTrust: { ...bestTrust(sources) },
  };
}

/** Group by canonical key (first-seen order), resolve each group. */
export function mergeCatalog(items: SourceItem[]): CatalogItem[] {
  const groups = new Map<string, SourceItem[]>();
  for (const srcItem of items) {
    const key = canonicalKey(srcItem);
    const group = groups.get(key);
    if (group === undefined) groups.set(key, [srcItem]);
    else group.push(srcItem);
  }
  return [...groups.values()].map(resolveGroup);
}