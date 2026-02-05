import type { Dependency, PredefinedSkill } from "../app_logic";
import { buildListRows } from "../ui/controller";
import { applyListRows } from "../ui/rows_render";

export function renderListWithUi(input: {
  tab: "Skills" | "Discover";
  visible: Array<Dependency | PredefinedSkill>;
  selectedIndex: number;
  rowCount: number;
  isSelectedDependency: (dep: Dependency) => boolean;
  getSkillDisplayLabel: (skill: PredefinedSkill) => string;
  getSkillSourceLabel: (skill: PredefinedSkill) => string;
  resolveSkillLabel: (skill: PredefinedSkill) => Promise<void>;
  setSelectedIndex: (index: number) => void;
  setTitle: (title: string) => void;
  lines: Array<{ content: unknown; fg: unknown; bg: unknown }>;
}): void {
  if (input.tab === "Discover") {
    for (const item of input.visible) {
      void input.resolveSkillLabel(item as PredefinedSkill);
    }
  }

  const listModel = buildListRows({
    tab: input.tab,
    visible: input.visible,
    selectedIndex: input.selectedIndex,
    rowCount: input.rowCount,
    isSelectedDependency: input.isSelectedDependency,
    getSkillDisplayLabel: input.getSkillDisplayLabel,
    getSkillSourceLabel: input.getSkillSourceLabel,
  });

  input.setSelectedIndex(listModel.selectedIndex);
  input.setTitle(listModel.title);
  applyListRows(input.lines, listModel.rows);
}
