import { describe, expect, test } from "bun:test";
import { renderTabsWithUi } from "../src/services/render_tabs";
import { colors } from "../src/ui";

describe("render tabs service", () => {
  test("renders selected tab and cwd line", () => {
    const tabLabels = [
      { content: "", fg: "" },
      { content: "", fg: "" },
    ];
    const cwdLine = { content: "", fg: "" };

    renderTabsWithUi({
      tabs: ["Skills", "Discover"],
      tabIndex: 1,
      updateError: false,
      updateAvailable: true,
      cwd: "/repo",
      tabLabels,
      cwdLine,
    });

    expect(tabLabels[0]).toEqual({ content: " Skills* ", fg: colors.accent });
    expect(tabLabels[1]).toEqual({ content: ">Discover<", fg: colors.highlight });
    expect(cwdLine).toEqual({ content: "cwd: /repo", fg: colors.dim });
  });
});
