import type { Dependency, PredefinedSkill } from "../app_logic";
import type { SkillsSource } from "../state";
import { buildSkillMdUrls } from "./discover_labels";

export async function loadPreviewLines(input: {
  dependency?: Dependency | null;
  discoverSkill?: PredefinedSkill | null;
  predefinedSource?: SkillsSource | null;
  readText?: (path: string) => Promise<string>;
  fetchText?: (url: string) => Promise<string>;
  maxLineLength?: number;
}): Promise<string[]> {
  const dep = input.dependency ?? null;
  const discoverSkill = input.discoverSkill ?? null;
  const readText = input.readText;
  const fetchText = input.fetchText;
  const maxLineLength = input.maxLineLength ?? 200;

  const formatLines = (text: string): string[] => text.split(/\r?\n/).map((line) => line.slice(0, maxLineLength));

  if (dep?.skill_md_path && readText) {
    try {
      const text = await readText(dep.skill_md_path);
      return formatLines(text);
    } catch {
      return [];
    }
  }

  if (!discoverSkill || !fetchText) {
    return [];
  }

  const urls = buildSkillMdUrls({
    skill: discoverSkill,
    predefinedSource: input.predefinedSource ?? null,
  });

  for (const url of urls) {
    try {
      const text = await fetchText(url);
      return formatLines(text);
    } catch {
      // ignore and try next URL
    }
  }

  return [];
}
