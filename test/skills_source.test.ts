import { describe, expect, test } from "bun:test";
import {
  buildCommitApiUrl,
  buildRawUrl,
  extractSkillName,
  handleVariants,
  normalizeHandleForAgr,
  normalizeSkills,
  normalizeSkillsFromAgrToml,
  parseGitHubUrl,
} from "../src/services/skills_source";

describe("skills source service", () => {
  test("normalizes mixed skill entries", () => {
    const result = normalizeSkills([
      " org/repo/one ",
      { label: "Two", handle: " org/repo/two ", repo: " org/repo " },
      {
        label: "Three",
        handle: " org/repo/three ",
        repo: " org/repo ",
        branch: " main ",
        skillMdPath: " skills/path/SKILL.md ",
      },
      { label: "", handle: "org/repo/three" },
      { label: "bad", handle: "" } as never,
    ]);

    expect(result).toEqual([
      { label: "org/repo/one", handle: "org/repo/one" },
      { label: "Two", handle: "org/repo/two", repo: "org/repo" },
      {
        label: "Three",
        handle: "org/repo/three",
        repo: "org/repo",
        branch: "main",
        skillMdPath: "skills/path/SKILL.md",
      },
      { label: "org/repo/three", handle: "org/repo/three" },
    ]);
  });

  test("parses dependencies from agr.toml", () => {
    const toml = `dependencies = [
  {type = "skill", handle = "org/repo/alpha"},
  {type = "skill", handle = "org/repo/beta"}
]\n`;

    expect(normalizeSkillsFromAgrToml(toml).map((s) => s.handle)).toEqual(["org/repo/alpha", "org/repo/beta"]);
  });

  test("builds source urls from github blob", () => {
    const parsed = parseGitHubUrl("https://github.com/acme/skills/blob/main/skills.json");
    expect(parsed).toEqual({ owner: "acme", repo: "skills", branch: "main", path: "skills.json" });

    expect(buildRawUrl({ url: "https://github.com/acme/skills/blob/main/skills.json" })).toBe(
      "https://raw.githubusercontent.com/acme/skills/main/skills.json",
    );

    expect(buildCommitApiUrl({ url: "https://github.com/acme/skills/blob/main/skills.json" })).toBe(
      "https://api.github.com/repos/acme/skills/commits?path=skills.json&sha=main&per_page=1",
    );
  });

  test("normalizes relative handles with source context", () => {
    const source = { repo: "kasperjunge/agent-resources" };
    expect(normalizeHandleForAgr("./development/workflow/code-review", source)).toBe(
      "kasperjunge/code-review",
    );
  });

  test("builds handle variants with source context", () => {
    const source = { repo: "kasperjunge/agent-resources" };
    const variants = handleVariants("skills/development/workflow/code-review", source);
    expect(variants).toContain("skills/development/workflow/code-review");
    expect(variants).toContain("development/workflow/code-review");
    expect(variants).toContain("kasperjunge/code-review");
  });

  test("extracts skill name from frontmatter and markdown heading", () => {
    expect(extractSkillName("---\nname: My Skill\n---\n\n# Ignored\n")).toBe("My Skill");
    expect(extractSkillName("# Heading Skill\n\nText")).toBe("Heading Skill");
    expect(extractSkillName("No heading here")).toBeNull();
  });
});
