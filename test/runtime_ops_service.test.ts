import { describe, expect, test } from "bun:test";
import { createRunCommand, createRunDoctorChecks } from "../src/services/runtime_ops";
import { createInitialState } from "../src/state";
import type { AppDeps } from "../src/deps";

describe("runtime ops service", () => {
  test("createRunCommand forwards args and callbacks to command impl", async () => {
    const state = createInitialState();
    let receivedArgs: string[] = [];
    let receivedCwd = "";
    const deps: AppDeps = {
      cwd: () => "/repo",
      existsSync: () => true,
      readFileSync: () => "",
      now: () => Date.now(),
      setTimeout,
      spawn: () => {
        throw new Error("not used");
      },
      env: () => ({}),
    };

    const runCommand = createRunCommand({
      state,
      cwd: "/repo",
      deps,
      onRenderRunModal: () => {},
      onSetStatus: () => {},
      onShowToast: () => {},
      onOpenVerify: () => {},
      onLogEvent: () => {},
      runCommandImpl: async (input) => {
        receivedArgs = input.args;
        receivedCwd = input.cwd;
        return { exitCode: 0, stdout: "ok", stderr: "" };
      },
    });

    const result = await runCommand(["uv", "run", "agr", "sync"]);
    expect(receivedArgs).toEqual(["uv", "run", "agr", "sync"]);
    expect(receivedCwd).toBe("/repo");
    expect(result.exitCode).toBe(0);
  });

  test("createRunDoctorChecks forwards runtime deps", async () => {
    let receivedCwd = "";
    let spawnCalled = false;

    const runDoctorChecks = createRunDoctorChecks({
      cwd: "/repo",
      spawn: async () => {
        spawnCalled = true;
        return { exitCode: 0, stderr: "" };
      },
      setStatus: () => {},
      openVerify: () => {},
      showToast: () => {},
      runDoctorChecksImpl: async (input) => {
        receivedCwd = input.cwd;
        await input.spawn(["uv", "run", "agr", "doctor"]);
      },
    });

    await runDoctorChecks();
    expect(receivedCwd).toBe("/repo");
    expect(spawnCalled).toBe(true);
  });
});
