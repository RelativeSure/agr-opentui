import type { Dependency } from "../app_logic";

export async function loadPreviewLines(input: {
  dependency: Dependency | null;
  readText: (path: string) => Promise<string>;
  maxLineLength?: number;
}): Promise<string[]> {
  const dep = input.dependency;
  if (!dep?.skill_md_path) {
    return [];
  }
  try {
    const text = await input.readText(dep.skill_md_path);
    const maxLineLength = input.maxLineLength ?? 200;
    return text.split(/\r?\n/).map((line) => line.slice(0, maxLineLength));
  } catch {
    return [];
  }
}
