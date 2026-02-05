import { describe, expect, test } from "bun:test";
import { applyEnterInputMode, applyExitInputMode, processInputSequence } from "../src/services/input_mode";
import { createInitialState } from "../src/state";

describe("input mode service", () => {
  test("processes printable, backspace, submit and cancel keys", () => {
    expect(processInputSequence("a", "")).toEqual({ kind: "update", buffer: "a" });
    expect(processInputSequence("\x7f", "abc")).toEqual({ kind: "update", buffer: "ab" });
    expect(processInputSequence("\n", "abc")).toEqual({ kind: "submit" });
    expect(processInputSequence("\x1b", "abc")).toEqual({ kind: "cancel" });
    expect(processInputSequence("\x01", "abc")).toEqual({ kind: "noop" });
  });

  test("applies enter and exit input mode transitions", () => {
    const state = createInitialState();

    applyEnterInputMode(state, "prompt", "hello");
    expect(state.inputMode).toBe("prompt");
    expect(state.inputBuffer).toBe("hello");

    const prev = applyExitInputMode(state);
    expect(prev).toBe("prompt");
    expect(state.inputMode).toBe("none");
    expect(state.inputBuffer).toBe("");
  });
});
