import { describe, expect, test } from "bun:test";
import { loadPreviewLines } from "../src/services/preview";

describe("preview service", () => {
  test("returns empty when no skill_md_path exists", async () => {
    const lines = await loadPreviewLines({
      dependency: { identifier: "org/repo/skill", is_local: false, installed: true },
      readText: async () => "ignored",
    });
    expect(lines).toEqual([]);
  });

  test("loads and truncates preview lines", async () => {
    const lines = await loadPreviewLines({
      dependency: {
        identifier: "org/repo/skill",
        is_local: false,
        installed: true,
        skill_md_path: "/tmp/SKILL.md",
      },
      readText: async () => "short\nthis line is long",
      maxLineLength: 4,
    });

    expect(lines).toEqual(["shor", "this"]);
  });

  test("returns empty on read failure", async () => {
    const lines = await loadPreviewLines({
      dependency: {
        identifier: "org/repo/skill",
        is_local: false,
        installed: true,
        skill_md_path: "/tmp/SKILL.md",
      },
      readText: async () => {
        throw new Error("boom");
      },
    });

    expect(lines).toEqual([]);
  });
});
