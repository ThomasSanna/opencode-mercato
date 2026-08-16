import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ecosystemAdapter } from "../../../src/adapters/sources/ecosystem";

const fixture = readFileSync(join(import.meta.dir, "../../fixtures/ecosystem.mdx"), "utf8");
const originalFetch = globalThis.fetch;
let capturedUrl = "";

afterEach(() => {
  globalThis.fetch = originalFetch;
  capturedUrl = "";
});

describe("ecosystemAdapter", () => {
  test("GETs the MDX and returns text payload", async () => {
    // bun-types requires the fetch namespace members (e.g. preconnect) on any value assigned to globalThis.fetch.
    globalThis.fetch = Object.assign(
      async (input: string | URL | Request) => {
        capturedUrl = String(input);
        return new Response(fixture, { status: 200, headers: { "content-type": "text/plain" } });
      },
      { preconnect: (): void => {} },
    );
    const raw = await ecosystemAdapter.fetch();
    expect(capturedUrl).toBe("https://raw.githubusercontent.com/anomalyco/opencode/dev/packages/web/src/content/docs/ecosystem.mdx");
    expect(raw.source).toBe("ecosystem");
    expect(typeof raw.payload).toBe("string");
    expect((raw.payload as string).length).toBeGreaterThan(0);
  });

  test("propagates HTTP errors", async () => {
    globalThis.fetch = Object.assign(async () => new Response("nope", { status: 500 }), { preconnect: (): void => {} });
    expect(ecosystemAdapter.fetch()).rejects.toThrow(/500/);
  });
});