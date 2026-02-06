export type Dependency = {
  identifier: string;
  handle?: string | null;
  path?: string | null;
  is_local: boolean;
  installed: boolean;
  skill_md_path?: string | null;
  candidates_by_tool?: Record<string, string[]>;
};

export type PredefinedSkill = {
  label: string;
  handle: string;
  repo?: string;
};

export type BridgeData = {
  repo_root: string | null;
  config_path: string | null;
  tools: string[];
  default_tool: string | null;
  dependencies: Dependency[];
  installed?: Record<string, string[]>;
};

export type ValidateBridgeResult =
  | { ok: true; data: BridgeData }
  | { ok: false; error: string };

export type BridgeLoadSnapshot = {
  data: BridgeData;
  toolIndex: number;
};

export type CommandRunResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

function isStringOrNull(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isStringArrayRecord(value: unknown): value is Record<string, string[]> {
  if (!value || typeof value !== "object") {
    return false;
  }
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof k !== "string" || !isStringArray(v)) {
      return false;
    }
  }
  return true;
}

function isCandidatesByTool(value: unknown): value is Record<string, string[]> {
  return isStringArrayRecord(value);
}

function isDependency(value: unknown): value is Dependency {
  if (!value || typeof value !== "object") {
    return false;
  }
  const dep = value as Record<string, unknown>;
  if (typeof dep.identifier !== "string") {
    return false;
  }
  if (typeof dep.is_local !== "boolean" || typeof dep.installed !== "boolean") {
    return false;
  }
  if (dep.handle !== undefined && !isStringOrNull(dep.handle)) {
    return false;
  }
  if (dep.path !== undefined && !isStringOrNull(dep.path)) {
    return false;
  }
  if (dep.skill_md_path !== undefined && !isStringOrNull(dep.skill_md_path)) {
    return false;
  }
  if (dep.candidates_by_tool !== undefined && !isCandidatesByTool(dep.candidates_by_tool)) {
    return false;
  }
  return true;
}

export function validateBridgeData(raw: unknown): ValidateBridgeResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Bridge output must be a JSON object" };
  }
  const obj = raw as Record<string, unknown>;
  if (!isStringOrNull(obj.repo_root)) {
    return { ok: false, error: "bridge.repo_root must be string|null" };
  }
  if (!isStringOrNull(obj.config_path)) {
    return { ok: false, error: "bridge.config_path must be string|null" };
  }
  if (!isStringArray(obj.tools)) {
    return { ok: false, error: "bridge.tools must be string[]" };
  }
  if (!isStringOrNull(obj.default_tool)) {
    return { ok: false, error: "bridge.default_tool must be string|null" };
  }
  if (!Array.isArray(obj.dependencies) || !obj.dependencies.every((d) => isDependency(d))) {
    return { ok: false, error: "bridge.dependencies must be Dependency[]" };
  }
  if (obj.installed !== undefined && !isStringArrayRecord(obj.installed)) {
    return { ok: false, error: "bridge.installed must be Record<string, string[]>" };
  }
  return {
    ok: true,
    data: {
      repo_root: obj.repo_root,
      config_path: obj.config_path,
      tools: obj.tools,
      default_tool: obj.default_tool,
      dependencies: obj.dependencies,
      installed: obj.installed,
    },
  };
}

export function buildBridgeLoadSnapshot(stdout: string): { ok: true; snapshot: BridgeLoadSnapshot } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON";
    return { ok: false, error: `Bridge JSON parse failed: ${message}` };
  }
  const validated = validateBridgeData(parsed);
  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }
  return {
    ok: true,
    snapshot: {
      data: validated.data,
      toolIndex: 0,
    },
  };
}

export function formatLoadDataFailureStatus(message: string): string {
  return `Failed to load config: ${message} (press c to retry)`;
}

export function mapCommandFailureStatus(stderr: string, exitCode: number): string {
  const stderrLower = stderr.toLowerCase();
  if (stderrLower.includes("uv") && stderrLower.includes("not found")) {
    return "Command failed: uv not found (install uv or update PATH) (press c to retry)";
  }
  if (stderrLower.includes("python") && stderrLower.includes("not found")) {
    return "Command failed: python not found (install Python or update PATH) (press c to retry)";
  }
  if (stderrLower.includes("agrx") && stderrLower.includes("not found")) {
    return "Command failed: agrx not found (install agr or update PATH) (press c to retry)";
  }
  if (stderrLower.includes("agr") && stderrLower.includes("not found")) {
    return "Command failed: agr not found (install agr or update PATH) (press c to retry)";
  }
  return `Command failed (${exitCode})`;
}

export async function executeCommandWithRunner(input: {
  args: string[];
  hasAgrToml: boolean;
  runner: (args: string[]) => Promise<CommandRunResult>;
}): Promise<{ blocked: boolean; result: CommandRunResult; status: string }> {
  if (shouldBlockForMissingConfig(input.args, input.hasAgrToml)) {
    return {
      blocked: true,
      result: { exitCode: 1, stdout: "", stderr: "missing agr.toml" },
      status: "Error: agr.toml missing in current directory",
    };
  }

  const result = await input.runner(input.args);
  if (result.exitCode === 0) {
    return { blocked: false, result, status: "Done" };
  }
  return { blocked: false, result, status: mapCommandFailureStatus(result.stderr, result.exitCode) };
}

export function needsAgrTomlForCommand(args: string[]): boolean {
  const isAgrCommand = args[0] === "uv" && (args[2] === "agr" || args[2] === "agrx");
  if (!isAgrCommand) {
    return false;
  }
  const agrSub = args[3] ?? "";
  return args[2] === "agr" && ["add", "remove", "sync"].includes(agrSub);
}

export function shouldBlockForMissingConfig(args: string[], hasAgrToml: boolean): boolean {
  return needsAgrTomlForCommand(args) && !hasAgrToml;
}

export function buildRunSelectedArgs(input: {
  identifier: string;
  tool: string | null;
  interactive: boolean;
  prompt: string;
  extraArgs: string[];
}): string[] {
  const args = ["uv", "run", "agrx", input.identifier];
  if (input.prompt) {
    args.push("--prompt", input.prompt);
  }
  if (input.tool) {
    args.push("--tool", input.tool);
  }
  if (input.interactive) {
    args.push("--interactive");
  }
  if (input.extraArgs.length > 0) {
    args.push(...input.extraArgs);
  }
  return args;
}

export function computeUpdateDiff(
  localSkills: PredefinedSkill[],
  remoteSkills: PredefinedSkill[],
): { added: PredefinedSkill[]; removed: PredefinedSkill[] } {
  const localHandles = new Set(localSkills.map((skill) => skill.handle));
  const remoteHandles = new Set(remoteSkills.map((skill) => skill.handle));
  const added = remoteSkills.filter((skill) => !localHandles.has(skill.handle));
  const removed = localSkills.filter((skill) => !remoteHandles.has(skill.handle));
  return { added, removed };
}

export function buildDetailsLines(input: {
  tab: "Skills" | "Discover";
  predefinedError: string | null;
  predefinedCount: number;
  visiblePredefinedCount: number;
  updateInProgress: boolean;
  hasSource: boolean;
  selectedSkill: { displayLabel: string; sourceLabel: string; handle: string; repo?: string } | null;
  hasData: boolean;
  selectedDependency: Dependency | null;
}): string[] {
  const lines: string[] = [];
  if (input.tab === "Discover") {
    if (input.predefinedError) {
      lines.push(`Discover list error: ${input.predefinedError}`);
      lines.push("Edit skills.json to fix.");
      return lines;
    }
    if (!input.selectedSkill) {
      lines.push("No skills in Discover.");
      if (input.predefinedCount > 0 && input.visiblePredefinedCount === 0) {
        lines.push("All discover skills are already installed.");
      } else if (input.updateInProgress) {
        lines.push("Loading discover list...");
      } else if (input.hasSource) {
        lines.push("Waiting for discover list to load...");
      } else {
        lines.push("Add entries to skills.json.");
      }
      return lines;
    }
    lines.push(`Name: ${input.selectedSkill.displayLabel}`);
    lines.push(`Source: ${input.selectedSkill.sourceLabel}`);
    if (input.selectedSkill.displayLabel !== input.selectedSkill.handle) {
      lines.push(`Handle: ${input.selectedSkill.handle}`);
    }
    if (input.selectedSkill.repo) {
      lines.push(`Repo: ${input.selectedSkill.repo}`);
    }
    lines.push("");
    return lines;
  }

  if (!input.hasData) {
    lines.push("Loading configuration...");
    return lines;
  }
  if (!input.selectedDependency) {
    lines.push("No skills in agr.toml.");
    return lines;
  }
  const dep = input.selectedDependency;
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
  return lines;
}

export function buildHelpLines(tab: "Skills" | "Discover"): string[] {
  if (tab === "Skills") {
    return [
      "Skills shows skills in agr.toml with status.",
      "Press f to filter visible skills.",
      "Press p to pin/unpin selected skill.",
      "Press z to undo last add/remove.",
      "Press L to view run history.",
      "Press v to preview SKILL.md.",
      "Press g to run selected.",
      "Press G to edit run options.",
      "Press T to test the run popup.",
    ];
  }
  return [
    "Discover lists skills from skills.json.",
    "Press f to filter discover skills.",
    "Press p to pin/unpin selected discover skill.",
    "Select one and press i to add it.",
    "Bulk add/remove asks for confirmation.",
    "Press L to view run history.",
    "Edit skills.json to change the source.",
  ];
}

export function buildActionLines(
  tab: "Skills" | "Discover",
  options?: { updateAvailable?: boolean },
): string[] {
  if (tab === "Skills") {
    const lines = [
      "f: filter list",
      "p: pin selected",
      "space: toggle select",
      "i: install selected",
      "r: remove selected",
      "z: undo last add/remove",
      "L: run history",
      "v: show SKILL",
      "g: run",
      "G: run options",
      "u: check updates",
      "a: add skill",
      "d: doctor",
      "T: test popup",
      "c: reload config",
      "H: help",
      "Tab: next panel",
      "Arrow keys: move",
      "q: quit",
    ];
    if (options?.updateAvailable) {
      lines.splice(11, 0, "U: apply update", "s: apply (confirm)", "S: apply + sync");
    }
    return lines;
  }
  return [
    "f: filter list",
    "p: pin selected",
    "i: add selected",
    "z: undo last add/remove",
    "L: run history",
    "y: copy handle/repo",
    "a: add skill",
    "d: doctor",
    "T: test popup",
    "c: reload config",
    "H: help",
    "Tab: next panel",
    "Arrow keys: move",
    "q: quit",
  ];
}
