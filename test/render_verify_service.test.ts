import { describe, expect, test } from "bun:test";
import { renderVerifyWithUi } from "../src/services/render_verify";

describe("render verify service", () => {
  test("hides overlay when closed", () => {
    const overlay = { visible: true };
    const line1 = { content: "" };
    const line2 = { content: "" };
    const listLines = [{ content: "" }];

    renderVerifyWithUi({
      verifyOpen: false,
      verifyMessage: "",
      verifyDetails: [],
      wrapText: (v) => [v],
      overlay,
      line1,
      line2,
      listLines,
    });

    expect(overlay.visible).toBe(false);
  });

  test("renders wrapped message and detail bullets", () => {
    const overlay = { visible: false };
    const line1 = { content: "" };
    const line2 = { content: "" };
    const listLines = [{ content: "" }, { content: "" }, { content: "" }];

    renderVerifyWithUi({
      verifyOpen: true,
      verifyMessage: "Main verify message",
      verifyDetails: ["first detail", "second detail"],
      wrapText: (v) => [v],
      overlay,
      line1,
      line2,
      listLines,
    });

    expect(overlay.visible).toBe(true);
    expect(line1.content).toBe("Main verify message");
    expect(listLines[0].content).toBe("- first detail");
    expect(listLines[1].content).toBe("- second detail");
  });
});
