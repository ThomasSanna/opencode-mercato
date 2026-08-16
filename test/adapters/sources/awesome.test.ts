import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { awesomeAdapter } from "../../../src/adapters/sources/awesome";

const fixture = readFileSync(join(import.meta.dir, "../../fixtures/awesome.json"), "utf8");
const originalFetch = globalThis.fetch;
let capturedUrl = "";

afterEach(() => {
  globalThis.fetch = originalFetch;
  capturedUrl = "";
});

describe("awesomeAdapter", () => {
  test("GETs dist/registry.json and returns the raw payload", async () => {
    // bun-types requires the fetch namespace members (e.g. preconnect) on any value assigned to globalThis.fetch.
    globalThis.fetch = Object.assign(
      async (input: string | URL | Request) => {
        capturedUrl = String(input);
        return new Response(fixture, { status: 200, headers: { "content-type": "application/json" } });
      },
      { preconnect: (): void => {} },
    );
    const raw = await awesomeAdapter.fetch();
    expect(capturedUrl).toBe("https://raw.githubusercontent.com/awesome-opencode/awesome-opencode/main/dist/registry.json");
    expect(raw.source).toBe("awesome");
    expect(Array.isArray(raw.payload)).toBe(true);
  });

  test("propagates HTTP errors", async () => {
    globalThis.fetch = Object.assign(async () => new Response("nope", { status: 404 }), { preconnect: (): void => {} });
    expect(awesomeAdapter.fetch()).rejects.toThrow(/404/);
  });
});