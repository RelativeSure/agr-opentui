type ClipboardProcess = {
  stdin: { write: (text: string) => void; end: () => void } | null;
  exited: Promise<number>;
};

type ClipboardSpawn = (
  args: string[],
  options: { stdin: "pipe"; stdout: "ignore"; stderr: "ignore" },
) => ClipboardProcess;

export async function copyToClipboard(text: string, spawnFn?: ClipboardSpawn): Promise<boolean> {
  const attempts: Array<string[]> = [
    ["pbcopy"],
    ["wl-copy"],
    ["xclip", "-selection", "clipboard"],
  ];
  const spawn: ClipboardSpawn = spawnFn ?? ((args, options) => Bun.spawn(args, options) as unknown as ClipboardProcess);

  for (const cmd of attempts) {
    try {
      const proc = spawn(cmd, { stdin: "pipe", stdout: "ignore", stderr: "ignore" });
      const stdin = proc.stdin;
      if (!stdin) {
        continue;
      }
      stdin.write(text);
      stdin.end();
      const code = await proc.exited;
      if (code === 0) {
        return true;
      }
    } catch {
      // try next clipboard command
    }
  }

  return false;
}
