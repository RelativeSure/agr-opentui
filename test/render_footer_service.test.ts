import { describe, expect, test } from "bun:test";
import { renderFooterWithUi } from "../src/services/render_footer";

describe("render footer service", () => {
  test("renders footer model when render targets are active", () => {
    const footerStatus = { content: "" };
    const footerHint = { content: "" };

    renderFooterWithUi({
      rendererDestroyed: false,
      footerStatusDestroyed: false,
      footerHintDestroyed: false,
      updateInProgress: false,
      status: "Ready",
      updateCheckedAt: null,
      confirmUpdateOpen: false,
      inputMode: "none",
      lastCommand: "uv run agr sync",
      cwd: "/repo",
      footerStatus,
      footerHint,
    });

    expect(footerStatus.content).toBe("Ready");
    expect(String(footerHint.content)).toContain("Target repo: /repo");
    expect(String(footerHint.content)).toContain("Last: uv run agr sync");
  });

  test("skips rendering when renderer is destroyed", () => {
    const footerStatus = { content: "x" };
    const footerHint = { content: "y" };

    renderFooterWithUi({
      rendererDestroyed: true,
      footerStatusDestroyed: false,
      footerHintDestroyed: false,
      updateInProgress: false,
      status: "Ready",
      updateCheckedAt: null,
      confirmUpdateOpen: false,
      inputMode: "none",
      lastCommand: "",
      cwd: "/repo",
      footerStatus,
      footerHint,
    });

    expect(footerStatus.content).toBe("x");
    expect(footerHint.content).toBe("y");
  });
});
