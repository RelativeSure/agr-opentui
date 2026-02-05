import { describe, expect, test } from "bun:test";
import { commandReportedExists, commandReportedRemoved, parseArgs } from "../src/commands";

describe("commands service", () => {
  test("parseArgs handles quotes and escapes", () => {
    expect(parseArgs(`uv run agrx org/repo/skill --prompt "fix this" --tool claude`)).toEqual([
      "uv",
      "run",
      "agrx",
      "org/repo/skill",
      "--prompt",
      "fix this",
      "--tool",
      "claude",
    ]);

    expect(parseArgs(String.raw`cmd 'single quoted' "double quoted" path\ with\ spaces`)).toEqual([
      "cmd",
      "single quoted",
      "double quoted",
      "path with spaces",
    ]);
  });

  test("commandReportedExists matches known exists patterns", () => {
    expect(commandReportedExists("Skill already exists")).toBe(true);
    expect(commandReportedExists("Error: already exists at destination")).toBe(true);
    expect(commandReportedExists("not found")).toBe(false);
  });

  test("commandReportedRemoved detects removed or deleted lines", () => {
    expect(commandReportedRemoved("Removed: org/repo/skill")).toBe(true);
    expect(commandReportedRemoved("Deleted: org/repo/skill")).toBe(true);
    expect(commandReportedRemoved("Done")).toBe(false);
  });
});
