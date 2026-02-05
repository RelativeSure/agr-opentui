export function looksLikeHandleInput(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) {
    return false;
  }
  if (trimmed.startsWith("/") || trimmed.startsWith(".")) {
    return false;
  }
  return trimmed.includes("/");
}

export function hasKnownHandleInSources(input: {
  handle: string;
  predefinedHandles: string[];
  remoteHandles: string[];
}): boolean {
  const normalized = input.handle.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  const known = new Set<string>();
  for (const handle of input.predefinedHandles) {
    known.add(handle.toLowerCase());
  }
  for (const handle of input.remoteHandles) {
    known.add(handle.toLowerCase());
  }
  if (known.size === 0) {
    return true;
  }
  return known.has(normalized);
}
