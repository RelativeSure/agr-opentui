import { describe, expect, test } from "bun:test";
import { createHandleKey } from "../src/runtime/handlers";
import { createInitialState, tabs } from "../src/state";

function createDeps() {
  const state = createInitialState();
  const calls = {
    renderAll: 0,
    renderActions: 0,
    renderFooter: 0,
    renderHelp: 0,
    renderRunOptions: 0,
    renderPreviewModal: 0,
    installSelected: 0,
    installSelectedBulk: 0,
    togglePinned: 0,
    openRunHistory: 0,
    undoLastAction: 0,
    loadData: 0,
    reloadData: 0,
    applyUpdatesAndSync: 0,
    scrollPreview: [] as number[],
    enterInputMode: [] as Array<{ mode: "none" | "add" | "prompt" | "args" | "filter"; seed?: string }>,
  };

  const handleKey = createHandleKey({
    state,
    tabs,
    PREVIEW_LINES: 13,
    getActiveTab: () => tabs[state.tabIndex] ?? tabs[0],
    renderAll: () => {
      calls.renderAll += 1;
    },
    renderActions: () => {
      calls.renderActions += 1;
    },
    renderFooter: () => {
      calls.renderFooter += 1;
    },
    renderHelp: () => {
      calls.renderHelp += 1;
    },
    renderRunModal: () => {},
    renderRunOptions: () => {
      calls.renderRunOptions += 1;
    },
    renderPreviewModal: () => {
      calls.renderPreviewModal += 1;
    },
    renderVerifyModal: () => {},
    renderMissingConfig: () => {},
    renderUpdateConfirm: () => {},
    moveSelection: () => {},
    scrollPreview: (delta) => {
      calls.scrollPreview.push(delta);
    },
    toggleSelected: () => {},
    togglePinned: () => {
      calls.togglePinned += 1;
    },
    openRunHistory: () => {
      calls.openRunHistory += 1;
    },
    undoLastAction: async () => {
      calls.undoLastAction += 1;
    },
    loadData: async () => {
      calls.loadData += 1;
    },
    reloadData: async () => {
      calls.reloadData += 1;
    },
    enterInputMode: (mode, seed) => {
      calls.enterInputMode.push({ mode, seed });
    },
    exitInputMode: () => {},
    handleInputChar: () => {},
    installSelectedBulk: async () => {
      calls.installSelectedBulk += 1;
    },
    installSelected: async () => {
      calls.installSelected += 1;
    },
    removeSelectedBulk: async () => {},
    removeSelected: async () => {},
    refreshPreview: async () => {},
    runSelected: async () => {},
    cycleTool: () => {},
    addPredefinedSelected: async () => {},
    selectedPredefined: () => null,
    copyToClipboard: async () => true,
    setStatus: () => {},
    checkUpdates: async () => {},
    applyUpdates: async () => {},
    applyUpdatesAndSync: async () => {
      calls.applyUpdatesAndSync += 1;
    },
    runDoctorChecks: async () => {},
    logEvent: () => {},
    quit: () => {
      throw new Error("quit");
    },
  });

  return { state, calls, handleKey };
}

describe("runtime key handler", () => {
  test("Tab advances active tab and triggers rerender", () => {
    const { state, calls, handleKey } = createDeps();

    const handled = handleKey("\t");

    expect(handled).toBe(true);
    expect(state.tabIndex).toBe(1);
    expect(calls.renderAll).toBe(1);
    expect(calls.renderActions).toBe(1);
  });

  test("skills install key routes to single action or bulk confirm modal", async () => {
    const { state, calls, handleKey } = createDeps();
    state.tabIndex = 0;

    expect(handleKey("i")).toBe(true);
    await Promise.resolve();
    expect(calls.installSelected).toBe(1);
    expect(calls.installSelectedBulk).toBe(0);

    state.selectedIds.add("org/repo/skill");
    expect(handleKey("i")).toBe(true);
    await Promise.resolve();
    expect(calls.installSelected).toBe(1);
    expect(calls.installSelectedBulk).toBe(0);
    expect(state.verifyOpen).toBe(true);
    expect(state.verifyConfirmAction).toBe("install_bulk");
  });

  test("run options prompt key closes modal and enters prompt mode", () => {
    const { state, calls, handleKey } = createDeps();
    state.runOptionsOpen = true;
    state.promptBuffer = "fix me";

    const handled = handleKey("p");

    expect(handled).toBe(true);
    expect(state.runOptionsOpen).toBe(false);
    expect(calls.renderRunOptions).toBe(1);
    expect(calls.enterInputMode).toEqual([{ mode: "prompt", seed: "fix me" }]);
  });

  test("confirm-update s key triggers apply-and-sync flow", async () => {
    const { state, calls, handleKey } = createDeps();
    state.confirmUpdateOpen = true;

    const handled = handleKey("s");
    await Promise.resolve();

    expect(handled).toBe(true);
    expect(state.confirmUpdateOpen).toBe(false);
    expect(calls.renderFooter).toBe(1);
    expect(calls.applyUpdatesAndSync).toBe(1);
  });

  test("preview mode handles close and scroll keys", () => {
    const { state, calls, handleKey } = createDeps();
    state.previewOpen = true;

    expect(handleKey("\x1b[A")).toBe(true);
    expect(handleKey("\x1b[6~")).toBe(true);
    expect(calls.scrollPreview).toEqual([-1, 13]);
    expect(state.previewOpen).toBe(true);

    expect(handleKey("q")).toBe(true);
    expect(state.previewOpen).toBe(false);
    expect(calls.renderPreviewModal).toBe(1);
    expect(calls.renderFooter).toBe(1);
  });

  test("verify modal closes on escape and swallows other keys", () => {
    const { state, calls, handleKey } = createDeps();
    state.verifyOpen = true;

    expect(handleKey("x")).toBe(true);
    expect(state.verifyOpen).toBe(true);
    expect(calls.renderFooter).toBe(0);

    expect(handleKey("\x1b")).toBe(true);
    expect(state.verifyOpen).toBe(false);
    expect(calls.renderFooter).toBe(1);
  });

  test("missing-config modal closes on escape", () => {
    const { state, calls, handleKey } = createDeps();
    state.missingConfigOpen = true;

    expect(handleKey("\x1b")).toBe(true);
    expect(state.missingConfigOpen).toBe(false);
    expect(calls.renderFooter).toBe(1);
  });

  test("verify confirm y runs pending bulk action", async () => {
    const { state, calls, handleKey } = createDeps();
    state.verifyOpen = true;
    state.verifyConfirmAction = "install_bulk";

    expect(handleKey("y")).toBe(true);
    await Promise.resolve();
    expect(state.verifyOpen).toBe(false);
    expect(state.verifyConfirmAction).toBeNull();
    expect(calls.installSelectedBulk).toBe(1);
  });

  test("f key opens filter input mode seeded with current query", () => {
    const { state, calls, handleKey } = createDeps();
    state.filterQuery = "abc";

    expect(handleKey("f")).toBe(true);
    expect(calls.enterInputMode).toEqual([{ mode: "filter", seed: "abc" }]);
  });

  test("p, L, z trigger pin/history/undo actions", async () => {
    const { calls, handleKey } = createDeps();

    expect(handleKey("p")).toBe(true);
    expect(handleKey("L")).toBe(true);
    expect(handleKey("z")).toBe(true);
    await Promise.resolve();

    expect(calls.togglePinned).toBe(1);
    expect(calls.openRunHistory).toBe(1);
    expect(calls.undoLastAction).toBe(1);
  });

  test("c key triggers reload path", async () => {
    const { calls, handleKey } = createDeps();

    expect(handleKey("c")).toBe(true);
    await Promise.resolve();
    expect(calls.reloadData).toBe(1);
    expect(calls.loadData).toBe(0);
  });

  test("invalid action key on active tab is ignored without blocking next input", () => {
    const { state, calls, handleKey } = createDeps();
    state.tabIndex = 1; // Discover tab

    expect(handleKey("r")).toBe(false);
    expect(calls.enterInputMode).toHaveLength(0);

    expect(handleKey("f")).toBe(true);
    expect(calls.enterInputMode).toEqual([{ mode: "filter", seed: "" }]);
  });
});
