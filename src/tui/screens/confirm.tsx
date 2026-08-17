/** @jsxImportSource @opentui/solid */
import type { JSX } from "@opentui/solid";
import type { InstallPlan } from "../../core/install-plan";
import { KindBadge, TrustBadge } from "../components/badge";
import { KeymapHelp } from "../components/keymap_help";
import { STRINGS } from "../strings";

export interface ConfirmAction {
  id: "confirm" | "scope" | "cancel";
  label: string;
}

export function getConfirmActions(plan: InstallPlan): ConfirmAction[] {
  const scopeLabel =
    plan.scope === "global"
      ? STRINGS.CONFIRM_SCOPE_GLOBAL
      : STRINGS.CONFIRM_SCOPE_LOCAL;

  return [
    { id: "confirm", label: STRINGS.CONFIRM_ACTION_INSTALL },
    {
      id: "scope",
      label: `${STRINGS.CONFIRM_ACTION_SWITCH_SCOPE} (${scopeLabel})`,
    },
    { id: "cancel", label: STRINGS.CONFIRM_ACTION_CANCEL },
  ];
}

export interface ConfirmScreenProps {
  plan: InstallPlan;
  selectedActionIndex: number;
}

export function ConfirmScreen(props: ConfirmScreenProps): JSX.Element {
  const actions = getConfirmActions(props.plan);

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
            — {STRINGS.CONFIRM_HEADER}
          </text>
        </box>
      </box>

      {/* Target Item Title & Badges */}
      <box flexDirection="row" justifyContent="space-between" paddingTop={1}>
        <box flexDirection="row" gap={1}>
          <text fg="#f0f6fc">
            <b>{props.plan.item.name}</b>
          </text>
          <KindBadge kind={props.plan.item.kind} />
        </box>
        <TrustBadge trust={props.plan.item.bestTrust} />
      </box>

      {/* Scope and Target Path */}
      <box
        flexDirection="column"
        padding={1}
        backgroundColor="#161b22"
        borderColor="#30363d"
        border={true}
        gap={0}
      >
        <box flexDirection="row" gap={1}>
          <text fg="#8b949e">
            <b>{STRINGS.CONFIRM_SCOPE_LABEL}</b>
          </text>
          <text fg="#58a6ff">
            <b>
              {props.plan.scope === "global"
                ? STRINGS.CONFIRM_SCOPE_GLOBAL
                : STRINGS.CONFIRM_SCOPE_LOCAL}
            </b>
          </text>
        </box>
        <box flexDirection="row" gap={1}>
          <text fg="#8b949e">
            <b>Target Config:</b>
          </text>
          <text fg="#f0f6fc">
            {props.plan.targetConfigPath}
          </text>
        </box>
        <box flexDirection="row" gap={1}>
          <text fg="#8b949e">
            <b>Summary:</b>
          </text>
          <text fg="#f0f6fc">
            {props.plan.summary}
          </text>
        </box>
      </box>

      {/* Conflict Warning if any */}
      {props.plan.conflict === "conflict" && (
        <box
          flexDirection="column"
          padding={1}
          backgroundColor="#3b1219"
          borderColor="#f85149"
          border={true}
        >
          <text fg="#f85149">
            <b>⚠ {STRINGS.CONFIRM_CONFLICT_TITLE}</b>
          </text>
          <text fg="#ff7b72">
            {props.plan.conflictDetails ?? "Conflict detected with existing installation."}
          </text>
        </box>
      )}

      {/* Warnings */}
      {props.plan.warnings.length > 0 && (
        <box flexDirection="column" gap={0}>
          <text fg="#d29922">
            <b>{STRINGS.CONFIRM_WARNINGS_HEADER}</b>
          </text>
          {props.plan.warnings.map((w) => (
            <box flexDirection="row" gap={1} paddingLeft={1}>
              <text fg={w.severity === "caution" ? "#f85149" : "#d29922"}>
                • <b>[{w.title}]</b>
              </text>
              <text fg="#c9d1d9">
                {w.message}
              </text>
            </box>
          ))}
        </box>
      )}

      {/* Planned Diffs */}
      <box flexDirection="column" gap={0}>
        <text fg="#8b949e">
          <b>{STRINGS.CONFIRM_DIFF_HEADER}</b>
        </text>
        {props.plan.configDiffs.map((diff) => (
          <box flexDirection="row" gap={1} paddingLeft={1}>
            <text fg={diff.action === "add" ? "#3fb950" : "#d29922"}>
              {diff.action === "add" ? "[+ config]" : "[~ config]"}
            </text>
            <text fg="#f0f6fc">
              {diff.path}: {typeof diff.newValue === "object" ? JSON.stringify(diff.newValue) : String(diff.newValue)}
            </text>
          </box>
        ))}
        {props.plan.targetFiles.map((file) => (
          <box flexDirection="row" gap={1} paddingLeft={1}>
            <text fg={file.action === "create" ? "#3fb950" : "#d29922"}>
              {file.action === "create" ? "[+ file]" : "[~ file]"}
            </text>
            <text fg="#f0f6fc">
              {file.filePath}
            </text>
          </box>
        ))}
      </box>

      {/* Actions */}
      <box flexDirection="column" gap={0} paddingTop={1}>
        <text fg="#f0f6fc">
          <b>Actions:</b>
        </text>
        {actions.map((act, idx) => {
          const isSel = idx === props.selectedActionIndex;
          return (
            <box
              flexDirection="row"
              gap={1}
              paddingLeft={1}
              backgroundColor={isSel ? "#1f6feb22" : undefined}
            >
              <text fg={isSel ? "#58a6ff" : "#8b949e"}>
                <b>{isSel ? "›" : " "}</b>
              </text>
              <text fg={isSel ? "#58a6ff" : "#f0f6fc"}>
                {isSel ? <b>{act.label}</b> : act.label}
              </text>
            </box>
          );
        })}
      </box>

      <KeymapHelp screen="confirm" />
    </box>
  );
}
