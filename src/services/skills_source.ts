import type { PredefinedSkill } from "../app_logic";
import { DEFAULT_SKILLS_SOURCE, type SkillsSource } from "../state";

export type GitHubUrlParts = { owner: string; repo: string; branch: string; path: string };

export function normalizeSkills(items: Array<string | PredefinedSkill>): PredefinedSkill[] {
  const normalized: PredefinedSkill[] = [];
  for (const item of items) {
    if (typeof item === "string") {
      const handle = item.trim();
      if (!handle) {
        continue;
      }
      normalized.push({ label: handle, handle });
    } else if (item && typeof item === "object") {
      const maybe = item as { label?: unknown; handle?: unknown; repo?: unknown; branch?: unknown; skillMdPath?: unknown };
      const handle = typeof maybe.handle === "string" ? maybe.handle.trim() : "";
      if (!handle) {
        continue;
      }
      const label = typeof maybe.label === "string" && maybe.label.trim().length > 0 ? maybe.label.trim() : handle;
      const repo = typeof maybe.repo === "string" && maybe.repo.trim().length > 0 ? maybe.repo.trim() : undefined;
      const branch = typeof maybe.branch === "string" && maybe.branch.trim().length > 0 ? maybe.branch.trim() : undefined;
      const skillMdPath =
        typeof maybe.skillMdPath === "string" && maybe.skillMdPath.trim().length > 0 ? maybe.skillMdPath.trim() : undefined;
      normalized.push({ label, handle, repo, branch, skillMdPath });
    }
  }
  return normalized;
}

export function normalizeSource(source?: SkillsSource | null): SkillsSource {
  return {
    ...DEFAULT_SKILLS_SOURCE,
    ...(source ?? {}),
    format: source?.format ?? "skills-json",
  };
}

export function getSkillsSource(source: SkillsSource | null): SkillsSource {
  if (source) {
    return normalizeSource(source);
  }
  return normalizeSource(null);
}

export function buildSkillFromHandle(handle: string): PredefinedSkill {
  const skill: PredefinedSkill = { label: handle, handle };
  const parts = handle.split("/");
  if (parts.length === 3) {
    skill.repo = `${parts[0]}/${parts[1]}`;
  } else if (parts.length === 2) {
    skill.repo = `${parts[0]}/agent-resources`;
  }
  return skill;
}

export function normalizeSkillsFromAgrToml(tomlText: string): PredefinedSkill[] {
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
    const fallbackRegex = /"([^"]+\/[^\"]+)"/g;
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

export function normalizeSourceUrl(url: string): string {
  const match = url.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/);
  if (match) {
    const [, owner, repo, branch, path] = match;
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
  }
  return url;
}

export function parseGitHubUrl(url?: string): GitHubUrlParts | null {
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

export function buildRawUrl(source: SkillsSource): string | null {
  if (source.url) {
    return normalizeSourceUrl(source.url);
  }
  if (!source.repo || !source.path) {
    return null;
  }
  const branch = source.branch ?? "main";
  return `https://raw.githubusercontent.com/${source.repo}/${branch}/${source.path}`;
}

export function buildCommitApiUrl(source: SkillsSource): string | null {
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

export function getSourceRepoRef(source: SkillsSource | null): string | null {
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

export function getSourceRepoParts(source: SkillsSource | null): { owner: string; repo: string } | null {
  const ref = getSourceRepoRef(source);
  if (!ref) {
    return null;
  }
  const parts = ref.split("/");
  if (parts.length < 2) {
    return null;
  }
  return { owner: parts[0], repo: parts[1] };
}

export function buildHandleFromSource(skillName: string, source: SkillsSource | null): string {
  const parts = getSourceRepoParts(source);
  if (!parts) {
    return skillName;
  }
  if (parts.repo === "agent-resources") {
    return `${parts.owner}/${skillName}`;
  }
  return `${parts.owner}/${parts.repo}/${skillName}`;
}

function normalizeRelativeHandle(relative: string, source: SkillsSource | null): string {
  const cleaned = relative.replace(/^\.?\/?/, "").replace(/^skills\//, "");
  const parts = cleaned.split("/").filter(Boolean);
  const skillName = parts[parts.length - 1] ?? cleaned;
  return buildHandleFromSource(skillName, source);
}

export function normalizeHandleForAgr(handle: string, source: SkillsSource | null): string {
  const trimmed = handle.trim();
  if (!trimmed) {
    return trimmed;
  }
  if (trimmed.startsWith("./")) {
    const rest = trimmed.slice(2);
    return normalizeRelativeHandle(rest, source);
  }
  if (trimmed.startsWith("skills/") || trimmed.startsWith(".claude/skills/")) {
    return normalizeRelativeHandle(trimmed.replace(/^\.?claude\//, ""), source);
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

export function handleVariants(handle: string, source: SkillsSource | null): string[] {
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
  const fromSource = buildHandleFromSource(lastSegment, source);
  variants.add(fromSource);
  const repo = getSourceRepoRef(source);
  if (repo) {
    for (const v of Array.from(variants)) {
      if (!v.includes("/")) {
        variants.add(buildHandleFromSource(v, source));
      } else if (!v.startsWith(repo + "/") && !v.startsWith("http")) {
        variants.add(`${repo}/${v}`);
      }
    }
  }
  return Array.from(variants);
}

export function parseRepoRef(repoRef: string): { host: string; path: string } | null {
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

export function extractSkillName(text: string): string | null {
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
