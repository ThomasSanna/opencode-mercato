import { afterEach, describe, expect, test } from "bun:test";
import { fetchWithTimeout } from "../../../src/adapters/sources/fetch";

const originalFetch = globalThis.fetch;
let receivedSignal: AbortSignal | null = null;

afterEach(() => {
  globalThis.fetch = originalFetch;
  receivedSignal = null;
});

describe("fetchWithTimeout", () => {
  test("passes a combined signal that includes the caller's signal", async () => {
    // bun-types requires the fetch namespace members (e.g. preconnect) on any value assigned to globalThis.fetch.
    globalThis.fetch = Object.assign(
      async (_input: string | URL | Request, init?: RequestInit) => {
        receivedSignal = init?.signal ?? null;
        return new Response("ok", { status: 200 });
      },
      { preconnect: (): void => {} },
    );
    const caller = new AbortController();
    await fetchWithTimeout("https://example.com/ok", { signal: caller.signal });
    expect(receivedSignal).toBeDefined();
    expect(receivedSignal!.aborted).toBe(false);
  });

  test("propagates a caller signal aborted before the call", async () => {
    globalThis.fetch = Object.assign(
      async (_input: string | URL | Request, init?: RequestInit) => {
        receivedSignal = init?.signal ?? null;
        return new Response("ok", { status: 200 });
      },
      { preconnect: (): void => {} },
    );
    const caller = new AbortController();
    caller.abort();
    await fetchWithTimeout("https://example.com/aborted", { signal: caller.signal });
    // If the caller signal were overwritten by the internal timeout signal this would be false.
    expect(receivedSignal).toBeDefined();
    expect(receivedSignal!.aborted).toBe(true);
  });
});