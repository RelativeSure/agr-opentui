import { BoxRenderable, InputRenderable, TextRenderable, createCliRenderer } from "@opentui/core";
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

type InputMode = "none" | "filter" | "add" | "prompt" | "args" | "repo";

type State = {
  tabIndex: number;
  filter: string;
  inputMode: InputMode;
  inputBuffer: string;
  promptBuffer: string;
  argsBuffer: string;
  selectedIndex: number;
  targetRepo: string | null;
  selectedIds: Set<string>;
  toolIndex: number;
  interactive: boolean;
  status: string;
  statusToken: number;
  lastCommand: string;
  lastExit: number | null;
  data: BridgeData | null;
  busy: boolean;
  previewLines: string[];
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
};

const tabs = ["List", "Run", "Predefined", "Updates", "Config"];
const DEFAULT_SKILLS_SOURCE: SkillsSource = {
  repo: "kasperjunge/agent-resources",
  branch: "main",
  path: "skills.json",
};

const state: State = {
  tabIndex: 0,
  filter: "",
  inputMode: "none",
  inputBuffer: "",
  promptBuffer: "",
  argsBuffer: "",
  selectedIndex: 0,
  targetRepo: process.env.AGR_TUI_REPO ?? null,
  selectedIds: new Set<string>(),
  toolIndex: 0,
  interactive: false,
  status: "Ready",
  statusToken: 0,
  lastCommand: "",
  lastExit: null,
  data: null,
  busy: false,
  previewLines: [],
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
const headerRepo = new TextRenderable(renderer, {
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
const leftTitle = new TextRenderable(renderer, { content: "Skills", fg: colors.highlight });

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

const repoOverlay = new BoxRenderable(renderer, {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  alignItems: "center",
  justifyContent: "center",
});
const repoModal = new BoxRenderable(renderer, {
  width: 60,
  height: 5,
  padding: 1,
  borderStyle: "double",
  borderColor: colors.highlight,
  backgroundColor: colors.panelAlt,
});
const repoTitle = new TextRenderable(renderer, { content: "Set Repo Path", fg: colors.highlight });
const repoInput = new InputRenderable(renderer, {
  width: "100%",
  placeholder: "/path/to/repo",
  backgroundColor: colors.panelAlt,
  textColor: colors.text,
  focusedBackgroundColor: colors.panel,
  focusedTextColor: colors.text,
  placeholderColor: colors.dim,
});
const repoHint = new TextRenderable(renderer, { content: "Enter to save, Esc to cancel", fg: colors.dim });
repoModal.add(repoTitle);
repoModal.add(repoInput);
repoModal.add(repoHint);
repoOverlay.add(repoModal);
repoOverlay.visible = false;

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
  width: 66,
  height: 6,
  padding: 1,
  borderStyle: "double",
  borderColor: colors.accent,
  backgroundColor: colors.panelAlt,
});
const runTitle = new TextRenderable(renderer, { content: "Running Command", fg: colors.highlight });
const runCmd = new TextRenderable(renderer, { content: "", fg: colors.text });
const runHint = new TextRenderable(renderer, { content: "Please wait...", fg: colors.dim });
runModal.add(runTitle);
runModal.add(runCmd);
runModal.add(runHint);
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
header.add(headerRepo);
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
root.add(repoOverlay);
root.add(helpOverlay);
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
  const repo = state.targetRepo ?? "(repo: unset)";
  headerRepo.content = `repo: ${repo}`;
  headerRepo.fg = state.targetRepo ? colors.dim : colors.warn;
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

function filterInstalledPredefined(skills: PredefinedSkill[]): PredefinedSkill[] {
  if (!state.data) {
    if (state.installedOverrides.size === 0) {
      return skills;
    }
    return skills.filter((skill) => !state.installedOverrides.has(skill.handle.toLowerCase()));
  }
  const installed = getInstalledHandleSet();
  for (const handle of state.installedOverrides) {
    installed.add(handle);
  }
  return skills.filter((skill) => !installed.has(skill.handle.toLowerCase()));
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

function applyFilter(deps: Dependency[]): Dependency[] {
  if (!state.filter) {
    return deps;
  }
  const needle = state.filter.toLowerCase();
  return deps.filter((dep) => dep.identifier.toLowerCase().includes(needle));
}

function applyPredefinedFilter(skills: PredefinedSkill[]): PredefinedSkill[] {
  if (!state.filter) {
    return skills;
  }
  const needle = state.filter.toLowerCase();
  return skills.filter(
    (skill) => skill.label.toLowerCase().includes(needle) || skill.handle.toLowerCase().includes(needle),
  );
}

function getVisibleItems(): Array<Dependency | PredefinedSkill> {
  if (getActiveTab() === "Predefined") {
    return applyPredefinedFilter(filterInstalledPredefined(getPredefinedSkills()));
  }
  if (getActiveTab() === "Updates") {
    return applyPredefinedFilter(getUpdateSkills());
  }
  return applyFilter(getDependencies());
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
  if (getActiveTab() === "Predefined" || getActiveTab() === "Updates") {
    return null;
  }
  const visible = getVisibleItems() as Dependency[];
  if (visible.length === 0) {
    return null;
  }
  return visible[state.selectedIndex] ?? null;
}

function selectedPredefined(): PredefinedSkill | null {
  if (getActiveTab() !== "Predefined") {
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
  if (tab === "Updates" && state.updateCheckedAt) {
    const short = formatTimestampShort(state.updateCheckedAt);
    leftTitle.content = short ? `Update Candidates (${short})` : "Update Candidates";
  } else {
    leftTitle.content = tab === "Updates" ? "Update Candidates" : "Skills";
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
    if (tab === "Predefined" || tab === "Updates") {
      const skill = item as PredefinedSkill;
      void resolveSkillLabel(skill);
      const displayLabel = getSkillDisplayLabel(skill);
      if (displayLabel === skill.handle) {
        listLines[i].content = `${marker} ${displayLabel}`;
      } else {
        listLines[i].content = `${marker} ${displayLabel} (${skill.handle})`;
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
  } else if (tab === "Predefined") {
    if (state.predefinedError) {
      lines.push(`Predefined list error: ${state.predefinedError}`);
      lines.push("Edit skills.json to fix.");
    } else if (!predefined) {
      lines.push("No predefined skills.");
      const total = state.predefined.length;
      const visible = filterInstalledPredefined(state.predefined).length;
      if (total > 0 && visible === 0) {
        lines.push("All predefined skills are already installed.");
      } else if (state.updateInProgress) {
        lines.push("Loading predefined list...");
      } else if (state.predefinedSource?.url || state.predefinedSource?.repo) {
        lines.push("Waiting for predefined list to load...");
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
    const repoPath = state.targetRepo;
    const repoPathMissing = !!repoPath && !existsSync(repoPath);
    const configPath = repoPath ? join(repoPath, "agr.toml") : null;
    const configMissing = !!configPath && !existsSync(configPath);
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
  if (tab === "List") {
    lines.push("List shows skills in agr.toml + install state.");
    lines.push("Press i to install selected missing skills.");
    lines.push("Press s to sync all skills at once.");
    lines.push("Press r to remove selected skills.");
  } else if (tab === "Run") {
    lines.push("Run uses agrx to execute a skill temporarily.");
    } else if (tab === "Config") {
      lines.push(`Config path: ${state.data.config_path ?? "(none)"}`);
      lines.push(`Repo root: ${state.data.repo_root ?? "(none)"}`);
      lines.push(`Target repo: ${repoPath ?? "(unset)"}`);
      if (repoPathMissing) {
        lines.push("Status: repo path not found");
      } else if (configMissing) {
        lines.push("Status: agr.toml not found in repo");
      } else {
        lines.push("Status: repo path OK");
      }
      if (state.predefinedSource?.repo) {
        lines.push(`Skills source: ${state.predefinedSource.repo}`);
      } else if (state.predefinedSource?.url) {
        lines.push(`Skills source: ${state.predefinedSource.url}`);
      } else {
        lines.push("Skills source: skills.json (local)");
      }
      if (state.updateCheckedAt) {
        lines.push(`Updates checked: ${state.updateCheckedAt}`);
      }
      lines.push(`Tools: ${state.data.tools.join(", ") || "(none)"}`);
    }

    if (tab !== "Config" && tab !== "Predefined" && tab !== "Updates" && state.previewLines.length > 0) {
      lines.push("");
      lines.push("SKILL.md preview:");
      lines.push(...state.previewLines);
    }

    if (tab !== "Config" && tab !== "Predefined" && tab !== "Updates" && dep && state.data?.installed) {
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
    } else if (content.startsWith("Predefined list error:") || content.startsWith("Update error:")) {
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
  lines.push("a: add skill");
  lines.push("R: set repo");
  lines.push("space: toggle select");
  lines.push("q: quit");
  lines.push("c: reload config");
  lines.push("H: help");
  lines.push("Tab: next panel");
  lines.push("j/k: move selection");
  lines.push("/: filter");

  if (tab === "List") {
    lines.push("i: install selected");
    lines.push("I: install all selected");
    lines.push("s: sync all");
    lines.push("r: remove selected");
    lines.push("x: remove all selected");
  } else if (tab === "Run") {
    lines.push("r: run selected");
    lines.push(`t: tool (${toolName || "none"})`);
    lines.push("p: edit prompt");
    lines.push(`u: interactive (${state.interactive ? "on" : "off"})`);
    lines.push(`e: extra args (${state.argsBuffer || "none"})`);
  } else if (tab === "Predefined") {
    lines.push("i: add selected");
  } else if (tab === "Updates") {
    lines.push("u: check updates");
    lines.push("U: apply update (no confirm)");
    lines.push("s: apply (confirm)");
    lines.push("S: apply + sync (no confirm)");
  }
  if (tab === "Predefined" || tab === "Updates") {
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
  footerStatus.content = state.updateInProgress ? "Loading predefined list..." : state.status;
  const hints: string[] = [];
  if (state.confirmUpdateOpen) {
    hints.push("Update pending: y apply, s apply+sync, n/Esc cancel");
  } else if (state.inputMode === "filter") {
    hints.push("Filter mode: type to filter, Enter to accept, Esc to cancel");
  } else if (state.inputMode === "add") {
    hints.push("Add mode: enter handle/path, Enter to add, Esc to cancel");
  } else if (state.inputMode === "prompt") {
    hints.push("Prompt mode: Enter to run, Esc to cancel");
  } else if (state.inputMode === "args") {
    hints.push("Args mode: Enter to set extra args, Esc to cancel");
  } else if (state.inputMode === "repo") {
    hints.push("Repo mode: Enter repo path, Esc to cancel");
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
  if (tab === "List") {
    lines.push("List shows skills in agr.toml with status.");
    lines.push("Press i to install selected.");
    lines.push("Use space to multi-select, then I to install all.");
    lines.push("Press s to sync everything at once.");
    lines.push("Press r to remove selected.");
    lines.push("Press x to remove all selected.");
  } else if (tab === "Run") {
    lines.push("Run executes a skill without installing it.");
    lines.push("Press r to run selected, t to change tool.");
    lines.push("Use p for prompt, u for interactive, e for args.");
  } else if (tab === "Predefined") {
    lines.push("Predefined lists skills from skills.json.");
    lines.push("Select one and press i to add it.");
    lines.push("Edit skills.json to customize the list.");
  } else if (tab === "Updates") {
    lines.push("Updates checks for changes to skills.json.");
    lines.push("Press u to check the remote list.");
    lines.push("Press U to apply updates immediately.");
    lines.push("Press s to review before applying.");
    lines.push("Press S to apply updates and run agr sync.");
    lines.push("Press y to copy handle/repo.");
  } else if (tab === "Config") {
    lines.push("Config shows detected repo + agr.toml info.");
    lines.push("Press c to reload configuration.");
    lines.push("Repo path should point to a folder with agr.toml.");
    lines.push("If empty or wrong, set repo path with R.");
  }
  while (lines.length < helpLines.length) {
    lines.push("");
  }
  for (let i = 0; i < helpLines.length; i += 1) {
    helpLines[i].content = lines[i] ?? "";
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
  if (!state.busy) {
    runOverlay.visible = false;
    return;
  }
  runOverlay.visible = true;
  runCmd.content = state.lastCommand ? state.lastCommand : "Running...";
}

function showToast(message: string, durationMs = 2000): void {
  toastText.content = message;
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
  const cwd = state.targetRepo ?? process.cwd();
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
    showToast("Command succeeded");
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
        setStatus("Loading predefined list...");
        await checkUpdates();
        if (state.updateRemote.length > 0) {
          writeSkillsFile(state.updateRemote, state.predefinedSource);
          loadPredefined();
          renderList();
          renderDetails();
          setStatus("Predefined list updated", { clearAfterMs: 2500 });
        } else {
          setStatus("Predefined list up to date", { clearAfterMs: 2500 });
        }
      }
    }
    if (state.targetRepo) {
      if (!existsSync(state.targetRepo)) {
        setStatus("Repo path not found. Press R to set a valid repo path.");
        return;
      }
      const configPath = join(state.targetRepo, "agr.toml");
      if (!existsSync(configPath)) {
        setStatus("No agr.toml in repo path. Press R to set the correct repo root.");
        return;
      }
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
  await runCommand(["uv", "run", "agr", "add", dep.identifier]);
  await loadData();
}

async function addPredefinedSelected(): Promise<void> {
  const skill = selectedPredefined();
  if (!skill) {
    return;
  }
  const target = skill.repo ?? skill.handle;
  const result = await runCommand(["uv", "run", "agr", "add", target]);
  if (result.exitCode === 0) {
    state.installedOverrides.add(skill.handle.toLowerCase());
    showToast(`Installed ${getSkillDisplayLabel(skill)}`);
  }
  state.predefined = state.predefined.filter((item) => item.handle !== skill.handle);
  renderList();
  renderDetails();
  renderActions();
  await loadData();
  renderList();
  renderDetails();
  renderActions();
}

async function removeSelected(): Promise<void> {
  const dep = selectedDependency();
  if (!dep) {
    return;
  }
  await runCommand(["uv", "run", "agr", "remove", dep.identifier]);
  await loadData();
}

async function syncAll(): Promise<void> {
  await runCommand(["uv", "run", "agr", "sync"]);
  await loadData();
  if (getActiveTab() === "Predefined") {
    renderList();
    renderDetails();
    renderActions();
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
  if (mode === "repo") {
    repoOverlay.visible = true;
    repoInput.value = seed;
    repoInput.focus();
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
  if (prevMode === "repo") {
    repoInput.blur();
    repoOverlay.visible = false;
  }
  renderActions();
  renderFooter();
}

async function handleInputSubmit(): Promise<void> {
  if (state.inputMode === "filter") {
    state.filter = state.inputBuffer;
    exitInputMode();
    renderList();
    renderDetails();
    void refreshPreview();
    return;
  }
  if (state.inputMode === "add") {
    const value = addInput.value.trim();
    exitInputMode();
    if (value) {
      await runCommand(["uv", "run", "agr", "add", value]);
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
  if (state.inputMode === "repo") {
    const repo = repoInput.value.trim();
    state.targetRepo = repo.length > 0 ? repo : null;
    exitInputMode();
    renderTabs();
    await loadData();
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
  state.previewLines = state.previewAll
    .slice(state.previewOffset, state.previewOffset + 8)
    .map((line) => line.slice(0, 80));
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

async function refreshPreview(): Promise<void> {
  const dep = selectedDependency();
  if (!dep || !dep.skill_md_path) {
    state.previewLines = [];
    state.previewAll = [];
    state.previewOffset = 0;
    renderDetails();
    return;
  }
  try {
    const text = await Bun.file(dep.skill_md_path).text();
    const lines = text.split(/\r?\n/);
    state.previewAll = lines.map((line) => line.slice(0, 200));
    state.previewOffset = 0;
    state.previewLines = state.previewAll.slice(0, 8).map((line) => line.slice(0, 80));
  } catch {
    state.previewLines = [];
    state.previewAll = [];
    state.previewOffset = 0;
  }
  renderDetails();
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
  await runCommand(["uv", "run", "agr", "add", ...selected]);
  await loadData();
}

async function removeSelectedBulk(): Promise<void> {
  const selected = getSelectedIds();
  if (selected.length === 0) {
    await removeSelected();
    return;
  }
  await runCommand(["uv", "run", "agr", "remove", ...selected]);
  await loadData();
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
  if (state.inputMode === "repo") {
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

  if (sequence === "\x1b[A" || sequence === "k") {
    moveSelection(-1);
    return true;
  }

  if (sequence === "\x1b[B" || sequence === "j") {
    moveSelection(1);
    return true;
  }

  if (sequence === "/") {
    enterInputMode("filter", state.filter);
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

  const tab = getActiveTab();
  if (sequence === "a") {
    enterInputMode("add");
    return true;
  }

  if (sequence === "R") {
    enterInputMode("repo", state.targetRepo ?? "");
    return true;
  }

  if (tab === "List" && sequence === "i") {
    void installSelected();
    return true;
  }

  if (tab === "List" && sequence === "I") {
    void installSelectedBulk();
    return true;
  }

  if (tab === "List" && sequence === "r") {
    void removeSelected();
    return true;
  }

  if (tab === "List" && sequence === "x") {
    void removeSelectedBulk();
    return true;
  }

  if (tab === "List" && sequence === "s") {
    void syncAll();
    return true;
  }

  if (tab === "Run" && sequence === "r") {
    void runSelected();
    return true;
  }

  if (tab === "Run" && sequence === "t") {
    cycleTool();
    renderActions();
    return true;
  }

  if (tab === "Run" && sequence === "p") {
    enterInputMode("prompt", state.promptBuffer);
    return true;
  }

  if (tab === "Run" && sequence === "u") {
    state.interactive = !state.interactive;
    renderActions();
    return true;
  }

  if (tab === "Run" && sequence === "e") {
    enterInputMode("args", state.argsBuffer);
    return true;
  }

  if (tab === "Predefined" && sequence === "i") {
    void addPredefinedSelected();
    return true;
  }

  if ((tab === "Predefined" || tab === "Updates") && sequence === "y") {
    const skill = tab === "Predefined" ? selectedPredefined() : selectedUpdate();
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
repoInput.on("input", (value) => {
  state.inputBuffer = String(value ?? "");
  renderActions();
  renderFooter();
});
repoInput.on("enter", () => {
  void handleInputSubmit();
});
