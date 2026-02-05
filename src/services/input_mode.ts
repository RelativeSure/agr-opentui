import type { InputMode, State } from "../state";

export type InputSequenceResult =
  | { kind: "update"; buffer: string }
  | { kind: "submit" }
  | { kind: "cancel" }
  | { kind: "noop" };

export function processInputSequence(sequence: string, currentBuffer: string): InputSequenceResult {
  if (sequence === "\x7f" || sequence === "\b") {
    return { kind: "update", buffer: currentBuffer.slice(0, -1) };
  }
  if (sequence === "\r" || sequence === "\n") {
    return { kind: "submit" };
  }
  if (sequence === "\x1b") {
    return { kind: "cancel" };
  }
  if (sequence.length === 1 && sequence >= " " && sequence <= "~") {
    return { kind: "update", buffer: currentBuffer + sequence };
  }
  return { kind: "noop" };
}

export function applyEnterInputMode(state: State, mode: InputMode, seed = ""): void {
  state.inputMode = mode;
  state.inputBuffer = seed;
}

export function applyExitInputMode(state: State): InputMode {
  const prevMode = state.inputMode;
  state.inputMode = "none";
  state.inputBuffer = "";
  return prevMode;
}
