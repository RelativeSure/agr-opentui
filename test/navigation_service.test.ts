import { describe, expect, test } from "bun:test";
import { handleInputCharWithUi, moveSelectionWithUi, scrollPreviewWithUi } from "../src/services/navigation";

describe("navigation service", () => {
  test("handleInputCharWithUi routes submit/cancel/update paths", () => {
    let submitted = 0;
    let cancelled = 0;
    let buffer = "abc";
    let actions = 0;
    let footer = 0;

    handleInputCharWithUi({
      sequence: "\n",
      inputBuffer: buffer,
      processInputSequence: () => ({ kind: "submit" }),
      onSubmit: () => {
        submitted += 1;
      },
      onCancel: () => {
        cancelled += 1;
      },
      setInputBuffer: (value) => {
        buffer = value;
      },
      renderActions: () => {
        actions += 1;
      },
      renderFooter: () => {
        footer += 1;
      },
    });
    handleInputCharWithUi({
      sequence: "\x1b",
      inputBuffer: buffer,
      processInputSequence: () => ({ kind: "cancel" }),
      onSubmit: () => {
        submitted += 1;
      },
      onCancel: () => {
        cancelled += 1;
      },
      setInputBuffer: (value) => {
        buffer = value;
      },
      renderActions: () => {
        actions += 1;
      },
      renderFooter: () => {
        footer += 1;
      },
    });
    handleInputCharWithUi({
      sequence: "x",
      inputBuffer: buffer,
      processInputSequence: () => ({ kind: "update", buffer: "next" }),
      onSubmit: () => {
        submitted += 1;
      },
      onCancel: () => {
        cancelled += 1;
      },
      setInputBuffer: (value) => {
        buffer = value;
      },
      renderActions: () => {
        actions += 1;
      },
      renderFooter: () => {
        footer += 1;
      },
    });

    expect(submitted).toBe(1);
    expect(cancelled).toBe(1);
    expect(buffer).toBe("next");
    expect(actions).toBe(1);
    expect(footer).toBe(1);
  });

  test("moveSelectionWithUi updates selection and triggers rerenders", () => {
    let selected = 0;
    let list = 0;
    let details = 0;
    let preview = 0;

    moveSelectionWithUi({
      delta: 1,
      visibleCount: 3,
      selectedIndex: 0,
      nextSelectionIndex: ({ selectedIndex, delta }) => selectedIndex + delta,
      setSelectedIndex: (value) => {
        selected = value;
      },
      renderList: () => {
        list += 1;
      },
      renderDetails: () => {
        details += 1;
      },
      refreshPreview: async () => {
        preview += 1;
      },
    });

    expect(selected).toBe(1);
    expect(list).toBe(1);
    expect(details).toBe(1);
    expect(preview).toBe(1);
  });

  test("scrollPreviewWithUi updates offset and rerenders modal", () => {
    let offset = 0;
    let renders = 0;

    scrollPreviewWithUi({
      delta: 2,
      previewLineCount: 10,
      previewOffset: 0,
      pageLines: 4,
      nextPreviewOffset: ({ offset, delta }) => offset + delta,
      setPreviewOffset: (value) => {
        offset = value;
      },
      renderPreviewModal: () => {
        renders += 1;
      },
    });

    expect(offset).toBe(2);
    expect(renders).toBe(1);
  });
});
