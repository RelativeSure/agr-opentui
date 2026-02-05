import { describe, expect, test } from "bun:test";
import type { Dependency, PredefinedSkill } from "../src/app_logic";
import { renderDetailsWithUi } from "../src/services/render_details";
import { colors } from "../src/ui";

describe("render details service", () => {
  test("renders selected dependency details in skills tab", () => {
    const dep: Dependency = {
      identifier: "org/repo/skill",
      handle: "org/repo/skill",
      path: null,
      is_local: false,
      installed: true,
    };
    const lines = [
      { content: "", fg: "" },
      { content: "", fg: "" },
      { content: "", fg: "" },
      { content: "", fg: "" },
    ];

    renderDetailsWithUi({
      tab: "Skills",
      predefinedError: null,
      predefinedCount: 0,
      visiblePredefinedCount: 0,
      updateInProgress: false,
      hasSource: false,
      selectedPredefined: null,
      hasData: true,
      selectedDependency: dep,
      rowCount: lines.length,
      getSkillDisplayLabel: () => "",
      getSkillSourceLabel: () => "",
      lines,
    });

    expect(lines[0]).toEqual({ content: "Selected: org/repo/skill", fg: colors.highlight });
    expect(lines[1]).toEqual({ content: "Installed: yes", fg: colors.success });
  });

  test("renders selected discover skill details", () => {
    const skill: PredefinedSkill = {
      label: "Skill Name",
      handle: "org/repo/skill",
      repo: "org/repo",
    };
    const lines = [
      { content: "", fg: "" },
      { content: "", fg: "" },
      { content: "", fg: "" },
      { content: "", fg: "" },
    ];

    renderDetailsWithUi({
      tab: "Discover",
      predefinedError: null,
      predefinedCount: 1,
      visiblePredefinedCount: 1,
      updateInProgress: false,
      hasSource: true,
      selectedPredefined: skill,
      hasData: true,
      selectedDependency: null,
      rowCount: lines.length,
      getSkillDisplayLabel: (value) => value.label,
      getSkillSourceLabel: (value) => value.repo ?? "",
      lines,
    });

    expect(lines[0]).toEqual({ content: "Name: Skill Name", fg: colors.highlight });
    expect(lines[2]).toEqual({ content: "Handle: org/repo/skill", fg: colors.accent });
  });
});
