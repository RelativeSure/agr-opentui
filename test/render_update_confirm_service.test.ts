import { describe, expect, test } from "bun:test";
import { renderUpdateConfirmWithUi } from "../src/services/render_update_confirm";

describe("render update confirm service", () => {
  test("hides overlay when confirm modal is closed", () => {
    const overlay = { visible: true };
    const body = { content: "" };
    const body2 = { content: "" };

    renderUpdateConfirmWithUi({
      confirmUpdateOpen: false,
      addedCount: 0,
      removedCount: 0,
      predefinedSource: null,
      overlay,
      body,
      body2,
    });

    expect(overlay.visible).toBe(false);
  });

  test("renders counts and source details when open", () => {
    const overlay = { visible: false };
    const body = { content: "" };
    const body2 = { content: "" };

    renderUpdateConfirmWithUi({
      confirmUpdateOpen: true,
      addedCount: 3,
      removedCount: 1,
      predefinedSource: { repo: "org/repo", path: "skills.json" },
      overlay,
      body,
      body2,
    });

    expect(overlay.visible).toBe(true);
    expect(body.content).toBe("Add 3 and remove 1 skills.");
    expect(body2.content).toBe("Source: org/repo");
  });
});
