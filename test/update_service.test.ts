import { describe, expect, test } from "bun:test";
import { applyUpdatesWithUi, checkUpdatesWithUi, resetUpdateState } from "../src/services/update";
import { createInitialState } from "../src/state";

describe("update service", () => {
  test("resetUpdateState clears update diff and error fields", () => {
    const state = createInitialState();
    state.updateRemote = [{ label: "x", handle: "o/r/x" }];
    state.updateCandidates = [{ label: "x", handle: "o/r/x" }];
    state.updateRemoved = [{ label: "y", handle: "o/r/y" }];
    state.updateAvailable = true;
    state.updateError = "boom";

    resetUpdateState(state);

    expect(state.updateRemote).toEqual([]);
    expect(state.updateCandidates).toEqual([]);
    expect(state.updateRemoved).toEqual([]);
    expect(state.updateAvailable).toBe(false);
    expect(state.updateError).toBeNull();
  });

  test("checkUpdatesWithUi reports missing source URL", async () => {
    const state = createInitialState();
    const statuses: string[] = [];

    await checkUpdatesWithUi({
      state,
      source: { format: "skills-json" },
      setStatus: (message) => statuses.push(message),
      logEvent: () => {},
      renderAll: () => {},
    });

    expect(statuses.at(-1)).toBe("No source URL configured");
  });

  test("checkUpdatesWithUi rate limits repeated checks", async () => {
    const state = createInitialState();
    state.updateLastRequestedAt = 10_000;
    const statuses: string[] = [];

    await checkUpdatesWithUi({
      state,
      source: { repo: "acme/skills", path: "skills.json", format: "skills-json" },
      nowMs: () => 10_500,
      setStatus: (message) => statuses.push(message),
      logEvent: () => {},
      renderAll: () => {},
    });

    expect(statuses.at(-1)).toContain("Update check rate-limited");
  });

  test("checkUpdatesWithUi handles fetch failure", async () => {
    const state = createInitialState();
    state.predefined = [{ label: "a", handle: "o/r/a" }];

    const statuses: string[] = [];

    await checkUpdatesWithUi({
      state,
      source: { repo: "acme/skills", path: "skills.json", format: "skills-json" },
      fetchFn: async () => new Response("not found", { status: 404 }),
      nowMs: () => 1000,
      setStatus: (message) => statuses.push(message),
      logEvent: () => {},
      renderAll: () => {},
    });

    expect(state.updateInProgress).toBe(false);
    expect(state.updateError).toBe("Fetch failed (404)");
    expect(statuses.at(-1)).toBe("Update check failed");
  });

  test("applyUpdatesWithUi writes and reloads when updates exist", async () => {
    const state = createInitialState();
    state.updateAvailable = true;
    state.updateRemote = [{ label: "new", handle: "o/r/new" }];
    state.predefinedSource = { repo: "acme/skills", path: "skills.json" };

    let writeCalls = 0;
    let loadCalls = 0;
    let renderCalls = 0;
    const statuses: string[] = [];

    await applyUpdatesWithUi({
      state,
      writeSkillsFile: () => {
        writeCalls += 1;
      },
      loadPredefined: () => {
        loadCalls += 1;
      },
      setStatus: (message) => {
        statuses.push(message);
      },
      renderAll: () => {
        renderCalls += 1;
      },
    });

    expect(writeCalls).toBe(1);
    expect(loadCalls).toBe(1);
    expect(renderCalls).toBe(1);
    expect(statuses.at(-1)).toBe("skills.json updated");
  });
});
