import { describe, expect, test } from "bun:test";
import { createUiFeedbackAdapter } from "../src/services/ui_feedback";

describe("ui feedback adapter", () => {
  test("routes showToast and setStatus through shared UI wiring", () => {
    const state = {
      status: "Ready",
      statusToken: 0,
      toastToken: 0,
      busy: false,
    };
    const toastText = { content: "" as unknown };
    const toastOverlay = { visible: false };
    let footerRenders = 0;
    let renderRequests = 0;
    const scheduled: Array<() => void> = [];

    const adapter = createUiFeedbackAdapter({
      state,
      wrapText: (value) => [value],
      toastText,
      toastOverlay,
      renderFooter: () => {
        footerRenders += 1;
      },
      requestRender: () => {
        renderRequests += 1;
      },
      schedule: (cb) => {
        scheduled.push(cb);
      },
      isRendererDestroyed: () => false,
    });

    adapter.showToast("hello");
    expect(toastOverlay.visible).toBe(true);
    expect(toastText.content).toBe("hello");

    adapter.setStatus("Working", { clearAfterMs: 10 });
    expect(state.status).toBe("Working");
    expect(footerRenders).toBe(1);

    scheduled.forEach((cb) => cb());
    expect(state.status).toBe("Ready");
    expect(toastOverlay.visible).toBe(false);
    expect(renderRequests).toBeGreaterThan(0);
  });
});
