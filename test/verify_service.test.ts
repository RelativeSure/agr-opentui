import { describe, expect, test } from "bun:test";
import {
  verifyAgrTomlContainsManyWithUi,
  verifyAgrTomlContainsWithUi,
  verifyAgrTomlHasAnyWithUi,
} from "../src/services/verify";

describe("verify service", () => {
  test("reports missing handle in agr.toml", () => {
    const verify: Array<{ message: string; details?: string[] }> = [];
    const logs: string[] = [];

    verifyAgrTomlContainsWithUi({
      cwd: "/repo",
      handle: "org/repo/skill",
      label: "install",
      handleVariants: (h) => [h],
      openVerify: (message, details) => verify.push({ message, details }),
      logEvent: (message) => logs.push(message),
      deps: {
        existsSync: () => true,
        readFileSync: () => 'dependencies = [{ handle = "org/repo/other" }]\n',
      },
    });

    expect(verify).toEqual([{ message: "agr.toml missing handle:", details: ["org/repo/skill"] }]);
    expect(logs[0]).toContain("handle not found");
  });

  test("reports missing handles in bulk", () => {
    const verify: Array<{ message: string; details?: string[] }> = [];

    verifyAgrTomlContainsManyWithUi({
      cwd: "/repo",
      handles: ["a/b/one", "a/b/two"],
      label: "install",
      handleVariants: (h) => [h],
      openVerify: (message, details) => verify.push({ message, details }),
      logEvent: () => {},
      deps: {
        existsSync: () => true,
        readFileSync: () => 'dependencies = [{ handle = "a/b/one" }]\n',
      },
    });

    expect(verify).toEqual([{ message: "agr.toml missing handles:", details: ["a/b/two"] }]);
  });

  test("reports empty dependency set after sync", () => {
    const verify: Array<{ message: string; details?: string[] }> = [];

    verifyAgrTomlHasAnyWithUi({
      cwd: "/repo",
      label: "sync",
      openVerify: (message, details) => verify.push({ message, details }),
      logEvent: () => {},
      deps: {
        existsSync: () => true,
        readFileSync: () => 'name = "repo"\n',
      },
    });

    expect(verify).toEqual([{ message: "agr.toml has no dependencies after sync.", details: undefined }]);
  });
});
