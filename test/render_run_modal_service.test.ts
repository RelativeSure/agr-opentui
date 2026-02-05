import { describe, expect, test } from "bun:test";
import { renderRunModalWithUi } from "../src/services/render_run_modal";

describe("render run modal service", () => {
  test("hides overlay when not busy and not in test mode", () => {
    const overlay = { visible: true };
    let body = "";

    renderRunModalWithUi({
      busy: false,
      runTestOpen: false,
      lastCommand: "",
      cwd: "/repo",
      overlay,
      text: {
        setText: (value) => {
          body = value;
        },
      },
    });

    expect(overlay.visible).toBe(false);
    expect(body).toBe("");
  });

  test("renders command and extracted handle", () => {
    const overlay = { visible: false };
    let body = "";

    renderRunModalWithUi({
      busy: true,
      runTestOpen: false,
      lastCommand: "uv run agr add org/repo/skill",
      cwd: "/repo",
      overlay,
      text: {
        setText: (value) => {
          body = value;
        },
      },
    });

    expect(overlay.visible).toBe(true);
    expect(body).toContain("Cmd:\nuv run agr add org/repo/skill");
    expect(body).toContain("Handle:\norg/repo/skill");
    expect(body).toContain("cwd:\n/repo");
  });
});
