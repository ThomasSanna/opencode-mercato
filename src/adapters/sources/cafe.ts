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