import { describe, expect, test } from "bun:test";
import { colors } from "../src/ui";
import { renderHelpWithUi } from "../src/services/render_help";

describe("render help service", () => {
  test("hides overlay when help is closed", () => {
    const overlay = { visible: true };
    const title = { content: "" };
    const lines = [{ content: "", fg: "" }];

    renderHelpWithUi({
      helpOpen: false,
      tab: "Skills",
      rowCount: 1,
      overlay,
      title,
      lines,
    });

    expect(overlay.visible).toBe(false);
  });

  test("renders help title and rows when open", () => {
    const overlay = { visible: false };
    const title = { content: "" };
    const lines = [
      { content: "", fg: "" },
      { content: "", fg: "" },
    ];

    renderHelpWithUi({
      helpOpen: true,
      tab: "Skills",
      rowCount: 2,
      overlay,
      title,
      lines,
    });

    expect(overlay.visible).toBe(true);
    expect(title.content).toBe("Skills Help");
    expect(String(lines[0].content)).toContain("Skills shows skills in agr.toml");
    expect(lines[0].fg).toBe(colors.text);
  });
});
