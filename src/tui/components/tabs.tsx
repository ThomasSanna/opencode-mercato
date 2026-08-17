/** @jsxImportSource @opentui/solid */
import type { JSX } from "@opentui/solid";
import { KIND_FILTER_LIST, type KindFilter } from "../../core/search";
import { KIND_TAB_LABELS } from "../strings";

export interface KindTabsProps {
  activeKind: KindFilter;
  counts?: Partial<Record<KindFilter, number>>;
}

export function KindTabs(props: KindTabsProps): JSX.Element {
  return (
    <box flexDirection="row" gap={2} paddingTop={1} paddingBottom={1}>
      {KIND_FILTER_LIST.map((kind) => {
        const isActive = props.activeKind === kind;
        const label = KIND_TAB_LABELS[kind];
        const count = props.counts?.[kind];
        const text = count !== undefined ? `${label} (${count})` : label;

        return (
          <box>
            {isActive ? (
              <text fg="#58a6ff">
                <b>[{text}]</b>
              </text>
            ) : (
              <text fg="#8b949e">
                {" "}{text}{" "}
              </text>
            )}
          </box>
        );
      })}
    </box>
  );
}
