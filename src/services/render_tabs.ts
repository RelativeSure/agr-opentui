import { buildTabsRows } from "../ui/controller";
import { applyRows } from "../ui/rows_render";
import { colors } from "../ui";

export function renderTabsWithUi(input: {
  tabs: string[];
  tabIndex: number;
  updateError: boolean;
  updateAvailable: boolean;
  cwd: string;
  tabLabels: Array<{ content: unknown; fg: unknown }>;
  cwdLine: { content: unknown; fg: unknown };
}): void {
  const rows = buildTabsRows({
    tabs: input.tabs,
    tabIndex: input.tabIndex,
    updateError: input.updateError,
    updateAvailable: input.updateAvailable,
  });
  applyRows(input.tabLabels, rows);
  input.cwdLine.content = `cwd: ${input.cwd}`;
  input.cwdLine.fg = colors.dim;
}
