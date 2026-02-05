import { setStatusWithUi, showToastWithUi } from "./feedback";

export function createUiFeedbackAdapter(input: {
  state: { status: string; statusToken: number; toastToken: number; busy: boolean };
  wrapText: (value: string, width: number) => string[];
  toastText: { content: unknown };
  toastOverlay: { visible: boolean };
  renderFooter: () => void;
  requestRender: () => void;
  schedule: (callback: () => void, ms: number) => void;
  isRendererDestroyed: () => boolean;
}): {
  showToast: (message: string, durationMs?: number) => void;
  setStatus: (message: string, options?: { clearAfterMs?: number }) => void;
} {
  return {
    showToast(message: string, durationMs = 2000): void {
      showToastWithUi({
        state: input.state,
        message,
        durationMs,
        wrapText: input.wrapText,
        text: input.toastText,
        overlay: input.toastOverlay,
        requestRender: input.requestRender,
        schedule: input.schedule,
      });
    },
    setStatus(message: string, options?: { clearAfterMs?: number }): void {
      setStatusWithUi({
        state: input.state,
        rendererDestroyed: input.isRendererDestroyed(),
        message,
        clearAfterMs: options?.clearAfterMs,
        renderFooter: input.renderFooter,
        requestRender: input.requestRender,
        schedule: input.schedule,
      });
    },
  };
}
