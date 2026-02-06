import { BoxRenderable, CodeRenderable, InputRenderable, SyntaxStyle, TextRenderable, TextareaRenderable, createCliRenderer } from "@opentui/core";
import { colors } from "../ui";

export const PREVIEW_LINES = 13;

export type UiLayoutRefs = {
  headerTabLabels: TextRenderable[];
  headerCwd: TextRenderable;
  leftTitle: TextRenderable;
  listLines: TextRenderable[];
  detailLines: TextRenderable[];
  actionLines: TextRenderable[];
  addOverlay: BoxRenderable;
  addInput: InputRenderable;
  runOptionsOverlay: BoxRenderable;
  runOptionsSkill: TextRenderable;
  runOptionsTool: TextRenderable;
  runOptionsInteractive: TextRenderable;
  runOptionsPrompt: TextRenderable;
  runOptionsArgs: TextRenderable;
  helpOverlay: BoxRenderable;
  helpTitle: TextRenderable;
  helpLines: TextRenderable[];
  previewOverlay: BoxRenderable;
  previewTitle: TextRenderable;
  previewCode: CodeRenderable;
  missingConfigOverlay: BoxRenderable;
  missingConfigLine1: TextRenderable;
  missingConfigLine2: TextRenderable;
  verifyOverlay: BoxRenderable;
  verifyLine: TextRenderable;
  verifyLine2: TextRenderable;
  verifyListLines: TextRenderable[];
  updateOverlay: BoxRenderable;
  updateBody: TextRenderable;
  updateBody2: TextRenderable;
  runOverlay: BoxRenderable;
  runText: TextareaRenderable;
  toastOverlay: BoxRenderable;
  toastText: TextRenderable;
  footerStatus: TextRenderable;
  footerHint: TextRenderable;
};

export function createUiLayout(
  renderer: Awaited<ReturnType<typeof createCliRenderer>>,
  tabCount: number,
): UiLayoutRefs {
  const root = renderer.root;

  const layout = new BoxRenderable(renderer, {
    width: "100%",
    height: "100%",
    flexDirection: "column",
    backgroundColor: colors.background,
  });

  const header = new BoxRenderable(renderer, {
    height: 3,
    padding: 1,
    gap: 2,
    alignItems: "center",
    backgroundColor: colors.panelRaised,
  });
  const headerTitle = new TextRenderable(renderer, {
    content: "AGR OPENTUI",
    fg: colors.accent,
  });
  const headerTabsBox = new BoxRenderable(renderer, {
    flexDirection: "row",
    gap: 1,
  });
  const headerTabLabels: TextRenderable[] = [];
  for (let i = 0; i < tabCount; i += 1) {
    headerTabLabels.push(new TextRenderable(renderer, { content: "", fg: colors.dim }));
  }
  const headerCwd = new TextRenderable(renderer, {
    content: "",
    fg: colors.dim,
  });

  const body = new BoxRenderable(renderer, {
    flexDirection: "row",
    flexGrow: 1,
    padding: 1,
    gap: 1,
  });

  const leftPanel = new BoxRenderable(renderer, {
    width: 32,
    flexDirection: "column",
    borderStyle: "rounded",
    borderColor: colors.border,
    padding: 1,
    backgroundColor: colors.panelAlt,
  });

  const leftTitle = new TextRenderable(renderer, { content: "SKILLS", fg: colors.highlight });
  const listLines: TextRenderable[] = [];
  const listRows = 17;
  for (let i = 0; i < listRows; i += 1) {
    const line = new TextRenderable(renderer, { content: "", fg: colors.text, bg: colors.panelAlt });
    listLines.push(line);
  }

  const centerPanel = new BoxRenderable(renderer, {
    flexGrow: 1,
    flexDirection: "column",
    borderStyle: "rounded",
    borderColor: colors.border,
    padding: 1,
    backgroundColor: colors.panel,
  });
  const centerTitle = new TextRenderable(renderer, { content: "DETAILS", fg: colors.highlight });
  const detailLines: TextRenderable[] = [];
  for (let i = 0; i < 12; i += 1) {
    detailLines.push(new TextRenderable(renderer, { content: "", fg: colors.text }));
  }

  const rightPanel = new BoxRenderable(renderer, {
    width: 28,
    flexDirection: "column",
    borderStyle: "rounded",
    borderColor: colors.border,
    padding: 1,
    backgroundColor: colors.panelAlt,
  });
  const rightTitle = new TextRenderable(renderer, { content: "ACTIONS", fg: colors.highlight });
  const actionLines: TextRenderable[] = [];
  for (let i = 0; i < 12; i += 1) {
    actionLines.push(new TextRenderable(renderer, { content: "", fg: colors.text }));
  }
  const addOverlay = new BoxRenderable(renderer, {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  });
  const addModal = new BoxRenderable(renderer, {
    width: 60,
    height: 5,
    padding: 1,
    borderStyle: "double",
    borderColor: colors.borderStrong,
    backgroundColor: colors.panelRaised,
  });
  const addTitle = new TextRenderable(renderer, { content: "Add Skill", fg: colors.highlight });
  const addInput = new InputRenderable(renderer, {
    width: "100%",
    placeholder: "owner/repo/path or skill handle",
    backgroundColor: colors.panel,
    textColor: colors.text,
    focusedBackgroundColor: colors.selectedBg,
    focusedTextColor: colors.text,
    placeholderColor: colors.dim,
  });
  const addHint = new TextRenderable(renderer, { content: "Enter to add, Esc to cancel", fg: colors.dim });
  addModal.add(addTitle);
  addModal.add(addInput);
  addModal.add(addHint);
  addOverlay.add(addModal);
  addOverlay.visible = false;

  const runOptionsOverlay = new BoxRenderable(renderer, {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  });
  const runOptionsModal = new BoxRenderable(renderer, {
    width: 64,
    height: 7,
    padding: 1,
    borderStyle: "double",
    borderColor: colors.borderStrong,
    backgroundColor: colors.panelRaised,
  });
  const runOptionsTitle = new TextRenderable(renderer, { content: "Run Options", fg: colors.highlight });
  const runOptionsSkill = new TextRenderable(renderer, { content: "", fg: colors.text });
  const runOptionsTool = new TextRenderable(renderer, { content: "", fg: colors.text });
  const runOptionsInteractive = new TextRenderable(renderer, { content: "", fg: colors.text });
  const runOptionsPrompt = new TextRenderable(renderer, { content: "", fg: colors.text });
  const runOptionsArgs = new TextRenderable(renderer, { content: "", fg: colors.text });
  const runOptionsHint = new TextRenderable(renderer, {
    content: "t: tool  u: interactive  p: prompt  e: args  Enter: run  Esc: close",
    fg: colors.dim,
  });
  runOptionsModal.add(runOptionsTitle);
  runOptionsModal.add(runOptionsSkill);
  runOptionsModal.add(runOptionsTool);
  runOptionsModal.add(runOptionsInteractive);
  runOptionsModal.add(runOptionsPrompt);
  runOptionsModal.add(runOptionsArgs);
  runOptionsModal.add(runOptionsHint);
  runOptionsOverlay.add(runOptionsModal);
  runOptionsOverlay.visible = false;

  const helpOverlay = new BoxRenderable(renderer, {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  });
  const helpModal = new BoxRenderable(renderer, {
    width: 68,
    height: 9,
    padding: 1,
    borderStyle: "double",
    borderColor: colors.borderStrong,
    backgroundColor: colors.panelRaised,
  });
  const helpTitle = new TextRenderable(renderer, { content: "Help", fg: colors.highlight });
  const helpLines: TextRenderable[] = [];
  for (let i = 0; i < 5; i += 1) {
    helpLines.push(new TextRenderable(renderer, { content: "", fg: colors.text }));
  }
  const helpHint = new TextRenderable(renderer, { content: "Press H or Esc to close", fg: colors.dim });
  helpModal.add(helpTitle);
  for (const line of helpLines) {
    helpModal.add(line);
  }
  helpModal.add(helpHint);
  helpOverlay.add(helpModal);
  helpOverlay.visible = false;

  const previewOverlay = new BoxRenderable(renderer, {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  });
  const previewModal = new BoxRenderable(renderer, {
    width: 76,
    height: 19,
    padding: 1,
    borderStyle: "double",
    borderColor: colors.borderStrong,
    backgroundColor: colors.panelRaised,
    overflow: "hidden",
  });
  const previewTitle = new TextRenderable(renderer, { content: "SKILL.md", fg: colors.highlight });
  const previewCode = new CodeRenderable(renderer, {
    width: 72,
    height: PREVIEW_LINES,
    content: "",
    filetype: "markdown",
    syntaxStyle: SyntaxStyle.create(),
    conceal: true,
    drawUnstyledText: true,
    wrapMode: "none",
    truncate: true,
    selectable: false,
    bg: colors.panelRaised,
  });
  const previewHint = new TextRenderable(renderer, { content: "Esc/q: close  PgUp/PgDn: scroll", fg: colors.dim });
  previewModal.add(previewTitle);
  previewModal.add(previewCode);
  previewModal.add(previewHint);
  previewOverlay.add(previewModal);
  previewOverlay.visible = false;

  const missingConfigOverlay = new BoxRenderable(renderer, {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  });
  const missingConfigModal = new BoxRenderable(renderer, {
    width: 72,
    height: 7,
    padding: 1,
    borderStyle: "double",
    borderColor: colors.warn,
    backgroundColor: colors.panelRaised,
  });
  const missingConfigTitle = new TextRenderable(renderer, { content: "Missing agr.toml", fg: colors.warn });
  const missingConfigLine1 = new TextRenderable(renderer, { content: "", fg: colors.text });
  const missingConfigLine2 = new TextRenderable(renderer, { content: "", fg: colors.text });
  const missingConfigHint = new TextRenderable(renderer, { content: "Esc: close", fg: colors.dim });
  missingConfigModal.add(missingConfigTitle);
  missingConfigModal.add(missingConfigLine1);
  missingConfigModal.add(missingConfigLine2);
  missingConfigModal.add(missingConfigHint);
  missingConfigOverlay.add(missingConfigModal);
  missingConfigOverlay.visible = false;

  const verifyOverlay = new BoxRenderable(renderer, {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  });
  const verifyModal = new BoxRenderable(renderer, {
    width: 72,
    height: 10,
    padding: 1,
    borderStyle: "double",
    borderColor: colors.warn,
    backgroundColor: colors.panelRaised,
  });
  const verifyTitle = new TextRenderable(renderer, { content: "Verification Warning", fg: colors.warn });
  const verifyLine = new TextRenderable(renderer, { content: "", fg: colors.text });
  const verifyLine2 = new TextRenderable(renderer, { content: "", fg: colors.text });
  const verifyListLines: TextRenderable[] = [];
  for (let i = 0; i < 3; i += 1) {
    verifyListLines.push(new TextRenderable(renderer, { content: "", fg: colors.text }));
  }
  const verifyHint = new TextRenderable(renderer, { content: "Esc: close", fg: colors.dim });
  verifyModal.add(verifyTitle);
  verifyModal.add(verifyLine);
  verifyModal.add(verifyLine2);
  for (const line of verifyListLines) {
    verifyModal.add(line);
  }
  verifyModal.add(verifyHint);
  verifyOverlay.add(verifyModal);
  verifyOverlay.visible = false;

  const updateOverlay = new BoxRenderable(renderer, {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  });
  const updateModal = new BoxRenderable(renderer, {
    width: 64,
    height: 7,
    padding: 1,
    borderStyle: "double",
    borderColor: colors.borderStrong,
    backgroundColor: colors.panelRaised,
  });
  const updateTitle = new TextRenderable(renderer, { content: "Update Skills List", fg: colors.highlight });
  const updateBody = new TextRenderable(renderer, { content: "", fg: colors.text });
  const updateBody2 = new TextRenderable(renderer, { content: "", fg: colors.text });
  const updateHint = new TextRenderable(renderer, {
    content: "y: update, s: update+sync, n/Esc: cancel",
    fg: colors.dim,
  });
  updateModal.add(updateTitle);
  updateModal.add(updateBody);
  updateModal.add(updateBody2);
  updateModal.add(updateHint);
  updateOverlay.add(updateModal);
  updateOverlay.visible = false;

  const runOverlay = new BoxRenderable(renderer, {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  });
  const runModal = new BoxRenderable(renderer, {
    width: 72,
    height: 12,
    padding: 1,
    borderStyle: "double",
    borderColor: colors.accent,
    backgroundColor: colors.panelRaised,
  });
  const runTitle = new TextRenderable(renderer, { content: "", fg: colors.highlight });
  const runText = new TextareaRenderable(renderer, {
    width: 68,
    height: 8,
    initialValue: "",
    wrapMode: "word",
    showCursor: false,
    selectable: false,
    backgroundColor: colors.panelRaised,
    textColor: colors.text,
  });
  runText.blur();
  runModal.add(runTitle);
  runModal.add(runText);
  runOverlay.add(runModal);
  runOverlay.visible = false;

  const toastOverlay = new BoxRenderable(renderer, {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
  });
  const toastBox = new BoxRenderable(renderer, {
    position: "absolute",
    top: 1,
    right: 2,
    padding: 1,
    borderStyle: "rounded",
    borderColor: colors.accent,
    backgroundColor: colors.panelRaised,
  });
  const toastText = new TextRenderable(renderer, { content: "", fg: colors.text });
  toastBox.add(toastText);
  toastOverlay.add(toastBox);
  toastOverlay.visible = false;

  const footer = new BoxRenderable(renderer, {
    height: 2,
    padding: 1,
    gap: 2,
    backgroundColor: colors.panelRaised,
  });
  const footerStatus = new TextRenderable(renderer, { content: "", fg: colors.text });
  const footerHint = new TextRenderable(renderer, { content: "", fg: colors.dim });

  header.add(headerTitle);
  for (const tab of headerTabLabels) {
    headerTabsBox.add(tab);
  }
  header.add(headerTabsBox);
  header.add(headerCwd);
  leftPanel.add(leftTitle);
  for (const line of listLines) {
    leftPanel.add(line);
  }
  centerPanel.add(centerTitle);
  for (const line of detailLines) {
    centerPanel.add(line);
  }
  rightPanel.add(rightTitle);
  for (const line of actionLines) {
    rightPanel.add(line);
  }
  body.add(leftPanel);
  body.add(centerPanel);
  body.add(rightPanel);
  footer.add(footerStatus);
  footer.add(footerHint);
  layout.add(header);
  layout.add(body);
  layout.add(footer);
  root.add(layout);
  root.add(addOverlay);
  root.add(runOptionsOverlay);
  root.add(helpOverlay);
  root.add(previewOverlay);
  root.add(missingConfigOverlay);
  root.add(verifyOverlay);
  root.add(updateOverlay);
  root.add(runOverlay);
  root.add(toastOverlay);

  return {
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
    previewCode,
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
  };
}
