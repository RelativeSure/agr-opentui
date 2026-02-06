import type { Dependency, PredefinedSkill } from "../app_logic";
import type { ActiveTab } from "./selection";

export function computeVisibleItems(input: {
  tab: ActiveTab;
  baseItems: Array<Dependency | PredefinedSkill>;
  filterQuery: string;
  discoverText: (skill: PredefinedSkill) => string;
  dependencyText: (dep: Dependency) => string;
  isPinned: (item: Dependency | PredefinedSkill) => boolean;
}): Array<Dependency | PredefinedSkill> {
  const normalizedQuery = input.filterQuery.trim().toLowerCase();
  const filtered = normalizedQuery
    ? input.baseItems.filter((item) => {
        if (input.tab === "Discover") {
          return input.discoverText(item as PredefinedSkill).toLowerCase().includes(normalizedQuery);
        }
        return input.dependencyText(item as Dependency).toLowerCase().includes(normalizedQuery);
      })
    : input.baseItems;

  const rank = (item: Dependency | PredefinedSkill): number => (input.isPinned(item) ? 0 : 1);
  return [...filtered].sort((a, b) => rank(a) - rank(b));
}
