/** @jsxImportSource @opentui/solid */
import type { JSX } from "@opentui/solid";
import { computeWindow } from "../../core/flow";
import type { CatalogItem } from "../../core/model";
import type { KindFilter } from "../../core/search";
import type { ItemStatus } from "../../core/status";
import type { ItemUpdateInfo } from "../../core/versions";
import { Header } from "../components/header";
import { ItemRow } from "../components/item_row";
import { KeymapHelp } from "../components/keymap_help";
import { SearchBar } from "../components/search_bar";
import { KindTabs } from "../components/tabs";
import { STRINGS } from "../strings";

export interface ListScreenProps {
  items: readonly CatalogItem[];
  totalCount: number;
  selectedIndex: number;
  query: string;
  activeKind: KindFilter;
  counts?: Partial<Record<KindFilter, number>>;
  itemStatuses?: Record<string, ItemStatus>;
  itemUpdates?: Record<string, ItemUpdateInfo>;
  stale?: boolean;
  windowSize?: number;
}

export function ListScreen(props: ListScreenProps): JSX.Element {
  const windowSize = props.windowSize ?? 8;
  const { start, end } = computeWindow(
    props.selectedIndex,
    props.items.length,
    windowSize
  );

  const visibleItems = props.items.slice(start, end);

  return (
    <box flexDirection="column" padding={1} width="100%">
      <Header
        filteredCount={props.items.length}
        totalCount={props.totalCount}
        stale={props.stale}
      />
      <KindTabs activeKind={props.activeKind} counts={props.counts} />
      <SearchBar query={props.query} />

      <box flexDirection="column" gap={1} paddingTop={1} paddingBottom={1} minHeight={12}>
        {props.items.length === 0 ? (
          <box paddingLeft={1} paddingTop={2} paddingBottom={2}>
            <text fg="#8b949e">
              {STRINGS.EMPTY_SEARCH}
            </text>
          </box>
        ) : (
          visibleItems.map((item, idx) => {
            const actualIndex = start + idx;
            const isSelected = actualIndex === props.selectedIndex;
            const status = props.itemStatuses?.[item.id];
            const updateInfo = props.itemUpdates?.[item.id];
            return (
              <ItemRow
                item={item}
                isSelected={isSelected}
                status={status}
                updateInfo={updateInfo}
              />
            );
          })
        )}
      </box>


      <KeymapHelp screen="list" />
    </box>
  );
}
