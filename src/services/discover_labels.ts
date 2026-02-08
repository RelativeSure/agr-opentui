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

  const buildUrl = (branch: string, path: string): string => {
    if (repoInfo.host === "gitlab.com") {
      return `https://gitlab.com/${repoInfo.path}/-/raw/${branch}/${path}`;
    }
    if (repoInfo.host === "bitbucket.org") {
      return `https://bitbucket.org/${repoInfo.path}/raw/${branch}/${path}`;
    }
    return `https://raw.githubusercontent.com/${repoInfo.path}/${branch}/${path}`;
  };

  if (input.skill.skillMdPath) {
    const branch = input.skill.branch?.trim() || "main";
    const explicitPath = input.skill.skillMdPath.trim().replace(/^\/+/, "");
    return [buildUrl(branch, explicitPath)];
  }

  const branchCandidates = [input.skill.branch?.trim(), "main", "master"].filter((item): item is string => Boolean(item));
  const branches = Array.from(new Set(branchCandidates));

  const urls: string[] = [];
  for (const branch of branches) {
    for (const path of paths) {
      urls.push(buildUrl(branch, path));
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
  timeoutMs?: number;
  abortSignal?: AbortSignal;
  onResolved?: () => void;
}): Promise<boolean> {
  const fetchFn = input.fetchFn ?? fetch;
  const timeoutMs = input.timeoutMs ?? 1500;
  const handle = input.skill.handle;
  if (!handle || input.skillLabelCache[handle] || input.skillLabelPending.has(handle)) {
    return false;
  }

  const fetchWithTimeout = async (url: string): Promise<Response> => {
    const controller = new AbortController();
    const onAbort = () => {
      controller.abort();
    };
    input.abortSignal?.addEventListener("abort", onAbort, { once: true });
    const timeout = setTimeout(() => {
      controller.abort();
    }, timeoutMs);
    try {
      return await fetchFn(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
      input.abortSignal?.removeEventListener("abort", onAbort);
    }
  };

  input.skillLabelPending.add(handle);
  try {
    const urls = buildSkillMdUrls({ skill: input.skill, predefinedSource: input.predefinedSource });
    for (const url of urls) {
      if (input.abortSignal?.aborted) {
        return false;
      }
      try {
        const res = await fetchWithTimeout(url);
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
        if (input.abortSignal?.aborted) {
          return false;
        }
        // ignore and try next URL
      }
    }
    return false;
  } finally {
    input.skillLabelPending.delete(handle);
  }
}
