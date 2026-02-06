import { describe, expect, test } from "bun:test";
import type { Dependency, PredefinedSkill } from "../src/app_logic";
import { renderListWithUi } from "../src/services/render_list";
import { colors } from "../src/ui";

describe("render list service", () => {
  test("renders skills rows and updates selected index/title", () => {
    const deps: Dependency[] = [
      {
        identifier: "org/repo/one",
        handle: "org/repo/one",
        path: null,
        is_local: false,
        installed: true,
      },
    ];
    const lines = [{ content: "", fg: "", bg: "" }];
    let selectedIndex = -1;
    let title = "";

    renderListWithUi({
      tab: "Skills",
      visible: deps,
      selectedIndex: 0,
      rowCount: 1,
      isSelectedDependency: () => false,
      getSkillDisplayLabel: () => "",
      getSkillSourceLabel: () => "",
      resolveSkillLabel: async () => {},
      setSelectedIndex: (value) => {
        selectedIndex = value;
      },
      setTitle: (value) => {
        title = value;
      },
      lines,
    });

    expect(selectedIndex).toBe(0);
    expect(title).toBe("SKILLS");
    expect(lines[0]).toEqual({
      content: ">  [*] org/repo/one",
      fg: colors.selectedText,
      bg: colors.selectedBg,
    });
  });

  test("discover tab resolves labels for visible items", () => {
    const skills: PredefinedSkill[] = [
      { label: "one", handle: "org/repo/one", repo: "org/repo" },
      { label: "two", handle: "org/repo/two", repo: "org/repo" },
    ];
    const resolved: string[] = [];
    let title = "";
    const lines = [
      { content: "", fg: "", bg: "" },
      { content: "", fg: "", bg: "" },
    ];

    renderListWithUi({
      tab: "Discover",
      visible: skills,
      selectedIndex: 0,
      rowCount: 2,
      isSelectedDependency: () => false,
      getSkillDisplayLabel: (skill) => skill.label,
      getSkillSourceLabel: (skill) => skill.repo ?? "",
      resolveSkillLabel: async (skill) => {
        resolved.push(skill.handle);
      },
      setSelectedIndex: () => {},
      setTitle: (value) => {
        title = value;
      },
      lines,
    });

    expect(resolved).toEqual(["org/repo/one", "org/repo/two"]);
    expect(title).toBe("DISCOVER");
  });

  test("scrolls list viewport as selection moves", () => {
    const deps: Dependency[] = Array.from({ length: 7 }, (_, i) => ({
      identifier: `org/repo/${i + 1}`,
      handle: `org/repo/${i + 1}`,
      path: null,
      is_local: false,
      installed: false,
    }));
    const lines = [
      { content: "", fg: "", bg: "" },
      { content: "", fg: "", bg: "" },
      { content: "", fg: "", bg: "" },
    ];

    renderListWithUi({
      tab: "Skills",
      visible: deps,
      selectedIndex: 5,
      rowCount: 3,
      isSelectedDependency: () => false,
      getSkillDisplayLabel: () => "",
      getSkillSourceLabel: () => "",
      resolveSkillLabel: async () => {},
      setSelectedIndex: () => {},
      setTitle: () => {},
      lines,
    });

    expect(String(lines[0].content)).toContain("org/repo/5");
    expect(String(lines[1].content)).toContain("org/repo/6");
    expect(String(lines[2].content)).toContain("org/repo/7");
    expect(String(lines[1].content).startsWith(">")).toBe(true);
  });
});
