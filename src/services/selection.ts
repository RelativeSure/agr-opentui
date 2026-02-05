import type { Dependency, PredefinedSkill } from "../app_logic";

export type ActiveTab = "Skills" | "Discover";

export function getVisibleItems(input: {
  tab: ActiveTab;
  dependencies: Dependency[];
  discoverSkills: PredefinedSkill[];
}): Array<Dependency | PredefinedSkill> {
  if (input.tab === "Discover") {
    return input.discoverSkills;
  }
  return input.dependencies;
}

export function selectedDependencyFromVisible(input: {
  tab: ActiveTab;
  visible: Array<Dependency | PredefinedSkill>;
  selectedIndex: number;
}): Dependency | null {
  if (input.tab === "Discover") {
    return null;
  }
  const selected = input.visible[input.selectedIndex];
  if (!selected) {
    return null;
  }
  return selected as Dependency;
}

export function selectedPredefinedFromVisible(input: {
  tab: ActiveTab;
  visible: Array<Dependency | PredefinedSkill>;
  selectedIndex: number;
}): PredefinedSkill | null {
  if (input.tab !== "Discover") {
    return null;
  }
  const selected = input.visible[input.selectedIndex];
  if (!selected) {
    return null;
  }
  return selected as PredefinedSkill;
}

export function nextSelectionIndex(input: {
  selectedIndex: number;
  delta: number;
  visibleCount: number;
}): number {
  if (input.visibleCount <= 0) {
    return input.selectedIndex;
  }
  return Math.max(0, Math.min(input.visibleCount - 1, input.selectedIndex + input.delta));
}

export function nextPreviewOffset(input: {
  offset: number;
  delta: number;
  totalLines: number;
  pageLines: number;
}): number {
  if (input.totalLines <= 0) {
    return input.offset;
  }
  const maxOffset = Math.max(0, input.totalLines - input.pageLines);
  return Math.max(0, Math.min(maxOffset, input.offset + input.delta));
}

export function toggleSelectedId(selectedIds: Set<string>, id: string): void {
  if (selectedIds.has(id)) {
    selectedIds.delete(id);
  } else {
    selectedIds.add(id);
  }
}
