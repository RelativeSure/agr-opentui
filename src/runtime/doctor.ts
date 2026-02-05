import { join } from "node:path";
import { existsSync } from "node:fs";

type SpawnLike = (args: string[]) => Promise<{ exitCode: number; stderr: string }>;

async function checkCommandAvailable(spawn: SpawnLike, args: string[]): Promise<{ ok: boolean; detail: string }> {
  try {
    const result = await spawn(args);
    if (result.exitCode === 0) {
      return { ok: true, detail: "" };
    }
    const lastLine = result.stderr.trim().split(/\r?\n/).slice(-1)[0];
    return { ok: false, detail: lastLine || `exit ${result.exitCode}` };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, detail: message };
  }
}

export async function runDoctorChecks(input: {
  cwd: string;
  spawn: SpawnLike;
  setStatus: (message: string, options?: { clearAfterMs?: number }) => void;
  openVerify: (message: string, details?: string[]) => void;
  showToast: (message: string) => void;
}): Promise<void> {
  input.setStatus("Running doctor checks...");
  const checks: Array<{ name: string; args: string[] }> = [
    { name: "uv", args: ["uv", "--version"] },
    { name: "python", args: ["python", "--version"] },
    { name: "agr", args: ["agr", "--help"] },
    { name: "agrx", args: ["agrx", "--help"] },
  ];
  const details: string[] = [];

  for (const check of checks) {
    const result = await checkCommandAvailable(input.spawn, check.args);
    if (!result.ok) {
      details.push(`${check.name}: ${result.detail}`);
    }
  }

  const configPath = join(input.cwd, "agr.toml");
  const hasAgrToml = existsSync(configPath);
  if (!hasAgrToml) {
    details.push("agr.toml: missing in target repo (needed for agr add/remove/sync)");
  }

  if (details.length > 0) {
    input.openVerify("Doctor found issues.", details.slice(0, 3));
    input.setStatus("Doctor: issues found");
    return;
  }
  input.setStatus("Doctor: all checks passed", { clearAfterMs: 3000 });
  input.showToast("Doctor: all checks passed");
}
