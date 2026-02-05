export function renderMissingConfigWithUi(input: {
  missingConfigOpen: boolean;
  overlay: { visible: boolean };
  line1: { content: unknown };
  line2: { content: unknown };
}): void {
  if (!input.missingConfigOpen) {
    input.overlay.visible = false;
    return;
  }
  input.overlay.visible = true;
  input.line1.content = "agr.toml not found in current directory.";
  input.line2.content = "agr add/remove/sync require agr.toml in this target repo.";
}
