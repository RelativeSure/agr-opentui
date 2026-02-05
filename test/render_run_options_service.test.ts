import { describe, expect, test } from "bun:test";
import type { Dependency } from "../src/app_logic";
import { renderRunOptionsWithUi } from "../src/services/render_run_options";

describe("render run options service", () => {
  test("hides overlay when run options are closed", () => {
    const overlay = { visible: true };
    const skillLine = { content: "" };
    const toolLine = { content: "" };
    const interactiveLine = { content: "" };
    const promptLine = { content: "" };
    const argsLine = { content: "" };

    renderRunOptionsWithUi({
      runOptionsOpen: false,
      selectedDependency: null,
      tools: [],
      toolIndex: 0,
      interactive: false,
      promptBuffer: "",
      argsBuffer: "",
      overlay,
      skillLine,
      toolLine,
      interactiveLine,
      promptLine,
      argsLine,
    });

    expect(overlay.visible).toBe(false);
  });

  test("renders selected skill and option values", () => {
    const dep: Dependency = {
      identifier: "org/repo/skill",
      handle: "org/repo/skill",
      path: null,
      is_local: false,
      installed: true,
    };
    const overlay = { visible: false };
    const skillLine = { content: "" };
    const toolLine = { content: "" };
    const interactiveLine = { content: "" };
    const promptLine = { content: "" };
    const argsLine = { content: "" };

    renderRunOptionsWithUi({
      runOptionsOpen: true,
      selectedDependency: dep,
      tools: ["claude", "gpt"],
      toolIndex: 1,
      interactive: true,
      promptBuffer: "fix this",
      argsBuffer: "--dry-run",
      overlay,
      skillLine,
      toolLine,
      interactiveLine,
      promptLine,
      argsLine,
    });

    expect(overlay.visible).toBe(true);
    expect(skillLine.content).toBe("Skill: org/repo/skill");
    expect(toolLine.content).toBe("Tool: gpt");
    expect(interactiveLine.content).toBe("Interactive: on");
    expect(promptLine.content).toBe("Prompt: fix this");
    expect(argsLine.content).toBe("Args: --dry-run");
  });
});
