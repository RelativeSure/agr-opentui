import { BoxRenderable, InputRenderable, TextRenderable, TextareaRenderable, createCliRenderer } from "@opentui/core";
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const colors = {
  background: "#0b1020",
  panel: "#111a2b",
  panelAlt: "#0f1526",
  accent: "#2dd4bf",
  warn: "#f59e0b",
  text: "#f8fafc",
  dim: "#94a3b8",
  border: "#2f3b52",
  highlight: "#60a5fa",
};

function logEvent(message: string): void {
  try {
    const line = `[${new Date().toISOString()}] ${message}\n`;
    appendFileSync("/tmp/agr-opentui.log", line, "utf-8");
  } catch {
    // ignore logging failures
  }
}

type Dependency = {
  identifier: string;
  handle?: string | null;
  path?: string | null;
  is_local: boolean;
  installed: boolean;
  skill_md_path?: string | null;
  candidates_by_tool?: Record<string, string[]>;
};

type PredefinedSkill = {
  label: string;
  handle: string;
  repo?: string;
};

type SkillsSource = {
  repo?: string;
  branch?: string;
  path?: string;
  url?: string;
  format?: "skills-json" | "agr-toml";
  lastCommit?: string | null;
  lastChecked?: string | null;
};

type SkillsFile = {
  source?: SkillsSource;
  skills: Array<string | (PredefinedSkill & { repo?: string })>;
};

type BridgeData = {
  repo_root: string | null;
  config_path: string | null;
  tools: string[];
  default_tool: string | null;
  dependencies: Dependency[];
  installed?: Record<string, string[]>;
};

type InputMode = "none" | "add" | "prompt" | "args";

type State = {
  tabIndex: number;
  inputMode: InputMode;
  inputBuffer: string;
  promptBuffer: string;
  argsBuffer: string;
  selectedIndex: number;
  selectedIds: Set<string>;
  toolIndex: number;
  interactive: boolean;
  status: string;
  statusToken: number;
  lastCommand: string;
  lastExit: number | null;
  data: BridgeData | null;
  busy: boolean;
  previewAll: string[];
  previewOffset: number;
  helpOpen: boolean;
  predefined: PredefinedSkill[];
  predefinedError: string | null;
  predefinedSource: SkillsSource | null;
  predefinedFormat: "array" | "object";
  updateRemote: PredefinedSkill[];
  updateCandidates: PredefinedSkill[];
  updateRemoved: PredefinedSkill[];
  updateError: string | null;
  updateAvailable: boolean;
  updateCheckedAt: string | null;
  updateCommit: string | null;
  confirmUpdateOpen: boolean;
  updateInProgress: boolean;
  skillLabelCache: Record<string, string>;
  skillLabelPending: Set<string>;
  installedOverrides: Set<string>;
  previewOpen: boolean;
  runOptionsOpen: boolean;
  missingConfig: boolean;
  missingConfigOpen: boolean;
  verifyOpen: boolean;
  verifyMessage: string;
  verifyDetails: string[];
  runTestOpen: boolean;
};

const tabs = ["Skills", "Discover", "Updates"];
const DEFAULT_SKILLS_SOURCE: SkillsSource = {
  format: "skills-json",
};

const state: State = {
  tabIndex: 0,
  inputMode: "none",
  inputBuffer: "",
  promptBuffer: "",
  argsBuffer: "",
  selectedIndex: 0,
  selectedIds: new Set<string>(),
  toolIndex: 0,
  interactive: false,
  status: "Ready",
  statusToken: 0,
  lastCommand: "",
  lastExit: null,
  data: null,
  busy: false,
  previewAll: [],
  previewOffset: 0,
  helpOpen: false,
  predefined: [],
  predefinedError: null,
  predefinedSource: null,
  predefinedFormat: "array",
  updateRemote: [],
  updateCandidates: [],
  updateRemoved: [],
  updateError: null,
  updateAvailable: false,
  updateCheckedAt: null,
  updateCommit: null,
  confirmUpdateOpen: false,
  updateInProgress: false,
  skillLabelCache: {},
  skillLabelPending: new Set<string>(),
  installedOverrides: new Set<string>(),
  previewOpen: false,
  runOptionsOpen: false,
  missingConfig: false,
  missingConfigOpen: false,
  verifyOpen: false,
  verifyMessage: "",
  verifyDetails: [],
  runTestOpen: false,
};

const renderer = await createCliRenderer();
let rendererDestroyed = false;
renderer.on("destroy", () => {
  rendererDestroyed = true;
});

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
  backgroundColor: colors.panelAlt,
});
const headerTitle = new TextRenderable(renderer, {
  content: "AGR OpenTUI",
  fg: colors.highlight,
});
const headerTabs = new TextRenderable(renderer, {
  content: "",
  fg: colors.dim,
});
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
  backgroundColor: colors.panel,
});

const listLines: TextRenderable[] = [];
const listRows = 18;
for (let i = 0; i < listRows; i += 1) {
  const line = new TextRenderable(renderer, { content: "", fg: colors.text });
  listLines.push(line);
}

const centerPanel = new BoxRenderable(renderer, {
  flexGrow: 1,
  flexDirection: "column",
  borderStyle: "rounded",
  borderColor: colors.border,
  padding: 1,
  backgroundColor: colors.panelAlt,
});
const centerTitle = new TextRenderable(renderer, { content: "Details", fg: colors.highlight });
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
  backgroundColor: colors.panel,
});
const rightTitle = new TextRenderable(renderer, { content: "Actions:", fg: colors.highlight });
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
  borderColor: colors.highlight,
  backgroundColor: colors.panelAlt,
});
const addTitle = new TextRenderable(renderer, { content: "Add Skill", fg: colors.highlight });
const addInput = new InputRenderable(renderer, {
  width: "100%",
  placeholder: "owner/repo/path or skill handle",
  backgroundColor: colors.panelAlt,
  textColor: colors.text,
  focusedBackgroundColor: colors.panel,
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
  borderColor: colors.highlight,
  backgroundColor: colors.panelAlt,
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
  borderColor: colors.highlight,
  backgroundColor: colors.panelAlt,
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
  height: 14,
  padding: 1,
  borderStyle: "double",
  borderColor: colors.highlight,
  backgroundColor: colors.panelAlt,
});
const previewTitle = new TextRenderable(renderer, { content: "SKILL.md", fg: colors.highlight });
const previewText = new TextareaRenderable(renderer, {
  width: 72,
  height: 9,
  initialValue: "",
  wrapMode: "word",
  showCursor: false,
  selectable: false,
  backgroundColor: colors.panelAlt,
  textColor: colors.text,
});
previewText.blur();
const previewHint = new TextRenderable(renderer, { content: "[/]: scroll, Esc: close", fg: colors.dim });
previewModal.add(previewTitle);
previewModal.add(previewText);
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
  backgroundColor: colors.panelAlt,
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
  backgroundColor: colors.panelAlt,
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
  borderColor: colors.highlight,
  backgroundColor: colors.panelAlt,
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
  backgroundColor: colors.panelAlt,
});
const runTitle = new TextRenderable(renderer, { content: "", fg: colors.highlight });
const runText = new TextareaRenderable(renderer, {
  width: 68,
  height: 8,
  initialValue: "",
  wrapMode: "word",
  showCursor: false,
  selectable: false,
  backgroundColor: colors.panelAlt,
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
  borderStyle: "round",
  borderColor: colors.accent,
  backgroundColor: colors.panelAlt,
});
const toastText = new TextRenderable(renderer, { content: "", fg: colors.text });
toastBox.add(toastText);
toastOverlay.add(toastBox);
toastOverlay.visible = false;

const footer = new BoxRenderable(renderer, {
  height: 2,
  padding: 1,
  gap: 2,
  backgroundColor: colors.panelAlt,
});
const footerStatus = new TextRenderable(renderer, { content: "", fg: colors.text });
const footerHint = new TextRenderable(renderer, { content: "", fg: colors.dim });

header.add(headerTitle);
header.add(headerTabs);
header.add(headerCwd);
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

function getActiveTab(): string {
  return tabs[state.tabIndex] ?? tabs[0];
}

function renderTabs(): void {
  const tabText = tabs
    .map((tab, idx) => {
      let label = tab;
      if (tab === "Updates") {
        if (state.updateError) {
          label = "Updates!";
        } else if (state.updateAvailable) {
          label = "Updates*";
        }
      }
      return idx === state.tabIndex ? `[${label}]` : ` ${label} `;
    })
    .join("  ");
  headerTabs.content = tabText;
  headerTabs.fg = colors.dim;
  headerCwd.content = `cwd: ${process.cwd()}`;
  headerCwd.fg = colors.dim;
}

function getDependencies(): Dependency[] {
  return state.data?.dependencies ?? [];
}

function getPredefinedSkills(): PredefinedSkill[] {
  return state.predefined;
}

function getInstalledHandleSet(): Set<string> {
  const set = new Set<string>();
  const deps = state.data?.dependencies ?? [];
  for (const dep of deps) {
    set.add(dep.identifier.toLowerCase());
    if (dep.handle) {
      set.add(dep.handle.toLowerCase());
    }
    if (dep.path) {
      set.add(dep.path.toLowerCase());
    }
  }
  return set;
}

function getInstalledNameSet(): Set<string> {
  const set = new Set<string>();
  const data = state.data;
  if (!data?.installed) {
    return set;
  }
  const tool = data.default_tool ?? "";
  const names = tool ? data.installed[tool] ?? [] : [];
  for (const name of names) {
    set.add(name.toLowerCase());
  }
  return set;
}

function isInstalledByName(handle: string, installedNames: Set<string>): boolean {
  if (installedNames.size === 0) {
    return false;
  }
  const variants = handleVariants(handle).map((v) => v.toLowerCase());
  for (const variant of variants) {
    if (installedNames.has(variant)) {
      return true;
    }
    const parts = variant.split("/");
    const last = parts[parts.length - 1];
    if (last && installedNames.has(last)) {
      return true;
    }
  }
  return false;
}

function filterInstalledPredefined(skills: PredefinedSkill[]): PredefinedSkill[] {
  if (!state.data) {
    if (state.installedOverrides.size === 0) {
      return skills;
    }
    return skills.filter((skill) => !state.installedOverrides.has(skill.handle.toLowerCase()));
  }
  const installed = getInstalledHandleSet();
  const installedNames = getInstalledNameSet();
  for (const handle of state.installedOverrides) {
    installed.add(handle);
  }
  return skills.filter((skill) => {
    const handle = skill.handle.toLowerCase();
    if (installed.has(handle)) {
      return false;
    }
    if (isInstalledByName(handle, installedNames)) {
      return false;
    }
    return true;
  });
}

function normalizeSkills(items: Array<string | PredefinedSkill>): PredefinedSkill[] {
  const normalized: PredefinedSkill[] = [];
  for (const item of items) {
    if (typeof item === "string") {
      const handle = item.trim();
      if (!handle) {
        continue;
      }
      normalized.push({ label: handle, handle });
    } else if (item && typeof item === "object") {
      const maybe = item as { label?: unknown; handle?: unknown; repo?: unknown };
      const handle = typeof maybe.handle === "string" ? maybe.handle.trim() : "";
      if (!handle) {
        continue;
      }
      const label = typeof maybe.label === "string" && maybe.label.trim().length > 0 ? maybe.label.trim() : handle;
      const repo = typeof maybe.repo === "string" && maybe.repo.trim().length > 0 ? maybe.repo.trim() : undefined;
      normalized.push({ label, handle, repo });
    }
  }
  return normalized;
}

function normalizeSource(source?: SkillsSource | null): SkillsSource {
  return {
    ...DEFAULT_SKILLS_SOURCE,
    ...(source ?? {}),
    format: source?.format ?? "skills-json",
  };
}

function normalizeSkillsFromAgrToml(tomlText: string): PredefinedSkill[] {
  const entries: PredefinedSkill[] = [];
  const seen = new Set<string>();
  const addHandle = (handle: string) => {
    const trimmed = handle.trim();
    if (!trimmed) {
      return;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    entries.push(buildSkillFromHandle(trimmed));
  };

  const inlineMatch = tomlText.match(/dependencies\s*=\s*\[(.*?)\]/s);
  if (inlineMatch) {
    const body = inlineMatch[1];
    const itemRegex = /{([^}]+)}/g;
    let itemMatch: RegExpExecArray | null;
    while ((itemMatch = itemRegex.exec(body)) !== null) {
      const block = itemMatch[1];
      const handleMatch = block.match(/handle\s*=\s*"([^"]+)"/);
      if (!handleMatch) {
        continue;
      }
      const typeMatch = block.match(/type\s*=\s*"([^"]+)"/);
      if (typeMatch && typeMatch[1] !== "skill") {
        continue;
      }
      addHandle(handleMatch[1]);
    }
    const stringRegex = /"([^"]+)"/g;
    let stringMatch: RegExpExecArray | null;
    while ((stringMatch = stringRegex.exec(body)) !== null) {
      const value = stringMatch[1];
      if (value.includes("/") && !value.startsWith("http")) {
        addHandle(value);
      }
    }
  }

  const lines = tomlText.split(/\r?\n/);
  let current: Record<string, string> | null = null;
  const flush = () => {
    if (!current) {
      return;
    }
    const handle = current.handle?.trim();
    if (handle) {
      if (!current.type || current.type === "skill") {
        addHandle(handle);
      }
    }
    current = null;
  };
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    if (trimmed.startsWith("[[")) {
      if (trimmed === "[[dependencies]]" || trimmed.endsWith(".dependencies]]")) {
        flush();
        current = {};
      } else {
        flush();
        current = null;
      }
      continue;
    }
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      flush();
      current = null;
      continue;
    }
    if (current) {
      const match = trimmed.match(/^([A-Za-z0-9_-]+)\s*=\s*"(.*)"\s*$/);
      if (match) {
        current[match[1]] = match[2];
      }
    }
  }
  flush();

  if (entries.length === 0) {
    const handleRegex = /handle\s*=\s*"([^"]+)"/g;
    let match: RegExpExecArray | null;
    while ((match = handleRegex.exec(tomlText)) !== null) {
      addHandle(match[1]);
    }
  }

  if (entries.length === 0) {
    const fallbackRegex = /"([^"]+\/[^"]+)"/g;
    let match: RegExpExecArray | null;
    while ((match = fallbackRegex.exec(tomlText)) !== null) {
      const value = match[1];
      if (!value.startsWith("http")) {
        addHandle(value);
      }
    }
  }

  return entries;
}

function buildSkillFromHandle(handle: string): PredefinedSkill {
  const skill: PredefinedSkill = { label: handle, handle };
  const parts = handle.split("/");
  if (parts.length === 3) {
    skill.repo = `${parts[0]}/${parts[1]}`;
  } else if (parts.length === 2) {
    skill.repo = `${parts[0]}/agent-resources`;
  }
  return skill;
}

function hasKnownHandle(handle: string): boolean {
  const normalized = handle.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  const known = new Set<string>();
  for (const skill of state.predefined) {
    known.add(skill.handle.toLowerCase());
  }
  for (const skill of state.updateRemote) {
    known.add(skill.handle.toLowerCase());
  }
  if (known.size === 0) {
    return true;
  }
  return known.has(normalized);
}

function looksLikeHandle(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) {
    return false;
  }
  if (trimmed.startsWith("/") || trimmed.startsWith(".")) {
    return false;
  }
  return trimmed.includes("/");
}

function getUpdateSkills(): PredefinedSkill[] {
  return state.updateCandidates;
}

function loadPredefined(): void {
  const path = join(process.cwd(), "skills.json");
  try {
    if (!existsSync(path)) {
      state.predefined = [];
      state.predefinedError = "skills.json not found";
      state.predefinedSource = null;
      state.predefinedFormat = "array";
      return;
    }
    const raw = readFileSync(path, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      state.predefined = normalizeSkills(parsed as Array<string | PredefinedSkill>);
      state.predefinedSource = null;
      state.predefinedFormat = "array";
    } else if (parsed && typeof parsed === "object") {
      const obj = parsed as SkillsFile;
      if (!Array.isArray(obj.skills)) {
        state.predefined = [];
      } else {
        state.predefined = normalizeSkills(obj.skills);
      }
      state.predefinedSource = normalizeSource(obj.source);
      state.predefinedFormat = "object";
    } else {
      state.predefined = [];
      state.predefinedError = "skills.json must be an array or object";
      state.predefinedSource = null;
      state.predefinedFormat = "array";
      return;
    }
    state.predefinedError = null;
  } catch (error) {
    state.predefined = [];
    state.predefinedError = error instanceof Error ? error.message : "Failed to read skills.json";
    state.predefinedSource = null;
    state.predefinedFormat = "array";
  }
  state.updateRemote = [];
  state.updateCandidates = [];
  state.updateRemoved = [];
  state.updateAvailable = false;
  state.updateError = null;
}

function getSkillsSource(): SkillsSource {
  if (state.predefinedSource) {
    return normalizeSource(state.predefinedSource);
  }
  return normalizeSource(null);
}

function buildRawUrl(source: SkillsSource): string | null {
  if (source.url) {
    return normalizeSourceUrl(source.url);
  }
  if (!source.repo || !source.path) {
    return null;
  }
  const branch = source.branch ?? "main";
  return `https://raw.githubusercontent.com/${source.repo}/${branch}/${source.path}`;
}

function normalizeSourceUrl(url: string): string {
  const match = url.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/);
  if (match) {
    const [, owner, repo, branch, path] = match;
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
  }
  return url;
}

function buildCommitApiUrl(source: SkillsSource): string | null {
  const fromUrl = parseGitHubUrl(source.url);
  if (fromUrl) {
    const encodedPath = encodeURIComponent(fromUrl.path);
    return `https://api.github.com/repos/${fromUrl.owner}/${fromUrl.repo}/commits?path=${encodedPath}&sha=${fromUrl.branch}&per_page=1`;
  }
  if (!source.repo || !source.path) {
    return null;
  }
  const branch = source.branch ?? "main";
  const encodedPath = encodeURIComponent(source.path);
  return `https://api.github.com/repos/${source.repo}/commits?path=${encodedPath}&sha=${branch}&per_page=1`;
}

function computeUpdateDiff(
  localSkills: PredefinedSkill[],
  remoteSkills: PredefinedSkill[],
): { added: PredefinedSkill[]; removed: PredefinedSkill[] } {
  const localHandles = new Set(localSkills.map((skill) => skill.handle));
  const remoteHandles = new Set(remoteSkills.map((skill) => skill.handle));
  const added = remoteSkills.filter((skill) => !localHandles.has(skill.handle));
  const removed = localSkills.filter((skill) => !remoteHandles.has(skill.handle));
  return { added, removed };
}

function parseGitHubUrl(
  url?: string,
): { owner: string; repo: string; branch: string; path: string } | null {
  if (!url) {
    return null;
  }
  const blobMatch = url.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/);
  if (blobMatch) {
    const [, owner, repo, branch, path] = blobMatch;
    return { owner, repo, branch, path };
  }
  const rawMatch = url.match(/^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/);
  if (rawMatch) {
    const [, owner, repo, branch, path] = rawMatch;
    return { owner, repo, branch, path };
  }
  return null;
}

function formatTimestampShort(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${min}`;
}

async function copyToClipboard(text: string): Promise<boolean> {
  const attempts: Array<string[]> = [
    ["pbcopy"],
    ["wl-copy"],
    ["xclip", "-selection", "clipboard"],
  ];
  for (const cmd of attempts) {
    try {
      const proc = Bun.spawn(cmd, { stdin: "pipe", stdout: "ignore", stderr: "ignore" });
      const writer = proc.stdin?.getWriter();
      if (!writer) {
        continue;
      }
      await writer.write(new TextEncoder().encode(text));
      await writer.close();
      const code = await proc.exited;
      if (code === 0) {
        return true;
      }
    } catch {
      // ignore and try next
    }
  }
  return false;
}

function getSkillDisplayLabel(skill: PredefinedSkill): string {
  return state.skillLabelCache[skill.handle] ?? skill.label ?? skill.handle;
}

function getSkillSourceLabel(skill: PredefinedSkill): string {
  if (skill.repo) {
    return skill.repo;
  }
  const source = state.predefinedSource;
  if (source?.repo) {
    return source.repo;
  }
  if (source?.url) {
    const parsed = parseGitHubUrl(source.url);
    if (parsed) {
      return `${parsed.owner}/${parsed.repo}`;
    }
    try {
      const url = new URL(source.url);
      if (url.hostname && url.pathname) {
        return `${url.hostname}${url.pathname}`;
      }
    } catch {
      // ignore
    }
    return source.url;
  }
  const parts = skill.handle.split("/");
  if (parts.length >= 2) {
    return `${parts[0]}/${parts[1]}`;
  }
  return "(unknown)";
}

function getSourceRepoRef(): string | null {
  const source = state.predefinedSource;
  if (source?.repo) {
    return source.repo;
  }
  if (source?.url) {
    const parsed = parseGitHubUrl(source.url);
    if (parsed) {
      return `${parsed.owner}/${parsed.repo}`;
    }
  }
  return null;
}

function getSourceRepoParts(): { owner: string; repo: string } | null {
  const ref = getSourceRepoRef();
  if (!ref) {
    return null;
  }
  const parts = ref.split("/");
  if (parts.length < 2) {
    return null;
  }
  return { owner: parts[0], repo: parts[1] };
}

function buildHandleFromSource(skillName: string): string {
  const parts = getSourceRepoParts();
  if (!parts) {
    return skillName;
  }
  if (parts.repo === "agent-resources") {
    return `${parts.owner}/${skillName}`;
  }
  return `${parts.owner}/${parts.repo}/${skillName}`;
}

function normalizeHandleForAgr(handle: string): string {
  const trimmed = handle.trim();
  if (!trimmed) {
    return trimmed;
  }
  if (trimmed.startsWith("./")) {
    const rest = trimmed.slice(2);
    return normalizeRelativeHandle(rest);
  }
  if (trimmed.startsWith("skills/") || trimmed.startsWith(".claude/skills/")) {
    return normalizeRelativeHandle(trimmed.replace(/^\.?claude\//, ""));
  }
  const segments = trimmed.split("/");
  if (segments.length > 3) {
    const skillName = segments[segments.length - 1];
    if (segments[1] === "agent-resources") {
      return `${segments[0]}/${skillName}`;
    }
    return `${segments[0]}/${segments[1]}/${skillName}`;
  }
  return trimmed;
}

function normalizeRelativeHandle(relative: string): string {
  const cleaned = relative.replace(/^\.?\/?/, "").replace(/^skills\//, "");
  const parts = cleaned.split("/").filter(Boolean);
  const skillName = parts[parts.length - 1] ?? cleaned;
  return buildHandleFromSource(skillName);
}

function handleVariants(handle: string): string[] {
  const variants = new Set<string>();
  const trimmed = handle.trim();
  if (!trimmed) {
    return [];
  }
  variants.add(trimmed);
  if (trimmed.startsWith("./")) {
    variants.add(trimmed.slice(2));
  }
  if (trimmed.startsWith(".claude/")) {
    variants.add(trimmed.replace(/^\.claude\//, ""));
  }
  if (trimmed.startsWith("skills/")) {
    variants.add(trimmed.replace(/^skills\//, ""));
  }
  const parts = trimmed.split("/");
  if (parts.length >= 3) {
    variants.add(parts.slice(2).join("/"));
  }
  if (trimmed.startsWith("skills/")) {
    variants.add(trimmed.replace(/^skills\//, ""));
  }
  const lastSegment = parts[parts.length - 1];
  const fromSource = buildHandleFromSource(lastSegment);
  variants.add(fromSource);
  const repo = getSourceRepoRef();
  if (repo) {
    for (const v of Array.from(variants)) {
      if (!v.includes("/")) {
        variants.add(buildHandleFromSource(v));
      } else if (!v.startsWith(repo + "/") && !v.startsWith("http")) {
        variants.add(`${repo}/${v}`);
      }
    }
  }
  return Array.from(variants);
}

function buildSkillMdUrls(skill: PredefinedSkill): string[] {
  const repoRef = skill.repo ?? getSkillSourceLabel(skill);
  if (!repoRef || repoRef === "(unknown)") {
    return [];
  }
  const handleParts = skill.handle.split("/");
  const tail = handleParts.length >= 3 ? handleParts.slice(2).join("/") : handleParts.slice(-1)[0] || skill.handle;
  const tailVariants = new Set<string>([
    tail,
    tail.replace(/:/g, "/"),
    tail.replace(/~/g, "/"),
  ]);
  const baseDirs = ["skills", ".claude/skills", ".github/skills", ".codex/skills", ""];
  const branches = ["main", "master"];
  const paths: string[] = [];
  for (const variant of tailVariants) {
    const trimmed = variant.replace(/^\/+|\/+$/g, "");
    if (!trimmed) {
      continue;
    }
    for (const base of baseDirs) {
      const prefix = base ? `${base}/${trimmed}` : trimmed;
      paths.push(`${prefix}/SKILL.md`);
      paths.push(`${prefix}/skill.md`);
    }
  }

  const repoInfo = parseRepoRef(repoRef);
  if (!repoInfo) {
    return [];
  }
  const urls: string[] = [];
  for (const branch of branches) {
    for (const path of paths) {
      if (repoInfo.host === "gitlab.com") {
        urls.push(`https://gitlab.com/${repoInfo.path}/-/raw/${branch}/${path}`);
      } else if (repoInfo.host === "bitbucket.org") {
        urls.push(`https://bitbucket.org/${repoInfo.path}/raw/${branch}/${path}`);
      } else {
        urls.push(`https://raw.githubusercontent.com/${repoInfo.path}/${branch}/${path}`);
      }
    }
  }
  return urls;
}

function parseRepoRef(repoRef: string): { host: string; path: string } | null {
  if (repoRef.includes("://")) {
    try {
      const url = new URL(repoRef);
      const host = url.host;
      const path = url.pathname.replace(/^\/+|\/+$/g, "");
      if (!host || !path) {
        return null;
      }
      return { host, path };
    } catch {
      return null;
    }
  }
  if (repoRef.includes("/")) {
    return { host: "github.com", path: repoRef };
  }
  return null;
}

function extractSkillName(text: string): string | null {
  const frontmatter = text.match(/^---\s*[\r\n]+([\s\S]*?)\r?\n---/);
  if (frontmatter) {
    const nameMatch = frontmatter[1].match(/^\s*name\s*:\s*(.+)\s*$/m);
    if (nameMatch) {
      const value = nameMatch[1].trim();
      return value.replace(/^"(.*)"$/, "$1");
    }
  }
  const headingMatch = text.match(/^#\s+(.+)\s*$/m);
  if (headingMatch) {
    return headingMatch[1].trim();
  }
  return null;
}

async function resolveSkillLabel(skill: PredefinedSkill): Promise<void> {
  const handle = skill.handle;
  if (!handle || state.skillLabelCache[handle] || state.skillLabelPending.has(handle)) {
    return;
  }
  state.skillLabelPending.add(handle);
  const urls = buildSkillMdUrls(skill);
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        continue;
      }
      const text = await res.text();
      const name = extractSkillName(text);
      if (name) {
        state.skillLabelCache[handle] = name;
        state.skillLabelPending.delete(handle);
        renderList();
        renderDetails();
        return;
      }
    } catch {
      // ignore and try next URL
    }
  }
  state.skillLabelPending.delete(handle);
}

async function checkUpdates(): Promise<void> {
  const source = getSkillsSource();
  const rawUrl = buildRawUrl(source);
  if (!rawUrl) {
    state.updateError = "No source URL configured";
    state.updateCheckedAt = new Date().toISOString();
    logEvent("Update check skipped: no source URL configured");
    renderList();
    renderDetails();
    return;
  }
  state.updateInProgress = true;
  logEvent(`Update check started: ${rawUrl}`);
  setStatus("Checking for skill updates...");
  state.updateError = null;
  state.updateCheckedAt = null;
  state.updateCommit = null;
  try {
    const commitUrl = buildCommitApiUrl(source);
    if (commitUrl) {
      const commitRes = await fetch(commitUrl, {
        headers: { Accept: "application/vnd.github+json" },
      });
      if (commitRes.ok) {
        const commits = (await commitRes.json()) as Array<{ sha?: string; commit?: { author?: { date?: string } } }>;
        const latest = commits[0];
        if (latest?.sha) {
          state.updateCommit = latest.sha;
        }
      }
    }

    const res = await fetch(rawUrl);
    if (!res.ok) {
      state.updateError = `Fetch failed (${res.status})`;
      state.updateCheckedAt = new Date().toISOString();
      state.updateAvailable = false;
      state.updateCandidates = [];
      state.updateRemoved = [];
      setStatus("Update check failed");
      state.updateInProgress = false;
      logEvent(`Update check failed: fetch ${res.status}`);
      renderAll();
      return;
    }
    const text = await res.text();
    let remoteSkills: PredefinedSkill[] = [];
    if (source.format === "agr-toml") {
      remoteSkills = normalizeSkillsFromAgrToml(text);
      logEvent(`Parsed agr.toml skills: ${remoteSkills.length}`);
    } else {
      const parsed = JSON.parse(text) as unknown;
      if (Array.isArray(parsed)) {
        remoteSkills = normalizeSkills(parsed as Array<string | PredefinedSkill>);
      } else if (parsed && typeof parsed === "object") {
        const obj = parsed as SkillsFile;
        if (!Array.isArray(obj.skills)) {
          state.updateError = "Remote skills.json missing skills array";
          state.updateCheckedAt = new Date().toISOString();
          state.updateAvailable = false;
          state.updateCandidates = [];
          state.updateRemoved = [];
          setStatus("Update check failed");
          state.updateInProgress = false;
          logEvent("Update check failed: remote skills.json missing skills array");
          renderAll();
          return;
        }
        remoteSkills = normalizeSkills(obj.skills);
      } else {
        state.updateError = "Remote skills.json invalid format";
        state.updateCheckedAt = new Date().toISOString();
        state.updateAvailable = false;
        state.updateCandidates = [];
        state.updateRemoved = [];
        setStatus("Update check failed");
        state.updateInProgress = false;
        logEvent("Update check failed: remote skills.json invalid format");
        renderAll();
        return;
      }
    }

    const diff = computeUpdateDiff(state.predefined, remoteSkills);
    state.updateRemote = remoteSkills;
    state.updateCandidates = diff.added;
    state.updateRemoved = diff.removed;
    state.updateAvailable = diff.added.length > 0 || diff.removed.length > 0;
    state.updateCheckedAt = new Date().toISOString();
    if (remoteSkills.length === 0) {
      state.updateError = "No skills found in source";
    }
    setStatus(state.updateAvailable ? "Updates available" : "No updates found", { clearAfterMs: 2500 });
    state.updateInProgress = false;
    logEvent(
      `Update check complete: added=${state.updateCandidates.length} removed=${state.updateRemoved.length} available=${state.updateAvailable}`,
    );
    renderAll();
  } catch (error) {
    state.updateError = error instanceof Error ? error.message : "Update check failed";
    state.updateCheckedAt = new Date().toISOString();
    state.updateAvailable = false;
    state.updateCandidates = [];
    state.updateRemoved = [];
    setStatus("Update check failed");
    state.updateInProgress = false;
    logEvent(`Update check failed: ${String(error)}`);
    renderAll();
  }
}

function writeSkillsFile(skills: PredefinedSkill[], source: SkillsSource | null): void {
  const path = join(process.cwd(), "skills.json");
  if (state.predefinedFormat === "array" && !source) {
    const payload = skills.map((skill) => skill.handle);
    writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
    return;
  }
  const payload: SkillsFile = {
    source: source ? normalizeSource(source) : undefined,
    skills: skills.map((skill) => {
      const entry: PredefinedSkill = { label: skill.label, handle: skill.handle };
      if (skill.repo) {
        entry.repo = skill.repo;
      }
      return entry;
    }),
  };
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
}

async function applyUpdates(): Promise<void> {
  if (!state.updateAvailable) {
    return;
  }
  const now = new Date().toISOString();
  const source = state.predefinedSource
    ? { ...state.predefinedSource, lastCommit: state.updateCommit ?? state.predefinedSource.lastCommit, lastChecked: now }
    : null;
  writeSkillsFile(state.updateRemote, source);
  loadPredefined();
  setStatus("skills.json updated", { clearAfterMs: 2500 });
  renderAll();
}

async function applyUpdatesAndSync(): Promise<void> {
  if (!state.updateAvailable) {
    return;
  }
  await applyUpdates();
  await runCommand(["uv", "run", "agr", "sync"]);
  await loadData();
}

function getVisibleItems(): Array<Dependency | PredefinedSkill> {
  if (getActiveTab() === "Discover") {
    return filterInstalledPredefined(getPredefinedSkills());
  }
  if (getActiveTab() === "Updates") {
    return getUpdateSkills();
  }
  return getDependencies();
}

function clampSelection(): void {
  const visible = getVisibleItems();
  if (visible.length === 0) {
    state.selectedIndex = 0;
    return;
  }
  if (state.selectedIndex < 0) {
    state.selectedIndex = 0;
  }
  if (state.selectedIndex >= visible.length) {
    state.selectedIndex = visible.length - 1;
  }
}

function selectedDependency(): Dependency | null {
  if (getActiveTab() === "Discover" || getActiveTab() === "Updates") {
    return null;
  }
  const visible = getVisibleItems() as Dependency[];
  if (visible.length === 0) {
    return null;
  }
  return visible[state.selectedIndex] ?? null;
}

function selectedPredefined(): PredefinedSkill | null {
  if (getActiveTab() !== "Discover") {
    return null;
  }
  const visible = getVisibleItems() as PredefinedSkill[];
  if (visible.length === 0) {
    return null;
  }
  return visible[state.selectedIndex] ?? null;
}

function selectedUpdate(): PredefinedSkill | null {
  if (getActiveTab() !== "Updates") {
    return null;
  }
  const visible = getVisibleItems() as PredefinedSkill[];
  if (visible.length === 0) {
    return null;
  }
  return visible[state.selectedIndex] ?? null;
}

function isSelected(dep: Dependency): boolean {
  return state.selectedIds.has(dep.identifier);
}

function renderList(): void {
  const tab = getActiveTab();
  const visible = getVisibleItems();
  clampSelection();
  let nameCounts: Record<string, number> | null = null;
  if (tab === "Discover") {
    nameCounts = {};
    for (const item of visible) {
      const skill = item as PredefinedSkill;
      const name = getSkillDisplayLabel(skill);
      nameCounts[name] = (nameCounts[name] ?? 0) + 1;
    }
  }
  for (let i = 0; i < listLines.length; i += 1) {
    const item = visible[i];
    if (!item) {
      if (i === 0 && tab === "Updates") {
        if (state.updateError) {
          listLines[i].content = "Update check failed.";
          listLines[i].fg = colors.warn;
        } else if (!state.updateCheckedAt) {
          listLines[i].content = "Press u to check updates.";
          listLines[i].fg = colors.dim;
        } else if (!state.updateAvailable) {
          listLines[i].content = "No updates available.";
          listLines[i].fg = colors.dim;
        } else {
          if (state.updateCandidates.length === 0 && state.updateRemoved.length > 0) {
            listLines[i].content = "Updates available (removals only).";
            listLines[i].fg = colors.highlight;
          } else {
            listLines[i].content = "Updates available below.";
            listLines[i].fg = colors.highlight;
          }
        }
      } else {
        listLines[i].content = "";
      }
      continue;
    }
    const marker = i === state.selectedIndex ? ">" : " ";
    if (tab === "Discover" || tab === "Updates") {
      const skill = item as PredefinedSkill;
      void resolveSkillLabel(skill);
      const displayLabel = getSkillDisplayLabel(skill);
      if (tab === "Discover") {
        const count = nameCounts?.[displayLabel] ?? 0;
        if (count > 1) {
          listLines[i].content = `${marker} ${displayLabel} - ${getSkillSourceLabel(skill)}`;
        } else {
          listLines[i].content = `${marker} ${displayLabel}`;
        }
      } else {
        listLines[i].content = `${marker} ${displayLabel}`;
      }
      if (tab === "Updates") {
        listLines[i].fg = state.updateError ? colors.warn : colors.accent;
      } else {
        listLines[i].fg = colors.text;
      }
    } else {
      const dep = item as Dependency;
      const status = dep.installed ? "*" : " ";
      const multi = isSelected(dep) ? "+" : " ";
      listLines[i].content = `${marker}${multi} [${status}] ${dep.identifier}`;
      listLines[i].fg = dep.installed ? colors.accent : colors.text;
    }
  }
}

function renderDetails(): void {
  const dep = selectedDependency();
  const predefined = selectedPredefined();
  const update = selectedUpdate();
  const tab = getActiveTab();
  const lines: string[] = [];
  if (tab === "Updates") {
    if (state.updateError) {
      lines.push(`Update error: ${state.updateError}`);
      lines.push("Edit skills.json source to fix.");
      if (state.predefined.length > 0) {
        lines.push("Using cached skills.json list.");
      }
    } else if (!state.updateCheckedAt) {
      lines.push("Press u to check for updates.");
      lines.push("Updates compare skills.json with the remote list.");
    } else if (!state.updateAvailable) {
      lines.push("No updates available.");
      lines.push(`Last checked: ${state.updateCheckedAt}`);
    } else {
      const addedCount = state.updateCandidates.length;
      const removedCount = state.updateRemoved.length;
      lines.push("Update available.");
      lines.push(`Added: ${addedCount} | Removed: ${removedCount}`);
      if (state.updateCommit) {
        lines.push(`Remote commit: ${state.updateCommit.slice(0, 8)}`);
      }
      if (update) {
        lines.push("");
        lines.push(`Selected: ${getSkillDisplayLabel(update)}`);
        lines.push(`Source: ${getSkillSourceLabel(update)}`);
        lines.push(`Handle: ${update.handle}`);
        if (update.repo) {
          lines.push(`Repo: ${update.repo}`);
        }
      }
      if (removedCount > 0) {
        lines.push("");
        lines.push("Removed skills:");
        lines.push(...state.updateRemoved.slice(0, 4).map((skill) => `- ${skill.handle}`));
      }
      lines.push("");
      lines.push("Press U to update skills.json.");
    }
  } else if (tab === "Discover") {
    if (state.predefinedError) {
      lines.push(`Discover list error: ${state.predefinedError}`);
      lines.push("Edit skills.json to fix.");
    } else if (!predefined) {
      lines.push("No skills in Discover.");
      const total = state.predefined.length;
      const visible = filterInstalledPredefined(state.predefined).length;
      if (total > 0 && visible === 0) {
        lines.push("All discover skills are already installed.");
      } else if (state.updateInProgress) {
        lines.push("Loading discover list...");
      } else if (state.predefinedSource?.url || state.predefinedSource?.repo) {
        lines.push("Waiting for discover list to load...");
      } else {
        lines.push("Add entries to skills.json.");
      }
    } else {
      const displayLabel = getSkillDisplayLabel(predefined);
      lines.push(`Name: ${displayLabel}`);
      lines.push(`Source: ${getSkillSourceLabel(predefined)}`);
      if (displayLabel !== predefined.handle) {
        lines.push(`Handle: ${predefined.handle}`);
      }
      if (predefined.repo) {
        lines.push(`Repo: ${predefined.repo}`);
      }
      lines.push("");
      lines.push("Press i to add this skill.");
    }
  } else if (!state.data) {
    lines.push("Loading configuration...");
  } else if (!dep) {
    lines.push("No skills in agr.toml.");
  } else {
    lines.push(`Selected: ${dep.identifier}`);
    lines.push(`Installed: ${dep.installed ? "yes" : "no"}`);
    lines.push(`Source: ${dep.is_local ? "local" : "remote"}`);
    if (dep.handle) {
      lines.push(`Handle: ${dep.handle}`);
    }
    if (dep.path) {
      lines.push(`Path: ${dep.path}`);
    }
    lines.push("");
    if (tab === "Skills") {
      lines.push("Skills shows skills in agr.toml + install state.");
    }

    if (tab !== "Discover" && tab !== "Updates" && dep && state.data?.installed) {
      const toolLines: string[] = [];
      const candidatesByTool = dep.candidates_by_tool ?? {};
      for (const toolName of state.data.tools) {
        const installed = state.data.installed[toolName] ?? [];
        const candidates = candidatesByTool[toolName] ?? [];
        const match = candidates.find((name) => installed.includes(name));
        if (match) {
          toolLines.push(`${toolName}: ${match}`);
        } else {
          toolLines.push(`${toolName}: not installed`);
        }
      }
      if (toolLines.length > 0) {
        lines.push("");
        lines.push("Install paths:");
        lines.push(...toolLines.slice(0, 5));
      }
    }
  }

  for (let i = 0; i < detailLines.length; i += 1) {
    const content = lines[i] ?? "";
    detailLines[i].content = content;
    if (content.startsWith("Status:")) {
      if (content.includes("OK")) {
        detailLines[i].fg = colors.accent;
      } else if (content.includes("not found")) {
        detailLines[i].fg = colors.warn;
      } else {
        detailLines[i].fg = colors.text;
      }
    } else if (content.startsWith("Selected:") || content.startsWith("Name:")) {
      detailLines[i].fg = colors.highlight;
    } else if (content.startsWith("Installed:")) {
      detailLines[i].fg = content.includes("yes") ? colors.accent : colors.warn;
    } else if (content.startsWith("Handle:")) {
      detailLines[i].fg = colors.accent;
    } else if (content.startsWith("Discover list error:") || content.startsWith("Update error:")) {
      detailLines[i].fg = colors.warn;
    } else {
      detailLines[i].fg = colors.text;
    }
  }
}

function renderActions(): void {
  const tab = getActiveTab();
  const toolName = state.data?.tools[state.toolIndex] ?? "";
  const lines: string[] = [];
  lines.push("i: install");
  lines.push("r: remove");
  lines.push("space: toggle select");
  lines.push("v: show SKILL");
  lines.push("g: run");
  lines.push("G: run options");
  lines.push("a: add skill");
  lines.push("T: test popup");
  lines.push("c: reload config");
  lines.push("H: help");
  lines.push("Tab: next panel");
  lines.push("Arrow keys: move");
  lines.push("q: quit");

  if (tab === "Discover") {
    lines.push("i: add selected");
  } else if (tab === "Updates") {
    lines.push("u: check updates");
    lines.push("U: apply update (no confirm)");
    lines.push("s: apply (confirm)");
    lines.push("S: apply + sync (no confirm)");
  }
  if (tab === "Discover" || tab === "Updates") {
    lines.push("y: copy handle/repo");
  }
  lines.push("[/]: preview scroll");

  if (state.inputMode !== "none") {
    lines.push("");
    lines.push(`Input: ${state.inputBuffer}`);
    lines.push("Enter: submit");
    lines.push("Esc: cancel");
  }

  for (let i = 0; i < actionLines.length; i += 1) {
    const content = lines[i] ?? "";
    actionLines[i].content = content;
    if (!content) {
      actionLines[i].fg = colors.text;
    } else if (content.endsWith(":")) {
      actionLines[i].fg = colors.highlight;
    } else {
      actionLines[i].fg = colors.text;
    }
  }

}

function renderFooter(): void {
  if (rendererDestroyed || (footerStatus as any).isDestroyed || (footerHint as any).isDestroyed) {
    return;
  }
  footerStatus.content = state.updateInProgress ? "Loading discover list..." : state.status;
  const hints: string[] = [];
  if (state.confirmUpdateOpen) {
    hints.push("Update pending: y apply, s apply+sync, n/Esc cancel");
  } else if (state.inputMode === "add") {
    hints.push("Add mode: enter handle/path, Enter to add, Esc to cancel");
  } else if (state.inputMode === "prompt") {
    hints.push("Prompt mode: Enter to run, Esc to cancel");
  } else if (state.inputMode === "args") {
    hints.push("Args mode: Enter to set extra args, Esc to cancel");
  } else {
    hints.push("Press Tab to switch panels. Press q to exit.");
  }
  if (state.lastCommand) {
    hints.push(`Last: ${state.lastCommand}`);
  }
  footerHint.content = hints.join(" | ");
}

function renderAll(): void {
  renderTabs();
  renderList();
  renderDetails();
  renderActions();
  renderFooter();
  renderHelp();
  renderPreviewModal();
  renderMissingConfig();
  renderVerifyModal();
  renderRunOptions();
  renderUpdateConfirm();
  renderRunModal();
  renderer.requestRender();
}

function renderHelp(): void {
  if (!state.helpOpen) {
    helpOverlay.visible = false;
    return;
  }
  helpOverlay.visible = true;
  const tab = getActiveTab();
  helpTitle.content = `${tab} Help`;
  const lines: string[] = [];
  if (tab === "Skills") {
    lines.push("Skills shows skills in agr.toml with status.");
    lines.push("Press v to preview SKILL.md.");
    lines.push("Press g to run selected.");
    lines.push("Press G to edit run options.");
    lines.push("Press T to test the run popup.");
  } else if (tab === "Discover") {
    lines.push("Discover lists skills from skills.json.");
    lines.push("Select one and press i to add it.");
    lines.push("Edit skills.json to change the source.");
  } else if (tab === "Updates") {
    lines.push("Updates checks for changes to skills.json.");
    lines.push("Press u to check the remote list.");
    lines.push("Press U to apply updates immediately.");
    lines.push("Press s to review before applying.");
    lines.push("Press S to apply updates and run agr sync.");
    lines.push("Press y to copy handle/repo.");
  }
  while (lines.length < helpLines.length) {
    lines.push("");
  }
  for (let i = 0; i < helpLines.length; i += 1) {
    helpLines[i].content = lines[i] ?? "";
  }
}

function renderPreviewModal(): void {
  if (!state.previewOpen) {
    previewOverlay.visible = false;
    return;
  }
  previewOverlay.visible = true;
  const dep = selectedDependency();
  previewTitle.content = dep ? `SKILL.md: ${dep.identifier}` : "SKILL.md";
  const lines = state.previewAll.length > 0 ? state.previewAll : ["No SKILL.md found."];
  const start = state.previewOffset;
  const slice = lines.slice(start, start + 9);
  previewText.setText(slice.join("\n"));
}

function renderRunOptions(): void {
  if (!state.runOptionsOpen) {
    runOptionsOverlay.visible = false;
    return;
  }
  runOptionsOverlay.visible = true;
  const dep = selectedDependency();
  runOptionsSkill.content = dep ? `Skill: ${dep.identifier}` : "Skill: (none)";
  const toolName = state.data?.tools[state.toolIndex] ?? "(none)";
  runOptionsTool.content = `Tool: ${toolName}`;
  runOptionsInteractive.content = `Interactive: ${state.interactive ? "on" : "off"}`;
  runOptionsPrompt.content = `Prompt: ${state.promptBuffer || "(none)"}`;
  runOptionsArgs.content = `Args: ${state.argsBuffer || "(none)"}`;
}

function renderMissingConfig(): void {
  if (!state.missingConfigOpen) {
    missingConfigOverlay.visible = false;
    return;
  }
  missingConfigOverlay.visible = true;
  missingConfigLine1.content = "agr.toml not found in current directory.";
  missingConfigLine2.content = "Run this binary from a repo that has agr.toml.";
}

function renderVerifyModal(): void {
  if (!state.verifyOpen) {
    verifyOverlay.visible = false;
    return;
  }
  verifyOverlay.visible = true;
  const wrapped = wrapText(state.verifyMessage, 64);
  verifyLine.content = wrapped[0] ?? "";
  verifyLine2.content = wrapped[1] ?? "";
  const details = state.verifyDetails ?? [];
  const list: string[] = [];
  for (const item of details) {
    const wrappedItem = wrapText(item, 60);
    if (wrappedItem.length === 0) {
      continue;
    }
    list.push(`- ${wrappedItem[0]}`);
    for (const extra of wrappedItem.slice(1)) {
      list.push(`  ${extra}`);
    }
  }
  if (list.length > verifyListLines.length) {
    const remaining = list.length - (verifyListLines.length - 1);
    list.length = verifyListLines.length - 1;
    list.push(`... +${remaining} more`);
  }
  for (let i = 0; i < verifyListLines.length; i += 1) {
    verifyListLines[i].content = list[i] ?? "";
  }
}

function renderUpdateConfirm(): void {
  if (!state.confirmUpdateOpen) {
    updateOverlay.visible = false;
    return;
  }
  updateOverlay.visible = true;
  const addedCount = state.updateCandidates.length;
  const removedCount = state.updateRemoved.length;
  updateBody.content = `Add ${addedCount} and remove ${removedCount} skills.`;
  if (state.predefinedSource?.repo) {
    updateBody2.content = `Source: ${state.predefinedSource.repo}`;
  } else if (state.predefinedSource?.url) {
    updateBody2.content = `Source: ${state.predefinedSource.url}`;
  } else {
  updateBody2.content = "Source: skills.json (local)";
  }
}

function renderRunModal(): void {
  if (!state.busy && !state.runTestOpen) {
    runOverlay.visible = false;
    return;
  }
  runOverlay.visible = true;
  const cmdText = state.runTestOpen
    ? "uv run agr add kasperjunge/agent-resources/development/workflow/code-review"
    : state.lastCommand
      ? state.lastCommand
      : "Running...";
  let handleText = "";
  if (state.runTestOpen) {
    handleText = "kasperjunge/agent-resources/development/workflow/code-review";
  } else {
    const match = state.lastCommand.match(/\bagr\s+(add|remove)\s+(.+)$/);
    if (match) {
      handleText = match[2];
    }
  }
  const text = handleText
    ? `Cmd:\n${cmdText}\n\nHandle:\n${handleText}\n\ncwd:\n${process.cwd()}\n\nPlease wait...`
    : `Cmd:\n${cmdText}\n\ncwd:\n${process.cwd()}\n\nPlease wait...`;
  runText.setText(text);
}

function showToast(message: string, durationMs = 2000): void {
  const wrapped = wrapText(message, 28);
  toastText.content = wrapped[0] ?? message;
  toastOverlay.visible = true;
  renderer.requestRender();
  setTimeout(() => {
    toastOverlay.visible = false;
    renderer.requestRender();
  }, durationMs);
}

function setStatus(message: string, options?: { clearAfterMs?: number }): void {
  if (rendererDestroyed) {
    return;
  }
  state.status = message;
  state.statusToken += 1;
  const token = state.statusToken;
  renderFooter();
  renderer.requestRender();
  if (options?.clearAfterMs) {
    setTimeout(() => {
      if (rendererDestroyed) {
        return;
      }
      if (state.statusToken !== token || state.busy) {
        return;
      }
      state.status = "Ready";
      renderFooter();
      renderer.requestRender();
    }, options.clearAfterMs);
  }
}

async function runCommand(args: string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  state.busy = true;
  state.lastCommand = args.join(" ");
  renderRunModal();
  setStatus(`Running: ${state.lastCommand}`);
  const cwd = process.cwd();
  const isAgr = args[0] === "uv" && (args[2] === "agr" || args[2] === "agrx");
  const agrSub = args[3] ?? "";
  const needsConfig = args[2] === "agr" && ["add", "remove", "sync"].includes(agrSub);
  if (isAgr && needsConfig) {
    const configPath = join(cwd, "agr.toml");
    if (!existsSync(configPath)) {
      state.busy = false;
      state.missingConfig = true;
      setStatus("Error: agr.toml missing in current directory");
      showToast("Missing agr.toml");
      logEvent("Run blocked: missing agr.toml");
      renderRunModal();
      return { exitCode: 1, stdout: "", stderr: "missing agr.toml" };
    }
  }
  logEvent(`Run command: ${state.lastCommand} (cwd=${cwd})`);
  const env = {
    ...process.env,
    UV_CACHE_DIR: process.env.UV_CACHE_DIR ?? "/tmp/uv-cache",
  };
  let proc: ReturnType<typeof Bun.spawn>;
  try {
    proc = Bun.spawn(args, { stdout: "pipe", stderr: "pipe", cwd, env });
  } catch (error) {
    state.busy = false;
    state.lastExit = 127;
    const message = error instanceof Error ? error.message : String(error);
    setStatus(`Command failed (spawn): ${message}`);
    return { exitCode: 127, stdout: "", stderr: message };
  }
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  state.busy = false;
  state.lastExit = exitCode;
  renderRunModal();
  if (exitCode === 0) {
    setStatus("Done");
  } else {
    showToast(`Command failed (${exitCode})`);
    const stderrLower = stderr.toLowerCase();
    if (stderrLower.includes("uv") && stderrLower.includes("not found")) {
      setStatus("Command failed: uv not found (install uv or update PATH) (press c to retry)");
    } else if (stderrLower.includes("python") && stderrLower.includes("not found")) {
      setStatus("Command failed: python not found (install Python or update PATH) (press c to retry)");
    } else if (stderrLower.includes("agr") && stderrLower.includes("not found")) {
      setStatus("Command failed: agr not found (install agr or update PATH) (press c to retry)");
    } else {
      setStatus(`Command failed (${exitCode})`);
    }
    const stderrLine = stderr.trim().split(/\r?\n/).slice(-1)[0];
    if (stderrLine) {
      openVerify(`Command error: ${stderrLine}`);
    }
  }
  if (stderr.trim()) {
    logEvent(`Command stderr: ${stderr.trim().slice(0, 400)}`);
  }
  if (stdout.trim() && isAgr) {
    logEvent(`Command stdout: ${stdout.trim().slice(0, 400)}`);
  }
  return { exitCode, stdout, stderr };
}

async function loadData(): Promise<void> {
  try {
    loadPredefined();
    renderList();
    renderDetails();
    if (state.predefinedSource?.url || state.predefinedSource?.repo) {
      const lastChecked = state.predefinedSource?.lastChecked
        ? new Date(state.predefinedSource.lastChecked).getTime()
        : 0;
      const now = Date.now();
      const sixHoursMs = 6 * 60 * 60 * 1000;
      if (!lastChecked || Number.isNaN(lastChecked) || now - lastChecked > sixHoursMs) {
        setStatus("Loading discover list...");
        await checkUpdates();
        if (state.updateRemote.length > 0) {
          writeSkillsFile(state.updateRemote, state.predefinedSource);
          loadPredefined();
          renderList();
          renderDetails();
          setStatus("Discover list updated", { clearAfterMs: 2500 });
        } else {
          setStatus("Discover list up to date", { clearAfterMs: 2500 });
        }
      }
    }
    const configPath = join(process.cwd(), "agr.toml");
    state.missingConfig = !existsSync(configPath);
    if (state.missingConfig) {
      setStatus("Warning: no agr.toml in current directory");
      state.missingConfigOpen = true;
    }
    setStatus("Loading configuration...");
    const result = await runCommand(["uv", "run", "python", "-m", "agr_opentui.bridge"]);
    if (result.exitCode !== 0) {
      const errorLine = result.stderr.trim().split(/\r?\n/).slice(-1)[0];
      const message = errorLine ? `Failed to load config: ${errorLine}` : "Failed to load config";
      setStatus(`${message} (press c to retry)`);
      return;
    }
    state.data = JSON.parse(result.stdout) as BridgeData;
    state.toolIndex = 0;
    state.installedOverrides.clear();
    setStatus("Config loaded", { clearAfterMs: 2500 });
    renderAll();
    await refreshPreview();
  } catch (error) {
    setStatus(`Bridge error: ${String(error)} (press c to retry)`);
  }
}

async function installSelected(): Promise<void> {
  const dep = selectedDependency();
  if (!dep) {
    return;
  }
  if (state.missingConfig) {
    showToast("Missing agr.toml in current directory");
    setStatus("Error: agr.toml missing in current directory");
    state.missingConfigOpen = true;
    renderMissingConfig();
    return;
  }
  const target = normalizeHandleForAgr(dep.handle ?? dep.identifier);
  let result = await runCommand(["uv", "run", "agr", "add", target]);
  if (result.exitCode !== 0 && commandReportedExists(`${result.stdout}\n${result.stderr}`)) {
    setStatus("Skill exists; retrying with --overwrite");
    result = await runCommand(["uv", "run", "agr", "add", "--overwrite", target]);
  }
  await loadData();
  if (result.exitCode === 0) {
    verifyAgrTomlContains(target, "install");
  }
}

async function addPredefinedSelected(): Promise<void> {
  const skill = selectedPredefined();
  if (!skill) {
    return;
  }
  logEvent(`Discover install requested: ${skill.handle}`);
  const target = skill.repo ?? normalizeHandleForAgr(skill.handle);
  setStatus(`Installing: ${target}`);
  let result = await runCommand(["uv", "run", "agr", "add", target]);
  if (result.exitCode !== 0 && commandReportedExists(`${result.stdout}\n${result.stderr}`)) {
    setStatus("Skill exists; retrying with --overwrite");
    result = await runCommand(["uv", "run", "agr", "add", "--overwrite", target]);
  }
  if (result.exitCode === 0) {
    state.installedOverrides.add(skill.handle.toLowerCase());
    showToast(`Installed ${getSkillDisplayLabel(skill)}`);
  }
  state.predefined = state.predefined.filter((item) => item.handle !== skill.handle);
  renderList();
  renderDetails();
  renderActions();
  await loadData();
  verifyAgrTomlContains(target, "install");
  const skillsPath = join(process.cwd(), "skills.json");
  if (existsSync(skillsPath)) {
    const raw = readFileSync(skillsPath, "utf-8");
    const variants = handleVariants(target).concat(handleVariants(skill.handle));
    const found = variants.some((v) => raw.includes(v));
    if (!found) {
      openVerify("skills.json missing handle:", [target]);
      logEvent(`Install check: skills.json missing ${target}`);
    }
  }
  renderList();
  renderDetails();
  renderActions();
}

async function removeSelected(): Promise<void> {
  const dep = selectedDependency();
  if (!dep) {
    return;
  }
  if (state.missingConfig) {
    showToast("Missing agr.toml in current directory");
    setStatus("Error: agr.toml missing in current directory");
    state.missingConfigOpen = true;
    renderMissingConfig();
    return;
  }
  const target = normalizeHandleForAgr(dep.handle ?? dep.identifier);
  const result = await runCommand(["uv", "run", "agr", "remove", target]);
  await loadData();
  if (result.exitCode === 0) {
    if (!commandReportedRemoved(result.stdout)) {
      openVerify("agr did not report a remove.");
      logEvent("Remove check: stdout missing 'Removed:' line");
    } else {
      verifyAgrTomlMissing(target, "remove");
    }
  }
}

async function syncAll(): Promise<void> {
  if (state.missingConfig) {
    showToast("Missing agr.toml in current directory");
    setStatus("Error: agr.toml missing in current directory");
    state.missingConfigOpen = true;
    renderMissingConfig();
    return;
  }
  const result = await runCommand(["uv", "run", "agr", "sync"]);
  await loadData();
  if (getActiveTab() === "Discover") {
    renderList();
    renderDetails();
    renderActions();
  }
  if (result.exitCode === 0) {
    verifyAgrTomlHasAny("sync");
  }
}

async function runSelected(): Promise<void> {
  const dep = selectedDependency();
  if (!dep) {
    return;
  }
  const tool = state.data?.tools[state.toolIndex];
  const args = ["uv", "run", "agrx", dep.identifier];
  if (state.promptBuffer) {
    args.push("--prompt", state.promptBuffer);
  }
  if (tool) {
    args.push("--tool", tool);
  }
  if (state.interactive) {
    args.push("--interactive");
  }
  if (state.argsBuffer) {
    args.push(...parseArgs(state.argsBuffer));
  }
  await runCommand(args);
}

function cycleTool(): void {
  const tools = state.data?.tools ?? [];
  if (tools.length === 0) {
    return;
  }
  state.toolIndex = (state.toolIndex + 1) % tools.length;
}

function enterInputMode(mode: InputMode, seed = ""): void {
  state.inputMode = mode;
  state.inputBuffer = seed;
  if (mode === "add") {
    addOverlay.visible = true;
    addInput.value = seed;
    addInput.focus();
  }
  renderActions();
  renderFooter();
}

function exitInputMode(): void {
  const prevMode = state.inputMode;
  state.inputMode = "none";
  state.inputBuffer = "";
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
    if (value) {
      if (looksLikeHandle(value) && !hasKnownHandle(value)) {
        showToast("Handle not found in source list");
        return;
      }
      let result = await runCommand(["uv", "run", "agr", "add", value]);
      if (result.exitCode !== 0 && commandReportedExists(`${result.stdout}\n${result.stderr}`)) {
        setStatus("Skill exists; retrying with --overwrite");
        result = await runCommand(["uv", "run", "agr", "add", "--overwrite", value]);
      }
      await loadData();
    }
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
  }
}

function handleInputChar(sequence: string): void {
  if (sequence === "\x7f" || sequence === "\b") {
    state.inputBuffer = state.inputBuffer.slice(0, -1);
  } else if (sequence === "\r" || sequence === "\n") {
    void handleInputSubmit();
    return;
  } else if (sequence === "\x1b") {
    exitInputMode();
    return;
  } else if (sequence.length === 1 && sequence >= " " && sequence <= "~") {
    state.inputBuffer += sequence;
  }
  renderActions();
  renderFooter();
}

function moveSelection(delta: number): void {
  const visible = getVisibleItems();
  if (visible.length === 0) {
    return;
  }
  state.selectedIndex = Math.max(0, Math.min(visible.length - 1, state.selectedIndex + delta));
  renderList();
  renderDetails();
  void refreshPreview();
}

function scrollPreview(delta: number): void {
  if (state.previewAll.length === 0) {
    return;
  }
  const maxOffset = Math.max(0, state.previewAll.length - 8);
  state.previewOffset = Math.max(0, Math.min(maxOffset, state.previewOffset + delta));
  renderDetails();
}

function parseArgs(input: string): string[] {
  const args: string[] = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;
  let escape = false;

  for (const ch of input) {
    if (escape) {
      current += ch;
      escape = false;
      continue;
    }
    if (ch === "\\\\") {
      escape = true;
      continue;
    }
    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      continue;
    }
    if (ch === "\"" && !inSingle) {
      inDouble = !inDouble;
      continue;
    }
    if (!inSingle && !inDouble && /\s/.test(ch)) {
      if (current) {
        args.push(current);
        current = "";
      }
      continue;
    }
    current += ch;
  }

  if (current) {
    args.push(current);
  }
  return args;
}

function wrapText(text: string, width: number): string[] {
  if (width <= 0) {
    return [text];
  }
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (!current) {
      current = word;
      continue;
    }
    if (current.length + 1 + word.length <= width) {
      current += ` ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) {
    lines.push(current);
  }
  return lines.length > 0 ? lines : [text];
}

function openVerify(message: string, details: string[] = []): void {
  state.verifyMessage = message;
  state.verifyDetails = details;
  state.verifyOpen = true;
  renderVerifyModal();
}

function normalizeHandle(handle: string): string {
  return handle.trim().toLowerCase();
}

function readAgrToml(): string | null {
  const path = join(process.cwd(), "agr.toml");
  if (!existsSync(path)) {
    return null;
  }
  return readFileSync(path, "utf-8");
}

function verifyAgrTomlContains(handle: string, label: string): void {
  const text = readAgrToml();
  if (!text) {
    openVerify("agr.toml is missing after command.");
    logEvent(`Verify ${label}: agr.toml missing`);
    return;
  }
  const variants = handleVariants(handle);
  const found = variants.some((v) => text.includes(v));
  if (!found) {
    openVerify("agr.toml missing handle:", [handle]);
    logEvent(`Verify ${label}: handle not found (${handle})`);
  }
}

function verifyAgrTomlContainsMany(handles: string[], label: string): void {
  const text = readAgrToml();
  if (!text) {
    openVerify("agr.toml is missing after command.");
    logEvent(`Verify ${label}: agr.toml missing`);
    return;
  }
  const missing = handles.filter((h) => !text.includes(h));
  if (missing.length > 0) {
    const filtered = missing.filter((h) => !handleVariants(h).some((v) => text.includes(v)));
    if (filtered.length === 0) {
      return;
    }
    openVerify("agr.toml missing handles:", filtered);
    logEvent(`Verify ${label}: missing ${filtered.join(", ")}`);
  }
}

function verifyAgrTomlMissing(handle: string, label: string): void {
  const text = readAgrToml();
  if (!text) {
    return;
  }
  const variants = handleVariants(handle);
  const found = variants.some((v) => text.includes(v));
  if (found) {
    openVerify("agr.toml still contains handle:", [handle]);
    logEvent(`Verify ${label}: handle still present (${handle})`);
  }
}

function verifyAgrTomlMissingMany(handles: string[], label: string): void {
  const text = readAgrToml();
  if (!text) {
    return;
  }
  const present = handles.filter((h) => text.includes(h));
  if (present.length > 0) {
    const filtered = present.filter((h) => handleVariants(h).some((v) => text.includes(v)));
    if (filtered.length === 0) {
      return;
    }
    openVerify("agr.toml still contains:", filtered);
    logEvent(`Verify ${label}: still present ${filtered.join(", ")}`);
  }
}

function verifyAgrTomlHasAny(label: string): void {
  const text = readAgrToml();
  if (!text) {
    openVerify("agr.toml is missing after sync.");
    logEvent(`Verify ${label}: agr.toml missing`);
    return;
  }
  if (!/dependencies\s*=|\[\[dependencies\]\]/.test(text)) {
    openVerify("agr.toml has no dependencies after sync.");
    logEvent(`Verify ${label}: no dependencies found`);
  }
}

function commandReportedAdded(stdout: string): boolean {
  const lines = stdout.split(/\r?\n/).map((line) => line.trim());
  return lines.some((line) => line.startsWith("Added:"));
}

function commandReportedExists(output: string): boolean {
  const text = output.toLowerCase();
  return text.includes("skill already exists") || text.includes("already exists at");
}

function commandReportedRemoved(stdout: string): boolean {
  const lines = stdout.split(/\r?\n/).map((line) => line.trim());
  return lines.some((line) => line.startsWith("Removed:") || line.startsWith("Deleted:"));
}

async function refreshPreview(): Promise<void> {
  const dep = selectedDependency();
  if (!dep || !dep.skill_md_path) {
    state.previewAll = [];
    state.previewOffset = 0;
    renderDetails();
    if (state.previewOpen) {
      renderPreviewModal();
    }
    return;
  }
  try {
    const text = await Bun.file(dep.skill_md_path).text();
    const lines = text.split(/\r?\n/);
    state.previewAll = lines.map((line) => line.slice(0, 200));
    state.previewOffset = 0;
  } catch {
    state.previewAll = [];
    state.previewOffset = 0;
  }
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
  if (state.selectedIds.has(dep.identifier)) {
    state.selectedIds.delete(dep.identifier);
  } else {
    state.selectedIds.add(dep.identifier);
  }
  renderList();
  renderActions();
}

function getSelectedIds(): string[] {
  return Array.from(state.selectedIds);
}

async function installSelectedBulk(): Promise<void> {
  const selected = getSelectedIds();
  if (selected.length === 0) {
    await installSelected();
    return;
  }
  const normalized = selected.map((id) => normalizeHandleForAgr(id));
  let result = await runCommand(["uv", "run", "agr", "add", ...normalized]);
  if (result.exitCode !== 0 && commandReportedExists(`${result.stdout}\n${result.stderr}`)) {
    setStatus("Skill exists; retrying with --overwrite");
    result = await runCommand(["uv", "run", "agr", "add", "--overwrite", ...normalized]);
  }
  await loadData();
  if (result.exitCode === 0) {
    verifyAgrTomlContainsMany(normalized, "install");
  }
}

async function removeSelectedBulk(): Promise<void> {
  const selectedIds = getSelectedIds();
  if (selectedIds.length === 0) {
    await removeSelected();
    return;
  }
  const deps = getDependencies();
  const map = new Map<string, Dependency>();
  for (const dep of deps) {
    map.set(dep.identifier, dep);
  }
  const rawHandles = selectedIds.map((id) => {
    const dep = map.get(id);
    return dep?.handle ?? dep?.identifier ?? id;
  });
  const normalized = rawHandles.map((handle) => normalizeHandleForAgr(handle));
  const unique = Array.from(new Set(normalized));
  setStatus(`Removing ${unique.length} skills...`);
  logEvent(`Bulk remove: ${unique.length} handles`);
  let anyFailed = false;
  for (const handle of unique) {
    const result = await runCommand(["uv", "run", "agr", "remove", handle]);
    if (result.exitCode !== 0) {
      anyFailed = true;
    }
  }
  await loadData();
  if (!anyFailed) {
    verifyAgrTomlMissingMany(unique, "remove");
    state.selectedIds.clear();
    renderList();
    renderActions();
  }
}

function handleKey(sequence: string): boolean {
  if (state.helpOpen) {
    if (sequence === "H" || sequence === "h" || sequence === "\x1b") {
      state.helpOpen = false;
      renderHelp();
      renderFooter();
      return true;
    }
    return true;
  }
  if (state.verifyOpen) {
    if (sequence === "\x1b") {
      state.verifyOpen = false;
      renderVerifyModal();
      renderFooter();
      return true;
    }
    return true;
  }
  if (state.missingConfigOpen) {
    if (sequence === "\x1b") {
      state.missingConfigOpen = false;
      renderMissingConfig();
      renderFooter();
      return true;
    }
    return true;
  }
  if (state.runOptionsOpen) {
    if (sequence === "\x1b") {
      state.runOptionsOpen = false;
      renderRunOptions();
      renderFooter();
      return true;
    }
    if (sequence === "\r" || sequence === "\n") {
      state.runOptionsOpen = false;
      renderRunOptions();
      renderFooter();
      void runSelected();
      return true;
    }
    if (sequence === "t") {
      cycleTool();
      renderRunOptions();
      return true;
    }
    if (sequence === "u") {
      state.interactive = !state.interactive;
      renderRunOptions();
      return true;
    }
    if (sequence === "p") {
      state.runOptionsOpen = false;
      renderRunOptions();
      enterInputMode("prompt", state.promptBuffer);
      return true;
    }
    if (sequence === "e") {
      state.runOptionsOpen = false;
      renderRunOptions();
      enterInputMode("args", state.argsBuffer);
      return true;
    }
    return true;
  }
  if (state.previewOpen) {
    if (sequence === "\x1b") {
      state.previewOpen = false;
      renderPreviewModal();
      renderFooter();
      return true;
    }
    if (sequence === "[" || sequence === "]") {
      scrollPreview(sequence === "[" ? -1 : 1);
      renderPreviewModal();
      return true;
    }
    return true;
  }
  if (state.confirmUpdateOpen) {
    if (sequence === "y" || sequence === "Y") {
      state.confirmUpdateOpen = false;
      renderUpdateConfirm();
      renderFooter();
      void applyUpdates();
      return true;
    }
    if (sequence === "n" || sequence === "N" || sequence === "\x1b") {
      state.confirmUpdateOpen = false;
      renderUpdateConfirm();
      renderFooter();
      return true;
    }
    if (sequence === "s" || sequence === "S") {
      state.confirmUpdateOpen = false;
      renderUpdateConfirm();
      renderFooter();
      void applyUpdatesAndSync();
      return true;
    }
    return true;
  }
  if (state.inputMode === "add") {
    if (sequence === "\u0003") {
      renderer.destroy();
      process.exit(0);
    }
    if (sequence === "\x1b") {
      exitInputMode();
      return true;
    }
    return false;
  }
  if (state.inputMode !== "none") {
    handleInputChar(sequence);
    return true;
  }

  if (sequence === "\u0003" || sequence === "q") {
    renderer.destroy();
    process.exit(0);
  }

  if (sequence === "\t") {
    state.tabIndex = (state.tabIndex + 1) % tabs.length;
    renderAll();
    renderActions();
    return true;
  }

  if (sequence === "\x1b[Z") {
    state.tabIndex = (state.tabIndex - 1 + tabs.length) % tabs.length;
    renderAll();
    renderActions();
    return true;
  }

  if (sequence === "\x1b[A") {
    moveSelection(-1);
    return true;
  }

  if (sequence === "\x1b[B") {
    moveSelection(1);
    return true;
  }

  if (sequence === "[") {
    scrollPreview(-1);
    return true;
  }

  if (sequence === "]") {
    scrollPreview(1);
    return true;
  }

  if (sequence === " ") {
    toggleSelected();
    return true;
  }

  if (sequence === "c") {
    void loadData();
    return true;
  }

  if (sequence === "H" || sequence === "h") {
    state.helpOpen = true;
    renderHelp();
    renderFooter();
    return true;
  }

  if (sequence === "T") {
    state.runTestOpen = !state.runTestOpen;
    renderRunModal();
    renderFooter();
    return true;
  }

  const tab = getActiveTab();
  if (sequence === "a") {
    enterInputMode("add");
    return true;
  }

  if (tab === "Skills" && sequence === "i") {
    if (state.selectedIds.size > 0) {
      void installSelectedBulk();
    } else {
      void installSelected();
    }
    return true;
  }

  if (tab === "Skills" && sequence === "r") {
    if (state.selectedIds.size > 0) {
      void removeSelectedBulk();
    } else {
      void removeSelected();
    }
    return true;
  }

  if (tab === "Skills" && sequence === "v") {
    void refreshPreview();
    state.previewOpen = true;
    renderPreviewModal();
    renderFooter();
    return true;
  }

  if (tab === "Skills" && sequence === "g") {
    void runSelected();
    return true;
  }

  if (tab === "Skills" && sequence === "G") {
    state.runOptionsOpen = true;
    renderRunOptions();
    renderFooter();
    return true;
  }

  if (tab === "Discover" && sequence === "i") {
    logEvent("Key: Discover install (i)");
    void addPredefinedSelected();
    return true;
  }

  if ((tab === "Discover" || tab === "Updates") && sequence === "y") {
    const skill = tab === "Discover" ? selectedPredefined() : selectedUpdate();
    if (skill) {
      const text = skill.repo ? `${skill.repo} (${skill.handle})` : skill.handle;
      void (async () => {
        const ok = await copyToClipboard(text);
        if (ok) {
          setStatus("Copied to clipboard", { clearAfterMs: 2000 });
        } else {
          setStatus(`Copy failed: ${text}`);
        }
      })();
    }
    return true;
  }

  if (tab === "Updates" && sequence === "u") {
    void checkUpdates();
    return true;
  }

  if (tab === "Updates" && sequence === "U") {
    if (state.updateAvailable) {
      void applyUpdates();
    }
    return true;
  }
  if (tab === "Updates" && sequence === "S") {
    if (state.updateAvailable) {
      void applyUpdatesAndSync();
    }
    return true;
  }
  if (tab === "Updates" && sequence === "s") {
    if (state.updateAvailable) {
      state.confirmUpdateOpen = true;
      renderUpdateConfirm();
      renderFooter();
    }
    return true;
  }

  return false;
}

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
