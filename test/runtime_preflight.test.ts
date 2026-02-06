import { describe, expect, test } from "bun:test";
import { runStartupPreflight } from "../src/runtime/preflight";

describe("runtime startup preflight", () => {
  test("reports missing tools", async () => {
    const statuses: string[] = [];
    const verifies: Array<{ message: string; details?: string[] }> = [];

    await runStartupPreflight({
      spawn: async (args) => {
        if (args[0] === "uv") {
          return { exitCode: 0, stderr: "" };
        }
        return { exitCode: 127, stderr: `${args[0]}: command not found` };
      },
      setStatus: (message) => statuses.push(message),
      openVerify: (message, details) => verifies.push({ message, details }),
    });

    expect(statuses.at(-1)).toBe("Startup: issues found");
    expect(verifies[0]?.message).toBe("Startup checks found issues.");
    expect(verifies[0]?.details?.[0]).toContain("agr:");
    expect(verifies[0]?.details?.[1]).toContain("agrx:");
  });

  test("stays quiet when tools are available", async () => {
    const statuses: string[] = [];
    const verifies: Array<{ message: string; details?: string[] }> = [];

    await runStartupPreflight({
      spawn: async () => ({ exitCode: 0, stderr: "" }),
      setStatus: (message) => statuses.push(message),
      openVerify: (message, details) => verifies.push({ message, details }),
    });

    expect(statuses).toEqual([]);
    expect(verifies).toEqual([]);
  });
});
