import type { CatalogItem, Kind } from "./model";

export interface FilterOptions {
  query?: string;
  kind?: "all" | Kind;
}

export const ALL_KINDS: readonly Kind[] = [
  "plugin",
  "mcp",
  "skill",
  "agent",
  "theme",
  "command",
] as const;

export type KindFilter = "all" | Kind;

export const KIND_FILTER_LIST: readonly KindFilter[] = [
  "all",
  ...ALL_KINDS,
] as const;

/**
 * Computes a relevance score for a catalog item against search query tokens.
 * Returns 0 if not all tokens match.
 */
function scoreItem(item: CatalogItem, tokens: string[]): number {
  if (tokens.length === 0) return 1;

  const nameLower = item.name.toLowerCase();
  const descLower = item.description.toLowerCase();
  const tagsLower = item.tags.map((t) => t.toLowerCase()).join(" ");
  const npmLower = item.npmSpec?.toLowerCase() ?? "";
  const repoLower = item.repoUrl?.toLowerCase() ?? "";
  const rawIdsLower = item.sources.map((s) => s.rawId.toLowerCase()).join(" ");

  const combinedSearchText = `${nameLower} ${descLower} ${tagsLower} ${npmLower} ${repoLower} ${rawIdsLower}`;

  let score = 0;

  for (const token of tokens) {
    if (!combinedSearchText.includes(token)) {
      return 0; // all tokens must match
    }

    if (nameLower === token) {
      score += 100;
    } else if (nameLower.startsWith(token)) {
      score += 50;
    } else if (nameLower.includes(token)) {
      score += 25;
    } else if (npmLower.includes(token)) {
      score += 15;
    } else if (tagsLower.includes(token)) {
      score += 10;
    } else if (descLower.includes(token)) {
      score += 5;
    } else {
      score += 1;
    }
  }

  return score;
}

/**
 * Filters and ranks catalog items by kind filter and search query.
 */
export function searchAndFilterCatalog(
  items: readonly CatalogItem[],
  options: FilterOptions = {}
): CatalogItem[] {
  const query = options.query?.trim().toLowerCase() ?? "";
  const kind = options.kind ?? "all";

  const tokens = query ? query.split(/\s+/).filter(Boolean) : [];

  const matched: Array<{ item: CatalogItem; score: number }> = [];

  for (const item of items) {
    if (kind !== "all" && item.kind !== kind) {
      continue;
    }

    const score = scoreItem(item, tokens);
    if (score > 0) {
      matched.push({ item, score });
    }
  }

  matched.sort((a, b) => {
    // 1. Higher search score first
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    // 2. Higher trust score first
    if (b.item.bestTrust.score !== a.item.bestTrust.score) {
      return b.item.bestTrust.score - a.item.bestTrust.score;
    }
    // 3. Alphabetical by name
    return a.item.name.localeCompare(b.item.name);
  });

  return matched.map((m) => m.item);
}
