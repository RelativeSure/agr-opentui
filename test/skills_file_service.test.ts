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
    });

    expect(result.predefined).toEqual([{ label: "org/repo/one", handle: "org/repo/one" }]);
    expect(result.predefinedFormat).toBe("array");
    expect(result.predefinedError).toBeNull();
  });

  test("reports missing skills.json", () => {
    const result = loadPredefinedFromDisk({
      cwd: "/repo",
      existsSync: () => false,
      readFileSync: () => "",
      normalizeSkills: () => [],
      normalizeSource: (source) => source ?? { format: "skills-json" },
    });

    expect(result.predefinedError).toBe("skills.json not found");
    expect(result.predefined).toEqual([]);
  });

  test("writes object-format skills.json payload", () => {
    let written = "";

    writeSkillsFileToDisk({
      cwd: "/repo",
      predefinedFormat: "object",
      skills: [{ label: "One", handle: "org/repo/one", repo: "org/repo" }],
      source: { repo: "org/repo", path: "skills.json" },
      normalizeSource: (source) => ({ format: "skills-json", ...(source ?? {}) }),
      writeFileSync: (_path, data) => {
        written = data;
      },
    });

    const parsed = JSON.parse(written);
    expect(parsed.source.repo).toBe("org/repo");
    expect(parsed.skills[0].handle).toBe("org/repo/one");
  });
});
