import { describe, expect, test } from "bun:test";
import type { Dependency } from "../src/app_logic";
import { installSelectedAction, installSelectedBulkAction } from "../src/services/agr_actions";
import { createInitialState } from "../src/state";

function sampleDependency(): Dependency {
  return {
    identifier: "org/repo/skill",
    handle: "org/repo/skill",
    is_local: false,
    installed: false,
    path: null,
  };
}

describe("agr action service", () => {
  test("installSelectedAction blocks when agr.toml is missing", async () => {
    const state = createInitialState();
    state.missingConfig = true;

    const calls: string[][] = [];
    const toasts: string[] = [];
    const statuses: string[] = [];

    await installSelectedAction({
      state,
      selectedDependency: () => sampleDependency(),
      normalizeHandleForAgr: (handle) => handle,
      runCommand: async (args) => {
        calls.push(args);
        return { exitCode: 0, stdout: "", stderr: "" };
      },
      loadData: async () => {},
      showToast: (message) => {
        toasts.push(message);
      },
      setStatus: (message) => {
        statuses.push(message);
      },
      renderMissingConfig: () => {},
      verifyAgrTomlContains: () => {},
    });

    expect(calls).toEqual([]);
    expect(state.missingConfigOpen).toBe(true);
    expect(toasts).toEqual(["Missing agr.toml in current directory"]);
    expect(statuses).toEqual(["Error: agr.toml missing in current directory"]);
  });

  test("installSelectedAction retries add with --overwrite when skill exists", async () => {
    const state = createInitialState();
    state.missingConfig = false;

    const commandCalls: string[][] = [];
    const verified: string[] = [];
    let loadCount = 0;

    await installSelectedAction({
      state,
      selectedDependency: () => sampleDependency(),
      normalizeHandleForAgr: (handle) => handle,
      runCommand: async (args) => {
        commandCalls.push(args);
        if (commandCalls.length === 1) {
          return { exitCode: 1, stdout: "", stderr: "skill already exists" };
        }
        return { exitCode: 0, stdout: "", stderr: "" };
      },
      loadData: async () => {
        loadCount += 1;
      },
      showToast: () => {},
      setStatus: () => {},
      renderMissingConfig: () => {},
      verifyAgrTomlContains: (handle) => {
        verified.push(handle);
      },
    });

    expect(commandCalls).toEqual([
      ["uv", "run", "agr", "add", "org/repo/skill"],
      ["uv", "run", "agr", "add", "--overwrite", "org/repo/skill"],
    ]);
    expect(loadCount).toBe(1);
    expect(verified).toEqual(["org/repo/skill"]);
  });

  test("installSelectedBulkAction retries with --overwrite for selected handles", async () => {
    const state = createInitialState();

    const commandCalls: string[][] = [];
    const verified: string[][] = [];
    let loadCount = 0;

    await installSelectedBulkAction({
      state,
      selectedIds: () => ["org/repo/one", "org/repo/two"],
      installSelected: async () => {},
      normalizeHandleForAgr: (handle) => handle,
      runCommand: async (args) => {
        commandCalls.push(args);
        if (commandCalls.length === 1) {
          return { exitCode: 1, stdout: "", stderr: "already exists at destination" };
        }
        return { exitCode: 0, stdout: "", stderr: "" };
      },
      loadData: async () => {
        loadCount += 1;
      },
      setStatus: () => {},
      verifyAgrTomlContainsMany: (handles) => {
        verified.push(handles);
      },
    });

    expect(commandCalls).toEqual([
      ["uv", "run", "agr", "add", "org/repo/one", "org/repo/two"],
      ["uv", "run", "agr", "add", "--overwrite", "org/repo/one", "org/repo/two"],
    ]);
    expect(loadCount).toBe(1);
    expect(verified).toEqual([["org/repo/one", "org/repo/two"]]);
  });
});
