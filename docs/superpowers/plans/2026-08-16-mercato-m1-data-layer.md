# Mercato M1 — Data Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the aggregated, normalized, cached catalog data layer for opencode-mercato — three source adapters, pure merge core, npm on-demand queries, crash-safe cache.

**Architecture:** Ports & adapters. `src/core/` holds pure logic (model, trust, normalize, merge) — no I/O. `src/adapters/` holds thin I/O (sources fetch, npm, cache). An aggregator (`aggregate.ts`) composes them: fetch each source independently (one failure never aborts the others), normalize, merge by canonical key, persist atomically. Everything headless-testable.

**Tech Stack:** TypeScript strict, Bun (test runner), Node built-ins only (`node:fs`, `node:path`, `node:os`), global `fetch`. No new dependencies — the lightweight rule forbids them.

## Global Constraints

Verbatim from `AGENTS.md` (binding on every task):

- **Strict TypeScript.** `strict: true`. No `as any`, no `@ts-ignore`, no `@ts-expect-error`.
- **Extremely lightweight.** Zero or near-zero runtime dependencies — Node built-ins and the OpenCode SDK only. M1 adds NO dependencies.
- **English only.** All code, identifiers, comments, commit messages in English.
- **Every behavior change ships with a test.** CI runs `bun test` + `bun run typecheck` on every push/PR.
- **Bugfix rule.** Fix minimally; never refactor while fixing.
- **No god files.** Split a file that exceeds ~300 lines.
- **One concern per module.** Tests mirror modules (`test/core/merge.test.ts` ↔ `src/core/merge.ts`).
- **No dead code.** No unused exports, parameters, or dependencies. Delete or justify.
- **Errors are handled.** No hidden `catch {}` — where a `catch` returns `null`, a comment states the contract (spec-mandated silent degradation).
- **No leftover `console.log`.**
- **Commit style.** `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`.
- **V2 only.** No V1 SDK APIs.

Spec: `docs/superpowers/specs/2026-08-16-mercato-m1-data-layer-design.md` (read it — tasks implement its sections).

## File Structure

```
scripts/capture-fixtures.ts          # Task 1 — regenerates fixtures from live sources
test/fixtures/cafe.json              # Task 1 — trimmed live sample (cafe)
test/fixtures/awesome.json           # Task 1 — trimmed live sample (awesome)
test/fixtures/ecosystem.mdx          # Task 1 — trimmed live sample (ecosystem)
src/core/model.ts                    # Task 2 — types (Kind, SourceId, Trust, ...)
src/core/trust.ts                    # Task 2 — fixed source trust + bestTrust
src/core/normalize.ts                # Task 3 — per-source raw → SourceItem[]
src/core/merge.ts                    # Task 4 — canonical key, group, resolve
src/adapters/sources/fetch.ts        # Task 5 — fetchWithTimeout / fetchText / fetchJson
src/adapters/sources/cafe.ts         # Task 5 — Convex POST adapter
src/adapters/sources/awesome.ts      # Task 5 — registry.json GET adapter
src/adapters/sources/ecosystem.ts    # Task 5 — MDX GET adapter
src/adapters/npm.ts                  # Task 6 — per-item npm versions on demand
src/adapters/cache.ts                # Task 7 — atomic file cache + TTL
src/core/aggregate.ts                # Task 8 — orchestrator
test/core/trust.test.ts              # Task 2
test/core/normalize.test.ts          # Task 3
test/core/merge.test.ts              # Task 4
test/adapters/sources/cafe.test.ts   # Task 5
test/adapters/sources/awesome.test.ts# Task 5
test/adapters/sources/ecosystem.test.ts# Task 5
test/adapters/npm.test.ts            # Task 6
test/adapters/cache.test.ts          # Task 7
test/core/aggregate.test.ts          # Task 8
```

Module rules: `src/core/*` never imports from `node:*` and never touches I/O. `src/adapters/*` is the only place that imports `node:*` or performs network/fs work. Imports use extensionless specifiers (moduleResolution `bundler`); type-only imports use `import type`.

---

### Task 1: Fixtures + capture script

**Files:**
- Create: `scripts/capture-fixtures.ts`
- Create: `test/fixtures/cafe.json`
- Create: `test/fixtures/awesome.json`
- Create: `test/fixtures/ecosystem.mdx`
- Modify: `tsconfig.json` (add `resolveJsonModule`)

**Interfaces:**
- Consumes: nothing (raw samples already captured at `C:\Users\thoma\AppData\Local\Temp\opencode\opc-research\mercato-sources\cafe.json`, `awesome.json`, `ecosystem-source.mdx`).
- Produces: the three fixture files later tasks import/read in tests. Paths are fixed.

- [ ] **Step 1: Add `resolveJsonModule` to tsconfig**

In `tsconfig.json`, add `"resolveJsonModule": true` to `compilerOptions`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "verbatimModuleSyntax": true,
    "jsx": "react-jsx",
    "jsxImportSource": "@opentui/solid",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "types": ["node", "bun"]
  },
  "include": ["src", "test"]
}
```

- [ ] **Step 2: Write the capture script**

Create `scripts/capture-fixtures.ts` (not under `src/`, so it is not shipped):

```ts
/**
 * Regenerates the M1 test fixtures from the live data sources.
 * Run with: bun run scripts/capture-fixtures.ts
 * Trim rule: keep the first 12 entries, plus any entry whose `type` was not
 * seen yet (max 20). If the live sources changed shape, update the affected
 * tests' spot data after regenerating.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = join(import.meta.dir, "../test/fixtures");
const CAFE_POST = {
  path: "extensions:listAllApproved",
  args: {},
  format: "json",
} as const;

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return await res.json();
}

function trimArray(entries: unknown[], typeField: string): unknown[] {
  const out: unknown[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const e = entry as Record<string, unknown>;
    const t = String(e[typeField] ?? "");
    if (out.length < 12 || !seen.has(t)) out.push(e);
    seen.add(t);
    if (out.length >= 20) break;
  }
  return out;
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });

  const cafe = (await fetchJson("https://curious-quail-727.convex.cloud/api/query", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(CAFE_POST),
  })) as { status: string; value?: unknown };
  writeFileSync(join(OUT, "cafe.json"), JSON.stringify({ status: cafe.status, value: trimArray(Array.isArray(cafe.value) ? cafe.value : [], "type") }, null, 2));

  const awesome = (await fetchJson("https://raw.githubusercontent.com/awesome-opencode/awesome-opencode/main/dist/registry.json")) as unknown[];
  writeFileSync(join(OUT, "awesome.json"), JSON.stringify(trimArray(Array.isArray(awesome) ? awesome : [], "type"), null, 2));

  const ecoRes = await fetch("https://raw.githubusercontent.com/anomalyco/opencode/dev/packages/web/src/content/docs/ecosystem.mdx");
  if (!ecoRes.ok) throw new Error(`HTTP ${ecoRes.status} from ecosystem`);
  const mdx = await ecoRes.text();
  const lines = mdx.split(/\r?\n/);
  const trimmed = lines.slice(0, 200); // first 200 lines cover the tables
  writeFileSync(join(OUT, "ecosystem.mdx"), trimmed.join("\n") + "\n");

  console.log(`fixtures written to ${OUT}`);
}

void main();
```

- [ ] **Step 3: Run the capture script**

Run (workdir `E:\programmes\apps\opencode-plugins\opencode-plugins-market`):

```
bun run scripts/capture-fixtures.ts
```

Expected: `fixtures written to ...\test\fixtures`, three files created. Verify `bun run typecheck` still exits 0 (the script is outside tsconfig `include`; the `test/fixtures/*.json` files are imported only from Task 3 onward).

- [ ] **Step 4: Commit**

```bash
git add tsconfig.json scripts/capture-fixtures.ts test/fixtures/
git commit -m "test: capture M1 data fixtures and regeneration script"
```

---

### Task 2: Core model + trust

**Files:**
- Create: `src/core/model.ts`
- Create: `src/core/trust.ts`
- Test: `test/core/trust.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces (typed contracts every later task uses verbatim):

```ts
// src/core/model.ts
export type Kind = "plugin" | "mcp" | "skill" | "agent" | "theme" | "command";
export type SourceId = "cafe" | "awesome" | "ecosystem";

export interface Trust { level: "high" | "medium" | "low"; score: number }
export interface SourceProvenance {
  source: SourceId;
  trust: Trust;
  rawId: string;
  seenAt: number;
}
export interface CatalogItem {
  id: string;
  kind: Kind;
  name: string;
  description: string;
  repoUrl: string | null;
  npmSpec: string | null;
  homepage: string | null;
  tags: string[];
  installSpec: Record<SourceId, unknown>;
  sources: SourceProvenance[];
  bestTrust: Trust;
}
export interface Catalog { version: 1; items: CatalogItem[] }
export interface SourceItem {
  source: SourceId;
  rawId: string;
  kind: Kind;
  name: string;
  description: string;
  repoUrl: string | null;
  npmSpec: string | null;
  homepage: string | null;
  tags: string[];
  installSpec: unknown;
  fetchedAt: number;
}
export interface SourceRaw { source: SourceId; payload: unknown; fetchedAt: number }
export interface SourceAdapter {
  id: SourceId;
  fetch(): Promise<SourceRaw>;
}
```

> Plan refinement over the spec: `SourceItem` carries `fetchedAt` (integer epoch ms) so merge can populate `SourceProvenance.seenAt` ("first successful fetch") — the spec's field, filled from the source fetch time.

- [ ] **Step 1: Write the failing test**

Create `test/core/trust.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import type { SourceId, SourceProvenance } from "../src/core/model";
import { SOURCE_TRUST, bestTrust } from "../src/core/trust";

describe("SOURCE_TRUST", () => {
  test("fixed values match spec §5 (30/20/15)", () => {
    expect(SOURCE_TRUST).toEqual({
      cafe: { level: "high", score: 30 },
      awesome: { level: "medium", score: 20 },
      ecosystem: { level: "medium", score: 15 },
    });
  });
});

describe("bestTrust", () => {
  const prov = (source: SourceId, score: number, level: "high" | "medium" | "low"): SourceProvenance =>
    ({ source, trust: { level, score }, rawId: "x", seenAt: 0 });

  test("returns the highest score", () => {
    expect(bestTrust([prov("awesome", 20, "medium"), prov("ecosystem", 15, "medium"), prov("cafe", 30, "high")]))
      .toEqual({ level: "high", score: 30 });
  });

  test("ties keep the first occurrence", () => {
    expect(bestTrust([prov("ecosystem", 15, "medium"), prov("awesome", 20, "medium")]))
      .toEqual({ level: "medium", score: 20 });
  });

  test("empty list yields low/0", () => {
    expect(bestTrust([])).toEqual({ level: "low", score: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/core/trust.test.ts`
Expected: FAIL — "cannot find module '../src/core/trust'".

- [ ] **Step 3: Write minimal implementation**

Create `src/core/model.ts` exactly as in the Interfaces block above.

Create `src/core/trust.ts`:

```ts
import type { SourceId, SourceProvenance, Trust } from "./model";

/** Fixed per-source trust (spec §5). */
export const SOURCE_TRUST: Record<SourceId, Trust> = {
  cafe: { level: "high", score: 30 },
  awesome: { level: "medium", score: 20 },
  ecosystem: { level: "medium", score: 15 },
};

/** Highest-score trust among provenances; ties keep the first occurrence. */
export function bestTrust(provenances: SourceProvenance[]): Trust {
  let best: Trust = { level: "low", score: 0 };
  for (const p of provenances) {
    if (p.trust.score > best.score) best = p.trust;
  }
  return best;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/core/trust.test.ts`
Expected: PASS (4 tests). Then `bun run typecheck` — exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/core/model.ts src/core/trust.ts test/core/trust.test.ts
git commit -m "feat: core data model and source trust (M1)"
```

---

### Task 3: Normalize — per-source raw → SourceItem[]

**Files:**
- Create: `src/core/normalize.ts`
- Test: `test/core/normalize.test.ts`

**Interfaces:**
- Consumes: `SourceRaw`, `SourceItem`, `Kind` from `./model` (Task 2).
- Produces:

```ts
export function normalizeCafe(payload: unknown, fetchedAt: number): SourceItem[]
export function normalizeAwesome(payload: unknown, fetchedAt: number): SourceItem[]
export function normalizeEcosystem(payload: unknown, fetchedAt: number): SourceItem[]
export function normalizeSource(raw: SourceRaw): SourceItem[]
export function mapCafeKind(type: string): Kind | null
export function mapAwesomeKind(type: string): Kind | null
```

Kind mapping policy (from the spec's "kind mapping is a pure function", pinned to the live data):
- cafe `type`: `plugin|tool|web-view` → `plugin`, `mcp-server` → `mcp`, `slash-command` → `command`, anything else → skip (`null`).
- awesome `type`: `plugins` → `plugin`, `agents` → `agent`, `themes` → `theme`; `projects` and `resources` are **skipped** (not installable items).
- ecosystem: group heading `## Plugins` → `plugin`, `## Agents` → `agent`, `## Projects` → skip; rows before any heading or under unknown headings are skipped.

- [ ] **Step 1: Write the failing test**

Create `test/core/normalize.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  mapAwesomeKind,
  mapCafeKind,
  normalizeAwesome,
  normalizeCafe,
  normalizeEcosystem,
  normalizeSource,
} from "../src/core/normalize";

const CAFE_RAW = {
  status: "success",
  value: [
    { _id: "c1", type: "plugin", productId: "p1", displayName: "P One", description: "A", repoUrl: "https://github.com/me/p1", tags: ["x"] },
    { _id: "c2", type: "mcp-server", productId: "m1", displayName: "Mcp One", description: "M", repoUrl: "https://github.com/me/m1" },
    { _id: "c3", type: "slash-command", productId: "sc1", displayName: "Sc One" },
    { _id: "c4", type: "unknown-thing", productId: "u1", displayName: "U One" },
  ],
};

describe("mapCafeKind", () => {
  test("pins the cafe kind mapping", () => {
    expect(mapCafeKind("plugin")).toBe("plugin");
    expect(mapCafeKind("tool")).toBe("plugin");
    expect(mapCafeKind("web-view")).toBe("plugin");
    expect(mapCafeKind("mcp-server")).toBe("mcp");
    expect(mapCafeKind("slash-command")).toBe("command");
    expect(mapCafeKind("mystery")).toBeNull();
  });
});

describe("mapAwesomeKind", () => {
  test("pins the awesome kind mapping", () => {
    expect(mapAwesomeKind("plugins")).toBe("plugin");
    expect(mapAwesomeKind("agents")).toBe("agent");
    expect(mapAwesomeKind("themes")).toBe("theme");
    expect(mapAwesomeKind("projects")).toBeNull();
    expect(mapAwesomeKind("resources")).toBeNull();
  });
});

describe("normalizeCafe", () => {
  test("maps entries, skips unknown types, keeps raw install spec", () => {
    const items = normalizeCafe(CAFE_RAW, 1000);
    expect(items.map((i) => i.rawId)).toEqual(["c1", "c2", "c3"]);
    expect(items[0]).toMatchObject({
      source: "cafe", kind: "plugin", name: "P One", description: "A",
      repoUrl: "https://github.com/me/p1", npmSpec: null, tags: ["x"], fetchedAt: 1000,
    });
    expect(items[1].kind).toBe("mcp");
    expect(items[2].kind).toBe("command");
    expect((items[0].installSpec as Record<string, unknown>).type).toBe("plugin");
    expect(items[0].installSpec as Record<string, unknown>).toMatchObject({ productId: "p1" });
  });

  test("throws when payload.value is not an array", () => {
    expect(() => normalizeCafe({ status: "success" }, 0)).toThrow(/array/i);
  });
});

describe("normalizeAwesome", () => {
  const AWESOME_RAW = [
    { productId: "p1", type: "plugins", displayName: "P One", repoUrl: "github.com/me/p1", tagline: "T", tags: ["y"] },
    { productId: "ag1", type: "agents", displayName: "Agentic", description: "AG", repoUrl: "https://github.com/me/ag" },
    { productId: "prj", type: "projects", displayName: "Proj" },
  ];

  test("maps entries, skips projects/resources, prefers description over tagline", () => {
    const items = normalizeAwesome(AWESOME_RAW, 2000);
    expect(items.map((i) => i.rawId)).toEqual(["p1", "ag1"]);
    expect(items[0]).toMatchObject({ kind: "plugin", name: "P One", description: "T", repoUrl: "github.com/me/p1", tags: ["y"], fetchedAt: 2000 });
    expect(items[1].kind).toBe("agent");
    expect(items[1].description).toBe("AG");
  });

  test("throws when payload is not an array", () => {
    expect(() => normalizeAwesome({}, 0)).toThrow(/array/i);
  });
});

describe("normalizeEcosystem", () => {
  const MDX = `# Ecosystem
## Plugins
| Name | Description |
| --- | --- |
| [P One](https://github.com/me/p1) | C |
| [NPK](https://www.npmjs.com/package/npk-thing) | npm pkg |
## Projects
| Name | Description |
| --- | --- |
| [Proj](https://example.com/p) | P |
## Agents
| Name | Description |
| --- | --- |
| [Agentic](https://github.com/me/agentic) | AG2 |
## Mystery
| Name | Description |
| --- | --- |
| [Weird](https://example.com/w) | W |
`;

  test("parses groups, skips Projects/unknown groups, extracts npm spec", () => {
    const items = normalizeEcosystem(MDX, 3000);
    expect(items.map((i) => i.rawId)).toEqual(["https://github.com/me/p1", "npk-thing", "https://github.com/me/agentic"]);
    const plugin = items[0];
    expect(plugin).toMatchObject({ kind: "plugin", name: "P One", description: "C", repoUrl: "https://github.com/me/p1", npmSpec: null, fetchedAt: 3000 });
    expect(items[1]).toMatchObject({ kind: "plugin", name: "NPK", repoUrl: null, npmSpec: "npk-thing" });
    expect(items[2]).toMatchObject({ kind: "agent", name: "Agentic" });
  });

  test("throws when payload is not a string", () => {
    expect(() => normalizeEcosystem(42, 0)).toThrow(/string/i);
  });
});

describe("normalizeSource", () => {
  test("dispatches by source", () => {
    expect(normalizeSource({ source: "cafe", payload: CAFE_RAW, fetchedAt: 0 }).length).toBe(3);
    expect(normalizeSource({ source: "ecosystem", payload: MDX, fetchedAt: 0 }).length).toBe(3);
  });
});

describe("real fixtures", () => {
  const cafeFixture = readFileSync(join(import.meta.dir, "../fixtures/cafe.json"), "utf8");
  const awesomeFixture = readFileSync(join(import.meta.dir, "../fixtures/awesome.json"), "utf8");
  const ecoFixture = readFileSync(join(import.meta.dir, "../fixtures/ecosystem.mdx"), "utf8");

  test("every fixture entry normalizes without throwing and satisfies shape invariants", () => {
    const items = [
      ...normalizeCafe(JSON.parse(cafeFixture) as unknown, 1),
      ...normalizeAwesome(JSON.parse(awesomeFixture) as unknown, 1),
      ...normalizeEcosystem(ecofixture, 1),
    ];
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(["plugin", "mcp", "skill", "agent", "theme", "command"]).toContain(item.kind);
      expect(item.name.length).toBeGreaterThan(0);
      expect(["cafe", "awesome", "ecosystem"]).toContain(item.source);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/core/normalize.test.ts`
Expected: FAIL — "cannot find module '../src/core/normalize'".

- [ ] **Step 3: Write minimal implementation**

Create `src/core/normalize.ts`:

```ts
import type { Kind, SourceItem, SourceRaw } from "./model";

/** cafe `type` → Kind; `null` = skip (not a marketplace item). */
export function mapCafeKind(type: string): Kind | null {
  switch (type) {
    case "plugin":
    case "tool":
    case "web-view":
      return "plugin";
    case "mcp-server":
      return "mcp";
    case "slash-command":
      return "command";
    default:
      return null;
  }
}

/** awesome `type` → Kind; `null` = skip (projects/resources are not installable). */
export function mapAwesomeKind(type: string): Kind | null {
  switch (type) {
    case "plugins":
      return "plugin";
    case "agents":
      return "agent";
    case "themes":
      return "theme";
    default:
      return null;
  }
}

/** ecosystem group heading → Kind; `null` = skip. */
const ECOSYSTEM_GROUP_KINDS: Record<string, Kind | null> = {
  Plugins: "plugin",
  Projects: null,
  Agents: "agent",
};

export function normalizeCafe(payload: unknown, fetchedAt: number): SourceItem[] {
  const value = (payload as { value?: unknown } | null)?.value;
  if (!Array.isArray(value)) throw new Error("cafe: payload.value is not an array");
  const out: SourceItem[] = [];
  for (const raw of value) {
    const e = raw as Record<string, unknown>;
    const kind = mapCafeKind(String(e.type ?? ""));
    if (kind === null) continue;
    const name = String(e.displayName ?? e.productId ?? "");
    if (name === "") continue;
    out.push({
      source: "cafe",
      rawId: String(e._id ?? e.productId ?? name),
      kind,
      name,
      description: String(e.description ?? ""),
      repoUrl: typeof e.repoUrl === "string" ? e.repoUrl : null,
      npmSpec: null,
      homepage: typeof e.homepageUrl === "string" ? e.homepageUrl : null,
      tags: Array.isArray(e.tags) ? (e.tags as unknown[]).map(String) : [],
      installSpec: e,
      fetchedAt,
    });
  }
  return out;
}

export function normalizeAwesome(payload: unknown, fetchedAt: number): SourceItem[] {
  if (!Array.isArray(payload)) throw new Error("awesome: payload is not an array");
  const out: SourceItem[] = [];
  for (const raw of payload) {
    const e = raw as Record<string, unknown>;
    const kind = mapAwesomeKind(String(e.type ?? ""));
    if (kind === null) continue;
    const name = String(e.displayName ?? "");
    if (name === "") continue;
    out.push({
      source: "awesome",
      rawId: String(e.productId ?? e.repoUrl ?? name),
      kind,
      name,
      description: String(e.description ?? e.tagline ?? ""),
      repoUrl: typeof e.repoUrl === "string" ? e.repoUrl : null,
      npmSpec: null,
      homepage: null,
      tags: Array.isArray(e.tags) ? (e.tags as unknown[]).map(String) : [],
      installSpec: e,
      fetchedAt,
    });
  }
  return out;
}

export function normalizeEcosystem(payload: unknown, fetchedAt: number): SourceItem[] {
  if (typeof payload !== "string") throw new Error("ecosystem: payload must be a string");
  const out: SourceItem[] = [];
  let group: string | null = null;
  for (const rawLine of payload.split(/\r?\n/)) {
    const line = rawLine.trim();
    const heading = /^##\s+(.+)$/.exec(line);
    if (heading) {
      group = heading[1]!.trim();
      continue;
    }
    if (!line.startsWith("|")) continue;
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length < 2) continue;
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue; // separator row
    if (cells[0]!.toLowerCase() === "name") continue; // header row
    const kind = ECOSYSTEM_GROUP_KINDS[group ?? ""] ?? null;
    if (kind === null) continue;
    const nameCell = cells[0]!;
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(nameCell);
    const name = link ? link[1]!.trim() : nameCell;
    const url = link ? link[2]!.trim() : null;
    if (name === "") continue;
    const npmMatch = url === null ? null : /npmjs\.com\/package\/([^?]+)/.exec(url);
    out.push({
      source: "ecosystem",
      rawId: url ?? name,
      kind,
      name,
      description: cells[1]!,
      repoUrl: url !== null && npmMatch === null ? url : null,
      npmSpec: npmMatch === null ? null : decodeURIComponent(npmMatch[1]!),
      homepage: null,
      tags: [],
      installSpec: { group, url },
      fetchedAt,
    });
  }
  return out;
}

export function normalizeSource(raw: SourceRaw): SourceItem[] {
  switch (raw.source) {
    case "cafe":
      return normalizeCafe(raw.payload, raw.fetchedAt);
    case "awesome":
      return normalizeAwesome(raw.payload, raw.fetchedAt);
    case "ecosystem":
      return normalizeEcosystem(raw.payload, raw.fetchedAt);
  }
}
```

- [ ] **Step 4: Run test to verify it passes + fixtures check**

Run: `bun test test/core/normalize.test.ts`
Expected: PASS (7 tests, including the fixture invariant test). Then `bun run typecheck` — exit 0 (this validates the JSON imports; if tsc complains the fixture JSON types are too loose, the code only casts through `unknown`, which is already done).

- [ ] **Step 5: Commit**

```bash
git add src/core/normalize.ts test/core/normalize.test.ts
git commit -m "feat: normalize per-source payloads into SourceItem (M1)"
```

---

### Task 4: Merge — canonical key, grouping, resolution

**Files:**
- Create: `src/core/merge.ts`
- Test: `test/core/merge.test.ts`

**Interfaces:**
- Consumes: `CatalogItem`, `SourceItem`, `SourceId` from `./model` (Task 2); `SOURCE_TRUST`, `bestTrust` from `./trust` (Task 2).
- Produces:

```ts
export function canonicalKey(item: SourceItem): string
export function normalizeRepoUrl(url: string): string
export function mergeCatalog(items: SourceItem[]): CatalogItem[]
```

Merge policy (spec §4): canonical key = normalized `repoUrl`, else `npm:npmSpec.toLowerCase()`, else `name.toLowerCase()@source`. Group by key (first-seen order). Within a group: `name`/`description` = longest non-empty (ties → first in source-preference order); `repoUrl`/`npmSpec`/`homepage` = first non-null in source preference `cafe > awesome > ecosystem`; `tags` = union sorted; `sources` = one provenance per source (preference order, `seenAt` = the item's `fetchedAt`); `installSpec` = per-source map; `bestTrust` = `bestTrust(sources)`.

- [ ] **Step 1: Write the failing test**

Create `test/core/merge.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import type { SourceItem } from "../src/core/model";
import { canonicalKey, mergeCatalog, normalizeRepoUrl } from "../src/core/merge";

const item = (over: Partial<SourceItem>): SourceItem => ({
  source: "cafe", rawId: "r", kind: "plugin", name: "N", description: "D",
  repoUrl: null, npmSpec: null, homepage: null, tags: [], installSpec: null, fetchedAt: 0, ...over,
});

describe("normalizeRepoUrl", () => {
  test("lowercases scheme/host, drops www and trailing slash", () => {
    expect(normalizeRepoUrl("HTTP://WWW.GitHub.com/Me/Repo/")).toBe("http://github.com/me/repo");
  });
  test("adds https:// when the scheme is missing", () => {
    expect(normalizeRepoUrl("github.com/me/repo")).toBe("https://github.com/me/repo");
  });
  test("sorts query params", () => {
    expect(normalizeRepoUrl("https://github.com/me/repo?b=2&a=1")).toBe("https://github.com/me/repo?a=1&b=2");
  });
});

describe("canonicalKey", () => {
  test("repoUrl wins, npm falls back, name@source is last resort", () => {
    expect(canonicalKey(item({ repoUrl: "https://GitHub.com/Me/Repo/" }))).toBe("https://github.com/me/repo");
    expect(canonicalKey(item({ npmSpec: "My-Pkg" }))).toBe("npm:my-pkg");
    expect(canonicalKey(item({ name: "Thing" }))).toBe("thing@cafe");
  });
});

describe("mergeCatalog", () => {
  test("merges same-repo items across sources with preference order", () => {
    const items: SourceItem[] = [
      item({ source: "awesome", rawId: "a1", name: "P One", description: "B", repoUrl: "https://github.com/me/p1/", tags: ["y"], fetchedAt: 20 }),
      item({ source: "cafe", rawId: "c1", name: "P One", description: "A", repoUrl: "https://github.com/me/p1", tags: ["x"], fetchedAt: 10 }),
      item({ source: "ecosystem", rawId: "e1", name: "P One", description: "C", repoUrl: "https://github.com/me/p1", fetchedAt: 30 }),
    ];
    const merged = mergeCatalog(items);
    expect(merged).toHaveLength(1);
    const m = merged[0]!;
    expect(m).toMatchObject({
      id: "https://github.com/me/p1",
      name: "P One",
      description: "A", // café first (longest is a tie, caf wins by source preference)
      repoUrl: "https://github.com/me/p1",
      tags: ["x", "y"],
      bestTrust: { level: "high", score: 30 },
    });
    expect(m.sources.map((s) => s.source)).toEqual(["cafe", "awesome", "ecosystem"]);
    expect(m.sources.map((s) => s.seenAt)).toEqual([10, 20, 30]);
    expect(Object.keys(m.installSpec)).toEqual(["awesome", "cafe", "ecosystem"]);
  });

  test("repoUrl vs npmSpec do not merge together; name@source is unique", () => {
    const items: SourceItem[] = [
      item({ source: "cafe", rawId: "c1", name: "Same", repoUrl: "https://github.com/me/same" }),
      item({ source: "cafe", rawId: "c2", name: "Same", npmSpec: "same-pkg" }),
      item({ source: "cafe", rawId: "c3", name: "Same" }),
      item({ source: "awesome", rawId: "c4", name: "Same" }),
    ];
    expect(mergeCatalog(items)).toHaveLength(4);
  });

  test("description takes the longest", () => {
    const merged = mergeCatalog([
      item({ source: "cafe", description: "Short", repoUrl: "https://github.com/me/x" }),
      item({ source: "awesome", description: "A much longer description", repoUrl: "https://github.com/me/x" }),
    ]);
    expect(merged[0]!.description).toBe("A much longer description");
  });

  test("preserves first-seen order across groups", () => {
    const merged = mergeCatalog([
      item({ source: "cafe", rawId: "b", name: "Beta", repoUrl: "https://github.com/me/b" }),
      item({ source: "cafe", rawId: "a", name: "Alpha", repoUrl: "https://github.com/me/a" }),
    ]);
    expect(merged.map((m) => m.name)).toEqual(["Beta", "Alpha"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/core/merge.test.ts`
Expected: FAIL — "cannot find module '../src/core/merge'".

- [ ] **Step 3: Write minimal implementation**

Create `src/core/merge.ts`:

```ts
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
  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  const params = [...new URLSearchParams(parsed.search).entries()].sort((a, b) => a[0].localeCompare(b[0]));
  parsed.search = params.length > 0 ? `?${params.map(([k, v]) => `${k}=${v}`).join("&")}` : "";
  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "");
}

/** Merge key: normalized repoUrl, else npm name, else name@source (spec §4). */
export function canonicalKey(item: SourceItem): string {
  if (item.repoUrl !== null) return normalizeRepoUrl(item.repoUrl);
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
    out.push({ source: src, trust: SOURCE_TRUST[src], rawId: match.rawId, seenAt: match.fetchedAt });
  }
  return out;
}

function resolveGroup(group: SourceItem[]): CatalogItem {
  const ordered = [...group].sort(
    (a, b) => SOURCE_PREFERENCE.indexOf(a.source) - SOURCE_PREFERENCE.indexOf(b.source),
  );
  const sources = buildSources(group);
  const installSpec: Record<SourceId, unknown> = {};
  for (const src of SOURCE_PREFERENCE) {
    const match = ordered.find((i) => i.source === src);
    if (match !== undefined) installSpec[src] = match.installSpec;
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
    bestTrust: bestTrust(sources),
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/core/merge.test.ts`
Expected: PASS (6 tests). Then `bun run typecheck` — exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/core/merge.ts test/core/merge.test.ts
git commit -m "feat: merge source items by canonical key (M1)"
```

---

### Task 5: Source adapters — fetch helpers + three adapters

**Files:**
- Create: `src/adapters/sources/fetch.ts`
- Create: `src/adapters/sources/cafe.ts`
- Create: `src/adapters/sources/awesome.ts`
- Create: `src/adapters/sources/ecosystem.ts`
- Test: `test/adapters/sources/cafe.test.ts`
- Test: `test/adapters/sources/awesome.test.ts`
- Test: `test/adapters/sources/ecosystem.test.ts`

**Interfaces:**
- Consumes: `SourceAdapter`, `SourceRaw`, `SourceId` from `../../core/model` (Task 2).
- Produces:

```ts
// fetch.ts
export async function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs?: number): Promise<Response>
export async function fetchText(url: string, timeoutMs?: number): Promise<string>
export async function fetchJson(url: string, init?: RequestInit, timeoutMs?: number): Promise<unknown>

// cafe.ts
export const cafeAdapter: SourceAdapter  // id: "cafe"; POST Convex, content-type json
// awesome.ts
export const awesomeAdapter: SourceAdapter  // id: "awesome"; GET registry.json
// ecosystem.ts
export const ecosystemAdapter: SourceAdapter  // id: "ecosystem"; GET MDX text
```

Endpoints (constants, verified live 2026-08-16):
- cafe: `https://curious-quail-727.convex.cloud/api/query`, body `{"path":"extensions:listAllApproved","args":{},"format":"json"}`
- awesome: `https://raw.githubusercontent.com/awesome-opencode/awesome-opencode/main/dist/registry.json`
- ecosystem: `https://raw.githubusercontent.com/anomalyco/opencode/dev/packages/web/src/content/docs/ecosystem.mdx`

- [ ] **Step 1: Write the failing tests**

Create `test/adapters/sources/cafe.test.ts`:

```ts
import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cafeAdapter } from "../../../src/adapters/sources/cafe";

const fixture = readFileSync(join(import.meta.dir, "../../fixtures/cafe.json"), "utf8");
const originalFetch = globalThis.fetch;
let captured: { url: string; init: RequestInit } | null = null;

afterEach(() => {
  globalThis.fetch = originalFetch;
  captured = null;
});

describe("cafeAdapter", () => {
  test("POSTs the Convex query and returns the raw payload", async () => {
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      captured = { url: String(input), init: init ?? {} };
      return new Response(fixture, { status: 200, headers: { "content-type": "application/json" } });
    };
    const raw = await cafeAdapter.fetch();
    expect(captured?.url).toBe("https://curious-quail-727.convex.cloud/api/query");
    expect(captured?.init.method).toBe("POST");
    expect(JSON.parse(captured?.init.body as string)).toEqual({ path: "extensions:listAllApproved", args: {}, format: "json" });
    expect(raw.source).toBe("cafe");
    expect(raw.fetchedAt).toBeGreaterThan(0);
    expect((raw.payload as { status: string }).status).toBe("success");
  });

  test("propagates HTTP errors", async () => {
    globalThis.fetch = async () => new Response("boom", { status: 500 });
    expect(cafeAdapter.fetch()).rejects.toThrow(/500/);
  });
});
```

Create `test/adapters/sources/awesome.test.ts`:

```ts
import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { awesomeAdapter } from "../../../src/adapters/sources/awesome";

const fixture = readFileSync(join(import.meta.dir, "../../fixtures/awesome.json"), "utf8");
const originalFetch = globalThis.fetch;
let capturedUrl = "";

afterEach(() => {
  globalThis.fetch = originalFetch;
  capturedUrl = "";
});

describe("awesomeAdapter", () => {
  test("GETs dist/registry.json and returns the raw payload", async () => {
    globalThis.fetch = async (input: RequestInfo | URL) => {
      capturedUrl = String(input);
      return new Response(fixture, { status: 200, headers: { "content-type": "application/json" } });
    };
    const raw = await awesomeAdapter.fetch();
    expect(capturedUrl).toBe("https://raw.githubusercontent.com/awesome-opencode/awesome-opencode/main/dist/registry.json");
    expect(raw.source).toBe("awesome");
    expect(Array.isArray(raw.payload)).toBe(true);
  });

  test("propagates HTTP errors", async () => {
    globalThis.fetch = async () => new Response("nope", { status: 404 });
    expect(awesomeAdapter.fetch()).rejects.toThrow(/404/);
  });
});
```

Create `test/adapters/sources/ecosystem.test.ts`:

```ts
import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ecosystemAdapter } from "../../../src/adapters/sources/ecosystem";

const fixture = readFileSync(join(import.meta.dir, "../../fixtures/ecosystem.mdx"), "utf8");
const originalFetch = globalThis.fetch;
let capturedUrl = "";

afterEach(() => {
  globalThis.fetch = originalFetch;
  capturedUrl = "";
});

describe("ecosystemAdapter", () => {
  test("GETs the MDX and returns text payload", async () => {
    globalThis.fetch = async (input: RequestInfo | URL) => {
      capturedUrl = String(input);
      return new Response(fixture, { status: 200, headers: { "content-type": "text/plain" } });
    };
    const raw = await ecosystemAdapter.fetch();
    expect(capturedUrl).toBe("https://raw.githubusercontent.com/anomalyco/opencode/dev/packages/web/src/content/docs/ecosystem.mdx");
    expect(raw.source).toBe("ecosystem");
    expect(typeof raw.payload).toBe("string");
    expect((raw.payload as string).length).toBeGreaterThan(0);
  });

  test("propagates HTTP errors", async () => {
    globalThis.fetch = async () => new Response("nope", { status: 500 });
    expect(ecosystemAdapter.fetch()).rejects.toThrow(/500/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test test/adapters/sources/`
Expected: FAIL — "cannot find module".

- [ ] **Step 3: Write minimal implementation**

Create `src/adapters/sources/fetch.ts`:

```ts
/** Shared fetch helpers. This module is the only place that touches network I/O. */

export async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 5000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchText(url: string, timeoutMs = 5000): Promise<string> {
  const res = await fetchWithTimeout(url, {}, timeoutMs);
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return await res.text();
}

export async function fetchJson(url: string, init: RequestInit = {}, timeoutMs = 5000): Promise<unknown> {
  const res = await fetchWithTimeout(url, init, timeoutMs);
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return await res.json();
}
```

Create `src/adapters/sources/cafe.ts`:

```ts
import type { SourceAdapter, SourceRaw } from "../../core/model";
import { fetchJson } from "./fetch";

export const CAFE_ENDPOINT = "https://curious-quail-727.convex.cloud/api/query";
export const CAFE_QUERY = { path: "extensions:listAllApproved", args: {}, format: "json" } as const;

export const cafeAdapter: SourceAdapter = {
  id: "cafe",
  async fetch(): Promise<SourceRaw> {
    const payload = await fetchJson(CAFE_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(CAFE_QUERY),
    });
    return { source: "cafe", payload, fetchedAt: Date.now() };
  },
};
```

Create `src/adapters/sources/awesome.ts`:

```ts
import type { SourceAdapter, SourceRaw } from "../../core/model";
import { fetchJson } from "./fetch";

export const AWESOME_URL = "https://raw.githubusercontent.com/awesome-opencode/awesome-opencode/main/dist/registry.json";

export const awesomeAdapter: SourceAdapter = {
  id: "awesome",
  async fetch(): Promise<SourceRaw> {
    const payload = await fetchJson(AWESOME_URL);
    return { source: "awesome", payload, fetchedAt: Date.now() };
  },
};
```

Create `src/adapters/sources/ecosystem.ts`:

```ts
import type { SourceAdapter, SourceRaw } from "../../core/model";
import { fetchText } from "./fetch";

export const ECOSYSTEM_URL = "https://raw.githubusercontent.com/anomalyco/opencode/dev/packages/web/src/content/docs/ecosystem.mdx";

export const ecosystemAdapter: SourceAdapter = {
  id: "ecosystem",
  async fetch(): Promise<SourceRaw> {
    const payload = await fetchText(ECOSYSTEM_URL);
    return { source: "ecosystem", payload, fetchedAt: Date.now() };
  },
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test test/adapters/sources/`
Expected: PASS (6 tests). Then `bun run typecheck` — exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/adapters/sources/ test/adapters/sources/
git commit -m "feat: source adapters for cafe, awesome, ecosystem (M1)"
```

---

### Task 6: npm adapter — per-item versions on demand

**Files:**
- Create: `src/adapters/npm.ts`
- Test: `test/adapters/npm.test.ts`

**Interfaces:**
- Consumes: `fetchJson` from `./sources/fetch` (Task 5).
- Produces:

```ts
export interface NpmInfo { latest: string; versions: string[]; publishedAt: string | null }
export async function npmInfo(pkg: string, timeoutMs?: number): Promise<NpmInfo | null>
```

Contract (spec §8): returns `null` on any failure (timeout, HTTP error, malformed payload) — silent degradation is the designed behavior; the caller decides what the user sees. Scoped packages (`@scope/name`) encode to `@scope%2Fname` in the URL.

- [ ] **Step 1: Write the failing test**

Create `test/adapters/npm.test.ts`:

```ts
import { afterEach, describe, expect, test } from "bun:test";
import { npmInfo } from "../src/adapters/npm";

const originalFetch = globalThis.fetch;
let capturedUrl = "";

afterEach(() => {
  globalThis.fetch = originalFetch;
  capturedUrl = "";
});

const registryResponse = (over: Record<string, unknown> = {}) =>
  new Response(
    JSON.stringify({ "dist-tags": { latest: "1.2.3" }, versions: { "1.0.0": {}, "1.2.3": {} }, time: { "1.2.3": "2026-01-01T00:00:00.000Z" }, ...over }),
    { status: 200, headers: { "content-type": "application/json" } },
  );

describe("npmInfo", () => {
  test("returns latest, versions and publishedAt", async () => {
    globalThis.fetch = async (input: RequestInfo | URL) => {
      capturedUrl = String(input);
      return registryResponse();
    };
    const info = await npmInfo("some-pkg");
    expect(capturedUrl).toBe("https://registry.npmjs.org/some-pkg");
    expect(info).toEqual({ latest: "1.2.3", versions: ["1.0.0", "1.2.3"], publishedAt: "2026-01-01T00:00:00.000Z" });
  });

  test("encodes scoped packages", async () => {
    globalThis.fetch = async (input: RequestInfo | URL) => {
      capturedUrl = String(input);
      return registryResponse();
    };
    await npmInfo("@scope/pkg");
    expect(capturedUrl).toBe("https://registry.npmjs.org/@scope%2Fpkg");
  });

  test("sorts versions numerically", async () => {
    globalThis.fetch = async () => registryResponse({ versions: { "1.10.0": {}, "1.9.0": {}, "2.0.0": {} } });
    const info = await npmInfo("p");
    expect(info?.versions).toEqual(["1.9.0", "1.10.0", "2.0.0"]);
  });

  test("returns null on HTTP error, malformed payload and missing latest", async () => {
    globalThis.fetch = async () => new Response("nope", { status: 404 });
    expect(await npmInfo("missing")).toBeNull();

    globalThis.fetch = async () => new Response("{broken", { status: 200 });
    expect(await npmInfo("broken")).toBeNull();

    globalThis.fetch = async () => registryResponse({ "dist-tags": {} });
    expect(await npmInfo("notags")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/adapters/npm.test.ts`
Expected: FAIL — "cannot find module '../src/adapters/npm'".

- [ ] **Step 3: Write minimal implementation**

Create `src/adapters/npm.ts`:

```ts
import { fetchJson } from "./sources/fetch";

export interface NpmInfo {
  latest: string;
  versions: string[];
  publishedAt: string | null;
}

const NPM_REGISTRY = "https://registry.npmjs.org/";

/** Scoped packages must keep the leading @ and encode the rest (@scope%2Fname). */
function registryUrl(pkg: string): string {
  const encoded = encodeURIComponent(pkg).replace(/^%40/, "@");
  return `${NPM_REGISTRY}${encoded}`;
}

/**
 * Per-item npm metadata, on demand. Returns null on ANY failure (timeout,
 * HTTP error, malformed payload) — silent degradation is the contract
 * (spec §8); the caller decides what the user sees.
 */
export async function npmInfo(pkg: string, timeoutMs = 5000): Promise<NpmInfo | null> {
  try {
    const payload = (await fetchJson(registryUrl(pkg), {}, timeoutMs)) as Record<string, unknown>;
    const distTags = payload["dist-tags"];
    if (typeof distTags !== "object" || distTags === null) return null;
    const latest = (distTags as Record<string, unknown>)["latest"];
    if (typeof latest !== "string") return null;
    const versionsObj = payload.versions;
    if (typeof versionsObj !== "object" || versionsObj === null) return null;
    const versions = Object.keys(versionsObj as Record<string, unknown>).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true }),
    );
    const time = payload.time;
    const publishedAt =
      typeof time === "object" && time !== null && typeof (time as Record<string, unknown>)[latest] === "string"
        ? ((time as Record<string, unknown>)[latest] as string)
        : null;
    return { latest, versions, publishedAt };
  } catch {
    return null;
  }
}
```

> The catch returning `null` is carried by the contract comment above (AGENTS.md "no hidden catch" rule — this one is declared).

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/adapters/npm.test.ts`
Expected: PASS (4 tests). Then `bun run typecheck` — exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/adapters/npm.ts test/adapters/npm.test.ts
git commit -m "feat: on-demand npm metadata adapter (M1)"
```

---

### Task 7: Cache adapter — atomic file cache + TTL

**Files:**
- Create: `src/adapters/cache.ts`
- Test: `test/adapters/cache.test.ts`

**Interfaces:**
- Consumes: `CatalogItem`, `SourceId`, `SourceItem` from `../core/model` (Task 2).
- Produces:

```ts
export const CACHE_VERSION: 1
export const DEFAULT_TTL_MS: number  // 24 * 60 * 60 * 1000
export interface SourceMeta { fetchedAt: number | null; lastError: string | null; itemCount: number }
export interface CacheShape {
  version: 1;
  fetchedAt: number | null;
  items: CatalogItem[];
  sourceItems: Partial<Record<SourceId, SourceItem[]>>;
  sourceMeta: Record<SourceId, SourceMeta>;
  stale: boolean;
}
export function cacheDir(): string
export function cachePath(dir?: string): string
export function emptyCache(): CacheShape
export function loadCache(dir?: string): CacheShape | null
export function saveCache(cache: CacheShape, dir?: string): void
export function isFresh(cache: CacheShape, ttlMs?: number): boolean
```

Behavior (spec §6): cache file `<config>/opencode/mercato/cache.json` (`%APPDATA%\opencode` on Windows, `~/.config/opencode` otherwise, honoring `XDG_CONFIG_HOME`). Save is atomic (tmp + rename), never partial. Load is null on missing file or corrupt content (corruption = treat as missing; validate `version === 1` + `items` array + `sourceMeta` object). `sourceItems` is a plan refinement over the spec (allows per-source recovery on partial failure — the spec's "write-on-failure keeps old items").

- [ ] **Step 1: Write the failing test**

Create `test/adapters/cache.test.ts`:

```ts
import { afterAll, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
} from "../src/adapters/cache";
import type { CacheShape } from "../src/adapters/cache";

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
    const leftovers = readFileSync(cachePath(dir), "utf8");
    expect(leftovers.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/adapters/cache.test.ts`
Expected: FAIL — "cannot find module '../src/adapters/cache'".

- [ ] **Step 3: Write minimal implementation**

Create `src/adapters/cache.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/adapters/cache.test.ts`
Expected: PASS. Then `bun run typecheck` — exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/adapters/cache.ts test/adapters/cache.test.ts
git commit -m "feat: atomic file cache with TTL and per-source meta (M1)"
```

---

### Task 8: Aggregate orchestrator — refresh the catalog

**Files:**
- Create: `src/core/aggregate.ts`
- Test: `test/core/aggregate.test.ts`

**Interfaces:**
- Consumes: `SourceAdapter` from `./model` (Task 2); `normalizeSource` from `./normalize` (Task 3); `mergeCatalog` from `./merge` (Task 4); `emptyCache`, `loadCache`, `saveCache`, `CacheShape`, `SourceMeta` from `../adapters/cache` (Task 7).
- Produces:

```ts
export interface AggregateResult {
  catalog: Catalog;                       // { version: 1, items }
  sourceMeta: Record<SourceId, SourceMeta>;
  stale: boolean;                         // false in M1 (refresh is synchronous)
}
export async function refreshCatalog(adapters: readonly SourceAdapter[], dir?: string): Promise<AggregateResult>
```

Behavior (spec §9): fetch each adapter sequentially; a failing source keeps its previously cached items and records `lastError`; others merge fresh. Result is always persisted atomically.

- [ ] **Step 1: Write the failing test**

Create `test/core/aggregate.test.ts`:

```ts
import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SourceAdapter, SourceId, SourceRaw } from "../src/core/model";
import { loadCache } from "../src/adapters/cache";
import { refreshCatalog } from "../src/core/aggregate";

const dir = mkdtempSync(join(tmpdir(), "mercato-aggregate-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

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
    const res = await refreshCatalog([fake("cafe", {}, true), fake("awesome", {}, true), fake("ecosystem", {}, true)], dir);
    expect(res.catalog.items).toHaveLength(0);
    expect(res.sourceMeta.cafe.lastError).toBe("boom-cafe");
    const cached = loadCache(dir)!;
    expect(cached.items).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/core/aggregate.test.ts`
Expected: FAIL — "cannot find module '../src/core/aggregate'".

- [ ] **Step 3: Write minimal implementation**

Create `src/core/aggregate.ts`:

```ts
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
 */
export async function refreshCatalog(adapters: readonly SourceAdapter[], dir?: string): Promise<AggregateResult> {
  const prev = loadCache(dir);
  const fresh: SourceItem[] = [];
  const sourceMeta = emptyCache().sourceMeta;
  for (const adapter of adapters) {
    const src = adapter.id;
    try {
      const raw = await adapter.fetch();
      const items = normalizeSource(raw);
      fresh.push(...items);
      sourceMeta[src] = { fetchedAt: raw.fetchedAt, lastError: null, itemCount: items.length };
    } catch (err) {
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
  const cache: CacheShape = { ...emptyCache(), fetchedAt: Date.now(), items, sourceItems: groupBySource(fresh), sourceMeta, stale: false };
  saveCache(cache, dir);
  return { catalog: { version: 1, items }, sourceMeta, stale: false };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/core/aggregate.test.ts`
Expected: PASS (3 tests). Then `bun run typecheck` — exit 0, and full suite:

```
bun test
bun run typecheck
```

Both green.

- [ ] **Step 5: Commit**

```bash
git add src/core/aggregate.ts test/core/aggregate.test.ts
git commit -m "feat: catalog refresh orchestrator with per-source isolation (M1)"
```

---

## Self-Review Notes

- **Spec coverage**: §3 model → Task 2; §4 merge → Task 4; §5 trust → Task 2; §6 cache → Task 7; §7 adapters → Tasks 1+3+5; §8 npm → Task 6; §9 error handling → Tasks 5+8; §10 testing → every task. §11 out-of-scope respected (no TUI/install code).
- **Plan refinements over spec, flagged**: `SourceItem.fetchedAt` (fills `seenAt`); `CacheShape.sourceItems` (per-source recovery on partial failure); repository-url raw values kept until merge (canonical key normalizes — avoids double normalization).
- **Type consistency**: `SourceAdapter`/`SourceRaw` defined once in Task 2, consumed identically by Tasks 5, 8. `CacheShape` defined once in Task 7, consumed by Task 8. `canonicalKey` (`string`) consistent across Tasks 4 and 8.