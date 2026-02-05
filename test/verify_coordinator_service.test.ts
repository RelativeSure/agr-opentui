import { describe, expect, test } from "bun:test";
import { createVerifyCoordinator } from "../src/services/verify_coordinator";

describe("verify coordinator service", () => {
  test("routes single and bulk verification calls with shared wiring", () => {
    const calls: string[] = [];
    const openMessages: string[] = [];

    const coordinator = createVerifyCoordinator({
      cwd: "/repo",
      deps: {
        existsSync: () => true,
        readFileSync: () => "",
      },
      handleVariants: (handle) => [handle],
      openVerify: (message) => {
        openMessages.push(message);
      },
      logEvent: () => {},
      verifyContainsImpl: (input) => {
        calls.push(`contains:${input.handle}:${input.label}:${input.cwd}`);
      },
      verifyContainsManyImpl: (input) => {
        calls.push(`containsMany:${input.handles.join(",")}:${input.label}:${input.cwd}`);
      },
      verifyMissingImpl: (input) => {
        calls.push(`missing:${input.handle}:${input.label}:${input.cwd}`);
      },
      verifyMissingManyImpl: (input) => {
        calls.push(`missingMany:${input.handles.join(",")}:${input.label}:${input.cwd}`);
      },
      verifyHasAnyImpl: (input) => {
        calls.push(`hasAny:${input.label}:${input.cwd}`);
      },
    });

    coordinator.verifyAgrTomlContains("org/repo/one", "install");
    coordinator.verifyAgrTomlContainsMany(["org/repo/one", "org/repo/two"], "install-bulk");
    coordinator.verifyAgrTomlMissing("org/repo/one", "remove");
    coordinator.verifyAgrTomlMissingMany(["org/repo/one", "org/repo/two"], "remove-bulk");
    coordinator.verifyAgrTomlHasAny("sync");

    expect(calls).toEqual([
      "contains:org/repo/one:install:/repo",
      "containsMany:org/repo/one,org/repo/two:install-bulk:/repo",
      "missing:org/repo/one:remove:/repo",
      "missingMany:org/repo/one,org/repo/two:remove-bulk:/repo",
      "hasAny:sync:/repo",
    ]);
    expect(openMessages).toEqual([]);
  });
});
