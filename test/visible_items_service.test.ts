import { describe, expect, test } from "bun:test";
import { computeVisibleItems } from "../src/services/visible_items";

describe("visible items service", () => {
  test("filters discover entries by query", () => {
    const items = [
      { label: "Alpha", handle: "org/repo/alpha", repo: "org/repo" },
      { label: "Beta", handle: "org/repo/beta", repo: "org/repo" },
    ];

    const visible = computeVisibleItems({
      tab: "Discover",
      baseItems: items,
      filterQuery: "beta",
      discoverText: (skill) => `${skill.label} ${skill.handle} ${skill.repo ?? ""}`,
      dependencyText: (dep) => dep.identifier,
      isPinned: () => false,
    });

    expect(visible).toHaveLength(1);
    expect((visible[0] as { handle: string }).handle).toBe("org/repo/beta");
  });

  test("sorts pinned skills before unpinned", () => {
    const items = [
      { identifier: "dep-a", installed: true, is_local: false },
      { identifier: "dep-b", installed: true, is_local: false },
    ];

    const visible = computeVisibleItems({
      tab: "Skills",
      baseItems: items,
      filterQuery: "",
      discoverText: (skill) => skill.handle,
      dependencyText: (dep) => dep.identifier,
      isPinned: (item) => (item as { identifier?: string }).identifier === "dep-b",
    });

    expect((visible[0] as { identifier: string }).identifier).toBe("dep-b");
    expect((visible[1] as { identifier: string }).identifier).toBe("dep-a");
  });
});
