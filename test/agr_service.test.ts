import { describe, expect, test } from "bun:test";
import { runCommandWithUi } from "../src/services/agr";
import { createInitialState } from "../src/state";

function streamFromText(text: string): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    },
  });
}

describe("runCommandWithUi with injected deps", () => {
  test("auto-creates agr.toml and runs agr add when missing", async () => {
    const state = createInitialState();
    let spawnCalls = 0;
    const writes: Array<{ path: string; data: string }> = [];
    let hasConfig = false;

    const result = await runCommandWithUi({
      state,
      args: ["uv", "run", "agr", "add", "org/repo/skill"],
      cwd: "/repo",
      deps: {
        existsSync: () => hasConfig,
        writeFileSync: (path, data) => {
          writes.push({ path, data });
          hasConfig = true;
        },
        env: () => ({}),
        spawn: () => {
          spawnCalls += 1;
          return {
            stdout: streamFromText(""),
            stderr: streamFromText(""),
            exited: Promise.resolve(0),
          };
        },
      },
      onRenderRunModal: () => {},
      onSetStatus: () => {},
      onShowToast: () => {},
      onOpenVerify: () => {},
      onLogEvent: () => {},
    });

    expect(result.exitCode).toBe(0);
    expect(spawnCalls).toBe(1);
    expect(writes).toEqual([{ path: "/repo/agr.toml", data: "dependencies = []\n" }]);
  });

  test("blocks agr remove when agr.toml is missing", async () => {
    const state = createInitialState();
    let spawnCalls = 0;
    const statuses: string[] = [];
    const toasts: string[] = [];

    const result = await runCommandWithUi({
      state,
      args: ["uv", "run", "agr", "remove", "org/repo/skill"],
      cwd: "/repo",
      deps: {
        existsSync: () => false,
        writeFileSync: () => {},
        env: () => ({}),
        spawn: () => {
          spawnCalls += 1;
          return {
            stdout: streamFromText(""),
            stderr: streamFromText(""),
            exited: Promise.resolve(0),
          };
        },
      },
      onRenderRunModal: () => {},
      onSetStatus: (message) => {
        statuses.push(message);
      },
      onShowToast: (message) => {
        toasts.push(message);
      },
      onOpenVerify: () => {},
      onLogEvent: () => {},
    });

    expect(result.exitCode).toBe(1);
    expect(spawnCalls).toBe(0);
    expect(state.missingConfig).toBe(true);
    expect(toasts).toEqual(["Missing agr.toml"]);
    expect(statuses.at(-1)).toBe("Error: agr.toml missing in current directory");
  });

  test("spawn failures map to status and exit 127", async () => {
    const state = createInitialState();
    const statuses: string[] = [];

    const result = await runCommandWithUi({
      state,
      args: ["uv", "run", "agrx", "org/repo/skill"],
      cwd: "/repo",
      deps: {
        existsSync: () => true,
        writeFileSync: () => {},
        env: () => ({}),
        spawn: () => {
          throw new Error("boom");
        },
      },
      onRenderRunModal: () => {},
      onSetStatus: (message) => {
        statuses.push(message);
      },
      onShowToast: () => {},
      onOpenVerify: () => {},
      onLogEvent: () => {},
    });

    expect(result.exitCode).toBe(127);
    expect(result.stderr).toBe("boom");
    expect(state.lastExit).toBe(127);
    expect(statuses.at(-1)).toBe("Command failed (spawn): boom");
  });

  test("spawn failures with non-Error values are stringified", async () => {
    const state = createInitialState();
    const statuses: string[] = [];

    const result = await runCommandWithUi({
      state,
      args: ["uv", "run", "agrx", "org/repo/skill"],
      cwd: "/repo",
      deps: {
        existsSync: () => true,
        writeFileSync: () => {},
        env: () => ({}),
        spawn: () => {
          throw "spawn exploded";
        },
      },
      onRenderRunModal: () => {},
      onSetStatus: (message) => {
        statuses.push(message);
      },
      onShowToast: () => {},
      onOpenVerify: () => {},
      onLogEvent: () => {},
    });

    expect(result.exitCode).toBe(127);
    expect(result.stderr).toBe("spawn exploded");
    expect(statuses.at(-1)).toBe("Command failed (spawn): spawn exploded");
  });

  test("stderr content maps to user-facing failure status", async () => {
    const state = createInitialState();
    const statuses: string[] = [];
    const toasts: string[] = [];
    const verifyMessages: string[] = [];

    const result = await runCommandWithUi({
      state,
      args: ["uv", "run", "agrx", "org/repo/skill"],
      cwd: "/repo",
      deps: {
        existsSync: () => true,
        writeFileSync: () => {},
        env: () => ({}),
        spawn: () => ({
          stdout: streamFromText(""),
          stderr: streamFromText("uv: command not found\n"),
          exited: Promise.resolve(127),
        }),
      },
      onRenderRunModal: () => {},
      onSetStatus: (message) => {
        statuses.push(message);
      },
      onShowToast: (message) => {
        toasts.push(message);
      },
      onOpenVerify: (message) => {
        verifyMessages.push(message);
      },
      onLogEvent: () => {},
    });

    expect(result.exitCode).toBe(127);
    expect(toasts).toEqual(["Command failed (127)"]);
    expect(statuses.at(-1)).toContain("uv not found");
    expect(verifyMessages).toEqual(["Command error: uv: command not found"]);
  });
});
