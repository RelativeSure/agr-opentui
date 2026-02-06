import { describe, expect, test } from "bun:test";
import { renderActionsWithUi } from "../src/services/render_actions";
import { colors } from "../src/ui";

describe("render actions service", () => {
  test("renders discover actions into line buffers", () => {
    const lines = [
      { content: "", fg: "" },
      { content: "", fg: "" },
      { content: "", fg: "" },
    ];

    renderActionsWithUi({
      tab: "Discover",
      rowCount: lines.length,
      updateAvailable: false,
      lines,
    });

    expect(lines[0]).toEqual({ content: "f: filter list", fg: colors.text });
    expect(lines[1]).toEqual({ content: "p: pin selected", fg: colors.text });
  });
});
