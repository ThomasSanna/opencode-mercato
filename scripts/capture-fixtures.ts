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