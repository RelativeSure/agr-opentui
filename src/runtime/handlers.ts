import type { PredefinedSkill } from "../app_logic";
import type { State } from "../state";
import { handleModalAndInputState } from "./modal_input_handler";

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
  reloadData: () => Promise<void>;
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
  return function handleKey(sequence: string): boolean {
    const state = deps.state;

    if (
      handleModalAndInputState({
        state,
        sequence,
        PREVIEW_LINES: deps.PREVIEW_LINES,
        renderFooter: deps.renderFooter,
        renderHelp: deps.renderHelp,
        renderRunModal: deps.renderRunModal,
        renderPreviewModal: deps.renderPreviewModal,
        scrollPreview: deps.scrollPreview,
        renderVerifyModal: deps.renderVerifyModal,
        installSelectedBulk: deps.installSelectedBulk,
        removeSelectedBulk: deps.removeSelectedBulk,
        renderMissingConfig: deps.renderMissingConfig,
        renderRunOptions: deps.renderRunOptions,
        runSelected: deps.runSelected,
        cycleTool: deps.cycleTool,
        enterInputMode: deps.enterInputMode,
        applyUpdates: deps.applyUpdates,
        applyUpdatesAndSync: deps.applyUpdatesAndSync,
        renderUpdateConfirm: deps.renderUpdateConfirm,
        exitInputMode: deps.exitInputMode,
        handleInputChar: deps.handleInputChar,
        quit: deps.quit,
      })
    ) {
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
      void deps.reloadData();
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
