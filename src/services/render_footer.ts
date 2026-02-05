import type { InputMode } from "../state";
import { buildFooterModel } from "../ui/controller";

export function renderFooterWithUi(input: {
  rendererDestroyed: boolean;
  footerStatusDestroyed: boolean;
  footerHintDestroyed: boolean;
  updateInProgress: boolean;
  status: string;
  updateCheckedAt: string | null;
  confirmUpdateOpen: boolean;
  inputMode: InputMode;
  filterQuery?: string;
  lastCommand: string;
  cwd: string;
  footerStatus: { content: unknown };
  footerHint: { content: unknown };
}): void {
  if (input.rendererDestroyed || input.footerStatusDestroyed || input.footerHintDestroyed) {
    return;
  }
  const model = buildFooterModel({
    updateInProgress: input.updateInProgress,
    status: input.status,
    updateCheckedAt: input.updateCheckedAt,
    confirmUpdateOpen: input.confirmUpdateOpen,
    inputMode: input.inputMode,
    filterQuery: input.filterQuery,
    lastCommand: input.lastCommand,
    cwd: input.cwd,
  });
  input.footerStatus.content = model.status;
  input.footerHint.content = model.hint;
}
