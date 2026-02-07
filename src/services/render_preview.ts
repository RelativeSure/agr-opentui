export function renderPreviewWithUi(input: {
  previewOpen: boolean;
  previewLines: string[];
  previewOffset: number;
  pageLines: number;
  previewTarget: string | null;
  overlay: { visible: boolean };
  title: { content: unknown };
  code: { content: string };
}): void {
  if (!input.previewOpen) {
    input.overlay.visible = false;
    return;
  }

  input.overlay.visible = true;
  input.title.content = input.previewTarget ? `SKILL.md: ${input.previewTarget}` : "SKILL.md";
  const lines = input.previewLines.length > 0 ? input.previewLines : ["No SKILL.md found."];
  const slice = lines.slice(input.previewOffset, input.previewOffset + input.pageLines);
  input.code.content = slice.join("\n");
}
