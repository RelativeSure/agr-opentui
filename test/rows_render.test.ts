import { describe, expect, test } from "bun:test";
import { colors } from "../src/ui";
import { applyListRows, applyRows, toneToColor } from "../src/ui/rows_render";

describe("rows render", () => {
  test("maps tones to palette colors", () => {
    expect(toneToColor("text")).toBe(colors.text);
    expect(toneToColor("dim")).toBe(colors.dim);
    expect(toneToColor("highlight")).toBe(colors.highlight);
    expect(toneToColor("warn")).toBe(colors.warn);
    expect(toneToColor("danger")).toBe(colors.danger);
    expect(toneToColor("accent")).toBe(colors.accent);
    expect(toneToColor("success")).toBe(colors.success);
    expect(toneToColor("selected")).toBe(colors.selectedText);
  });

  test("applies rows and clears unused targets", () => {
    const target = [
      { content: "x" as unknown, fg: "" },
      { content: "y" as unknown, fg: "" },
    ];

    applyRows(target, [{ content: "Row 1", tone: "accent" }]);

    expect(target).toEqual([
      { content: "Row 1", fg: colors.accent },
      { content: "", fg: colors.text },
    ]);
  });

  test("applies list rows including selected background", () => {
    const target = [
      { content: "x" as unknown, fg: "", bg: "" },
      { content: "y" as unknown, fg: "", bg: "" },
    ];

    applyListRows(target, [{ content: "Selected", tone: "selected", backgroundTone: "selected" }]);

    expect(target).toEqual([
      { content: "Selected", fg: colors.selectedText, bg: colors.selectedBg },
      { content: "", fg: colors.text, bg: colors.panelAlt },
    ]);
  });
});
