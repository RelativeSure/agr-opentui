import { describe, expect, test } from "bun:test";
import type { Dependency, PredefinedSkill } from "../src/app_logic";
import { buildThreePaneSnapshot } from "../src/ui/controller";

describe("three-pane render snapshots", () => {
  test("skills tab snapshot remains stable", () => {
    const dependencies: Dependency[] = [
      {
        identifier: "org/repo/alpha",
        handle: "org/repo/alpha",
        is_local: false,
        installed: true,
        path: null,
      },
      {
        identifier: "org/repo/beta",
        handle: "org/repo/beta",
        is_local: true,
        installed: false,
        path: "./skills/beta",
      },
    ];

    const snapshot = buildThreePaneSnapshot({
      tab: "Skills",
      visible: dependencies,
      selectedIndex: 0,
      selectedIds: new Set(["org/repo/beta"]),
      predefinedError: null,
      predefinedCount: 0,
      visiblePredefinedCount: 0,
      updateInProgress: false,
      hasSource: false,
      selectedSkill: null,
      hasData: true,
      selectedDependency: dependencies[0],
      getSkillDisplayLabel: (skill) => skill.label,
      getSkillSourceLabel: (skill) => skill.repo ?? skill.handle,
    });

    expect({
      selectedIndex: snapshot.selectedIndex,
      list: snapshot.list.slice(0, 3),
      details: snapshot.details.slice(0, 5),
      actions: snapshot.actions.slice(0, 6),
    }).toEqual({
      selectedIndex: 0,
      list: [">  [*] org/repo/alpha", " + [ ] org/repo/beta", ""],
      details: ["Selected: org/repo/alpha", "Installed: yes", "Source: remote", "Handle: org/repo/alpha", ""],
      actions: ["f: filter list", "p: pin selected", "space: toggle select", "i: install selected", "r: remove selected", "z: undo last add/remove"],
    });
  });

  test("discover tab snapshot remains stable", () => {
    const skills: PredefinedSkill[] = [
      { label: "alpha", handle: "org/repo/alpha", repo: "org/repo" },
      { label: "alpha", handle: "org/other/alpha", repo: "org/other" },
    ];

    const snapshot = buildThreePaneSnapshot({
      tab: "Discover",
      visible: skills,
      selectedIndex: 1,
      selectedIds: new Set(),
      predefinedError: null,
      predefinedCount: skills.length,
      visiblePredefinedCount: skills.length,
      updateInProgress: false,
      hasSource: true,
      selectedSkill: {
        displayLabel: "alpha",
        sourceLabel: "org/other",
        handle: "org/other/alpha",
        repo: "org/other",
      },
      hasData: false,
      selectedDependency: null,
      getSkillDisplayLabel: (skill) => skill.label,
      getSkillSourceLabel: (skill) => skill.repo ?? skill.handle,
    });

    expect({
      selectedIndex: snapshot.selectedIndex,
      list: snapshot.list.slice(0, 3),
      details: snapshot.details.slice(0, 5),
      actions: snapshot.actions.slice(0, 5),
    }).toEqual({
      selectedIndex: 1,
      list: ["  alpha - org/repo", "> alpha - org/other", ""],
      details: ["Name: alpha", "Source: org/other", "Handle: org/other/alpha", "Repo: org/other", ""],
      actions: ["f: filter list", "p: pin selected", "i: add selected", "z: undo last add/remove", "L: run history"],
    });
  });
});
