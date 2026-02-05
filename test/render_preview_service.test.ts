import { describe, expect, test } from "bun:test";
import type { Dependency } from "../src/app_logic";
import { renderPreviewWithUi } from "../src/services/render_preview";

describe("render preview service", () => {
  test("hides overlay when preview is closed", () => {
    const overlay = { visible: true };
    const title = { content: "" };
    let body = "x";

    renderPreviewWithUi({
      previewOpen: false,
      previewLines: [],
      previewOffset: 0,
      pageLines: 3,
      selectedDependency: null,
      overlay,
      title,
      text: {
        setText: (value) => {
          body = value;
        },
      },
    });

    expect(overlay.visible).toBe(false);
    expect(body).toBe("x");
  });

  test("renders title and sliced preview lines", () => {
    const dep: Dependency = {
      identifier: "org/repo/skill",
      handle: "org/repo/skill",
      path: null,
      is_local: false,
      installed: true,
    };
    const overlay = { visible: false };
    const title = { content: "" };
    let body = "";

    renderPreviewWithUi({
      previewOpen: true,
      previewLines: ["one", "two", "three", "four"],
      previewOffset: 1,
      pageLines: 2,
      selectedDependency: dep,
      overlay,
      title,
      text: {
        setText: (value) => {
          body = value;
        },
      },
    });

    expect(overlay.visible).toBe(true);
    expect(title.content).toBe("SKILL.md: org/repo/skill");
    expect(body).toBe("two\nthree");
  });
});
