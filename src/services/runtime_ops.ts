import type { AppDeps } from "../deps";
import type { State } from "../state";
import { runCommandWithUi } from "./agr";
import { runDoctorChecks as runDoctorChecksRuntime } from "../runtime/doctor";

export type CommandResult = { exitCode: number; stdout: string; stderr: string };

export function createRunCommand(input: {
  state: State;
  cwd: string;
  deps: AppDeps;
  onRenderRunModal: () => void;
  onSetStatus: (message: string) => void;
  onShowToast: (message: string) => void;
  onOpenVerify: (message: string, details?: string[]) => void;
  onLogEvent: (message: string) => void;
  runCommandImpl?: typeof runCommandWithUi;
}): (args: string[]) => Promise<CommandResult> {
  const runImpl = input.runCommandImpl ?? runCommandWithUi;
  return async (args: string[]) =>
    runImpl({
      state: input.state,
      args,
      cwd: input.cwd,
      deps: input.deps,
      onRenderRunModal: input.onRenderRunModal,
      onSetStatus: input.onSetStatus,
      onShowToast: input.onShowToast,
      onOpenVerify: input.onOpenVerify,
      onLogEvent: input.onLogEvent,
    });
}

export async function spawnDoctorCommand(args: string[]): Promise<{ exitCode: number; stderr: string }> {
  const proc = Bun.spawn(args, { stdout: "pipe", stderr: "pipe" });
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  return { exitCode, stderr };
}

export function createRunDoctorChecks(input: {
  cwd: string;
  spawn?: (args: string[]) => Promise<{ exitCode: number; stderr: string }>;
  setStatus: (message: string, options?: { clearAfterMs?: number }) => void;
  openVerify: (message: string, details?: string[]) => void;
  showToast: (message: string) => void;
  runDoctorChecksImpl?: typeof runDoctorChecksRuntime;
}): () => Promise<void> {
  const runImpl = input.runDoctorChecksImpl ?? runDoctorChecksRuntime;
  const spawn = input.spawn ?? spawnDoctorCommand;
  return async () =>
    runImpl({
      cwd: input.cwd,
      spawn,
      setStatus: input.setStatus,
      openVerify: input.openVerify,
      showToast: input.showToast,
    });
}
