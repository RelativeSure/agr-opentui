import { buildActionLines, buildDetailsLines, buildHelpLines, type Dependency, type PredefinedSkill } from "../app_logic";
import type { InputMode } from "../state";

export type UiTone = "text" | "dim" | "highlight" | "warn" | "danger" | "accent" | "success" | "selected";

export type UiRow = {
  content: string;
  tone: UiTone;
};

export type UiListRow = UiRow & {
  backgroundTone: "panelAlt" | "selected";
};

function formatTimestampShort(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return "invalid";
    }
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${y}-${m}-${day} ${hh}:${mm}`;
  } catch {
    return "invalid";
  }
}

function clampSelection(selectedIndex: number, visibleCount: number): number {
  if (visibleCount <= 0) {
    return 0;
  }
  if (selectedIndex < 0) {
    return 0;
  }
  if (selectedIndex >= visibleCount) {
    return visibleCount - 1;
  }
  return selectedIndex;
}

export function buildTabsRows(input: {
  tabs: string[];
  tabIndex: number;
  updateError: boolean;
  updateAvailable: boolean;
}): UiRow[] {
  return input.tabs.map((tab, index) => {
    let label = tab;
    if (tab === "Skills") {
      if (input.updateError) {
        label = "Skills!";
      } else if (input.updateAvailable) {
        label = "Skills*";
      }
    }
    const content = index === input.tabIndex ? `>${label}<` : ` ${label} `;
    let tone: UiTone = "dim";
    if (index === input.tabIndex) {
      tone = "highlight";
    } else if (tab === "Skills" && input.updateError) {
      tone = "warn";
    } else if (tab === "Skills" && input.updateAvailable) {
      tone = "accent";
    }
    return { content, tone };
  });
}

export function buildListRows(input: {
  tab: "Skills" | "Discover";
  visible: Array<Dependency | PredefinedSkill>;
  selectedIndex: number;
  rowCount: number;
  isSelectedDependency: (dep: Dependency) => boolean;
  getSkillDisplayLabel: (skill: PredefinedSkill) => string;
  getSkillSourceLabel: (skill: PredefinedSkill) => string;
}): { title: string; selectedIndex: number; rows: UiListRow[] } {
  const nextSelectedIndex = clampSelection(input.selectedIndex, input.visible.length);
  const title = input.tab === "Discover" ? "Discover" : "SKILLS";

  let nameCounts: Record<string, number> | null = null;
  if (input.tab === "Discover") {
    nameCounts = {};
    for (const item of input.visible) {
      const skill = item as PredefinedSkill;
      const name = input.getSkillDisplayLabel(skill);
      nameCounts[name] = (nameCounts[name] ?? 0) + 1;
    }
  }

  const rows: UiListRow[] = [];
  for (let i = 0; i < input.rowCount; i += 1) {
    const item = input.visible[i];
    if (!item) {
      rows.push({ content: "", tone: "text", backgroundTone: "panelAlt" });
      continue;
    }

    const selected = i === nextSelectedIndex;
    const marker = selected ? ">" : " ";

    if (input.tab === "Discover") {
      const skill = item as PredefinedSkill;
      const displayLabel = input.getSkillDisplayLabel(skill);
      const count = nameCounts?.[displayLabel] ?? 0;
      const content = count > 1 ? `${marker} ${displayLabel} - ${input.getSkillSourceLabel(skill)}` : `${marker} ${displayLabel}`;
      rows.push({
        content,
        tone: selected ? "selected" : "text",
        backgroundTone: selected ? "selected" : "panelAlt",
      });
      continue;
    }

    const dep = item as Dependency;
    const status = dep.installed ? "*" : " ";
    const multi = input.isSelectedDependency(dep) ? "+" : " ";
    rows.push({
      content: `${marker}${multi} [${status}] ${dep.identifier}`,
      tone: selected ? "selected" : dep.installed ? "success" : "text",
      backgroundTone: selected ? "selected" : "panelAlt",
    });
  }

  return { title, selectedIndex: nextSelectedIndex, rows };
}

export function buildDetailsRows(input: {
  tab: "Skills" | "Discover";
  predefinedError: string | null;
  predefinedCount: number;
  visiblePredefinedCount: number;
  updateInProgress: boolean;
  hasSource: boolean;
  selectedSkill: { displayLabel: string; sourceLabel: string; handle: string; repo?: string } | null;
  hasData: boolean;
  selectedDependency: Dependency | null;
  rowCount: number;
}): UiRow[] {
  const lines = buildDetailsLines(input);
  const rows: UiRow[] = [];
  for (let i = 0; i < input.rowCount; i += 1) {
    const content = lines[i] ?? "";
    let tone: UiTone = "text";
    if (content.startsWith("Status:")) {
      if (content.includes("OK")) {
        tone = "success";
      } else if (content.includes("not found")) {
        tone = "warn";
      }
    } else if (content.startsWith("Selected:") || content.startsWith("Name:")) {
      tone = "highlight";
    } else if (content.startsWith("Installed:")) {
      tone = content.includes("yes") ? "success" : "warn";
    } else if (content.startsWith("Handle:")) {
      tone = "accent";
    } else if (content.startsWith("Discover list error:") || content.startsWith("Update error:")) {
      tone = "danger";
    }
    rows.push({ content, tone });
  }
  return rows;
}

export function buildActionRows(input: {
  tab: "Skills" | "Discover";
  rowCount: number;
  updateAvailable?: boolean;
}): UiRow[] {
  const lines = buildActionLines(input.tab, { updateAvailable: input.updateAvailable });
  const rows: UiRow[] = [];
  for (let i = 0; i < input.rowCount; i += 1) {
    const content = lines[i] ?? "";
    let tone: UiTone = "text";
    if (content.startsWith("q:")) {
      tone = "warn";
    } else if (content.includes("no confirm")) {
      tone = "danger";
    } else if (content.startsWith("g:") || content.startsWith("i:")) {
      tone = "accent";
    }
    rows.push({ content, tone });
  }
  return rows;
}

export function buildFooterModel(input: {
  updateInProgress: boolean;
  status: string;
  updateCheckedAt: string | null;
  confirmUpdateOpen: boolean;
  inputMode: InputMode;
  filterQuery?: string;
  lastCommand: string;
  cwd: string;
}): { status: string; hint: string } {
  let status = input.updateInProgress ? "Loading discover list..." : input.status;
  if (input.updateCheckedAt) {
    status = `${status}  |  Last check: ${formatTimestampShort(input.updateCheckedAt)}`;
  }

  const hints: string[] = [];
  if (input.confirmUpdateOpen) {
    hints.push("Update pending: y apply, s apply+sync, n/Esc cancel");
  } else if (input.inputMode === "add") {
    hints.push("Add mode: enter handle/path, Enter to add, Esc to cancel");
  } else if (input.inputMode === "prompt") {
    hints.push("Prompt mode: Enter to run, Esc to cancel");
  } else if (input.inputMode === "args") {
    hints.push("Args mode: Enter to set extra args, Esc to cancel");
  } else if (input.inputMode === "filter") {
    hints.push("Filter mode: type to filter, Enter apply, Esc cancel");
  } else {
    hints.push("Press Tab to switch panels. Press q to exit.");
  }
  if (input.filterQuery) {
    hints.push(`Filter: ${input.filterQuery}`);
  }
  hints.push(`Target repo: ${input.cwd} (agr.toml checked here for agr add/remove/sync)`);
  if (input.lastCommand) {
    hints.push(`Last: ${input.lastCommand}`);
  }

  return { status, hint: hints.join(" | ") };
}

export function buildHelpRows(input: { tab: "Skills" | "Discover"; rowCount: number }): UiRow[] {
  const lines = buildHelpLines(input.tab);
  while (lines.length < input.rowCount) {
    lines.push("");
  }
  const rows: UiRow[] = [];
  for (let i = 0; i < input.rowCount; i += 1) {
    rows.push({ content: lines[i] ?? "", tone: "text" });
  }
  return rows;
}

export function buildThreePaneSnapshot(input: {
  tab: "Skills" | "Discover";
  visible: Array<Dependency | PredefinedSkill>;
  selectedIndex: number;
  selectedIds: Set<string>;
  predefinedError: string | null;
  predefinedCount: number;
  visiblePredefinedCount: number;
  updateInProgress: boolean;
  hasSource: boolean;
  selectedSkill: { displayLabel: string; sourceLabel: string; handle: string; repo?: string } | null;
  hasData: boolean;
  selectedDependency: Dependency | null;
  getSkillDisplayLabel: (skill: PredefinedSkill) => string;
  getSkillSourceLabel: (skill: PredefinedSkill) => string;
}): {
  list: string[];
  details: string[];
  actions: string[];
  selectedIndex: number;
} {
  const list = buildListRows({
    tab: input.tab,
    visible: input.visible,
    selectedIndex: input.selectedIndex,
    rowCount: 17,
    isSelectedDependency: (dep) => input.selectedIds.has(dep.identifier),
    getSkillDisplayLabel: input.getSkillDisplayLabel,
    getSkillSourceLabel: input.getSkillSourceLabel,
  });

  const details = buildDetailsRows({
    tab: input.tab,
    predefinedError: input.predefinedError,
    predefinedCount: input.predefinedCount,
    visiblePredefinedCount: input.visiblePredefinedCount,
    updateInProgress: input.updateInProgress,
    hasSource: input.hasSource,
    selectedSkill: input.selectedSkill,
    hasData: input.hasData,
    selectedDependency: input.selectedDependency,
    rowCount: 12,
  });

  const actions = buildActionRows({
    tab: input.tab,
    rowCount: 12,
    updateAvailable: false,
  });

  return {
    list: list.rows.map((row) => row.content),
    details: details.map((row) => row.content),
    actions: actions.map((row) => row.content),
    selectedIndex: list.selectedIndex,
  };
}
