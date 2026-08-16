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