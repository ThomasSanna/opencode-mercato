import { Plugin } from "@opencode-ai/plugin/tui";
import type { Context } from "@opencode-ai/plugin/tui/context";
import { setupTui, openMercato } from "./tui/index";

export { setupTui, openMercato };

export const tui = (ctx: Context): void => {
  setupTui(ctx);
};

const pluginDef = Plugin.define({
  id: "opencode-mercato",
  setup: (ctx) => {
    setupTui(ctx);
  },
});

export default Object.assign(tui, pluginDef, {
  id: "opencode-mercato",
  tui,
  setup: (ctx: Context) => setupTui(ctx),
});