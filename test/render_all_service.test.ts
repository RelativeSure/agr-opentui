import { describe, expect, test } from "bun:test";
import { renderAllWithUi } from "../src/services/render_all";

describe("render all service", () => {
  test("runs render pipeline in stable order and requests render", () => {
    const calls: string[] = [];

    renderAllWithUi({
      renderTabs: () => calls.push("tabs"),
      renderList: () => calls.push("list"),
      renderDetails: () => calls.push("details"),
      renderActions: () => calls.push("actions"),
      renderFooter: () => calls.push("footer"),
      renderHelp: () => calls.push("help"),
      renderPreviewModal: () => calls.push("preview"),
      renderMissingConfig: () => calls.push("missing"),
      renderVerifyModal: () => calls.push("verify"),
      renderRunOptions: () => calls.push("run-options"),
      renderUpdateConfirm: () => calls.push("update-confirm"),
      renderRunModal: () => calls.push("run-modal"),
      requestRender: () => calls.push("request-render"),
    });

    expect(calls).toEqual([
      "tabs",
      "list",
      "details",
      "actions",
      "footer",
      "help",
      "preview",
      "missing",
      "verify",
      "run-options",
      "update-confirm",
      "run-modal",
      "request-render",
    ]);
  });
});
