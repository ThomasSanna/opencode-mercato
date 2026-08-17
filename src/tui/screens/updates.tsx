/** @jsxImportSource @opentui/solid */
import type { JSX } from "@opentui/solid";
import { computeWindow } from "../../core/flow";
import type { CatalogItem } from "../../core/model";
import type { ItemUpdateInfo } from "../../core/versions";
import { KindBadge, UpdateBadge } from "../components/badge";
import { KeymapHelp } from "../components/keymap_help";
import { STRINGS } from "../strings";

export interface UpdateEntry {
  item: CatalogItem;
  info: ItemUpdateInfo;
}

export interface UpdatesScreenProps {
  updates: readonly UpdateEntry[];
  selectedIndex: number;
  stale?: boolean;
  windowSize?: number;
}

export function UpdatesScreen(props: UpdatesScreenProps): JSX.Element {
  const windowSize = props.windowSize ?? 8;
  const { start, end } = computeWindow(
    props.selectedIndex,
    props.updates.length,
    windowSize
  );

  const visibleUpdates = props.updates.slice(start, end);
  const safeCount = props.updates.filter((u) => u.info.autoEligible).length;
  const majorCount = props.updates.filter(
    (u) => u.info.updateState === "major-available"
  ).length;

  return (
    <box flexDirection="column" padding={1} width="100%" gap={1}>
      {/* Header */}
      <box
        flexDirection="row"
        justifyContent="space-between"
        paddingBottom={1}
        border={["bottom"]}
        borderColor="#30363d"
      >
        <box flexDirection="row" gap={1}>
          <text fg="#58a6ff">
            <b>{STRINGS.APP_TITLE}</b>
          </text>
          <text fg="#8b949e">
            — {STRINGS.UPDATES_HEADER} ({props.updates.length})
          </text>
        </box>
        {props.stale && (
          <text fg="#d29922">
            {STRINGS.STATUS_STALE}
          </text>
        )}
      </box>

      {/* Summary line */}
      <box flexDirection="row" gap={1} paddingBottom={0}>
        <text fg="#8b949e">
          Summary:
        </text>
        <text fg="#3fb950">
          {safeCount} safe (patch/minor)
        </text>
        {majorCount > 0 && (
          <text fg="#f85149">
            • {majorCount} major (requires confirmation)
          </text>
        )}
      </box>

      {/* Updates list */}
      <box
        flexDirection="column"
        gap={1}
        paddingTop={1}
        paddingBottom={1}
        minHeight={12}
      >
        {props.updates.length === 0 ? (
          <box paddingLeft={1} paddingTop={2} paddingBottom={2}>
            <text fg="#3fb950">
              ✓ {STRINGS.EMPTY_UPDATES}
            </text>
          </box>
        ) : (
          visibleUpdates.map((entry, idx) => {
            const actualIndex = start + idx;
            const isSelected = actualIndex === props.selectedIndex;

            return (
              <box
                flexDirection="row"
                justifyContent="space-between"
                paddingLeft={1}
                paddingRight={1}
                backgroundColor={isSelected ? "#1f6feb22" : undefined}
              >
                <box flexDirection="row" gap={1}>
                  <text fg={isSelected ? "#58a6ff" : "#8b949e"}>
                    <b>{isSelected ? "›" : " "}</b>
                  </text>
                  <text fg={isSelected ? "#58a6ff" : "#f0f6fc"}>
                    {isSelected ? <b>{entry.item.name}</b> : entry.item.name}
                  </text>
                  <KindBadge kind={entry.item.kind} />
                </box>

                <box flexDirection="row" gap={1}>
                  <text fg="#8b949e">
                    {entry.info.currentVersion ?? "local"} → {entry.info.latestVersion ?? "latest"}
                  </text>
                  <UpdateBadge updateInfo={entry.info} />
                </box>
              </box>
            );
          })
        )}
      </box>

      <KeymapHelp screen="updates" />
    </box>
  );
}
