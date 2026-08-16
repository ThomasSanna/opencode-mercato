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
      rawId: npmMatch === null ? (url ?? name) : decodeURIComponent(npmMatch[1]!),
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