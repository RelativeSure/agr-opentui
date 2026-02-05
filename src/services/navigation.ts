import type { InputSequenceResult } from "./input_mode";

export function handleInputCharWithUi(input: {
  sequence: string;
  inputBuffer: string;
  processInputSequence: (sequence: string, currentBuffer: string) => InputSequenceResult;
  onSubmit: () => void;
  onCancel: () => void;
  setInputBuffer: (buffer: string) => void;
  renderActions: () => void;
  renderFooter: () => void;
}): void {
  const result = input.processInputSequence(input.sequence, input.inputBuffer);
  if (result.kind === "submit") {
    input.onSubmit();
    return;
  }
  if (result.kind === "cancel") {
    input.onCancel();
    return;
  }
  if (result.kind === "update") {
    input.setInputBuffer(result.buffer);
  }
  input.renderActions();
  input.renderFooter();
}

export function moveSelectionWithUi(input: {
  delta: number;
  visibleCount: number;
  selectedIndex: number;
  nextSelectionIndex: (args: { selectedIndex: number; delta: number; visibleCount: number }) => number;
  setSelectedIndex: (value: number) => void;
  renderList: () => void;
  renderDetails: () => void;
  refreshPreview: () => Promise<void>;
}): void {
  if (input.visibleCount === 0) {
    return;
  }
  input.setSelectedIndex(
    input.nextSelectionIndex({
      selectedIndex: input.selectedIndex,
      delta: input.delta,
      visibleCount: input.visibleCount,
    }),
  );
  input.renderList();
  input.renderDetails();
  void input.refreshPreview();
}

export function scrollPreviewWithUi(input: {
  delta: number;
  previewLineCount: number;
  previewOffset: number;
  pageLines: number;
  nextPreviewOffset: (args: { offset: number; delta: number; totalLines: number; pageLines: number }) => number;
  setPreviewOffset: (value: number) => void;
  renderPreviewModal: () => void;
}): void {
  if (input.previewLineCount === 0) {
    return;
  }
  input.setPreviewOffset(
    input.nextPreviewOffset({
      offset: input.previewOffset,
      delta: input.delta,
      totalLines: input.previewLineCount,
      pageLines: input.pageLines,
    }),
  );
  input.renderPreviewModal();
}
