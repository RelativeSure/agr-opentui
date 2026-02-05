import { colors } from "../ui";
import type { UiListRow, UiRow, UiTone } from "./controller";

export function toneToColor(tone: UiTone): string {
  switch (tone) {
    case "dim":
      return colors.dim;
    case "highlight":
      return colors.highlight;
    case "warn":
      return colors.warn;
    case "danger":
      return colors.danger;
    case "accent":
      return colors.accent;
    case "success":
      return colors.success;
    case "selected":
      return colors.selectedText;
    default:
      return colors.text;
  }
}

export function applyRows(target: Array<{ content: unknown; fg: unknown }>, rows: UiRow[]): void {
  for (let i = 0; i < target.length; i += 1) {
    const row = rows[i];
    target[i].content = row?.content ?? "";
    target[i].fg = toneToColor(row?.tone ?? "text");
  }
}

export function applyListRows(target: Array<{ content: unknown; fg: unknown; bg: unknown }>, rows: UiListRow[]): void {
  for (let i = 0; i < target.length; i += 1) {
    const row = rows[i];
    target[i].content = row?.content ?? "";
    target[i].fg = toneToColor(row?.tone ?? "text");
    target[i].bg = row?.backgroundTone === "selected" ? colors.selectedBg : colors.panelAlt;
  }
}
