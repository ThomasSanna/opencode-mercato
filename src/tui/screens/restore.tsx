/** @jsxImportSource @opentui/solid */
import type { JSX } from "@opentui/solid";
import type { BackupEntry } from "../../adapters/backups";
import { computeWindow } from "../../core/flow";
import { KeymapHelp } from "../components/keymap_help";
import { STRINGS } from "../strings";

export interface RestoreScreenProps {
  backups: readonly BackupEntry[];
  selectedIndex: number;
  windowSize?: number;
}

export function RestoreScreen(props: RestoreScreenProps): JSX.Element {
  const windowSize = props.windowSize ?? 6;
  const { start, end } = computeWindow(
    props.selectedIndex,
    props.backups.length,
    windowSize
  );

  const visibleBackups = props.backups.slice(start, end);
  const selectedBackup = props.backups[props.selectedIndex];

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
            — {STRINGS.RESTORE_HEADER} ({props.backups.length})
          </text>
        </box>
      </box>

      {/* Subtitle */}
      <box paddingBottom={0}>
        <text fg="#8b949e">
          {STRINGS.RESTORE_HELP}
        </text>
      </box>

      {/* Backups List */}
      <box
        flexDirection="column"
        gap={1}
        paddingTop={1}
        paddingBottom={1}
        minHeight={8}
      >
        {props.backups.length === 0 ? (
          <box paddingLeft={1} paddingTop={2} paddingBottom={2}>
            <text fg="#8b949e">
              {STRINGS.EMPTY_RESTORE}
            </text>
          </box>
        ) : (
          visibleBackups.map((entry, idx) => {
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
                    {isSelected ? <b>{entry.kindSummary}</b> : entry.kindSummary}
                  </text>
                  <text fg="#8b949e">[{entry.scope}]</text>
                </box>

                <box flexDirection="row" gap={1}>
                  <text fg="#8b949e">{entry.formattedDate}</text>
                  <text fg="#8b949e">({entry.sizeBytes} B)</text>
                </box>
              </box>
            );
          })
        )}
      </box>

      {/* Active Backup Details */}
      {selectedBackup && (
        <box
          flexDirection="column"
          padding={1}
          border={["top"]}
          borderColor="#30363d"
          backgroundColor="#161b22"
          gap={1}
        >
          <text fg="#58a6ff">
            <b>Selected Backup: {selectedBackup.kindSummary}</b>
          </text>
          <box flexDirection="row" gap={1}>
            <text fg="#8b949e">{STRINGS.LABEL_BACKUP_TARGET}</text>
            <text fg="#c9d1d9">{selectedBackup.targetConfigPath}</text>
          </box>
          <box flexDirection="row" gap={1}>
            <text fg="#8b949e">{STRINGS.LABEL_BACKUP_PATH}</text>
            <text fg="#c9d1d9">{selectedBackup.filePath}</text>
          </box>
        </box>
      )}

      <KeymapHelp screen="restore" />
    </box>
  );
}
