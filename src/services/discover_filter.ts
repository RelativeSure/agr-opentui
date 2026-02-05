import type { BridgeData, PredefinedSkill } from "../app_logic";

export function getInstalledHandleSet(data: BridgeData | null): Set<string> {
  const set = new Set<string>();
  const deps = data?.dependencies ?? [];
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

export function getInstalledNameSet(data: BridgeData | null): Set<string> {
  const set = new Set<string>();
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

export function isInstalledByName(input: {
  handle: string;
  installedNames: Set<string>;
  handleVariants: (handle: string) => string[];
}): boolean {
  if (input.installedNames.size === 0) {
    return false;
  }
  const variants = input.handleVariants(input.handle).map((v) => v.toLowerCase());
  for (const variant of variants) {
    if (input.installedNames.has(variant)) {
      return true;
    }
    const parts = variant.split("/");
    const last = parts[parts.length - 1];
    if (last && input.installedNames.has(last)) {
      return true;
    }
  }
  return false;
}

export function filterInstalledPredefined(input: {
  skills: PredefinedSkill[];
  data: BridgeData | null;
  installedOverrides: Set<string>;
  handleVariants: (handle: string) => string[];
}): PredefinedSkill[] {
  if (!input.data) {
    if (input.installedOverrides.size === 0) {
      return input.skills;
    }
    return input.skills.filter((skill) => !input.installedOverrides.has(skill.handle.toLowerCase()));
  }

  const installed = getInstalledHandleSet(input.data);
  const installedNames = getInstalledNameSet(input.data);
  for (const handle of input.installedOverrides) {
    installed.add(handle);
  }

  return input.skills.filter((skill) => {
    const handle = skill.handle.toLowerCase();
    if (installed.has(handle)) {
      return false;
    }
    if (isInstalledByName({ handle, installedNames, handleVariants: input.handleVariants })) {
      return false;
    }
    return true;
  });
}
