import { describe, expect, test } from "bun:test";
import type {
  Context,
  DialogOptions,
  KeymapCommand,
  KeymapLayer,
  ToastOptions,
} from "@opencode-ai/plugin/tui/context";
import type { JSX } from "@opentui/solid";
import { openMercato, setupTui } from "../../src/tui/index";
import { STRINGS } from "../../src/tui/strings";

function createMockContext() {
  let registeredLayer: (() => KeymapLayer) | null = null;
  let activeMode = "base";
  let modeCleanupCalled = false;
  let dialogShown = false;
  let dialogCleared = false;
  let dialogOptions: DialogOptions | null = null;
  let toastShown: ToastOptions | null = null;

  const mockCtx: Partial<Context> = {
    keymap: {
      layer: (factory: () => KeymapLayer) => {
        registeredLayer = factory;
      },
      mode: {
        current: () => activeMode,
        push: (mode: string) => {
          activeMode = mode;
          return () => {
            modeCleanupCalled = true;
            activeMode = "base";
          };
        },
      },
      dispatch: () => {},
      shortcuts: () => [],
      commands: () => [],
      pending: () => [],
      active: () => [],
    },
    ui: {
      dialog: {
        set: (opts: DialogOptions) => {
          dialogOptions = opts;
        },
        show: (_render: () => JSX.Element, onClose?: () => void) => {
          dialogShown = true;
          // simulate dialog close
          onClose?.();
        },
        clear: () => {
          dialogCleared = true;
        },
        alert: async () => {},
        confirm: async () => true,
        prompt: async () => undefined,
        select: async () => undefined,
      },
      toast: {
        show: (opts: ToastOptions) => {
          toastShown = opts;
        },
      },
      format: {
        path: (v: string) => v,
      },
      router: {
        register: () => () => {},
        navigate: () => {},
        current: () => ({ type: "home" }),
      },
      tabs: {
        enabled: () => false,
        list: () => [],
        open: () => false,
        focus: () => false,
        close: () => false,
      },
      slot: () => () => {},
    },
  };

  return {
    ctx: mockCtx as Context,
    getRegisteredLayer: () => registeredLayer?.(),
    getState: () => ({
      activeMode,
      modeCleanupCalled,
      dialogShown,
      dialogCleared,
      dialogOptions,
      toastShown,
    }),
  };
}

describe("TUI setup and openMercato", () => {
  test("setupTui registers keymap command layer for mercato", () => {
    const { ctx, getRegisteredLayer } = createMockContext();
    setupTui(ctx);

    const layer = getRegisteredLayer();
    expect(layer).toBeDefined();
    expect(layer?.commands?.length).toBe(1);

    const cmd = layer?.commands?.[0] as KeymapCommand;
    expect(cmd.id).toBe(STRINGS.COMMAND_ID);
    expect(cmd.title).toBe(STRINGS.COMMAND_TITLE);
    expect(cmd.slash?.name).toBe("mercato");
    expect(cmd.palette).toBe(true);
    expect(cmd.group).toBe("Plugin Manager");
  });

  test("openMercato sets dialog size, pushes mode, and shows dialog", () => {
    const { ctx, getState } = createMockContext();
    openMercato(ctx);

    const state = getState();
    expect(state.dialogShown).toBe(true);
    expect(state.dialogOptions).toEqual({ size: "large", centered: true });
    expect(state.modeCleanupCalled).toBe(true);
  });
});
