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