import { describe, expect, test } from "bun:test";
import type { Dependency, PredefinedSkill } from "../src/app_logic";
import {
  getVisibleItems,
  nextPreviewOffset,
  nextSelectionIndex,
  selectedDependencyFromVisible,
  selectedPredefinedFromVisible,
  toggleSelectedId,
} from "../src/services/selection";

describe("selection service", () => {
  test("returns visible list by tab", () => {
    const deps: Dependency[] = [{ identifier: "a", is_local: false, installed: true }];
    const discover: PredefinedSkill[] = [{ label: "s", handle: "o/r/s" }];

    expect(getVisibleItems({ tab: "Skills", dependencies: deps, discoverSkills: discover })).toEqual(deps);
    expect(getVisibleItems({ tab: "Discover", dependencies: deps, discoverSkills: discover })).toEqual(discover);
  });

  test("resolves selected item by tab", () => {
    const deps: Dependency[] = [{ identifier: "a", is_local: false, installed: true }];
    const discover: PredefinedSkill[] = [{ label: "s", handle: "o/r/s" }];

    expect(selectedDependencyFromVisible({ tab: "Skills", visible: deps, selectedIndex: 0 })?.identifier).toBe("a");
    expect(selectedDependencyFromVisible({ tab: "Discover", visible: discover, selectedIndex: 0 })).toBeNull();

    expect(selectedPredefinedFromVisible({ tab: "Discover", visible: discover, selectedIndex: 0 })?.handle).toBe("o/r/s");
    expect(selectedPredefinedFromVisible({ tab: "Skills", visible: deps, selectedIndex: 0 })).toBeNull();
  });

  test("clamps selection and preview offsets", () => {
    expect(nextSelectionIndex({ selectedIndex: 0, delta: -1, visibleCount: 3 })).toBe(0);
    expect(nextSelectionIndex({ selectedIndex: 1, delta: 10, visibleCount: 3 })).toBe(2);

    expect(nextPreviewOffset({ offset: 0, delta: -5, totalLines: 20, pageLines: 13 })).toBe(0);
    expect(nextPreviewOffset({ offset: 0, delta: 99, totalLines: 20, pageLines: 13 })).toBe(7);
  });

  test("toggles selected ids", () => {
    const set = new Set<string>();
    toggleSelectedId(set, "x");
    expect(set.has("x")).toBe(true);
    toggleSelectedId(set, "x");
    expect(set.has("x")).toBe(false);
  });
});
