import type { Dependency } from "../app_logic";

export function renderRunOptionsWithUi(input: {
  runOptionsOpen: boolean;
  selectedDependency: Dependency | null;
  tools: string[];
  toolIndex: number;
  interactive: boolean;
  promptBuffer: string;
  argsBuffer: string;
  overlay: { visible: boolean };
  skillLine: { content: unknown };
  toolLine: { content: unknown };
  interactiveLine: { content: unknown };
  promptLine: { content: unknown };
  argsLine: { content: unknown };
}): void {
  if (!input.runOptionsOpen) {
    input.overlay.visible = false;
    return;
  }

  input.overlay.visible = true;
  input.skillLine.content = input.selectedDependency ? `Skill: ${input.selectedDependency.identifier}` : "Skill: (none)";
  const toolName = input.tools[input.toolIndex] ?? "(none)";
  input.toolLine.content = `Tool: ${toolName}`;
  input.interactiveLine.content = `Interactive: ${input.interactive ? "on" : "off"}`;
  input.promptLine.content = `Prompt: ${input.promptBuffer || "(none)"}`;
  input.argsLine.content = `Args: ${input.argsBuffer || "(none)"}`;
}
