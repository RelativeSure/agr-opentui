import type { Dependency, PredefinedSkill } from "../app_logic";
import { buildDetailsRows } from "../ui/controller";
import { applyRows } from "../ui/rows_render";

export function renderDetailsWithUi(input: {
  tab: "Skills" | "Discover";
  predefinedError: string | null;
  predefinedCount: number;
  visiblePredefinedCount: number;
  updateInProgress: boolean;
  hasSource: boolean;
  selectedPredefined: PredefinedSkill | null;
  hasData: boolean;
  selectedDependency: Dependency | null;
  rowCount: number;
  getSkillDisplayLabel: (skill: PredefinedSkill) => string;
  getSkillSourceLabel: (skill: PredefinedSkill) => string;
  lines: Array<{ content: unknown; fg: unknown }>;
}): void {
  const skill = input.selectedPredefined;
  const displayLabel = skill ? input.getSkillDisplayLabel(skill) : "";
  const rows = buildDetailsRows({
    tab: input.tab,
    predefinedError: input.predefinedError,
    predefinedCount: input.predefinedCount,
    visiblePredefinedCount: input.visiblePredefinedCount,
    updateInProgress: input.updateInProgress,
    hasSource: input.hasSource,
    selectedSkill: skill
      ? {
          displayLabel,
          sourceLabel: input.getSkillSourceLabel(skill),
          handle: skill.handle,
          repo: skill.repo,
        }
      : null,
    hasData: input.hasData,
    selectedDependency: input.selectedDependency,
    rowCount: input.rowCount,
  });
  applyRows(input.lines, rows);
}
