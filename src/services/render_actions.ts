import { buildActionRows } from "../ui/controller";
import { applyRows } from "../ui/rows_render";

export function renderActionsWithUi(input: {
  tab: "Skills" | "Discover";
  rowCount: number;
  updateAvailable: boolean;
  lines: Array<{ content: unknown; fg: unknown }>;
}): void {
  const rows = buildActionRows({ tab: input.tab, rowCount: input.rowCount, updateAvailable: input.updateAvailable });
  applyRows(input.lines, rows);
}
