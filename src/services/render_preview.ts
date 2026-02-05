import type { Dependency } from "../app_logic";

export function renderPreviewWithUi(input: {
  previewOpen: boolean;
  previewLines: string[];
  previewOffset: number;
  pageLines: number;
  selectedDependency: Dependency | null;
  overlay: { visible: boolean };
  title: { content: unknown };
  text: { setText: (value: string) => void };
}): void {
  if (!input.previewOpen) {
    input.overlay.visible = false;
    return;
  }

  input.overlay.visible = true;
  input.title.content = input.selectedDependency ? `SKILL.md: ${input.selectedDependency.identifier}` : "SKILL.md";
  const lines = input.previewLines.length > 0 ? input.previewLines : ["No SKILL.md found."];
  const slice = lines.slice(input.previewOffset, input.previewOffset + input.pageLines);
  input.text.setText(slice.join("\n"));
}
