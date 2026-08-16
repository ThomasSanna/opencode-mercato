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