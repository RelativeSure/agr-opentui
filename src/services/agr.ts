import { join } from "node:path";
import { mapCommandFailureStatus, shouldBlockForMissingConfig } from "../app_logic";
import type { AppDeps } from "../deps";
import { defaultAppDeps } from "../deps";
import type { State } from "../state";

export async function runCommandWithUi(input: {
  state: State;
  args: string[];
  cwd: string;
  deps?: Pick<AppDeps, "existsSync" | "env" | "spawn">;
  onRenderRunModal: () => void;
  onSetStatus: (message: string) => void;
  onShowToast: (message: string) => void;
  onOpenVerify: (message: string, details?: string[]) => void;
  onLogEvent: (message: string) => void;
}): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const { state, args, cwd } = input;
  const deps = input.deps ?? defaultAppDeps;

  state.busy = true;
  state.lastCommand = args.join(" ");
  input.onRenderRunModal();
  input.onSetStatus(`Running: ${state.lastCommand}`);

  if (shouldBlockForMissingConfig(args, deps.existsSync(join(cwd, "agr.toml")))) {
    const configPath = join(cwd, "agr.toml");
    if (!deps.existsSync(configPath)) {
      state.busy = false;
      state.missingConfig = true;
      input.onSetStatus("Error: agr.toml missing in current directory");
      input.onShowToast("Missing agr.toml");
      input.onLogEvent("Run blocked: missing agr.toml");
      input.onRenderRunModal();
      return { exitCode: 1, stdout: "", stderr: "missing agr.toml" };
    }
  }

  const isAgr = args[0] === "uv" && (args[2] === "agr" || args[2] === "agrx");
  input.onLogEvent(`Run command: ${state.lastCommand} (cwd=${cwd})`);

  const env = {
    ...deps.env(),
    UV_CACHE_DIR: deps.env().UV_CACHE_DIR ?? "/tmp/uv-cache",
  };

  let proc: ReturnType<AppDeps["spawn"]>;
  try {
    proc = deps.spawn(args, { stdout: "pipe", stderr: "pipe", cwd, env });
  } catch (error) {
    state.busy = false;
    state.lastExit = 127;
    const message = error instanceof Error ? error.message : String(error);
    input.onSetStatus(`Command failed (spawn): ${message}`);
    return { exitCode: 127, stdout: "", stderr: message };
  }

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  state.busy = false;
  state.lastExit = exitCode;
  input.onRenderRunModal();

  if (exitCode === 0) {
    input.onSetStatus("Done");
  } else {
    input.onShowToast(`Command failed (${exitCode})`);
    input.onSetStatus(mapCommandFailureStatus(stderr, exitCode));
    const stderrLine = stderr.trim().split(/\r?\n/).slice(-1)[0];
    if (stderrLine) {
      input.onOpenVerify(`Command error: ${stderrLine}`);
    }
  }

  if (stderr.trim()) {
    input.onLogEvent(`Command stderr: ${stderr.trim().slice(0, 400)}`);
  }
  if (stdout.trim() && isAgr) {
    input.onLogEvent(`Command stdout: ${stdout.trim().slice(0, 400)}`);
  }

  return { exitCode, stdout, stderr };
}
