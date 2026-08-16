import { afterEach, describe, expect, test } from "bun:test";
import { npmInfo } from "../../src/adapters/npm";

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

// bun-types merges a preconnect namespace onto fetch; any value assigned to
// globalThis.fetch must carry it (same pattern as test/adapters/sources/cafe.test.ts).
const mockFetch = (handler: (input: string | URL | Request, init?: RequestInit) => Promise<Response>) =>
  Object.assign(handler, { preconnect: (): void => {} });

describe("npmInfo", () => {
  test("returns latest, versions and publishedAt", async () => {
    globalThis.fetch = mockFetch(async (input) => {
      capturedUrl = String(input);
      return registryResponse();
    });
    const info = await npmInfo("some-pkg");
    expect(capturedUrl).toBe("https://registry.npmjs.org/some-pkg");
    expect(info).toEqual({ latest: "1.2.3", versions: ["1.0.0", "1.2.3"], publishedAt: "2026-01-01T00:00:00.000Z" });
  });

  test("encodes scoped packages", async () => {
    globalThis.fetch = mockFetch(async (input) => {
      capturedUrl = String(input);
      return registryResponse();
    });
    await npmInfo("@scope/pkg");
    expect(capturedUrl).toBe("https://registry.npmjs.org/@scope%2Fpkg");
  });

  test("sorts versions numerically", async () => {
    globalThis.fetch = mockFetch(async () => registryResponse({ versions: { "1.10.0": {}, "1.9.0": {}, "2.0.0": {} } }));
    const info = await npmInfo("p");
    expect(info?.versions).toEqual(["1.9.0", "1.10.0", "2.0.0"]);
  });

  test("returns null on HTTP error, malformed payload and missing latest", async () => {
    globalThis.fetch = mockFetch(async () => new Response("nope", { status: 404 }));
    expect(await npmInfo("missing")).toBeNull();

    globalThis.fetch = mockFetch(async () => new Response("{broken", { status: 200 }));
    expect(await npmInfo("broken")).toBeNull();

    globalThis.fetch = mockFetch(async () => registryResponse({ "dist-tags": {} }));
    expect(await npmInfo("notags")).toBeNull();
  });
});