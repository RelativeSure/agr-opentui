import type { State } from "../state";

export function handleModalAndInputState(input: {
  state: State;
  sequence: string;
  PREVIEW_LINES: number;
  renderFooter: () => void;
  renderHelp: () => void;
  renderPreviewModal: () => void;
  scrollPreview: (delta: number) => void;
  renderVerifyModal: () => void;
  installSelectedBulk: () => Promise<void>;
  removeSelectedBulk: () => Promise<void>;
  renderMissingConfig: () => void;
  renderRunOptions: () => void;
  runSelected: () => Promise<void>;
  cycleTool: () => void;
  enterInputMode: (mode: "none" | "add" | "prompt" | "args" | "filter", seed?: string) => void;
  applyUpdates: () => Promise<void>;
  applyUpdatesAndSync: () => Promise<void>;
  renderUpdateConfirm: () => void;
  exitInputMode: () => void;
  handleInputChar: (sequence: string) => void;
  quit: () => never;
}): boolean {
  const closeModal = (close: () => void, render: () => void): void => {
    close();
    render();
    input.renderFooter();
  };

  const { state, sequence } = input;
  if (state.helpOpen) {
    if (sequence === "H" || sequence === "h" || sequence === "\x1b") {
      closeModal(
        () => {
          state.helpOpen = false;
        },
        input.renderHelp,
      );
      return true;
    }
    return true;
  }

  if (state.previewOpen) {
    if (sequence === "\x1b" || sequence === "q" || sequence === "\x1b[O") {
      closeModal(
        () => {
          state.previewOpen = false;
        },
        input.renderPreviewModal,
      );
      return true;
    }
    if (sequence === "\x1b[A") {
      input.scrollPreview(-1);
      return true;
    }
    if (sequence === "\x1b[B") {
      input.scrollPreview(1);
      return true;
    }
    if (sequence === "\x1b[5~") {
      input.scrollPreview(-input.PREVIEW_LINES);
      return true;
    }
    if (sequence === "\x1b[6~") {
      input.scrollPreview(input.PREVIEW_LINES);
      return true;
    }
  }

  if (state.verifyOpen) {
    if (state.verifyConfirmAction) {
      if (sequence === "y" || sequence === "Y") {
        const action = state.verifyConfirmAction;
        state.verifyConfirmAction = null;
        state.verifyOpen = false;
        input.renderVerifyModal();
        input.renderFooter();
        if (action === "install_bulk") {
          void input.installSelectedBulk();
        } else if (action === "remove_bulk") {
          void input.removeSelectedBulk();
        }
        return true;
      }
      if (sequence === "n" || sequence === "N" || sequence === "\x1b") {
        state.verifyConfirmAction = null;
        state.verifyOpen = false;
        input.renderVerifyModal();
        input.renderFooter();
        return true;
      }
      return true;
    }
    if (sequence === "\x1b") {
      closeModal(
        () => {
          state.verifyOpen = false;
        },
        input.renderVerifyModal,
      );
      return true;
    }
    return true;
  }

  if (state.missingConfigOpen) {
    if (sequence === "\x1b") {
      closeModal(
        () => {
          state.missingConfigOpen = false;
        },
        input.renderMissingConfig,
      );
      return true;
    }
    return true;
  }

  if (state.runOptionsOpen) {
    if (sequence === "\x1b") {
      closeModal(
        () => {
          state.runOptionsOpen = false;
        },
        input.renderRunOptions,
      );
      return true;
    }
    if (sequence === "\r" || sequence === "\n") {
      closeModal(
        () => {
          state.runOptionsOpen = false;
        },
        input.renderRunOptions,
      );
      void input.runSelected();
      return true;
    }
    if (sequence === "t") {
      input.cycleTool();
      input.renderRunOptions();
      return true;
    }
    if (sequence === "u") {
      state.interactive = !state.interactive;
      input.renderRunOptions();
      return true;
    }
    if (sequence === "p") {
      state.runOptionsOpen = false;
      input.renderRunOptions();
      input.enterInputMode("prompt", state.promptBuffer);
      return true;
    }
    if (sequence === "e") {
      state.runOptionsOpen = false;
      input.renderRunOptions();
      input.enterInputMode("args", state.argsBuffer);
      return true;
    }
    return true;
  }

  if (state.confirmUpdateOpen) {
    if (sequence === "y" || sequence === "Y") {
      closeModal(
        () => {
          state.confirmUpdateOpen = false;
        },
        input.renderUpdateConfirm,
      );
      void input.applyUpdates();
      return true;
    }
    if (sequence === "n" || sequence === "N" || sequence === "\x1b") {
      closeModal(
        () => {
          state.confirmUpdateOpen = false;
        },
        input.renderUpdateConfirm,
      );
      return true;
    }
    if (sequence === "s" || sequence === "S") {
      closeModal(
        () => {
          state.confirmUpdateOpen = false;
        },
        input.renderUpdateConfirm,
      );
      void input.applyUpdatesAndSync();
      return true;
    }
    return true;
  }

  if (state.inputMode === "add") {
    if (sequence === "\u0003") {
      input.quit();
    }
    if (sequence === "\x1b") {
      input.exitInputMode();
      return true;
    }
    return false;
  }

  if (state.inputMode !== "none") {
    input.handleInputChar(sequence);
    return true;
  }

  return false;
}
