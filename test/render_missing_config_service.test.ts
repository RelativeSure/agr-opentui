import { describe, expect, test } from "bun:test";
import { renderMissingConfigWithUi } from "../src/services/render_missing_config";

describe("render missing config service", () => {
  test("hides overlay when modal is closed", () => {
    const overlay = { visible: true };
    const line1 = { content: "" };
    const line2 = { content: "" };

    renderMissingConfigWithUi({
      missingConfigOpen: false,
      overlay,
      line1,
      line2,
    });

    expect(overlay.visible).toBe(false);
  });

  test("renders missing config text when open", () => {
    const overlay = { visible: false };
    const line1 = { content: "" };
    const line2 = { content: "" };

    renderMissingConfigWithUi({
      missingConfigOpen: true,
      overlay,
      line1,
      line2,
    });

    expect(overlay.visible).toBe(true);
    expect(line1.content).toBe("agr.toml not found in current directory.");
    expect(line2.content).toBe("agr add/remove/sync require agr.toml in this target repo.");
  });
});
