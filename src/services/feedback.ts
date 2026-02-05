export function showToastWithUi(input: {
  state: { toastToken: number };
  message: string;
  durationMs?: number;
  width?: number;
  wrapText: (value: string, width: number) => string[];
  text: { content: unknown };
  overlay: { visible: boolean };
  requestRender: () => void;
  schedule: (callback: () => void, ms: number) => void;
}): void {
  const durationMs = input.durationMs ?? 2000;
  const width = input.width ?? 28;
  const wrapped = input.wrapText(input.message, width);
  input.text.content = wrapped[0] ?? input.message;
  input.overlay.visible = true;
  input.state.toastToken += 1;
  const token = input.state.toastToken;
  input.requestRender();
  input.schedule(() => {
    if (input.state.toastToken !== token) {
      return;
    }
    input.overlay.visible = false;
    input.requestRender();
  }, durationMs);
}

export function setStatusWithUi(input: {
  state: { status: string; statusToken: number; busy: boolean };
  rendererDestroyed: boolean;
  message: string;
  clearAfterMs?: number;
  renderFooter: () => void;
  requestRender: () => void;
  schedule: (callback: () => void, ms: number) => void;
  readyText?: string;
}): void {
  if (input.rendererDestroyed) {
    return;
  }
  input.state.status = input.message;
  input.state.statusToken += 1;
  const token = input.state.statusToken;
  input.renderFooter();
  input.requestRender();
  if (!input.clearAfterMs) {
    return;
  }
  const readyText = input.readyText ?? "Ready";
  input.schedule(() => {
    if (input.rendererDestroyed) {
      return;
    }
    if (input.state.statusToken !== token || input.state.busy) {
      return;
    }
    input.state.status = readyText;
    input.renderFooter();
    input.requestRender();
  }, input.clearAfterMs);
}
