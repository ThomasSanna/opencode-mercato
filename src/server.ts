import { Plugin } from "@opencode-ai/plugin";

/**
 * opencode-mercato — server entry (OpenCode V2).
 *
 * Thin entry only: marketplace logic lives in `src/core` and `src/adapters`
 * (see docs/architecture.md). Registered via `Plugin.define`.
 */
export default Plugin.define({
  id: "opencode-mercato",
  setup: async (ctx) => {
    // M1+: tools (market_search, market_view, market_install, ...)
    void ctx;
  },
});