import { describe, expect, test } from "bun:test";
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
      previewTarget: null,
      overlay,
      title,
      code: {
        set content(value: string) {
          body = value;
        },
      },
    });

    expect(overlay.visible).toBe(false);
    expect(body).toBe("x");
  });

  test("renders title and sliced preview lines", () => {
    const overlay = { visible: false };
    const title = { content: "" };
    let body = "";

    renderPreviewWithUi({
      previewOpen: true,
      previewLines: ["one", "two", "three", "four"],
      previewOffset: 1,
      pageLines: 2,
      previewTarget: "org/repo/skill",
      overlay,
      title,
      code: {
        set content(value: string) {
          body = value;
        },
      },
    });

    expect(overlay.visible).toBe(true);
    expect(title.content).toBe("SKILL.md: org/repo/skill");
    expect(body).toBe("two\nthree");
  });

  test("renders discover preview title context", () => {
    const overlay = { visible: false };
    const title = { content: "" };
    let body = "";

    renderPreviewWithUi({
      previewOpen: true,
      previewLines: ["discover body"],
      previewOffset: 0,
      pageLines: 2,
      previewTarget: "Code Review",
      overlay,
      title,
      code: {
        set content(value: string) {
          body = value;
        },
      },
    });

    expect(overlay.visible).toBe(true);
    expect(title.content).toBe("SKILL.md: Code Review");
    expect(body).toBe("discover body");
  });
});
