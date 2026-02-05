import { describe, expect, test } from "bun:test";
import { copyToClipboard } from "../src/services/clipboard";

describe("clipboard service", () => {
  test("returns true when first command succeeds", async () => {
    const calls: string[][] = [];
    const writes: string[] = [];

    const ok = await copyToClipboard("hello", (args) => {
      calls.push(args);
      return {
        stdin: {
          write: (text: string) => writes.push(text),
          end: () => {},
        },
        exited: Promise.resolve(0),
      };
    });

    expect(ok).toBe(true);
    expect(calls).toEqual([["pbcopy"]]);
    expect(writes).toEqual(["hello"]);
  });

  test("falls back to later command when earlier commands fail", async () => {
    const calls: string[][] = [];
    let count = 0;

    const ok = await copyToClipboard("hello", (args) => {
      calls.push(args);
      count += 1;
      if (count < 3) {
        return {
          stdin: {
            write: () => {},
            end: () => {},
          },
          exited: Promise.resolve(1),
        };
      }
      return {
        stdin: {
          write: () => {},
          end: () => {},
        },
        exited: Promise.resolve(0),
      };
    });

    expect(ok).toBe(true);
    expect(calls).toEqual([["pbcopy"], ["wl-copy"], ["xclip", "-selection", "clipboard"]]);
  });
});
