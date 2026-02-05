export function parseArgs(input: string): string[] {
  const args: string[] = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;
  let escape = false;

  for (const ch of input) {
    if (escape) {
      current += ch;
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      continue;
    }
    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      continue;
    }
    if (!inSingle && !inDouble && /\s/.test(ch)) {
      if (current) {
        args.push(current);
        current = "";
      }
      continue;
    }
    current += ch;
  }

  if (current) {
    args.push(current);
  }
  return args;
}

export function commandReportedExists(output: string): boolean {
  const text = output.toLowerCase();
  return text.includes("skill already exists") || text.includes("already exists at");
}

export function commandReportedRemoved(stdout: string): boolean {
  const lines = stdout.split(/\r?\n/).map((line) => line.trim());
  return lines.some((line) => line.startsWith("Removed:") || line.startsWith("Deleted:"));
}
