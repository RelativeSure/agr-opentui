import type { PredefinedSkill } from "../app_logic";
import type { SkillsSource } from "../state";
import { extractSkillName, parseGitHubUrl, parseRepoRef } from "./skills_source";

export function getSkillDisplayLabel(input: {
  skill: PredefinedSkill;
  skillLabelCache: Record<string, string>;
}): string {
  return input.skillLabelCache[input.skill.handle] ?? input.skill.label ?? input.skill.handle;
}

export function getSkillSourceLabel(input: {
  skill: PredefinedSkill;
  predefinedSource: SkillsSource | null;
}): string {
  const { skill, predefinedSource } = input;
  if (skill.repo) {
    return skill.repo;
  }
  if (predefinedSource?.repo) {
    return predefinedSource.repo;
  }
  if (predefinedSource?.url) {
    const parsed = parseGitHubUrl(predefinedSource.url);
    if (parsed) {
      return `${parsed.owner}/${parsed.repo}`;
    }
    try {
      const url = new URL(predefinedSource.url);
      if (url.hostname && url.pathname) {
        return `${url.hostname}${url.pathname}`;
      }
    } catch {
      // ignore parse failure and use raw URL
    }
    return predefinedSource.url;
  }
  const parts = skill.handle.split("/");
  if (parts.length >= 2) {
    return `${parts[0]}/${parts[1]}`;
  }
  return "(unknown)";
}

export function buildSkillMdUrls(input: {
  skill: PredefinedSkill;
  predefinedSource: SkillsSource | null;
}): string[] {
  const repoRef = input.skill.repo ?? getSkillSourceLabel({ skill: input.skill, predefinedSource: input.predefinedSource });
  if (!repoRef || repoRef === "(unknown)") {
    return [];
  }
  const handleParts = input.skill.handle.split("/");
  const tail = handleParts.length >= 3 ? handleParts.slice(2).join("/") : handleParts.slice(-1)[0] || input.skill.handle;
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

export async function resolveSkillLabelWithUi(input: {
  skill: PredefinedSkill;
  predefinedSource: SkillsSource | null;
  skillLabelCache: Record<string, string>;
  skillLabelPending: Set<string>;
  fetchFn?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  onResolved?: () => void;
}): Promise<boolean> {
  const fetchFn = input.fetchFn ?? fetch;
  const handle = input.skill.handle;
  if (!handle || input.skillLabelCache[handle] || input.skillLabelPending.has(handle)) {
    return false;
  }

  input.skillLabelPending.add(handle);
  try {
    const urls = buildSkillMdUrls({ skill: input.skill, predefinedSource: input.predefinedSource });
    for (const url of urls) {
      try {
        const res = await fetchFn(url);
        if (!res.ok) {
          continue;
        }
        const text = await res.text();
        const name = extractSkillName(text);
        if (name) {
          input.skillLabelCache[handle] = name;
          input.onResolved?.();
          return true;
        }
      } catch {
        // ignore and try next URL
      }
    }
    return false;
  } finally {
    input.skillLabelPending.delete(handle);
  }
}
