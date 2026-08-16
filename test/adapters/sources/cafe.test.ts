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
    // bun-types requires the fetch namespace members (e.g. preconnect) on any value assigned to globalThis.fetch.
    globalThis.fetch = Object.assign(
      async (input: string | URL | Request, init?: RequestInit) => {
        captured = { url: String(input), init: init ?? {} };
        return new Response(fixture, { status: 200, headers: { "content-type": "application/json" } });
      },
      { preconnect: (): void => {} },
    );
    const raw = await cafeAdapter.fetch();
    expect(captured?.url).toBe("https://curious-quail-727.convex.cloud/api/query");
    expect(captured?.init.method).toBe("POST");
    expect(JSON.parse(captured?.init.body as string)).toEqual({ path: "extensions:listAllApproved", args: {}, format: "json" });
    expect(raw.source).toBe("cafe");
    expect(raw.fetchedAt).toBeGreaterThan(0);
    expect((raw.payload as { status: string }).status).toBe("success");
  });

  test("propagates HTTP errors", async () => {
    globalThis.fetch = Object.assign(async () => new Response("boom", { status: 500 }), { preconnect: (): void => {} });
    expect(cafeAdapter.fetch()).rejects.toThrow(/500/);
  });
});