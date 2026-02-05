import { describe, expect, test } from "bun:test";
import {
  buildSkillMdUrls,
  getSkillDisplayLabel,
  getSkillSourceLabel,
  resolveSkillLabelWithUi,
} from "../src/services/discover_labels";

describe("discover labels service", () => {
  test("uses cached display label when present", () => {
    const label = getSkillDisplayLabel({
      skill: { label: "Fallback", handle: "org/repo/skill" },
      skillLabelCache: { "org/repo/skill": "Resolved Name" },
    });
    expect(label).toBe("Resolved Name");
  });

  test("derives source label from source url", () => {
    const source = getSkillSourceLabel({
      skill: { label: "S", handle: "acme/repo/s" },
      predefinedSource: { url: "https://github.com/kasperjunge/agent-resources/blob/main/skills.json" },
    });
    expect(source).toBe("kasperjunge/agent-resources");
  });

  test("builds raw github skill md urls", () => {
    const urls = buildSkillMdUrls({
      skill: { label: "S", handle: "kasperjunge/agent-resources/development/workflow/code-review" },
      predefinedSource: null,
    });
    expect(urls.some((u) => u.includes("raw.githubusercontent.com/kasperjunge/agent-resources/main/skills/development/workflow/code-review/SKILL.md"))).toBe(true);
  });

  test("resolves label from fetched skill markdown", async () => {
    const cache: Record<string, string> = {};
    const pending = new Set<string>();
    let resolvedCalls = 0;

    const ok = await resolveSkillLabelWithUi({
      skill: { label: "S", handle: "org/repo/skill", repo: "org/repo" },
      predefinedSource: null,
      skillLabelCache: cache,
      skillLabelPending: pending,
      fetchFn: async (input) => {
        const url = String(input);
        if (url.endsWith("/SKILL.md")) {
          return new Response("---\nname: Nice Skill\n---\n", { status: 200 });
        }
        return new Response("not found", { status: 404 });
      },
      onResolved: () => {
        resolvedCalls += 1;
      },
    });

    expect(ok).toBe(true);
    expect(cache["org/repo/skill"]).toBe("Nice Skill");
    expect(pending.has("org/repo/skill")).toBe(false);
    expect(resolvedCalls).toBe(1);
  });
});
