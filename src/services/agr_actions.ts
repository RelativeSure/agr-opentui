import { join } from "node:path";
import type { Dependency, PredefinedSkill } from "../app_logic";
import { buildRunSelectedArgs } from "../app_logic";
import { commandReportedExists, commandReportedRemoved, parseArgs } from "../commands";
import type { AppDeps } from "../deps";
import { defaultAppDeps } from "../deps";
import type { State } from "../state";

export async function runSelectedAction(input: {
  state: State;
  selectedDependency: () => Dependency | null;
  runCommand: (args: string[]) => Promise<{ exitCode: number; stdout: string; stderr: string }>;
}): Promise<void> {
  const dep = input.selectedDependency();
  if (!dep) {
    return;
  }
  const tool = input.state.data?.tools[input.state.toolIndex];
  const args = buildRunSelectedArgs({
    identifier: dep.identifier,
    tool: tool ?? null,
    interactive: input.state.interactive,
    prompt: input.state.promptBuffer,
    extraArgs: input.state.argsBuffer ? parseArgs(input.state.argsBuffer) : [],
  });
  await input.runCommand(args);
}

export async function installSelectedAction(input: {
  state: State;
  selectedDependency: () => Dependency | null;
  normalizeHandleForAgr: (handle: string) => string;
  runCommand: (args: string[]) => Promise<{ exitCode: number; stdout: string; stderr: string }>;
  loadData: () => Promise<void>;
  showToast: (message: string) => void;
  setStatus: (message: string) => void;
  renderMissingConfig: () => void;
  verifyAgrTomlContains: (handle: string, label: string) => void;
}): Promise<void> {
  const dep = input.selectedDependency();
  if (!dep) {
    return;
  }
  if (input.state.missingConfig) {
    input.showToast("Missing agr.toml in current directory");
    input.setStatus("Error: agr.toml missing in current directory");
    input.state.missingConfigOpen = true;
    input.renderMissingConfig();
    return;
  }
  const target = input.normalizeHandleForAgr(dep.handle ?? dep.identifier);
  let result = await input.runCommand(["uv", "run", "agr", "add", target]);
  if (result.exitCode !== 0 && commandReportedExists(`${result.stdout}\n${result.stderr}`)) {
    input.setStatus("Skill exists; retrying with --overwrite");
    result = await input.runCommand(["uv", "run", "agr", "add", "--overwrite", target]);
  }
  await input.loadData();
  if (result.exitCode === 0) {
    input.verifyAgrTomlContains(target, "install");
  }
}

export async function addPredefinedSelectedAction(input: {
  state: State;
  deps?: Pick<AppDeps, "cwd" | "existsSync" | "readFileSync">;
  selectedPredefined: () => PredefinedSkill | null;
  getSkillDisplayLabel: (skill: PredefinedSkill) => string;
  normalizeHandleForAgr: (handle: string) => string;
  runCommand: (args: string[]) => Promise<{ exitCode: number; stdout: string; stderr: string }>;
  loadData: () => Promise<void>;
  showToast: (message: string) => void;
  setStatus: (message: string) => void;
  renderList: () => void;
  renderDetails: () => void;
  renderActions: () => void;
  verifyAgrTomlContains: (handle: string, label: string) => void;
  openVerify: (message: string, details?: string[]) => void;
  logEvent: (message: string) => void;
  handleVariants: (handle: string) => string[];
}): Promise<void> {
  const deps = input.deps ?? defaultAppDeps;
  const skill = input.selectedPredefined();
  if (!skill) {
    return;
  }
  input.logEvent(`Discover install requested: ${skill.handle}`);
  const target = skill.repo ?? input.normalizeHandleForAgr(skill.handle);
  input.setStatus(`Installing: ${target}`);
  let result = await input.runCommand(["uv", "run", "agr", "add", target]);
  if (result.exitCode !== 0 && commandReportedExists(`${result.stdout}\n${result.stderr}`)) {
    input.setStatus("Skill exists; retrying with --overwrite");
    result = await input.runCommand(["uv", "run", "agr", "add", "--overwrite", target]);
  }
  if (result.exitCode === 0) {
    input.state.installedOverrides.add(skill.handle.toLowerCase());
    input.showToast(`Installed ${input.getSkillDisplayLabel(skill)}`);
  }
  input.state.predefined = input.state.predefined.filter((item) => item.handle !== skill.handle);
  input.renderList();
  input.renderDetails();
  input.renderActions();
  await input.loadData();
  input.verifyAgrTomlContains(target, "install");

  const skillsPath = join(deps.cwd(), "skills.json");
  if (deps.existsSync(skillsPath)) {
    const raw = deps.readFileSync(skillsPath, "utf-8");
    const variants = input.handleVariants(target).concat(input.handleVariants(skill.handle));
    const found = variants.some((v) => raw.includes(v));
    if (!found) {
      input.openVerify("skills.json missing handle:", [target]);
      input.logEvent(`Install check: skills.json missing ${target}`);
    }
  }
  input.renderList();
  input.renderDetails();
  input.renderActions();
}

export async function removeSelectedAction(input: {
  state: State;
  selectedDependency: () => Dependency | null;
  normalizeHandleForAgr: (handle: string) => string;
  runCommand: (args: string[]) => Promise<{ exitCode: number; stdout: string; stderr: string }>;
  loadData: () => Promise<void>;
  showToast: (message: string) => void;
  setStatus: (message: string) => void;
  renderMissingConfig: () => void;
  openVerify: (message: string, details?: string[]) => void;
  logEvent: (message: string) => void;
  verifyAgrTomlMissing: (handle: string, label: string) => void;
}): Promise<void> {
  const dep = input.selectedDependency();
  if (!dep) {
    return;
  }
  if (input.state.missingConfig) {
    input.showToast("Missing agr.toml in current directory");
    input.setStatus("Error: agr.toml missing in current directory");
    input.state.missingConfigOpen = true;
    input.renderMissingConfig();
    return;
  }
  const target = input.normalizeHandleForAgr(dep.handle ?? dep.identifier);
  const result = await input.runCommand(["uv", "run", "agr", "remove", target]);
  await input.loadData();
  if (result.exitCode === 0) {
    if (!commandReportedRemoved(result.stdout)) {
      input.openVerify("agr did not report a remove.");
      input.logEvent("Remove check: stdout missing 'Removed:' line");
    } else {
      input.verifyAgrTomlMissing(target, "remove");
    }
  }
}

export async function syncAllAction(input: {
  state: State;
  getActiveTab: () => string;
  runCommand: (args: string[]) => Promise<{ exitCode: number; stdout: string; stderr: string }>;
  loadData: () => Promise<void>;
  showToast: (message: string) => void;
  setStatus: (message: string) => void;
  renderMissingConfig: () => void;
  renderList: () => void;
  renderDetails: () => void;
  renderActions: () => void;
  verifyAgrTomlHasAny: (label: string) => void;
}): Promise<void> {
  if (input.state.missingConfig) {
    input.showToast("Missing agr.toml in current directory");
    input.setStatus("Error: agr.toml missing in current directory");
    input.state.missingConfigOpen = true;
    input.renderMissingConfig();
    return;
  }
  const result = await input.runCommand(["uv", "run", "agr", "sync"]);
  await input.loadData();
  if (input.getActiveTab() === "Discover") {
    input.renderList();
    input.renderDetails();
    input.renderActions();
  }
  if (result.exitCode === 0) {
    input.verifyAgrTomlHasAny("sync");
  }
}

export async function installSelectedBulkAction(input: {
  state: State;
  selectedIds: () => string[];
  installSelected: () => Promise<void>;
  normalizeHandleForAgr: (handle: string) => string;
  runCommand: (args: string[]) => Promise<{ exitCode: number; stdout: string; stderr: string }>;
  loadData: () => Promise<void>;
  setStatus: (message: string) => void;
  verifyAgrTomlContainsMany: (handles: string[], label: string) => void;
}): Promise<void> {
  const selected = input.selectedIds();
  if (selected.length === 0) {
    await input.installSelected();
    return;
  }
  const normalized = selected.map((id) => input.normalizeHandleForAgr(id));
  let result = await input.runCommand(["uv", "run", "agr", "add", ...normalized]);
  if (result.exitCode !== 0 && commandReportedExists(`${result.stdout}\n${result.stderr}`)) {
    input.setStatus("Skill exists; retrying with --overwrite");
    result = await input.runCommand(["uv", "run", "agr", "add", "--overwrite", ...normalized]);
  }
  await input.loadData();
  if (result.exitCode === 0) {
    input.verifyAgrTomlContainsMany(normalized, "install");
  }
}

export async function removeSelectedBulkAction(input: {
  state: State;
  selectedIds: () => string[];
  removeSelected: () => Promise<void>;
  getDependencies: () => Dependency[];
  normalizeHandleForAgr: (handle: string) => string;
  runCommand: (args: string[]) => Promise<{ exitCode: number; stdout: string; stderr: string }>;
  loadData: () => Promise<void>;
  setStatus: (message: string) => void;
  logEvent: (message: string) => void;
  verifyAgrTomlMissingMany: (handles: string[], label: string) => void;
  renderList: () => void;
  renderActions: () => void;
}): Promise<void> {
  const selectedIds = input.selectedIds();
  if (selectedIds.length === 0) {
    await input.removeSelected();
    return;
  }
  const deps = input.getDependencies();
  const map = new Map<string, Dependency>();
  for (const dep of deps) {
    map.set(dep.identifier, dep);
  }
  const rawHandles = selectedIds.map((id) => {
    const dep = map.get(id);
    return dep?.handle ?? dep?.identifier ?? id;
  });
  const normalized = rawHandles.map((handle) => input.normalizeHandleForAgr(handle));
  const unique = Array.from(new Set(normalized));
  input.setStatus(`Removing ${unique.length} skills...`);
  input.logEvent(`Bulk remove: ${unique.length} handles`);
  let anyFailed = false;
  for (const handle of unique) {
    const result = await input.runCommand(["uv", "run", "agr", "remove", handle]);
    if (result.exitCode !== 0) {
      anyFailed = true;
    }
  }
  await input.loadData();
  if (!anyFailed) {
    input.verifyAgrTomlMissingMany(unique, "remove");
    input.state.selectedIds.clear();
    input.renderList();
    input.renderActions();
  }
}
