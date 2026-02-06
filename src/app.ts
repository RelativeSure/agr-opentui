import { createCliRenderer } from "@opentui/core";
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { defaultAppDeps } from "./deps";
import { createInitialState, type InputMode, type SkillsSource, type State, tabs } from "./state";
import { PREVIEW_LINES, createUiLayout } from "./ui/layout";
import { wrapText } from "./ui/render";
import { createHandleKey } from "./runtime/handlers";
import { copyToClipboard } from "./services/clipboard";
import { submitAddInputWithUi } from "./services/add_flow";
import { hasKnownHandleInSources, looksLikeHandleInput } from "./services/handle_match";
import {
  getSkillDisplayLabel as getSkillDisplayLabelFromService,
  getSkillSourceLabel as getSkillSourceLabelFromService,
  resolveSkillLabelWithUi,
} from "./services/discover_labels";
import { loadPredefinedFromDisk, writeSkillsFileToDisk } from "./services/skills_file";
import { filterInstalledPredefined as filterInstalledPredefinedService } from "./services/discover_filter";
import { applyEnterInputMode, applyExitInputMode, processInputSequence } from "./services/input_mode";
import { handleInputCharWithUi, moveSelectionWithUi, scrollPreviewWithUi } from "./services/navigation";
import { loadPreviewLines } from "./services/preview";
import { renderPreviewWithUi } from "./services/render_preview";
import { renderActionsWithUi } from "./services/render_actions";
import { renderAllWithUi } from "./services/render_all";
import { renderDetailsWithUi } from "./services/render_details";
import { renderFooterWithUi } from "./services/render_footer";
import { renderHelpWithUi } from "./services/render_help";
import { renderListWithUi } from "./services/render_list";
import { renderMissingConfigWithUi } from "./services/render_missing_config";
import { renderRunModalWithUi } from "./services/render_run_modal";
import { renderRunOptionsWithUi } from "./services/render_run_options";
import { renderTabsWithUi } from "./services/render_tabs";
import { renderUpdateConfirmWithUi } from "./services/render_update_confirm";
import { renderVerifyWithUi } from "./services/render_verify";
import { createRunCommand, createRunDoctorChecks } from "./services/runtime_ops";
import { createUiFeedbackAdapter } from "./services/ui_feedback";
import {
  getVisibleItems as getVisibleItemsService,
  nextPreviewOffset,
  nextSelectionIndex,
  selectedDependencyFromVisible,
  selectedPredefinedFromVisible,
  toggleSelectedId,
  type ActiveTab,
} from "./services/selection";
import { computeVisibleItems } from "./services/visible_items";
import {
  getSkillsSource as getSkillsSourceFromState,
  handleVariants as buildHandleVariants,
  normalizeHandleForAgr as normalizeHandleForAgrWithSource,
  normalizeSkills as normalizeSkillsFromSource,
  normalizeSource as normalizeSourceFromSource,
} from "./services/skills_source";
import { loadDataWithUi } from "./services/data";
import { applyUpdatesAndSyncWithUi, applyUpdatesWithUi, checkUpdatesWithUi, resetUpdateState } from "./services/update";
import { createVerifyCoordinator } from "./services/verify_coordinator";
import {
  addPredefinedSelectedAction,
  installSelectedAction,
  installSelectedBulkAction,
  removeSelectedAction,
  removeSelectedBulkAction,
  runSelectedAction,
} from "./services/agr_actions";

function logEvent(message: string): void {
  try {
    const line = `[${new Date().toISOString()}] ${message}\n`;
    appendFileSync("/tmp/agr-opentui.log", line, "utf-8");
  } catch {
    // ignore logging failures
  }
}

process.on("uncaughtException", (error) => {
  logEvent(`Uncaught exception: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
});

process.on("unhandledRejection", (reason) => {
  logEvent(`Unhandled rejection: ${reason instanceof Error ? reason.stack ?? reason.message : String(reason)}`);
});

type Dependency = import("./app_logic").Dependency;
type PredefinedSkill = import("./app_logic").PredefinedSkill;

const state: State = createInitialState();

const renderer = await createCliRenderer();
let rendererDestroyed = false;
renderer.on("destroy", () => {
  rendererDestroyed = true;
});

const {
  headerTabLabels,
  headerCwd,
  leftTitle,
  listLines,
  detailLines,
  actionLines,
  addOverlay,
  addInput,
  runOptionsOverlay,
  runOptionsSkill,
  runOptionsTool,
  runOptionsInteractive,
  runOptionsPrompt,
  runOptionsArgs,
  helpOverlay,
  helpTitle,
  helpLines,
  previewOverlay,
  previewTitle,
  previewText,
  missingConfigOverlay,
  missingConfigLine1,
  missingConfigLine2,
  verifyOverlay,
  verifyLine,
  verifyLine2,
  verifyListLines,
  updateOverlay,
  updateBody,
  updateBody2,
  runOverlay,
  runText,
  toastOverlay,
  toastText,
  footerStatus,
  footerHint,
} = createUiLayout(renderer, tabs.length);

function getActiveTab(): string {
  return tabs[state.tabIndex] ?? tabs[0];
}

function getActiveTabTyped(): ActiveTab {
  return getActiveTab() === "Discover" ? "Discover" : "Skills";
}

function isDestroyedRenderable(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return record.isDestroyed === true;
}

function renderTabs(): void {
  renderTabsWithUi({
    tabs,
    tabIndex: state.tabIndex,
    updateError: Boolean(state.updateError),
    updateAvailable: state.updateAvailable,
    cwd: defaultAppDeps.cwd(),
    tabLabels: headerTabLabels,
    cwdLine: headerCwd,
  });
}

function getDependencies(): Dependency[] {
  return state.data?.dependencies ?? [];
}

function getPredefinedSkills(): PredefinedSkill[] {
  return state.predefined;
}

function filterInstalledPredefined(skills: PredefinedSkill[]): PredefinedSkill[] {
  return filterInstalledPredefinedService({
    skills,
    data: state.data,
    installedOverrides: state.installedOverrides,
    handleVariants,
  });
}

function hasKnownHandle(handle: string): boolean {
  return hasKnownHandleInSources({
    handle,
    predefinedHandles: state.predefined.map((skill) => skill.handle),
    remoteHandles: state.updateRemote.map((skill) => skill.handle),
  });
}

function looksLikeHandle(input: string): boolean {
  return looksLikeHandleInput(input);
}

function loadPredefined(): void {
  const loaded = loadPredefinedFromDisk({
    cwd: defaultAppDeps.cwd(),
    existsSync,
    readFileSync,
    normalizeSkills: normalizeSkillsFromSource,
    normalizeSource: normalizeSourceFromSource,
  });
  state.predefined = loaded.predefined;
  state.predefinedError = loaded.predefinedError;
  state.predefinedSource = loaded.predefinedSource;
  state.predefinedFormat = loaded.predefinedFormat;
  resetUpdateState(state);
}

function getSkillDisplayLabel(skill: PredefinedSkill): string {
  return getSkillDisplayLabelFromService({ skill, skillLabelCache: state.skillLabelCache });
}

function getSkillSourceLabel(skill: PredefinedSkill): string {
  return getSkillSourceLabelFromService({ skill, predefinedSource: state.predefinedSource });
}

function normalizeHandleForAgr(handle: string): string {
  return normalizeHandleForAgrWithSource(handle, state.predefinedSource);
}

function handleVariants(handle: string): string[] {
  return buildHandleVariants(handle, state.predefinedSource);
}

async function resolveSkillLabel(skill: PredefinedSkill): Promise<void> {
  await resolveSkillLabelWithUi({
    skill,
    predefinedSource: state.predefinedSource,
    skillLabelCache: state.skillLabelCache,
    skillLabelPending: state.skillLabelPending,
    onResolved: () => {
      renderList();
      renderDetails();
    },
  });
}

async function checkUpdates(): Promise<void> {
  await checkUpdatesWithUi({
    state,
    source: getSkillsSourceFromState(state.predefinedSource),
    setStatus,
    logEvent,
    renderAll,
  });
}

function writeSkillsFile(skills: PredefinedSkill[], source: SkillsSource | null): void {
  writeSkillsFileToDisk({
    cwd: defaultAppDeps.cwd(),
    predefinedFormat: state.predefinedFormat,
    skills,
    source,
    normalizeSource: normalizeSourceFromSource,
    writeFileSync,
  });
}

async function applyUpdates(): Promise<void> {
  await applyUpdatesWithUi({
    state,
    writeSkillsFile,
    loadPredefined,
    setStatus,
    renderAll,
  });
}

async function applyUpdatesAndSync(): Promise<void> {
  await applyUpdatesAndSyncWithUi({
    state,
    applyUpdates,
    runCommand: runCommandWithHistory,
    loadData,
  });
}

function getVisibleItems(): Array<Dependency | PredefinedSkill> {
  const base = getVisibleItemsService({
    tab: getActiveTabTyped(),
    dependencies: getDependencies(),
    discoverSkills: filterInstalledPredefined(getPredefinedSkills()),
  });
  const tab = getActiveTabTyped();
  return computeVisibleItems({
    tab,
    baseItems: base,
    filterQuery: state.filterQuery,
    discoverText: (skill) => `${getSkillDisplayLabel(skill)} ${skill.handle} ${skill.repo ?? ""}`,
    dependencyText: (dep) => `${dep.identifier} ${dep.handle ?? ""} ${dep.path ?? ""}`,
    isPinned: (item) =>
      tab === "Discover"
        ? state.pinnedIds.has(`discover:${(item as PredefinedSkill).handle}`)
        : state.pinnedIds.has(`skills:${(item as Dependency).identifier}`),
  });
}

function selectedDependency(): Dependency | null {
  return selectedDependencyFromVisible({
    tab: getActiveTabTyped(),
    visible: getVisibleItems(),
    selectedIndex: state.selectedIndex,
  });
}

function selectedPredefined(): PredefinedSkill | null {
  return selectedPredefinedFromVisible({
    tab: getActiveTabTyped(),
    visible: getVisibleItems(),
    selectedIndex: state.selectedIndex,
  });
}


function isSelected(dep: Dependency): boolean {
  return state.selectedIds.has(dep.identifier);
}

function renderList(): void {
  renderListWithUi({
    tab: getActiveTab() === "Discover" ? "Discover" : "Skills",
    visible: getVisibleItems(),
    selectedIndex: state.selectedIndex,
    rowCount: listLines.length,
    isSelectedDependency: isSelected,
    getSkillDisplayLabel,
    getSkillSourceLabel,
    resolveSkillLabel,
    setSelectedIndex: (index) => {
      state.selectedIndex = index;
    },
    setTitle: (title) => {
      leftTitle.content = title;
    },
    lines: listLines,
  });
}

function renderDetails(): void {
  renderDetailsWithUi({
    tab: getActiveTab() === "Discover" ? "Discover" : "Skills",
    predefinedError: state.predefinedError,
    predefinedCount: state.predefined.length,
    visiblePredefinedCount: filterInstalledPredefined(state.predefined).length,
    updateInProgress: state.updateInProgress,
    hasSource: Boolean(state.predefinedSource?.url || state.predefinedSource?.repo),
    selectedPredefined: selectedPredefined(),
    hasData: Boolean(state.data),
    selectedDependency: selectedDependency(),
    rowCount: detailLines.length,
    getSkillDisplayLabel,
    getSkillSourceLabel,
    lines: detailLines,
  });
}

function renderActions(): void {
  renderActionsWithUi({
    tab: getActiveTab() === "Discover" ? "Discover" : "Skills",
    rowCount: actionLines.length,
    updateAvailable: state.updateAvailable,
    lines: actionLines,
  });
}

function renderFooter(): void {
  renderFooterWithUi({
    rendererDestroyed,
    footerStatusDestroyed: isDestroyedRenderable(footerStatus),
    footerHintDestroyed: isDestroyedRenderable(footerHint),
    updateInProgress: state.updateInProgress,
    status: state.status,
    updateCheckedAt: state.updateCheckedAt,
    confirmUpdateOpen: state.confirmUpdateOpen,
    inputMode: state.inputMode,
    filterQuery: state.filterQuery,
    lastCommand: state.lastCommand,
    cwd: defaultAppDeps.cwd(),
    footerStatus,
    footerHint,
  });
}

function renderAll(): void {
  renderAllWithUi({
    renderTabs,
    renderList,
    renderDetails,
    renderActions,
    renderFooter,
    renderHelp,
    renderPreviewModal,
    renderMissingConfig,
    renderVerifyModal,
    renderRunOptions,
    renderUpdateConfirm,
    renderRunModal,
    requestRender: () => renderer.requestRender(),
  });
}

function renderHelp(): void {
  renderHelpWithUi({
    helpOpen: state.helpOpen,
    tab: getActiveTab() === "Discover" ? "Discover" : "Skills",
    rowCount: helpLines.length,
    overlay: helpOverlay,
    title: helpTitle,
    lines: helpLines,
  });
}

function renderPreviewModal(): void {
  renderPreviewWithUi({
    previewOpen: state.previewOpen,
    previewLines: state.previewAll,
    previewOffset: state.previewOffset,
    pageLines: PREVIEW_LINES,
    selectedDependency: selectedDependency(),
    overlay: previewOverlay,
    title: previewTitle,
    text: previewText,
  });
}

function renderRunOptions(): void {
  renderRunOptionsWithUi({
    runOptionsOpen: state.runOptionsOpen,
    selectedDependency: selectedDependency(),
    tools: state.data?.tools ?? [],
    toolIndex: state.toolIndex,
    interactive: state.interactive,
    promptBuffer: state.promptBuffer,
    argsBuffer: state.argsBuffer,
    overlay: runOptionsOverlay,
    skillLine: runOptionsSkill,
    toolLine: runOptionsTool,
    interactiveLine: runOptionsInteractive,
    promptLine: runOptionsPrompt,
    argsLine: runOptionsArgs,
  });
}

function renderMissingConfig(): void {
  renderMissingConfigWithUi({
    missingConfigOpen: state.missingConfigOpen,
    overlay: missingConfigOverlay,
    line1: missingConfigLine1,
    line2: missingConfigLine2,
  });
}

function renderVerifyModal(): void {
  renderVerifyWithUi({
    verifyOpen: state.verifyOpen,
    verifyMessage: state.verifyMessage,
    verifyDetails: state.verifyDetails ?? [],
    wrapText,
    overlay: verifyOverlay,
    line1: verifyLine,
    line2: verifyLine2,
    listLines: verifyListLines,
  });
}

function renderUpdateConfirm(): void {
  renderUpdateConfirmWithUi({
    confirmUpdateOpen: state.confirmUpdateOpen,
    addedCount: state.updateCandidates.length,
    removedCount: state.updateRemoved.length,
    predefinedSource: state.predefinedSource,
    overlay: updateOverlay,
    body: updateBody,
    body2: updateBody2,
  });
}

function renderRunModal(): void {
  renderRunModalWithUi({
    busy: state.busy,
    runTestOpen: state.runTestOpen,
    lastCommand: state.lastCommand,
    cwd: defaultAppDeps.cwd(),
    overlay: runOverlay,
    text: runText,
  });
}

const feedback = createUiFeedbackAdapter({
  state,
  wrapText,
  toastText,
  toastOverlay,
  renderFooter,
  requestRender: () => renderer.requestRender(),
  schedule: (callback, ms) => {
    setTimeout(callback, ms);
  },
  isRendererDestroyed: () => rendererDestroyed,
});

function showToast(message: string, durationMs = 2000): void {
  feedback.showToast(message, durationMs);
}

function setStatus(message: string, options?: { clearAfterMs?: number }): void {
  feedback.setStatus(message, options);
}

const runCommand = createRunCommand({
  state,
  cwd: defaultAppDeps.cwd(),
  deps: defaultAppDeps,
  onRenderRunModal: renderRunModal,
  onSetStatus: (message) => setStatus(message),
  onShowToast: showToast,
  onOpenVerify: openVerify,
  onLogEvent: logEvent,
});

const runCommandWithHistory = async (args: string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> => {
  const result = await runCommand(args);
  state.runHistory.unshift({ command: args.join(" "), exitCode: result.exitCode, at: new Date().toISOString() });
  if (state.runHistory.length > 30) {
    state.runHistory.length = 30;
  }
  if (result.exitCode === 0 && args[0] === "uv" && args[1] === "run" && args[2] === "agr") {
    const sub = args[3];
    const handles = args.filter((arg, idx) => idx >= 4 && !arg.startsWith("--"));
    if (handles.length > 0 && sub === "add") {
      state.undoAction = { op: "remove", handles };
    } else if (handles.length > 0 && sub === "remove") {
      state.undoAction = { op: "add", handles };
    }
  }
  return result;
};

const runDoctorChecks = createRunDoctorChecks({
  cwd: defaultAppDeps.cwd(),
  setStatus,
  openVerify,
  showToast,
});

async function loadData(): Promise<void> {
  await loadDataWithUi({
    state,
    cwd: defaultAppDeps.cwd(),
    deps: defaultAppDeps,
    loadPredefined,
    renderList,
    renderDetails,
    checkUpdates,
    writeSkillsFile: () => writeSkillsFile(state.updateRemote, state.predefinedSource),
    runBridge: () => runCommandWithHistory(["uv", "run", "python", "-m", "agr_opentui.bridge"]),
    setStatus,
    renderAll,
    refreshPreview,
  });
}

async function installSelected(): Promise<void> {
  await installSelectedAction({
    state,
    selectedDependency,
    normalizeHandleForAgr,
    runCommand: runCommandWithHistory,
    loadData,
    showToast,
    setStatus: (message) => setStatus(message),
    renderMissingConfig,
    verifyAgrTomlContains,
  });
}

async function addPredefinedSelected(): Promise<void> {
  await addPredefinedSelectedAction({
    state,
    deps: defaultAppDeps,
    selectedPredefined,
    getSkillDisplayLabel,
    normalizeHandleForAgr,
    runCommand: runCommandWithHistory,
    loadData,
    showToast,
    setStatus: (message) => setStatus(message),
    renderList,
    renderDetails,
    renderActions,
    verifyAgrTomlContains,
    openVerify,
    logEvent,
    handleVariants,
  });
}

async function removeSelected(): Promise<void> {
  await removeSelectedAction({
    state,
    selectedDependency,
    normalizeHandleForAgr,
    runCommand: runCommandWithHistory,
    loadData,
    showToast,
    setStatus: (message) => setStatus(message),
    renderMissingConfig,
    openVerify,
    logEvent,
    verifyAgrTomlMissing,
  });
}

async function runSelected(): Promise<void> {
  await runSelectedAction({
    state,
    selectedDependency,
    runCommand: runCommandWithHistory,
  });
}

function cycleTool(): void {
  const tools = state.data?.tools ?? [];
  if (tools.length === 0) {
    return;
  }
  state.toolIndex = (state.toolIndex + 1) % tools.length;
}

function enterInputMode(mode: InputMode, seed = ""): void {
  applyEnterInputMode(state, mode, seed);
  if (mode === "add") {
    addOverlay.visible = true;
    addInput.value = seed;
    addInput.focus();
  }
  renderActions();
  renderFooter();
}

function exitInputMode(): void {
  const prevMode = applyExitInputMode(state);
  if (prevMode === "add") {
    addInput.blur();
    addOverlay.visible = false;
  }
  renderActions();
  renderFooter();
}

async function handleInputSubmit(): Promise<void> {
  if (state.inputMode === "add") {
    const value = addInput.value.trim();
    exitInputMode();
    await submitAddInputWithUi({
      value,
      looksLikeHandle,
      hasKnownHandle,
      showToast,
      setStatus,
      runCommand: runCommandWithHistory,
      loadData,
    });
    return;
  }
  if (state.inputMode === "prompt") {
    state.promptBuffer = state.inputBuffer.trim();
    exitInputMode();
    await runSelected();
  }
  if (state.inputMode === "args") {
    state.argsBuffer = state.inputBuffer.trim();
    exitInputMode();
    renderActions();
    return;
  }
  if (state.inputMode === "filter") {
    state.filterQuery = state.inputBuffer.trim();
    exitInputMode();
    state.selectedIndex = 0;
    renderList();
    renderDetails();
    renderActions();
  }
}

function handleInputChar(sequence: string): void {
  handleInputCharWithUi({
    sequence,
    inputBuffer: state.inputBuffer,
    processInputSequence,
    onSubmit: () => {
      void handleInputSubmit();
    },
    onCancel: exitInputMode,
    setInputBuffer: (buffer) => {
      state.inputBuffer = buffer;
      if (state.inputMode === "filter") {
        state.filterQuery = buffer;
        state.selectedIndex = 0;
        renderList();
        renderDetails();
      }
    },
    renderActions,
    renderFooter,
  });
}

function moveSelection(delta: number): void {
  moveSelectionWithUi({
    delta,
    visibleCount: getVisibleItems().length,
    selectedIndex: state.selectedIndex,
    nextSelectionIndex,
    setSelectedIndex: (value) => {
      state.selectedIndex = value;
    },
    renderList,
    renderDetails,
    refreshPreview,
  });
}

function scrollPreview(delta: number): void {
  scrollPreviewWithUi({
    delta,
    previewLineCount: state.previewAll.length,
    previewOffset: state.previewOffset,
    pageLines: PREVIEW_LINES,
    nextPreviewOffset,
    setPreviewOffset: (value) => {
      state.previewOffset = value;
    },
    renderPreviewModal,
  });
}

function openVerify(message: string, details: string[] = []): void {
  state.verifyMessage = message;
  state.verifyDetails = details;
  state.verifyConfirmAction = null;
  state.verifyOpen = true;
  renderVerifyModal();
}

function openRunHistory(): void {
  state.verifyConfirmAction = null;
  state.verifyMessage = "Run history (latest first)";
  state.verifyDetails = state.runHistory.map((entry) => `[${entry.exitCode}] ${entry.command}`);
  state.verifyOpen = true;
  renderVerifyModal();
}

const {
  verifyAgrTomlContains,
  verifyAgrTomlContainsMany,
  verifyAgrTomlMissing,
  verifyAgrTomlMissingMany,
} = createVerifyCoordinator({
  cwd: defaultAppDeps.cwd(),
  deps: defaultAppDeps,
  handleVariants,
  openVerify,
  logEvent,
});

async function refreshPreview(): Promise<void> {
  state.previewAll = await loadPreviewLines({
    dependency: selectedDependency(),
    readText: async (path) => Bun.file(path).text(),
    maxLineLength: 200,
  });
  state.previewOffset = 0;
  renderDetails();
  if (state.previewOpen) {
    renderPreviewModal();
  }
}

function toggleSelected(): void {
  const dep = selectedDependency();
  if (!dep) {
    return;
  }
  toggleSelectedId(state.selectedIds, dep.identifier);
  renderList();
  renderActions();
}

function togglePinned(): void {
  if (getActiveTabTyped() === "Discover") {
    const skill = selectedPredefined();
    if (!skill) {
      return;
    }
    toggleSelectedId(state.pinnedIds, `discover:${skill.handle}`);
  } else {
    const dep = selectedDependency();
    if (!dep) {
      return;
    }
    toggleSelectedId(state.pinnedIds, `skills:${dep.identifier}`);
  }
  renderList();
  renderDetails();
}

function getSelectedIds(): string[] {
  return Array.from(state.selectedIds);
}

async function installSelectedBulk(): Promise<void> {
  await installSelectedBulkAction({
    state,
    selectedIds: getSelectedIds,
    installSelected,
    normalizeHandleForAgr,
    runCommand: runCommandWithHistory,
    loadData,
    setStatus: (message) => setStatus(message),
    verifyAgrTomlContainsMany,
  });
}

async function removeSelectedBulk(): Promise<void> {
  await removeSelectedBulkAction({
    state,
    selectedIds: getSelectedIds,
    removeSelected,
    getDependencies,
    normalizeHandleForAgr,
    runCommand: runCommandWithHistory,
    loadData,
    setStatus: (message) => setStatus(message),
    logEvent,
    verifyAgrTomlMissingMany,
    renderList,
    renderActions,
  });
}

async function undoLastAction(): Promise<void> {
  if (!state.undoAction) {
    setStatus("Nothing to undo", { clearAfterMs: 2000 });
    return;
  }
  const action = state.undoAction;
  await runCommandWithHistory(["uv", "run", "agr", action.op, ...action.handles]);
  state.undoAction = null;
  await loadData();
  setStatus("Undo applied", { clearAfterMs: 2500 });
}

const handleKey = createHandleKey({
  state,
  tabs,
  PREVIEW_LINES,
  getActiveTab,
  renderAll,
  renderActions,
  renderFooter,
  renderHelp,
  renderRunModal,
  renderRunOptions,
  renderPreviewModal,
  renderVerifyModal,
  renderMissingConfig,
  renderUpdateConfirm,
  moveSelection,
  scrollPreview,
  toggleSelected,
  togglePinned,
  openRunHistory,
  undoLastAction,
  loadData,
  enterInputMode,
  exitInputMode,
  handleInputChar,
  installSelectedBulk,
  installSelected,
  removeSelectedBulk,
  removeSelected,
  refreshPreview,
  runSelected,
  cycleTool,
  addPredefinedSelected,
  selectedPredefined,
  copyToClipboard,
  setStatus,
  checkUpdates,
  applyUpdates,
  applyUpdatesAndSync,
  runDoctorChecks,
  logEvent,
  quit: () => {
    renderer.destroy();
    process.exit(0);
  },
});

renderer.prependInputHandler(handleKey);

process.on("SIGINT", () => {
  renderer.destroy();
  process.exit(0);
});

renderer.start();
renderAll();
void loadData();

addInput.on("input", (value) => {
  state.inputBuffer = String(value ?? "");
  renderActions();
  renderFooter();
});
addInput.on("enter", () => {
  void handleInputSubmit();
});
