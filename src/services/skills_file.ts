import { join } from "node:path";
import type { PredefinedSkill } from "../app_logic";
import type { SkillsFile, SkillsSource } from "../state";

export type LoadedSkillsData = {
  predefined: PredefinedSkill[];
  predefinedError: string | null;
  predefinedSource: SkillsSource | null;
  predefinedFormat: "array" | "object";
};

export function loadPredefinedFromDisk(input: {
  cwd: string;
  existsSync: (path: string) => boolean;
  readFileSync: (path: string, encoding: BufferEncoding) => string;
  normalizeSkills: (items: Array<string | PredefinedSkill>) => PredefinedSkill[];
  normalizeSource: (source?: SkillsSource | null) => SkillsSource;
}): LoadedSkillsData {
  const path = join(input.cwd, "skills.json");
  try {
    if (!input.existsSync(path)) {
      return {
        predefined: [],
        predefinedError: "skills.json not found",
        predefinedSource: null,
        predefinedFormat: "array",
      };
    }
    const raw = input.readFileSync(path, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return {
        predefined: input.normalizeSkills(parsed as Array<string | PredefinedSkill>),
        predefinedError: null,
        predefinedSource: null,
        predefinedFormat: "array",
      };
    }
    if (parsed && typeof parsed === "object") {
      const obj = parsed as SkillsFile;
      const predefined = Array.isArray(obj.skills) ? input.normalizeSkills(obj.skills) : [];
      return {
        predefined,
        predefinedError: null,
        predefinedSource: input.normalizeSource(obj.source),
        predefinedFormat: "object",
      };
    }
    return {
      predefined: [],
      predefinedError: "skills.json must be an array or object",
      predefinedSource: null,
      predefinedFormat: "array",
    };
  } catch (error) {
    return {
      predefined: [],
      predefinedError: error instanceof Error ? error.message : "Failed to read skills.json",
      predefinedSource: null,
      predefinedFormat: "array",
    };
  }
}

export function writeSkillsFileToDisk(input: {
  cwd: string;
  predefinedFormat: "array" | "object";
  skills: PredefinedSkill[];
  source: SkillsSource | null;
  normalizeSource: (source?: SkillsSource | null) => SkillsSource;
  writeFileSync: (path: string, data: string, encoding: BufferEncoding) => void;
}): void {
  const path = join(input.cwd, "skills.json");
  if (input.predefinedFormat === "array" && !input.source) {
    const payload = input.skills.map((skill) => skill.handle);
    input.writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
    return;
  }
  const payload: SkillsFile = {
    source: input.source ? input.normalizeSource(input.source) : undefined,
    skills: input.skills.map((skill) => {
      const entry: PredefinedSkill = { label: skill.label, handle: skill.handle };
      if (skill.repo) {
        entry.repo = skill.repo;
      }
      return entry;
    }),
  };
  input.writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
}
