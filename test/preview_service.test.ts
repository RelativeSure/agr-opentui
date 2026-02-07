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

  test("loads discover preview from first successful SKILL.md URL", async () => {
    const lines = await loadPreviewLines({
      discoverSkill: {
        label: "Code Review",
        handle: "kasperjunge/agent-resources/development/workflow/code-review",
        repo: "kasperjunge/agent-resources",
      },
      fetchText: async (url) => {
        if (url.includes("/main/") && url.endsWith("/SKILL.md")) {
          return "line one\nline two";
        }
        throw new Error("not found");
      },
      maxLineLength: 20,
    });

    expect(lines).toEqual(["line one", "line two"]);
  });

  test("returns empty when discover SKILL.md fetch fails for all candidates", async () => {
    const lines = await loadPreviewLines({
      discoverSkill: {
        label: "Missing Skill",
        handle: "owner/repo/missing",
        repo: "owner/repo",
      },
      fetchText: async () => {
        throw new Error("404");
      },
    });

    expect(lines).toEqual([]);
  });
});
