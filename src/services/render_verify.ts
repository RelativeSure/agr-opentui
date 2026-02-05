export function renderVerifyWithUi(input: {
  verifyOpen: boolean;
  verifyMessage: string;
  verifyDetails: string[];
  wrapText: (value: string, width: number) => string[];
  overlay: { visible: boolean };
  line1: { content: unknown };
  line2: { content: unknown };
  listLines: Array<{ content: unknown }>;
}): void {
  if (!input.verifyOpen) {
    input.overlay.visible = false;
    return;
  }
  input.overlay.visible = true;
  const wrapped = input.wrapText(input.verifyMessage, 64);
  input.line1.content = wrapped[0] ?? "";
  input.line2.content = wrapped[1] ?? "";

  const list: string[] = [];
  for (const item of input.verifyDetails ?? []) {
    const wrappedItem = input.wrapText(item, 60);
    if (wrappedItem.length === 0) {
      continue;
    }
    list.push(`- ${wrappedItem[0]}`);
    for (const extra of wrappedItem.slice(1)) {
      list.push(`  ${extra}`);
    }
  }
  if (list.length > input.listLines.length) {
    const remaining = list.length - (input.listLines.length - 1);
    list.length = input.listLines.length - 1;
    list.push(`... +${remaining} more`);
  }
  for (let i = 0; i < input.listLines.length; i += 1) {
    input.listLines[i].content = list[i] ?? "";
  }
}
