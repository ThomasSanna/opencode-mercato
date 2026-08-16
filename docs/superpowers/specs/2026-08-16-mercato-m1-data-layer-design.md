# M1 — Data Layer Design (opencode-mercato)

> Date: 2026-08-16 · Status: draft for review
> Scope: aggregation of the three community sources, normalized model, merge,
> cache, per-item npm queries. Applies the contract in `AGENTS.md`.

## 1. Context

`opencode-mercato` is an OpenCode V2 plugin: a marketplace for everything
(plugins, MCP servers, skills, themes, agents) inside the TUI. The catalog is
**transparently aggregated** from three community sources, credited in
`CREDITS.md`:

1. **opencode.cafe** — approved-extension list, queried via its Convex API
   (`extensions:listAllApproved`).
2. **awesome-opencode** — `registry.json` in the GitHub repo.
3. **OpenCode ecosystem docs** — the ecosystem table on opencode.ai.

M0 (scaffold) is committed. M1 builds the data layer only: `src/core` +
`src/adapters/sources` + `src/adapters/npm` + `src/adapters/cache`.
No TUI, no install logic (M2/M3).

## 2. Goals / Non-goals

Goals:
- A normalized, deduplicated catalog model merging the three sources.
- Provenance and trust transparency per item (never claim third-party data as ours).
- Cache with TTL + offline fallback; no network work at plugin load.
- Pure, headless-testable core (per AGENTS.md: tests mirror modules).
- Per-item npm version queries, on demand only.

Non-goals (later milestones):
- Install/enable/update/downgrade (M3+) and version policy (M4).
- TUI screens and palette command (M2).
- Downloads/rating signals beyond the npm query surface.
- Curated local registry — explicitly rejected: aggregation only.

## 3. Normalized model

```ts
type Kind = "plugin" | "mcp" | "skill" | "agent" | "theme" | "command";

type SourceId = "cafe" | "awesome" | "ecosystem";

type Trust = {
  level: "high" | "medium" | "low"; // source-level, fixed per source
  score: number;                   // 0-100, used for sort/preference
};

interface SourceProvenance {
  source: SourceId;
  trust: Trust;
  rawId: string;        // id in the source (for traceability)
  seenAt: number;       // epoch ms of first successful fetch
}

interface CatalogItem {
  id: string;                     // stable, derived (see §4)
  kind: Kind;
  name: string;
  description: string;            // best available, never empty
  repoUrl: string | null;         // canonical if known — merge key
  npmSpec: string | null;         // npm package/spec if known
  homepage: string | null;
  tags: string[];
  installSpec: Record<SourceId, unknown>; // raw, kind-specific (consumed in M3+)
  sources: SourceProvenance[];    // never empty; ordered by preference
  bestTrust: Trust;               // max trust seen (see §5)
}

interface Catalog {
  version: 1;
  items: CatalogItem[];
}
```

`installSpec` is deliberately permissive in M1 (per-source raw payloads,
runtime-validated by the install planners in M3) — the model is not frozen by
M1's naive writers.

## 4. Merge rules

**Canonical key** (per item, computed once at normalize):
1. `repoUrl` normalized — trim, lowercase scheme/host, drop trailing slash,
   strip `www.`, sort query params.
2. Fallback `npmSpec` (normalized: lowercased package name).
3. Else `name.toLowerCase() + "@" + source` (no merge candidates).

**Grouping**: items with the same canonical key form one `CatalogItem`.

**Field resolution** within a group:
- `name`: longest, else first.
- `description`: longest non-empty.
- `repoUrl`/`npmSpec`/`homepage`: first non-null (preference order cafe >
  awesome > ecosystem, source-level).
- `tags`: union, deduplicated, sorted.
- `installSpec`: kept per source (`Record<SourceId, unknown>`) — M3 planners
  pick the best per kind.
- `sources`: concatenated provenance, dedup by `source`; each source contributes
  at most one provenance.
- `bestTrust`: max `score` across sources, with its `level`.

## 5. Trust model

Fixed source-level trust (no per-item estimation in M1):

| Source | level | score |
|---|---|---|
| opencode.cafe | high | 30 |
| awesome-opencode | medium | 20 |
| ecosystem docs | medium | 15 |

Scores are additive weights for future ranking (e.g., merge order, UI sort).
Transparency rule: provenance is displayed verbatim in the UI (M2+), never
hidden behind the score.

## 6. Cache

File: `~/.config/opencode/mercato/cache.json` (per-OS config dir; Windows:
`%APPDATA%\opencode`). `api.kv` rejected as the single store — the cache is a
raw data artifact, kv is for UI prefs (M2).

```ts
interface CacheShape {
  version: 1;
  fetchedAt: number | null;         // last successful full fetch
  items: CatalogItem[];
  sourceMeta: Record<SourceId, {   // per-source status
    fetchedAt: number | null;
    lastError: string | null;
    itemCount: number;              // items contributed after merge
  }>;
  stale: boolean;                   // true when served from a partial/older snapshot
}
```

**Read semantics** (on market open, M2 hook — exposed as pure helpers now):
- `age = now - fetchedAt`; `fresh = age < ttl` (TTL default **24 h**).
- fresh → serve cache directly.
- stale → serve cache immediately, trigger background refetch (caller decides
  the trigger; the data layer exposes `refresh()`).
- offline/failure → serve last snapshot regardless of age, set `stale: true`,
  record `lastError` per source.
- missing cache file → `null` (caller shows loading/error state).

**Write semantics**: always atomic (tmp file + rename), validate before write,
never partial JSON. Source-independent: each source fetch updates its own
`sourceMeta` entry, not the whole file (write-on-failure keeps old items).

## 7. Per-source adapters

Port — one adapter per source, same shape:

```ts
interface SourceAdapter {
  id: SourceId;
  fetch(): Promise<SourceRaw>;         // network, throwing on failure
  normalize(raw: SourceRaw): SourceItem[]; // pure, fixture-tested
}
```

- **cafe**: Convex query `extensions:listAllApproved` (exact endpoint validated
  at plan time from the live site). Normalize: id, name, description, repo,
  npm, kind mapping (cafe's category → our Kind), tags.
- **awesome**: `registry.json` from the awesome-opencode repo (raw GitHub).
  Normalize per its schema; unknown kinds default to `plugin`... **decision:**
  untyped/unrecognizable entries with an installable spec default to
  `plugin`; entries without repoUrl AND npmSpec are kept but flagged
  `sources[].rawId` only — no merge key beyond `name@source`.
- **ecosystem**: the ecosystem table on opencode.ai (docs page). Parse the
  table rows; each row's kind is explicit in the docs table.

Kind mapping is a pure function tested with fixtures, not inline parsing.

## 8. npm adapter (on demand)

Pure helper + thin HTTP adapter:

- `npm.latestVersion(pkg)` / `npm.versions(pkg)` via
  `GET https://registry.npmjs.org/<pkg>` — dist-tags (`latest`) + `versions` +
  `time`. Plain JSON, no special accept header (per the lightweight rule).
- Timeout (default 5 s) + non-2xx handling → `null` (silent degradation; no
  crash, no throw to the caller).
- Never called in bulk for the whole catalog — only for items the user acts on
  (detail/update views, M2/M4).
- Cache: short TTL (15 min) inside the same cache file namespace
  (`npmCache: Record<pkg, {fetchedAt, data}>`) — avoids hammering on repeated
  opens while the market is open.

## 9. Error handling & degradation

- One source failing never aborts the others: per-source `try/catch` in the
  aggregator, error recorded in `sourceMeta[src].lastError`.
- Partial success is a valid result: merge whatever normalized successfully,
  keep prior cached items for the failed source.
- npm adapter errors are silent (null). UI/M2 decides what the user sees.
- No retry storm: consecutive refresh attempts bounded by the caller
  (backoff), the data layer only reports state.

## 10. Testing

- `test/core/merge.test.ts` — dedupe by each key form, field resolution,
  trust max, tags union. Pure.
- `test/core/trust.test.ts` — fixed mapping + additive scoring.
- `test/adapters/sources/*.test.ts` — normalize() with fixture JSON per source
  (representative samples captured at plan time from live endpoints).
- `test/adapters/npm.test.ts` — mock fetch: dist-tags, timeout, non-2xx,
  malformed payload → null.
- `test/adapters/cache.test.ts` — tmpdir: fresh/stale/missing, atomicity,
  per-source partial update, offline fallback.
- `test/index.test.ts` — aggregator end-to-end with mocked adapters:
  full success, partial failure, all-fail (returns prior snapshot or null).

Every behavior change ships with a test (AGENTS.md). No `as any`, strict TS.

## 11. Out of scope (explicit)

- No TUI, no palette, no dialog (M2).
- No install/version policy/auto-update (M3/M4).
- No ratings, trending, compatibility checks (v2).
- No curated registry (aggregation only — see §2).

## 12. Risks

| Risk | Mitigation |
|---|---|
| Source schema drifts | Fixture-based tests + per-source normalize isolated; one broken source degrades to others |
| Source endpoint changes | Adapter per source; endpoint pinned + validated at plan time; capture scripts stored for regeneration |
| Cache file corruption | Atomic write + validate-before-write + versioned shape |
| npm registry slowness on item views | On-demand only, short TTL, timeout + silent null |
| Merge surprise (too many/too few items) | Count assertions in merge tests reflect live capture; no hardcoded counts in production code |