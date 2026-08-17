/** @jsxImportSource @opentui/solid */
import type { KeyEvent } from "@opentui/core";
import { useKeyboard, type JSX } from "@opentui/solid";
import { createMemo, createSignal, onMount } from "solid-js";
import { listBackups, type BackupEntry } from "../adapters/backups";
import { isFresh, loadCache } from "../adapters/cache";
import { npmInfo, type NpmInfo } from "../adapters/npm";
import { loadSettings } from "../adapters/settings";
import { loadConfigSnapshot, type ConfigSnapshot } from "../adapters/snapshot";
import { awesomeAdapter } from "../adapters/sources/awesome";
import { cafeAdapter } from "../adapters/sources/cafe";
import { ecosystemAdapter } from "../adapters/sources/ecosystem";
import { refreshCatalog } from "../core/aggregate";
import {
  createInitialListState,
  type ConfirmState,
  type DetailState,
  type FlowState,
  type ListState,
  type RestoreState,
  type SettingsState,
  type UpdatesState,
  type VersionsState,
} from "../core/flow";
import type { CatalogItem } from "../core/model";
import {
  KIND_FILTER_LIST,
  searchAndFilterCatalog,
  type KindFilter,
} from "../core/search";
import { DEFAULT_SETTINGS, type MercatoSettings } from "../core/settings";
import { getItemStatus, type ItemStatus } from "../core/status";
import { evaluateCatalogUpdates } from "../core/update-checker";
import { Toast } from "./components/toast";
import { handleDialogKey } from "./handlers";
import { ConfirmScreen } from "./screens/confirm";
import { DetailScreen } from "./screens/detail";
import { ListScreen } from "./screens/list";
import { RestoreScreen } from "./screens/restore";
import { SettingsScreen } from "./screens/settings";
import { UpdatesScreen } from "./screens/updates";
import { VersionsScreen } from "./screens/versions";

export interface MercatoDialogProps {
  onClose: () => void;
  showToast?: (message: string) => void;
  initialItems?: CatalogItem[];
  initialStale?: boolean;
  initialSnapshot?: ConfigSnapshot;
  initialSettings?: MercatoSettings;
  initialBackups?: BackupEntry[];
}

export function MercatoDialog(props: MercatoDialogProps): JSX.Element {
  const [items, setItems] = createSignal<CatalogItem[]>(props.initialItems ?? []);
  const [stale, setStale] = createSignal<boolean>(props.initialStale ?? false);
  const [snapshot, setSnapshot] = createSignal<ConfigSnapshot>(
    props.initialSnapshot ?? loadConfigSnapshot()
  );
  const [settings, setSettings] = createSignal<MercatoSettings>(
    props.initialSettings ?? DEFAULT_SETTINGS
  );
  const [backups, setBackups] = createSignal<BackupEntry[]>(
    props.initialBackups ?? []
  );
  const [toastMessage, setToastMessage] = createSignal<string | null>(null);
  const [flow, setFlow] = createSignal<FlowState>(createInitialListState());
  const [npmMap, setNpmMap] = createSignal<Record<string, NpmInfo>>({});

  let toastTimer: ReturnType<typeof setTimeout> | undefined;

  const triggerToast = (message: string) => {
    setToastMessage(message);
    props.showToast?.(message);
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const refreshSnapshot = () => {
    try {
      setSnapshot(loadConfigSnapshot());
    } catch {
      // ignore reload error
    }
  };

  const refreshBackups = () => {
    try {
      setBackups(listBackups());
    } catch {
      // ignore backups error
    }
  };

  const fetchNpmData = async (pkg: string): Promise<NpmInfo | null> => {
    const current = npmMap();
    if (current[pkg]) return current[pkg];
    const data = await npmInfo(pkg);
    if (data) {
      setNpmMap((prev) => ({ ...prev, [pkg]: data }));
    }
    return data;
  };

  onMount(() => {
    try {
      setSettings(loadSettings());
      setBackups(listBackups());
    } catch {
      // ignore load errors
    }

    if (items().length === 0) {
      const cached = loadCache();
      if (cached && cached.items.length > 0) {
        setItems(cached.items);
        setStale(!isFresh(cached));
      } else {
        refreshCatalog([cafeAdapter, awesomeAdapter, ecosystemAdapter])
          .then((res) => {
            setItems(res.catalog.items);
            setStale(res.stale);
          })
          .catch(() => {
            setStale(true);
          });
      }
    }
  });

  const filteredItems = createMemo(() => {
    const s = flow();
    if (s.screen !== "list") return [];
    return searchAndFilterCatalog(items(), {
      query: s.query,
      kind: s.kindFilter,
    });
  });

  const counts = createMemo(() => {
    const list = items();
    const result: Partial<Record<KindFilter, number>> = { all: list.length };
    for (const kind of KIND_FILTER_LIST) {
      if (kind === "all") continue;
      result[kind] = list.filter((i) => i.kind === kind).length;
    }
    return result;
  });

  const itemStatuses = createMemo(() => {
    const snap = snapshot();
    const res: Record<string, ItemStatus> = {};
    for (const item of items()) {
      res[item.id] = getItemStatus(item, snap);
    }
    return res;
  });

  const catalogUpdates = createMemo(() => {
    return evaluateCatalogUpdates(items(), snapshot(), npmMap(), settings());
  });

  const handleKey = (key: KeyEvent) => {
    handleDialogKey({
      key,
      flow: flow(),
      setFlow,
      filteredItems: filteredItems(),
      snapshot: snapshot(),
      refreshSnapshot,
      npmMap: npmMap(),
      fetchNpmData,
      catalogUpdates: catalogUpdates(),
      settings: settings(),
      setSettings,
      backups: backups(),
      refreshBackups,
      showToast: triggerToast,
      onClose: props.onClose,
    });
  };

  useKeyboard(handleKey);

  return (
    <box flexDirection="column" width="100%">
      {flow().screen === "list" && (
        <ListScreen
          items={filteredItems()}
          totalCount={items().length}
          selectedIndex={(flow() as ListState).selectedIndex}
          query={(flow() as ListState).query}
          activeKind={(flow() as ListState).kindFilter}
          counts={counts()}
          itemStatuses={itemStatuses()}
          itemUpdates={catalogUpdates().updates}
          stale={stale()}
        />
      )}
      {flow().screen === "detail" && (
        <DetailScreen
          item={(flow() as DetailState).item}
          selectedActionIndex={(flow() as DetailState).selectedActionIndex}
          status={getItemStatus((flow() as DetailState).item, snapshot())}
          updateInfo={catalogUpdates().updates[(flow() as DetailState).item.id]}
        />
      )}
      {flow().screen === "confirm" && (
        <ConfirmScreen
          plan={(flow() as ConfirmState).plan}
          selectedActionIndex={(flow() as ConfirmState).selectedActionIndex}
        />
      )}
      {flow().screen === "updates" && (
        <UpdatesScreen
          updates={catalogUpdates().availableUpdates}
          selectedIndex={(flow() as UpdatesState).selectedIndex}
          stale={stale()}
        />
      )}
      {flow().screen === "versions" && (
        <VersionsScreen
          item={(flow() as VersionsState).item}
          versions={(flow() as VersionsState).versions}
          currentVersion={(flow() as VersionsState).currentVersion}
          selectedIndex={(flow() as VersionsState).selectedIndex}
        />
      )}
      {flow().screen === "settings" && (
        <SettingsScreen
          settings={settings()}
          selectedIndex={(flow() as SettingsState).selectedIndex}
        />
      )}
      {flow().screen === "restore" && (
        <RestoreScreen
          backups={backups()}
          selectedIndex={(flow() as RestoreState).selectedIndex}
        />
      )}
      <Toast message={toastMessage()} />
    </box>
  );
}
