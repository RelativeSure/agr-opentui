import { describe, expect, test } from "bun:test";
import { submitAddInputWithUi } from "../src/services/add_flow";

describe("add flow service", () => {
  test("returns early on empty input", async () => {
    const commandCalls: string[][] = [];
    let loadCount = 0;

    await submitAddInputWithUi({
      value: "   ",
      looksLikeHandle: () => false,
      hasKnownHandle: () => false,
      showToast: () => {},
      setStatus: () => {},
      runCommand: async (args) => {
        commandCalls.push(args);
        return { exitCode: 0, stdout: "", stderr: "" };
      },
      loadData: async () => {
        loadCount += 1;
      },
    });

    expect(commandCalls).toEqual([]);
    expect(loadCount).toBe(0);
  });

  test("adds unknown handle without source-list warning", async () => {
    const toasts: string[] = [];
    const commandCalls: string[][] = [];

    await submitAddInputWithUi({
      value: "org/repo/skill",
      looksLikeHandle: () => true,
      hasKnownHandle: () => false,
      showToast: (message) => {
        toasts.push(message);
      },
      setStatus: () => {},
      runCommand: async (args) => {
        commandCalls.push(args);
        return { exitCode: 0, stdout: "", stderr: "" };
      },
      loadData: async () => {},
    });

    expect(toasts).toEqual([]);
    expect(commandCalls).toEqual([["uv", "run", "agr", "add", "org/repo/skill"]]);
  });

  test("retries with --overwrite when add reports existing skill", async () => {
    const commandCalls: string[][] = [];
    const statuses: string[] = [];
    let loadCount = 0;

    await submitAddInputWithUi({
      value: "org/repo/skill",
      looksLikeHandle: () => true,
      hasKnownHandle: () => true,
      showToast: () => {},
      setStatus: (message) => {
        statuses.push(message);
      },
      runCommand: async (args) => {
        commandCalls.push(args);
        if (commandCalls.length === 1) {
          return { exitCode: 1, stdout: "", stderr: "skill already exists" };
        }
        return { exitCode: 0, stdout: "", stderr: "" };
      },
      loadData: async () => {
        loadCount += 1;
      },
    });

    expect(commandCalls).toEqual([
      ["uv", "run", "agr", "add", "org/repo/skill"],
      ["uv", "run", "agr", "add", "--overwrite", "org/repo/skill"],
    ]);
    expect(statuses).toEqual(["Skill exists; retrying with --overwrite"]);
    expect(loadCount).toBe(1);
  });
});
