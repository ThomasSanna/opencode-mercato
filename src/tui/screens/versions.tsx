/** @jsxImportSource @opentui/solid */
import type { JSX } from "@opentui/solid";
import { computeWindow } from "../../core/flow";
import type { CatalogItem } from "../../core/model";
import { KindBadge } from "../components/badge";
import { KeymapHelp } from "../components/keymap_help";
import { STRINGS } from "../strings";

export interface VersionsScreenProps {
  item: CatalogItem;
  versions: readonly string[];
  currentVersion: string | null;
  selectedIndex: number;
  windowSize?: number;
}

export function VersionsScreen(props: VersionsScreenProps): JSX.Element {
  const windowSize = props.windowSize ?? 8;
  const { start, end } = computeWindow(
    props.selectedIndex,
    props.versions.length,
    windowSize
  );

  const visibleVersions = props.versions.slice(start, end);

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
            — {STRINGS.VERSIONS_HEADER}
          </text>
        </box>
      </box>

      {/* Target Item Name & Badge */}
      <box flexDirection="row" justifyContent="space-between">
        <box flexDirection="row" gap={1}>
          <text fg="#f0f6fc">
            <b>{props.item.name}</b>
          </text>
          <KindBadge kind={props.item.kind} />
        </box>
        {props.currentVersion && (
          <box flexDirection="row" gap={1}>
            <text fg="#8b949e">
              Installed:
            </text>
            <text fg="#3fb950">
              <b>{props.currentVersion}</b>
            </text>
          </box>
        )}

      </box>

      {/* Versions list */}
      <box
        flexDirection="column"
        gap={1}
        paddingTop={1}
        paddingBottom={1}
        minHeight={12}
      >
        {props.versions.length === 0 ? (
          <box paddingLeft={1} paddingTop={2} paddingBottom={2}>
            <text fg="#8b949e">
              No version history available for this item.
            </text>
          </box>
        ) : (
          visibleVersions.map((version, idx) => {
            const actualIndex = start + idx;
            const isSelected = actualIndex === props.selectedIndex;
            const isCurrent = version === props.currentVersion;

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
                  <text fg={isSelected ? "#58a6ff" : isCurrent ? "#3fb950" : "#f0f6fc"}>
                    {isSelected ? <b>v{version}</b> : `v${version}`}
                  </text>
                  {isCurrent && (
                    <text fg="#3fb950">
                      [current]
                    </text>
                  )}
                  {actualIndex === 0 && (
                    <text fg="#58a6ff">
                      [latest]
                    </text>
                  )}
                </box>

                <text fg="#8b949e">
                  {isCurrent ? "installed" : "available"}
                </text>
              </box>
            );
          })
        )}
      </box>

      <KeymapHelp screen="versions" />
    </box>
  );
}
