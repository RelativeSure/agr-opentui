import { computeUpdateDiff, type PredefinedSkill } from "../app_logic";
import type { SkillsFile, SkillsSource, State } from "../state";
import { buildCommitApiUrl, buildRawUrl, normalizeSkills, normalizeSkillsFromAgrToml } from "./skills_source";

export function resetUpdateState(state: State): void {
  state.updateRemote = [];
  state.updateCandidates = [];
  state.updateRemoved = [];
  state.updateAvailable = false;
  state.updateError = null;
}

function clearUpdateStateOnFailure(state: State, message: string): void {
  resetUpdateState(state);
  state.updateError = message;
  state.updateCheckedAt = new Date().toISOString();
  state.updateInProgress = false;
}

export async function checkUpdatesWithUi(input: {
  state: State;
  source: SkillsSource;
  fetchFn?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  nowMs?: () => number;
  setStatus: (message: string, options?: { clearAfterMs?: number }) => void;
  logEvent: (message: string) => void;
  renderAll: () => void;
}): Promise<void> {
  const fetchFn = input.fetchFn ?? fetch;
  const nowMs = input.nowMs ?? (() => Date.now());
  const { state, source } = input;

  const rawUrl = buildRawUrl(source);
  if (!rawUrl) {
    input.setStatus("No source URL configured");
    return;
  }

  const now = nowMs();
  const cooldownMs = 5 * 60 * 1000;
  if (state.updateLastRequestedAt && now - state.updateLastRequestedAt < cooldownMs) {
    const remaining = Math.ceil((cooldownMs - (now - state.updateLastRequestedAt)) / 1000);
    input.setStatus(`Update check rate-limited (${remaining}s)`, { clearAfterMs: 2500 });
    return;
  }

  state.updateLastRequestedAt = now;
  state.updateInProgress = true;
  input.logEvent(`Update check started: ${rawUrl}`);
  input.setStatus("Checking for skill updates...");
  state.updateError = null;
  state.updateCheckedAt = null;
  state.updateCommit = null;

  try {
    const commitUrl = buildCommitApiUrl(source);
    if (commitUrl) {
      const commitRes = await fetchFn(commitUrl, {
        headers: { Accept: "application/vnd.github+json" },
      });
      if (commitRes.ok) {
        const commits = (await commitRes.json()) as Array<{ sha?: string }>;
        const latest = commits[0];
        if (latest?.sha) {
          state.updateCommit = latest.sha;
        }
      }
    }

    const res = await fetchFn(rawUrl);
    if (!res.ok) {
      clearUpdateStateOnFailure(state, `Fetch failed (${res.status})`);
      input.setStatus("Update check failed");
      input.logEvent(`Update check failed: fetch ${res.status}`);
      input.renderAll();
      return;
    }

    const text = await res.text();
    let remoteSkills: PredefinedSkill[] = [];
    if (source.format === "agr-toml") {
      remoteSkills = normalizeSkillsFromAgrToml(text);
      input.logEvent(`Parsed agr.toml skills: ${remoteSkills.length}`);
    } else {
      const parsed = JSON.parse(text) as unknown;
      if (Array.isArray(parsed)) {
        remoteSkills = normalizeSkills(parsed as Array<string | PredefinedSkill>);
      } else if (parsed && typeof parsed === "object") {
        const obj = parsed as SkillsFile;
        if (!Array.isArray(obj.skills)) {
          clearUpdateStateOnFailure(state, "Remote skills.json missing skills array");
          input.setStatus("Update check failed");
          input.logEvent("Update check failed: remote skills.json missing skills array");
          input.renderAll();
          return;
        }
        remoteSkills = normalizeSkills(obj.skills);
      } else {
        clearUpdateStateOnFailure(state, "Remote skills.json invalid format");
        input.setStatus("Update check failed");
        input.logEvent("Update check failed: remote skills.json invalid format");
        input.renderAll();
        return;
      }
    }

    const diff = computeUpdateDiff(state.predefined, remoteSkills);
    state.updateRemote = remoteSkills;
    state.updateCandidates = diff.added;
    state.updateRemoved = diff.removed;
    state.updateAvailable = diff.added.length > 0 || diff.removed.length > 0;
    state.updateCheckedAt = new Date().toISOString();
    if (remoteSkills.length === 0) {
      state.updateError = "No skills found in source";
    }
    state.updateInProgress = false;
    input.setStatus(state.updateAvailable ? "Updates available" : "No updates found", { clearAfterMs: 2500 });
    input.logEvent(
      `Update check complete: added=${state.updateCandidates.length} removed=${state.updateRemoved.length} available=${state.updateAvailable}`,
    );
    input.renderAll();
  } catch (error) {
    clearUpdateStateOnFailure(state, error instanceof Error ? error.message : "Update check failed");
    input.setStatus("Update check failed");
    input.logEvent(`Update check failed: ${String(error)}`);
    input.renderAll();
  }
}

export async function applyUpdatesWithUi(input: {
  state: State;
  writeSkillsFile: (skills: PredefinedSkill[], source: SkillsSource | null) => void;
  loadPredefined: () => void;
  setStatus: (message: string, options?: { clearAfterMs?: number }) => void;
  renderAll: () => void;
}): Promise<void> {
  const { state } = input;
  if (!state.updateAvailable) {
    return;
  }
  const now = new Date().toISOString();
  const source = state.predefinedSource
    ? { ...state.predefinedSource, lastCommit: state.updateCommit ?? state.predefinedSource.lastCommit, lastChecked: now }
    : null;
  input.writeSkillsFile(state.updateRemote, source);
  input.loadPredefined();
  input.setStatus("skills.json updated", { clearAfterMs: 2500 });
  input.renderAll();
}

export async function applyUpdatesAndSyncWithUi(input: {
  state: State;
  applyUpdates: () => Promise<void>;
  runCommand: (args: string[]) => Promise<{ exitCode: number; stdout: string; stderr: string }>;
  loadData: () => Promise<void>;
}): Promise<void> {
  if (!input.state.updateAvailable) {
    return;
  }
  await input.applyUpdates();
  await input.runCommand(["uv", "run", "agr", "sync"]);
  await input.loadData();
}
