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