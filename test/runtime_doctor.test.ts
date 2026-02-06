import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runDoctorChecks } from "../src/runtime/doctor";

describe("runtime doctor checks", () => {
  test("reports success when all checks pass and agr.toml exists", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "agr-opentui-doctor-ok-"));
    writeFileSync(join(cwd, "agr.toml"), "dependencies = []\n", "utf-8");

    const statuses: string[] = [];
    const toasts: string[] = [];
    const verifies: Array<{ message: string; details?: string[] }> = [];

    await runDoctorChecks({
      cwd,
      spawn: async () => ({ exitCode: 0, stderr: "" }),
      setStatus: (message) => {
        statuses.push(message);
      },
      openVerify: (message, details) => {
        verifies.push({ message, details });
      },
      showToast: (message) => {
        toasts.push(message);
      },
    });

    expect(statuses[0]).toBe("Running doctor checks...");
    expect(statuses.at(-1)).toBe("Doctor: all checks passed");
    expect(toasts).toEqual(["Doctor: all checks passed"]);
    expect(verifies).toHaveLength(0);
  });

  test("reports first three failing details when checks fail", async () => {
    const statuses: string[] = [];
    const toasts: string[] = [];
    const verifies: Array<{ message: string; details?: string[] }> = [];

    await runDoctorChecks({
      cwd: "/definitely/missing/path",
      spawn: async (args) => {
        if (args[0] === "uv") {
          return { exitCode: 127, stderr: "uv: command not found" };
        }
        if (args[0] === "python") {
          return { exitCode: 127, stderr: "python: command not found" };
        }
        if (args[0] === "agr") {
          return { exitCode: 127, stderr: "agr: command not found" };
        }
        return { exitCode: 127, stderr: "agrx: command not found" };
      },
      setStatus: (message) => {
        statuses.push(message);
      },
      openVerify: (message, details) => {
        verifies.push({ message, details });
      },
      showToast: (message) => {
        toasts.push(message);
      },
    });

    expect(statuses.at(-1)).toBe("Doctor: issues found");
    expect(toasts).toEqual([]);
    expect(verifies).toHaveLength(1);
    expect(verifies[0]?.message).toBe("Doctor found issues.");
    expect(verifies[0]?.details).toHaveLength(3);
    expect(verifies[0]?.details?.[0]).toContain("uv:");
    expect(verifies[0]?.details?.[1]).toContain("python:");
    expect(verifies[0]?.details?.[2]).toContain("agr:");
  });
});
