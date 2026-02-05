import { describe, expect, test } from "bun:test";
import { hasKnownHandleInSources, looksLikeHandleInput } from "../src/services/handle_match";

describe("handle match service", () => {
  test("detects handle-shaped inputs", () => {
    expect(looksLikeHandleInput("org/repo/skill")).toBe(true);
    expect(looksLikeHandleInput("./local/path")).toBe(false);
    expect(looksLikeHandleInput("/abs/path")).toBe(false);
    expect(looksLikeHandleInput("skill-name")).toBe(false);
  });

  test("matches known handles from predefined and remote lists", () => {
    expect(
      hasKnownHandleInSources({
        handle: "org/repo/skill",
        predefinedHandles: ["org/repo/skill"],
        remoteHandles: [],
      }),
    ).toBe(true);

    expect(
      hasKnownHandleInSources({
        handle: "org/repo/skill",
        predefinedHandles: [],
        remoteHandles: ["org/repo/other"],
      }),
    ).toBe(false);
  });

  test("allows unknown handles when no source handles are available", () => {
    expect(
      hasKnownHandleInSources({
        handle: "org/repo/skill",
        predefinedHandles: [],
        remoteHandles: [],
      }),
    ).toBe(true);
  });
});
