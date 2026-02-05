import { describe, expect, test } from "bun:test";
import type { BridgeData } from "../src/app_logic";
import { filterInstalledPredefined, getInstalledHandleSet, getInstalledNameSet } from "../src/services/discover_filter";

describe("discover filter service", () => {
  test("builds installed sets from bridge data", () => {
    const data: BridgeData = {
      repo_root: "/repo",
      config_path: "/repo/agr.toml",
      tools: ["claude"],
      default_tool: "claude",
      dependencies: [
        {
          identifier: "org/repo/skill",
          handle: "org/repo/skill",
          path: null,
          is_local: false,
          installed: true,
        },
      ],
      installed: {
        claude: ["skill"],
      },
    };

    expect(getInstalledHandleSet(data).has("org/repo/skill")).toBe(true);
    expect(getInstalledNameSet(data).has("skill")).toBe(true);
  });

  test("filters out installed and overridden skills", () => {
    const skills = [
      { label: "One", handle: "org/repo/one" },
      { label: "Two", handle: "org/repo/two" },
      { label: "Three", handle: "org/repo/three" },
    ];
    const data: BridgeData = {
      repo_root: "/repo",
      config_path: "/repo/agr.toml",
      tools: ["claude"],
      default_tool: "claude",
      dependencies: [
        {
          identifier: "org/repo/one",
          handle: "org/repo/one",
          path: null,
          is_local: false,
          installed: true,
        },
      ],
      installed: {
        claude: ["two"],
      },
    };

    const result = filterInstalledPredefined({
      skills,
      data,
      installedOverrides: new Set(["org/repo/three"]),
      handleVariants: (h) => [h, h.split("/").at(-1) ?? h],
    });

    expect(result).toEqual([]);
  });
});
