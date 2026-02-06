import { commandReportedExists } from "../commands";

export async function submitAddInputWithUi(input: {
  value: string;
  looksLikeHandle: (value: string) => boolean;
  hasKnownHandle: (value: string) => boolean;
  showToast: (message: string) => void;
  setStatus: (message: string) => void;
  runCommand: (args: string[]) => Promise<{ exitCode: number; stdout: string; stderr: string }>;
  loadData: () => Promise<void>;
}): Promise<void> {
  const value = input.value.trim();
  if (!value) {
    return;
  }

  if (input.looksLikeHandle(value) && !input.hasKnownHandle(value)) {
    input.showToast("Handle not found in source list; adding anyway");
  }

  let result = await input.runCommand(["uv", "run", "agr", "add", value]);
  if (result.exitCode !== 0 && commandReportedExists(`${result.stdout}\n${result.stderr}`)) {
    input.setStatus("Skill exists; retrying with --overwrite");
    result = await input.runCommand(["uv", "run", "agr", "add", "--overwrite", value]);
  }
  await input.loadData();
}
