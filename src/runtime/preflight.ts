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

export async function runStartupPreflight(input: {
  spawn: SpawnLike;
  setStatus: (message: string) => void;
  openVerify: (message: string, details?: string[]) => void;
}): Promise<void> {
  const checks: Array<{ name: string; args: string[] }> = [
    { name: "uv", args: ["uv", "--version"] },
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

  if (details.length > 0) {
    input.openVerify("Startup checks found issues.", details.slice(0, 3));
    input.setStatus("Startup: issues found");
    return;
  }
}
