export function renderRunModalWithUi(input: {
  busy: boolean;
  runTestOpen: boolean;
  lastCommand: string;
  cwd: string;
  overlay: { visible: boolean };
  text: { setText: (value: string) => void };
}): void {
  if (!input.busy && !input.runTestOpen) {
    input.overlay.visible = false;
    return;
  }
  input.overlay.visible = true;

  const cmdText = input.runTestOpen
    ? "uv run agr add kasperjunge/agent-resources/development/workflow/code-review"
    : input.lastCommand
      ? input.lastCommand
      : "Running...";

  let handleText = "";
  if (input.runTestOpen) {
    handleText = "kasperjunge/agent-resources/development/workflow/code-review";
  } else {
    const match = input.lastCommand.match(/\bagr\s+(add|remove)\s+(.+)$/);
    if (match) {
      handleText = match[2];
    }
  }

  const text = handleText
    ? `Cmd:\n${cmdText}\n\nHandle:\n${handleText}\n\ncwd:\n${input.cwd}\n\nPlease wait...`
    : `Cmd:\n${cmdText}\n\ncwd:\n${input.cwd}\n\nPlease wait...`;
  input.text.setText(text);
}
