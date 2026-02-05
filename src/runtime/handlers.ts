import type { PredefinedSkill } from "../app_logic";
import type { State } from "../state";

type HandleKeyDeps = {
  state: State;
  tabs: string[];
  PREVIEW_LINES: number;
  getActiveTab: () => string;
  renderAll: () => void;
  renderActions: () => void;
  renderFooter: () => void;
  renderHelp: () => void;
  renderRunModal: () => void;
  renderRunOptions: () => void;
  renderPreviewModal: () => void;
  renderVerifyModal: () => void;
  renderMissingConfig: () => void;
  renderUpdateConfirm: () => void;
  moveSelection: (delta: number) => void;
  scrollPreview: (delta: number) => void;
  toggleSelected: () => void;
  togglePinned: () => void;
  openRunHistory: () => void;
  undoLastAction: () => Promise<void>;
  loadData: () => Promise<void>;
  enterInputMode: (mode: "none" | "add" | "prompt" | "args" | "filter", seed?: string) => void;
  exitInputMode: () => void;
  handleInputChar: (sequence: string) => void;
  installSelectedBulk: () => Promise<void>;
  installSelected: () => Promise<void>;
  removeSelectedBulk: () => Promise<void>;
  removeSelected: () => Promise<void>;
  refreshPreview: () => Promise<void>;
  runSelected: () => Promise<void>;
  cycleTool: () => void;
  addPredefinedSelected: () => Promise<void>;
  selectedPredefined: () => PredefinedSkill | null;
  copyToClipboard: (text: string) => Promise<boolean>;
  setStatus: (message: string, options?: { clearAfterMs?: number }) => void;
  checkUpdates: () => Promise<void>;
  applyUpdates: () => Promise<void>;
  applyUpdatesAndSync: () => Promise<void>;
  runDoctorChecks: () => Promise<void>;
  logEvent: (message: string) => void;
  quit: () => never;
};

export function createHandleKey(deps: HandleKeyDeps): (sequence: string) => boolean {
  const closeModal = (close: () => void, render: () => void): void => {
    close();
    render();
    deps.renderFooter();
  };

  return function handleKey(sequence: string): boolean {
    const state = deps.state;

    if (state.helpOpen) {
      if (sequence === "H" || sequence === "h" || sequence === "\x1b") {
        closeModal(
          () => {
            state.helpOpen = false;
          },
          deps.renderHelp,
        );
        return true;
      }
      return true;
    }
    if (state.previewOpen) {
      if (sequence === "\x1b") {
        closeModal(
          () => {
            state.previewOpen = false;
          },
          deps.renderPreviewModal,
        );
        return true;
      }
      if (sequence === "q" || sequence === "\x1b[O") {
        closeModal(
          () => {
            state.previewOpen = false;
          },
          deps.renderPreviewModal,
        );
        return true;
      }
      if (sequence === "\x1b[A") {
        deps.scrollPreview(-1);
        return true;
      }
      if (sequence === "\x1b[B") {
        deps.scrollPreview(1);
        return true;
      }
      if (sequence === "\x1b[5~") {
        deps.scrollPreview(-deps.PREVIEW_LINES);
        return true;
      }
      if (sequence === "\x1b[6~") {
        deps.scrollPreview(deps.PREVIEW_LINES);
        return true;
      }
    }
    if (state.verifyOpen) {
      if (state.verifyConfirmAction) {
        if (sequence === "y" || sequence === "Y") {
          const action = state.verifyConfirmAction;
          state.verifyConfirmAction = null;
          state.verifyOpen = false;
          deps.renderVerifyModal();
          deps.renderFooter();
          if (action === "install_bulk") {
            void deps.installSelectedBulk();
          } else if (action === "remove_bulk") {
            void deps.removeSelectedBulk();
          }
          return true;
        }
        if (sequence === "n" || sequence === "N" || sequence === "\x1b") {
          state.verifyConfirmAction = null;
          state.verifyOpen = false;
          deps.renderVerifyModal();
          deps.renderFooter();
          return true;
        }
        return true;
      }
      if (sequence === "\x1b") {
        closeModal(
          () => {
            state.verifyOpen = false;
          },
          deps.renderVerifyModal,
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
          deps.renderMissingConfig,
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
          deps.renderRunOptions,
        );
        return true;
      }
      if (sequence === "\r" || sequence === "\n") {
        closeModal(
          () => {
            state.runOptionsOpen = false;
          },
          deps.renderRunOptions,
        );
        void deps.runSelected();
        return true;
      }
      if (sequence === "t") {
        deps.cycleTool();
        deps.renderRunOptions();
        return true;
      }
      if (sequence === "u") {
        state.interactive = !state.interactive;
        deps.renderRunOptions();
        return true;
      }
      if (sequence === "p") {
        state.runOptionsOpen = false;
        deps.renderRunOptions();
        deps.enterInputMode("prompt", state.promptBuffer);
        return true;
      }
      if (sequence === "e") {
        state.runOptionsOpen = false;
        deps.renderRunOptions();
        deps.enterInputMode("args", state.argsBuffer);
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
          deps.renderUpdateConfirm,
        );
        void deps.applyUpdates();
        return true;
      }
      if (sequence === "n" || sequence === "N" || sequence === "\x1b") {
        closeModal(
          () => {
            state.confirmUpdateOpen = false;
          },
          deps.renderUpdateConfirm,
        );
        return true;
      }
      if (sequence === "s" || sequence === "S") {
        closeModal(
          () => {
            state.confirmUpdateOpen = false;
          },
          deps.renderUpdateConfirm,
        );
        void deps.applyUpdatesAndSync();
        return true;
      }
      return true;
    }
    if (state.inputMode === "add") {
      if (sequence === "\u0003") {
        deps.quit();
      }
      if (sequence === "\x1b") {
        deps.exitInputMode();
        return true;
      }
      return false;
    }
    if (state.inputMode !== "none") {
      deps.handleInputChar(sequence);
      return true;
    }

    if (sequence === "\u0003" || sequence === "q") {
      deps.quit();
    }

    if (sequence === "\t") {
      state.tabIndex = (state.tabIndex + 1) % deps.tabs.length;
      deps.renderAll();
      deps.renderActions();
      return true;
    }

    if (sequence === "\x1b[Z") {
      state.tabIndex = (state.tabIndex - 1 + deps.tabs.length) % deps.tabs.length;
      deps.renderAll();
      deps.renderActions();
      return true;
    }

    if (sequence === "\x1b[A") {
      deps.moveSelection(-1);
      return true;
    }

    if (sequence === "\x1b[B") {
      deps.moveSelection(1);
      return true;
    }

    if (sequence === " ") {
      deps.toggleSelected();
      return true;
    }

    if (sequence === "p") {
      deps.togglePinned();
      return true;
    }

    if (sequence === "L") {
      deps.openRunHistory();
      return true;
    }

    if (sequence === "z") {
      void deps.undoLastAction();
      return true;
    }

    if (sequence === "c") {
      void deps.loadData();
      return true;
    }

    if (sequence === "H" || sequence === "h") {
      state.helpOpen = true;
      deps.renderHelp();
      deps.renderFooter();
      return true;
    }

    if (sequence === "T") {
      state.runTestOpen = !state.runTestOpen;
      deps.renderRunModal();
      deps.renderFooter();
      return true;
    }

    if (sequence === "d" || sequence === "D") {
      void deps.runDoctorChecks();
      return true;
    }

    const tab = deps.getActiveTab();
    if (sequence === "a") {
      deps.enterInputMode("add");
      return true;
    }
    if (sequence === "f") {
      deps.enterInputMode("filter", state.filterQuery);
      return true;
    }

    if (tab === "Skills" && sequence === "i") {
      if (state.selectedIds.size > 0) {
        state.verifyConfirmAction = "install_bulk";
        state.verifyMessage = `Install ${state.selectedIds.size} selected skills?`;
        state.verifyDetails = Array.from(state.selectedIds);
        state.verifyOpen = true;
        deps.renderVerifyModal();
        deps.renderFooter();
      } else {
        void deps.installSelected();
      }
      return true;
    }

    if (tab === "Skills" && sequence === "r") {
      if (state.selectedIds.size > 0) {
        state.verifyConfirmAction = "remove_bulk";
        state.verifyMessage = `Remove ${state.selectedIds.size} selected skills?`;
        state.verifyDetails = Array.from(state.selectedIds);
        state.verifyOpen = true;
        deps.renderVerifyModal();
        deps.renderFooter();
      } else {
        void deps.removeSelected();
      }
      return true;
    }

    if (tab === "Skills" && sequence === "v") {
      void deps.refreshPreview();
      state.previewOpen = true;
      deps.renderPreviewModal();
      deps.renderFooter();
      return true;
    }

    if (tab === "Skills" && sequence === "g") {
      void deps.runSelected();
      return true;
    }

    if (tab === "Skills" && sequence === "G") {
      state.runOptionsOpen = true;
      deps.renderRunOptions();
      deps.renderFooter();
      return true;
    }

    if (tab === "Discover" && sequence === "i") {
      deps.logEvent("Key: Discover install (i)");
      void deps.addPredefinedSelected();
      return true;
    }

    if (tab === "Discover" && sequence === "y") {
      const skill = deps.selectedPredefined();
      if (skill) {
        const text = skill.repo ? `${skill.repo} (${skill.handle})` : skill.handle;
        void (async () => {
          const ok = await deps.copyToClipboard(text);
          if (ok) {
            deps.setStatus("Copied to clipboard", { clearAfterMs: 2000 });
          } else {
            deps.setStatus(`Copy failed: ${text}`);
          }
        })();
      }
      return true;
    }

    if (tab === "Skills" && sequence === "u") {
      void deps.checkUpdates();
      return true;
    }

    if (tab === "Skills" && sequence === "U") {
      if (state.updateAvailable) {
        void deps.applyUpdates();
      }
      return true;
    }
    if (tab === "Skills" && sequence === "S") {
      if (state.updateAvailable) {
        void deps.applyUpdatesAndSync();
      }
      return true;
    }
    if (tab === "Skills" && sequence === "s") {
      if (state.updateAvailable) {
        state.confirmUpdateOpen = true;
        deps.renderUpdateConfirm();
        deps.renderFooter();
      }
      return true;
    }

    return false;
  };
}
