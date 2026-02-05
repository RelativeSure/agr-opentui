import type { SkillsSource } from "../state";

export function renderUpdateConfirmWithUi(input: {
  confirmUpdateOpen: boolean;
  addedCount: number;
  removedCount: number;
  predefinedSource: SkillsSource | null;
  overlay: { visible: boolean };
  body: { content: unknown };
  body2: { content: unknown };
}): void {
  if (!input.confirmUpdateOpen) {
    input.overlay.visible = false;
    return;
  }

  input.overlay.visible = true;
  input.body.content = `Add ${input.addedCount} and remove ${input.removedCount} skills.`;
  if (input.predefinedSource?.repo) {
    input.body2.content = `Source: ${input.predefinedSource.repo}`;
  } else if (input.predefinedSource?.url) {
    input.body2.content = `Source: ${input.predefinedSource.url}`;
  } else {
    input.body2.content = "Source: skills.json (local)";
  }
}
