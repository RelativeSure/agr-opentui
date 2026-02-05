import { buildHelpRows } from "../ui/controller";
import { applyRows } from "../ui/rows_render";

export function renderHelpWithUi(input: {
  helpOpen: boolean;
  tab: "Skills" | "Discover";
  rowCount: number;
  overlay: { visible: boolean };
  title: { content: unknown };
  lines: Array<{ content: unknown; fg: unknown }>;
}): void {
  if (!input.helpOpen) {
    input.overlay.visible = false;
    return;
  }
  input.overlay.visible = true;
  input.title.content = `${input.tab} Help`;
  const rows = buildHelpRows({ tab: input.tab, rowCount: input.rowCount });
  applyRows(input.lines, rows);
}
