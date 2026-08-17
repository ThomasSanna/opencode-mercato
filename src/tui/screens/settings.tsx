/** @jsxImportSource @opentui/solid */
import type { JSX } from "@opentui/solid";
import {
  formatSettingValue,
  SETTING_DEFINITIONS,
  type MercatoSettings,
} from "../../core/settings";
import { KeymapHelp } from "../components/keymap_help";
import { STRINGS } from "../strings";

export interface SettingsScreenProps {
  settings: MercatoSettings;
  selectedIndex: number;
}

export function SettingsScreen(props: SettingsScreenProps): JSX.Element {
  const currentDef = () => SETTING_DEFINITIONS[props.selectedIndex];

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
            — {STRINGS.SETTINGS_HEADER}
          </text>
        </box>
      </box>

      {/* Help subtitle */}
      <box paddingBottom={0}>
        <text fg="#8b949e">
          {STRINGS.SETTINGS_HELP}
        </text>
      </box>

      {/* Settings list */}
      <box
        flexDirection="column"
        gap={1}
        paddingTop={1}
        paddingBottom={1}
        minHeight={10}
      >
        {SETTING_DEFINITIONS.map((def, idx) => {
          const isSelected = () => idx === props.selectedIndex;
          const valStr = () => formatSettingValue(props.settings, def.key);
          const isTrue = () => props.settings[def.key] === true;

          return (
            <box
              flexDirection="row"
              justifyContent="space-between"
              paddingLeft={1}
              paddingRight={1}
              backgroundColor={isSelected() ? "#1f6feb22" : undefined}
            >
              <box flexDirection="row" gap={1}>
                <text fg={isSelected() ? "#58a6ff" : "#8b949e"}>
                  <b>{isSelected() ? "›" : " "}</b>
                </text>
                <text fg={isSelected() ? "#58a6ff" : "#f0f6fc"}>
                  {isSelected() ? <b>{def.label}</b> : def.label}
                </text>
              </box>

              <box flexDirection="row" gap={1}>
                <text
                  fg={
                    typeof props.settings[def.key] === "boolean"
                      ? isTrue()
                        ? "#3fb950"
                        : "#8b949e"
                      : "#58a6ff"
                  }
                >
                  <b>[{valStr()}]</b>
                </text>
              </box>
            </box>
          );
        })}
      </box>

      {/* Active Setting Description Box */}
      {currentDef() && (
        <box
          flexDirection="column"
          padding={1}
          border={["top"]}
          borderColor="#30363d"
          backgroundColor="#161b22"
        >
          <text fg="#58a6ff">
            <b>{currentDef()?.label}</b>
          </text>
          <text fg="#c9d1d9">
            {currentDef()?.description}
          </text>
        </box>
      )}

      <KeymapHelp screen="settings" />
    </box>
  );
}
