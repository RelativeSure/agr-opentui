import { describe, expect, test } from "bun:test";
import { setStatusWithUi, showToastWithUi } from "../src/services/feedback";

describe("feedback service", () => {
  test("showToastWithUi keeps latest toast visible when older timeout fires", () => {
    const state = { toastToken: 0 };
    const text = { content: "" };
    const overlay = { visible: false };
    const scheduled: Array<() => void> = [];
    let renders = 0;

    const schedule = (callback: () => void) => {
      scheduled.push(callback);
    };

    showToastWithUi({
      state,
      message: "first",
      wrapText: (value) => [value],
      text,
      overlay,
      requestRender: () => {
        renders += 1;
      },
      schedule,
    });
    showToastWithUi({
      state,
      message: "second",
      wrapText: (value) => [value],
      text,
      overlay,
      requestRender: () => {
        renders += 1;
      },
      schedule,
    });

    expect(text.content).toBe("second");
    expect(overlay.visible).toBe(true);

    scheduled[0]?.();
    expect(overlay.visible).toBe(true);

    scheduled[1]?.();
    expect(overlay.visible).toBe(false);
    expect(renders).toBe(3);
  });

  test("setStatusWithUi clear timer honors token and busy guards", () => {
    const state = { status: "Ready", statusToken: 0, busy: false };
    const scheduled: Array<() => void> = [];
    let footers = 0;
    let renders = 0;

    const schedule = (callback: () => void) => {
      scheduled.push(callback);
    };

    setStatusWithUi({
      state,
      rendererDestroyed: false,
      message: "loading",
      clearAfterMs: 10,
      renderFooter: () => {
        footers += 1;
      },
      requestRender: () => {
        renders += 1;
      },
      schedule,
    });
    setStatusWithUi({
      state,
      rendererDestroyed: false,
      message: "still loading",
      clearAfterMs: 10,
      renderFooter: () => {
        footers += 1;
      },
      requestRender: () => {
        renders += 1;
      },
      schedule,
    });

    scheduled[0]?.();
    expect(state.status).toBe("still loading");

    state.busy = true;
    scheduled[1]?.();
    expect(state.status).toBe("still loading");

    state.busy = false;
    setStatusWithUi({
      state,
      rendererDestroyed: false,
      message: "done",
      clearAfterMs: 10,
      renderFooter: () => {
        footers += 1;
      },
      requestRender: () => {
        renders += 1;
      },
      schedule,
    });
    scheduled[2]?.();
    expect(state.status).toBe("Ready");
    expect(footers).toBe(4);
    expect(renders).toBe(4);
  });
});
