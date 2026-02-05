export function renderAllWithUi(input: {
  renderTabs: () => void;
  renderList: () => void;
  renderDetails: () => void;
  renderActions: () => void;
  renderFooter: () => void;
  renderHelp: () => void;
  renderPreviewModal: () => void;
  renderMissingConfig: () => void;
  renderVerifyModal: () => void;
  renderRunOptions: () => void;
  renderUpdateConfirm: () => void;
  renderRunModal: () => void;
  requestRender: () => void;
}): void {
  input.renderTabs();
  input.renderList();
  input.renderDetails();
  input.renderActions();
  input.renderFooter();
  input.renderHelp();
  input.renderPreviewModal();
  input.renderMissingConfig();
  input.renderVerifyModal();
  input.renderRunOptions();
  input.renderUpdateConfirm();
  input.renderRunModal();
  input.requestRender();
}
