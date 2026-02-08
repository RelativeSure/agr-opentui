import { describe, expect, test } from "bun:test";
import { resolveEmbeddedPayload } from "../scripts/generate-embedded-skills";

describe("generate embedded skills script", () => {
  test("expands github and gitlab repo-groups into discover entries", () => {
    const payload = resolveEmbeddedPayload([
      {
        repo: "kasperjunge/agent-resources",
        branch: "main",
        handlePrefix: "kasperjunge",
        skills: [
          { id: "code-review", path: "skills/development/workflow/code-review/SKILL.md", label: "Code Review" },
          { id: "create-plan", path: "skills/development/workflow/create-plan/SKILL.md" },
        ],
      },
      {
        repo: "https://gitlab.com/acme/skills",
        branch: "release",
        handlePrefix: "acme/skills",
        skills: [{ id: "incident-triage", path: "skills/ops/incident-triage/SKILL.md" }],
      },
    ]) as {
      skills: Array<{ label: string; handle: string; repo?: string; branch?: string; skillMdPath?: string }>;
    };

    expect(payload.skills).toEqual([
      {
        label: "Code Review",
        handle: "kasperjunge/code-review",
        repo: "kasperjunge/agent-resources",
        branch: "main",
        skillMdPath: "skills/development/workflow/code-review/SKILL.md",
      },
      {
        label: "kasperjunge/create-plan",
        handle: "kasperjunge/create-plan",
        repo: "kasperjunge/agent-resources",
        branch: "main",
        skillMdPath: "skills/development/workflow/create-plan/SKILL.md",
      },
      {
        label: "acme/skills/incident-triage",
        handle: "acme/skills/incident-triage",
        repo: "https://gitlab.com/acme/skills",
        branch: "release",
        skillMdPath: "skills/ops/incident-triage/SKILL.md",
      },
    ]);
  });

  test("throws when generated handles are duplicated", () => {
    expect(() =>
      resolveEmbeddedPayload([
        {
          repo: "acme/skills",
          handlePrefix: "acme",
          skills: [
            { id: "deploy", path: "skills/ops/deploy/SKILL.md" },
            { id: "deploy", path: "skills/dev/deploy/SKILL.md" },
          ],
        },
      ]),
    ).toThrow("duplicate generated handle: acme/deploy");
  });

  test("throws when skill path is not explicit SKILL.md path", () => {
    expect(() =>
      resolveEmbeddedPayload([
        {
          repo: "acme/skills",
          handlePrefix: "acme",
          skills: [{ id: "deploy", path: "skills/ops/deploy" }],
        },
      ]),
    ).toThrow("path must be an explicit relative path ending in /SKILL.md");
  });

  test("preserves legacy object payloads unchanged", () => {
    const legacy = {
      source: { repo: "acme/skills", path: "skills.json", branch: "main" },
      skills: [{ label: "Deploy", handle: "acme/skills/deploy" }],
    };

    expect(resolveEmbeddedPayload(legacy)).toEqual(legacy);
  });

  test("preserves legacy array payloads unchanged", () => {
    const legacy = ["acme/skills/deploy"];
    expect(resolveEmbeddedPayload(legacy)).toEqual(legacy);
  });
});
