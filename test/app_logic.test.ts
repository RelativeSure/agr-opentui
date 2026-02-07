import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  buildActionLines,
  buildBridgeCommand,
  buildBridgeLoadSnapshot,
  buildDetailsLines,
  buildHelpLines,
  buildRunSelectedArgs,
  computeUpdateDiff,
  executeCommandWithRunner,
  formatLoadDataFailureStatus,
  mapCommandFailureStatus,
  shouldBlockForMissingConfig,
  validateBridgeData,
  type Dependency,
  type PredefinedSkill,
} from "../src/app_logic";

describe("bridge validation", () => {
  test("accepts valid bridge payload", () => {
    const raw = {
      repo_root: "/repo",
      config_path: "/repo/agr.toml",
      tools: ["claude", "codex"],
      default_tool: "claude",
      dependencies: [
        {
          identifier: "foo/bar/skill",
          is_local: false,
          installed: true,
          handle: "foo/bar/skill",
        },
      ],
      installed: {
        claude: ["foo/bar/skill"],
      },
    };

    const result = validateBridgeData(raw);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.dependencies).toHaveLength(1);
      expect(result.data.tools).toEqual(["claude", "codex"]);
    }
  });

  test("rejects malformed bridge payload", () => {
    const result = validateBridgeData({
      repo_root: "/repo",
      config_path: null,
      tools: "claude",
      default_tool: null,
      dependencies: [],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("bridge.tools");
    }
  });
});

describe("command guard and run args", () => {
  test("blocks agr add/remove/sync when agr.toml is missing", () => {
    expect(shouldBlockForMissingConfig(["uv", "run", "agr", "add", "x/y"], false)).toBe(true);
    expect(shouldBlockForMissingConfig(["uv", "run", "agr", "remove", "x/y"], false)).toBe(true);
    expect(shouldBlockForMissingConfig(["uv", "run", "agr", "sync"], false)).toBe(true);
  });

  test("does not block agrx run when agr.toml is missing", () => {
    expect(shouldBlockForMissingConfig(["uv", "run", "agrx", "x/y"], false)).toBe(false);
  });

  test("builds run args with all options", () => {
    const args = buildRunSelectedArgs({
      identifier: "acme/tooling",
      tool: "claude",
      interactive: true,
      prompt: "fix this",
      extraArgs: ["--dry-run", "--verbose"],
    });

    expect(args).toEqual([
      "uv",
      "run",
      "agrx",
      "acme/tooling",
      "--prompt",
      "fix this",
      "--tool",
      "claude",
      "--interactive",
      "--dry-run",
      "--verbose",
    ]);
  });

  test("uses launcher python for bridge when available", () => {
    const args = buildBridgeCommand({ AGR_OPENTUI_LAUNCHER_PYTHON: "/tmp/tool-venv/bin/python3" });
    expect(args).toEqual(["/tmp/tool-venv/bin/python3", "-m", "agr_opentui.bridge"]);
  });

  test("falls back to uv run python bridge command without launcher python", () => {
    const args = buildBridgeCommand({});
    expect(args).toEqual(["uv", "run", "python", "-m", "agr_opentui.bridge"]);
  });
});

describe("discover update diff", () => {
  test("computes added and removed skills", () => {
    const local: PredefinedSkill[] = [
      { label: "A", handle: "o/r/a" },
      { label: "B", handle: "o/r/b" },
    ];
    const remote: PredefinedSkill[] = [
      { label: "B", handle: "o/r/b" },
      { label: "C", handle: "o/r/c" },
    ];

    const diff = computeUpdateDiff(local, remote);
    expect(diff.added.map((s) => s.handle)).toEqual(["o/r/c"]);
    expect(diff.removed.map((s) => s.handle)).toEqual(["o/r/a"]);
  });
});

describe("details render state lines", () => {
  test("discover error state", () => {
    const lines = buildDetailsLines({
      tab: "Discover",
      predefinedError: "skills.json parse failed",
      predefinedCount: 0,
      visiblePredefinedCount: 0,
      updateInProgress: false,
      hasSource: false,
      selectedSkill: null,
      hasData: false,
      selectedDependency: null,
    });

    expect(lines[0]).toContain("Discover list error:");
  });

  test("skills loading state", () => {
    const lines = buildDetailsLines({
      tab: "Skills",
      predefinedError: null,
      predefinedCount: 0,
      visiblePredefinedCount: 0,
      updateInProgress: false,
      hasSource: false,
      selectedSkill: null,
      hasData: false,
      selectedDependency: null,
    });

    expect(lines).toEqual(["Loading configuration..."]);
  });

  test("skills selected state includes install/source", () => {
    const dep: Dependency = {
      identifier: "o/r/skill",
      installed: true,
      is_local: false,
      handle: "o/r/skill",
      path: null,
    };
    const lines = buildDetailsLines({
      tab: "Skills",
      predefinedError: null,
      predefinedCount: 0,
      visiblePredefinedCount: 0,
      updateInProgress: false,
      hasSource: false,
      selectedSkill: null,
      hasData: true,
      selectedDependency: dep,
    });

    expect(lines).toContain("Selected: o/r/skill");
    expect(lines).toContain("Installed: yes");
    expect(lines).toContain("Source: remote");
  });
});

describe("integration smoke: bridge file -> load snapshot", () => {
  test("maps mocked bridge json into loadData snapshot shape", () => {
    const dir = mkdtempSync(join(tmpdir(), "agr-opentui-test-"));
    const file = join(dir, "bridge.json");
    const mocked = {
      repo_root: "/tmp/repo",
      config_path: "/tmp/repo/agr.toml",
      tools: ["claude", "codex"],
      default_tool: "claude",
      dependencies: [
        {
          identifier: "org/repo/skill",
          handle: "org/repo/skill",
          path: null,
          is_local: false,
          installed: true,
          skill_md_path: null,
        },
      ],
      installed: {
        claude: ["org/repo/skill"],
      },
    };
    writeFileSync(file, `${JSON.stringify(mocked)}\n`, "utf-8");

    const stdout = readFileSync(file, "utf-8");
    const result = buildBridgeLoadSnapshot(stdout);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.toolIndex).toBe(0);
      expect(result.snapshot.data.repo_root).toBe("/tmp/repo");
      expect(result.snapshot.data.dependencies[0]?.identifier).toBe("org/repo/skill");
      expect(result.snapshot.data.tools).toEqual(["claude", "codex"]);
    }
  });
});

describe("loadData failure status mapping", () => {
  test("bad json maps to retry status text", () => {
    const result = buildBridgeLoadSnapshot("{bad json");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const status = formatLoadDataFailureStatus(result.error);
      expect(status).toContain("Failed to load config:");
      expect(status).toContain("(press c to retry)");
      expect(status).toContain("Bridge JSON parse failed:");
    }
  });

  test("missing bridge fields maps to retry status text", () => {
    const result = buildBridgeLoadSnapshot(
      JSON.stringify({
        repo_root: "/tmp/repo",
        config_path: null,
        tools: "not-an-array",
        default_tool: null,
        dependencies: [],
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const status = formatLoadDataFailureStatus(result.error);
      expect(status).toBe("Failed to load config: bridge.tools must be string[] (press c to retry)");
    }
  });
});

describe("integration smoke: mocked command run", () => {
  test("blocks agr add when agr.toml is missing", async () => {
    const result = await executeCommandWithRunner({
      args: ["uv", "run", "agr", "add", "org/repo/skill"],
      hasAgrToml: false,
      runner: async () => ({ exitCode: 0, stdout: "unused", stderr: "" }),
    });

    expect(result.blocked).toBe(true);
    expect(result.result.exitCode).toBe(1);
    expect(result.result.stderr).toContain("missing agr.toml");
    expect(result.status).toBe("Error: agr.toml missing in current directory");
  });

  test("maps stderr into user-facing status", async () => {
    const result = await executeCommandWithRunner({
      args: ["uv", "run", "agrx", "org/repo/skill"],
      hasAgrToml: false,
      runner: async () => ({ exitCode: 127, stdout: "", stderr: "uv: command not found" }),
    });

    expect(result.blocked).toBe(false);
    expect(result.result.exitCode).toBe(127);
    expect(result.status).toBe(mapCommandFailureStatus("uv: command not found", 127));
  });

  test("maps agrx not found before generic agr not found", () => {
    const status = mapCommandFailureStatus("agrx: command not found", 127);
    expect(status).toBe("Command failed: agrx not found (install agr or update PATH) (press c to retry)");
  });

  test("cwd-focused config check only blocks when agr.toml is missing in that cwd", () => {
    const dir = mkdtempSync(join(tmpdir(), "agr-opentui-cwd-"));
    const args = ["uv", "run", "agr", "add", "org/repo/skill"];

    const before = shouldBlockForMissingConfig(args, existsSync(join(dir, "agr.toml")));
    expect(before).toBe(true);

    writeFileSync(join(dir, "agr.toml"), "dependencies = []\n", "utf-8");
    const after = shouldBlockForMissingConfig(args, existsSync(join(dir, "agr.toml")));
    expect(after).toBe(false);
  });
});

describe("help/action line snapshots", () => {
  test("skills action lines stay stable", () => {
    expect(buildActionLines("Skills", { updateAvailable: true })).toEqual([
      "f: filter list",
      "p: pin selected",
      "space: toggle select",
      "i: install selected",
      "r: remove selected",
      "z: undo last add/remove",
      "L: run history",
      "v: show SKILL",
      "g: run",
      "G: run options",
      "u: check updates",
      "U: apply update",
      "s: apply (confirm)",
      "S: apply + sync",
      "a: add skill",
      "d: doctor",
      "T: test popup",
      "c: reload config",
      "H: help",
      "Tab: next panel",
      "Arrow keys: move",
      "q: quit",
    ]);
  });

  test("skills action lines hide apply actions when no update is available", () => {
    expect(buildActionLines("Skills", { updateAvailable: false })).toEqual([
      "f: filter list",
      "p: pin selected",
      "space: toggle select",
      "i: install selected",
      "r: remove selected",
      "z: undo last add/remove",
      "L: run history",
      "v: show SKILL",
      "g: run",
      "G: run options",
      "u: check updates",
      "a: add skill",
      "d: doctor",
      "T: test popup",
      "c: reload config",
      "H: help",
      "Tab: next panel",
      "Arrow keys: move",
      "q: quit",
    ]);
  });

  test("discover help lines stay stable", () => {
    expect(buildHelpLines("Discover")).toEqual([
      "Discover list is embedded in the binary.",
      "Press f to filter discover skills.",
      "Press p to pin/unpin selected discover skill.",
      "Select one and press i to add it.",
      "Press v to preview SKILL.md.",
      "Bulk add/remove asks for confirmation.",
      "Press L to view run history.",
      "Rebuild binary to refresh discover source.",
    ]);
  });

  test("discover action lines stay stable", () => {
    expect(buildActionLines("Discover")).toEqual([
      "f: filter list",
      "p: pin selected",
      "i: add selected",
      "z: undo last add/remove",
      "L: run history",
      "v: show SKILL",
      "y: copy handle/repo",
      "a: add skill",
      "d: doctor",
      "T: test popup",
      "c: reload config",
      "H: help",
      "Tab: next panel",
      "Arrow keys: move",
      "q: quit",
    ]);
  });
});
