import { describe, expect, test } from "bun:test";
import { loadPredefinedFromDisk, writeSkillsFileToDisk } from "../src/services/skills_file";

describe("skills file service", () => {
  test("loads array-format skills.json", () => {
    const result = loadPredefinedFromDisk({
      cwd: "/repo",
      existsSync: () => true,
      readFileSync: () => '["org/repo/one"]\n',
      normalizeSkills: (items) => items.map((item) => ({ label: String(item), handle: String(item) })),
      normalizeSource: (source) => source ?? { format: "skills-json" },
      useEmbedded: false,
    });

    expect(result.predefined).toEqual([{ label: "org/repo/one", handle: "org/repo/one" }]);
    expect(result.predefinedFormat).toBe("array");
    expect(result.predefinedError).toBeNull();
  });

  test("uses embedded defaults when skills.json is missing", () => {
    const result = loadPredefinedFromDisk({
      cwd: "/repo",
      existsSync: () => false,
      readFileSync: () => "",
      normalizeSkills: (items) => items.map((item) => ({ label: String(item), handle: String(item) })),
      normalizeSource: (source) => source ?? { format: "skills-json" },
    });

    expect(result.predefinedError).toBeNull();
    expect(result.predefined.length).toBeGreaterThan(0);
  });

  test("loads embedded payload when skills.json is missing", () => {
    const result = loadPredefinedFromDisk({
      cwd: "/repo",
      existsSync: () => false,
      readFileSync: () => "",
      normalizeSkills: (items) => items.map((item) => ({ label: String(item), handle: String(item) })),
      normalizeSource: (source) => source ?? { format: "skills-json" },
      embedded: {
        payload: ["org/repo/embedded"],
      },
    });

    expect(result.predefinedError).toBeNull();
    expect(result.predefined).toEqual([{ label: "org/repo/embedded", handle: "org/repo/embedded" }]);
    expect(result.predefinedSource).toBeNull();
  });

  test("preserves source metadata from embedded object payload", () => {
    const result = loadPredefinedFromDisk({
      cwd: "/repo",
      existsSync: () => false,
      readFileSync: () => "",
      normalizeSkills: (items) => items.map((item) => ({ label: String(item), handle: String(item) })),
      normalizeSource: (source) => source ?? { format: "skills-json" },
      embedded: {
        payload: {
          source: { repo: "kasperjunge/agent-resources", path: "agr.toml", format: "agr-toml" },
          skills: ["./skills/development/workflow/code-review"],
        },
      },
    });

    expect(result.predefinedError).toBeNull();
    expect(result.predefinedSource?.repo).toBe("kasperjunge/agent-resources");
    expect(result.predefinedSource?.format).toBe("agr-toml");
  });

  test("writes object-format skills.json payload", () => {
    let written = "";

    writeSkillsFileToDisk({
      cwd: "/repo",
      predefinedFormat: "object",
      skills: [
        {
          label: "One",
          handle: "org/repo/one",
          repo: "org/repo",
          branch: "main",
          skillMdPath: "skills/path/one/SKILL.md",
        },
      ],
      source: { repo: "org/repo", path: "skills.json" },
      normalizeSource: (source) => ({ format: "skills-json", ...(source ?? {}) }),
      writeFileSync: (_path, data) => {
        written = data;
      },
    });

    const parsed = JSON.parse(written);
    expect(parsed.source.repo).toBe("org/repo");
    expect(parsed.skills[0].handle).toBe("org/repo/one");
    expect(parsed.skills[0].branch).toBe("main");
    expect(parsed.skills[0].skillMdPath).toBe("skills/path/one/SKILL.md");
  });

  test("loads embedded multi-repo skill entries", () => {
    const result = loadPredefinedFromDisk({
      cwd: "/repo",
      existsSync: () => false,
      readFileSync: () => "",
      normalizeSkills: (items) =>
        items.map((item) => {
          if (typeof item === "string") {
            return { label: item, handle: item };
          }
          return {
            label: item.label,
            handle: item.handle,
            repo: item.repo,
            branch: item.branch,
            skillMdPath: item.skillMdPath,
          };
        }),
      normalizeSource: (source) => source ?? { format: "skills-json" },
      embedded: {
        payload: {
          skills: [
            {
              label: "Code Review",
              handle: "acme/platform-skills/code-review",
              repo: "acme/platform-skills",
              branch: "main",
              skillMdPath: "skills/development/workflow/code-review/SKILL.md",
            },
            { label: "Deploy Runbook", handle: "team/automation/deploy-runbook", repo: "https://gitlab.com/team/automation" },
          ],
        },
      },
    });

    expect(result.predefinedError).toBeNull();
    expect(result.predefined.map((item) => item.handle)).toEqual([
      "acme/platform-skills/code-review",
      "team/automation/deploy-runbook",
    ]);
    expect(result.predefined[0]?.branch).toBe("main");
    expect(result.predefined[0]?.skillMdPath).toBe("skills/development/workflow/code-review/SKILL.md");
  });
});
