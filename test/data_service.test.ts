import { describe, expect, test } from "bun:test";
import { loadDataWithUi } from "../src/services/data";
import { createInitialState } from "../src/state";

function bridgeJson(): string {
  return JSON.stringify({
    repo_root: "/repo",
    config_path: "/repo/agr.toml",
    tools: ["claude"],
    default_tool: "claude",
    dependencies: [],
    installed: { claude: [] },
  });
}

describe("loadDataWithUi timing", () => {
  test("stale source triggers immediate update check", async () => {
    const state = createInitialState();
    state.predefinedSource = { url: "https://example.com/skills.json", lastChecked: new Date(0).toISOString() };

    let checkUpdatesCalls = 0;
    let timeoutCalls = 0;

    await loadDataWithUi({
      state,
      cwd: "/repo",
      deps: {
        existsSync: () => true,
        now: () => 7 * 60 * 60 * 1000,
        setTimeout: () => {
          timeoutCalls += 1;
          return 0;
        },
      },
      loadPredefined: () => {},
      renderList: () => {},
      renderDetails: () => {},
      checkUpdates: async () => {
        checkUpdatesCalls += 1;
        state.updateRemote = [];
      },
      writeSkillsFile: () => {},
      runBridge: async () => ({ exitCode: 0, stdout: bridgeJson(), stderr: "" }),
      setStatus: () => {},
      renderAll: () => {},
      refreshPreview: async () => {},
    });

    expect(checkUpdatesCalls).toBe(1);
    expect(timeoutCalls).toBe(0);
    expect(state.data?.repo_root).toBe("/repo");
  });

  test("fresh source schedules async update check when never checked this session", async () => {
    const state = createInitialState();
    const now = Date.now();
    state.predefinedSource = { url: "https://example.com/skills.json", lastChecked: new Date(now - 1000).toISOString() };
    state.updateCheckedAt = null;

    let checkUpdatesCalls = 0;
    let timeoutCalls = 0;

    await loadDataWithUi({
      state,
      cwd: "/repo",
      deps: {
        existsSync: () => true,
        now: () => now,
        setTimeout: () => {
          timeoutCalls += 1;
          return 0;
        },
      },
      loadPredefined: () => {},
      renderList: () => {},
      renderDetails: () => {},
      checkUpdates: async () => {
        checkUpdatesCalls += 1;
      },
      writeSkillsFile: () => {},
      runBridge: async () => ({ exitCode: 0, stdout: bridgeJson(), stderr: "" }),
      setStatus: () => {},
      renderAll: () => {},
      refreshPreview: async () => {},
    });

    expect(timeoutCalls).toBe(1);
    expect(checkUpdatesCalls).toBe(0);
    expect(state.data?.tools).toEqual(["claude"]);
  });
});
