import type { BridgeData, PredefinedSkill } from "./app_logic";

export type SkillsSource = {
  repo?: string;
  branch?: string;
  path?: string;
  url?: string;
  format?: "skills-json" | "agr-toml";
  lastCommit?: string | null;
  lastChecked?: string | null;
};

export type SkillsFile = {
  source?: SkillsSource;
  skills: Array<string | (PredefinedSkill & { repo?: string })>;
};

export type InputMode = "none" | "add" | "prompt" | "args" | "filter";

export type UndoAction =
  | { op: "add"; handles: string[] }
  | { op: "remove"; handles: string[] };

export type State = {
  tabIndex: number;
  inputMode: InputMode;
  inputBuffer: string;
  promptBuffer: string;
  argsBuffer: string;
  filterQuery: string;
  selectedIndex: number;
  selectedIds: Set<string>;
  pinnedIds: Set<string>;
  toolIndex: number;
  interactive: boolean;
  status: string;
  statusToken: number;
  toastToken: number;
  lastCommand: string;
  lastExit: number | null;
  runHistory: Array<{ command: string; exitCode: number; at: string }>;
  undoAction: UndoAction | null;
  data: BridgeData | null;
  busy: boolean;
  previewAll: string[];
  previewOffset: number;
  helpOpen: boolean;
  predefined: PredefinedSkill[];
  predefinedError: string | null;
  predefinedSource: SkillsSource | null;
  predefinedFormat: "array" | "object";
  updateRemote: PredefinedSkill[];
  updateCandidates: PredefinedSkill[];
  updateRemoved: PredefinedSkill[];
  updateError: string | null;
  updateAvailable: boolean;
  updateCheckedAt: string | null;
  updateCommit: string | null;
  updateLastRequestedAt: number | null;
  confirmUpdateOpen: boolean;
  updateInProgress: boolean;
  skillLabelCache: Record<string, string>;
  skillLabelPending: Set<string>;
  installedOverrides: Set<string>;
  previewOpen: boolean;
  runOptionsOpen: boolean;
  missingConfig: boolean;
  missingConfigOpen: boolean;
  verifyOpen: boolean;
  verifyMessage: string;
  verifyDetails: string[];
  verifyConfirmAction: "install_bulk" | "remove_bulk" | null;
  runTestOpen: boolean;
};

export const tabs = ["Skills", "Discover"];

export const DEFAULT_SKILLS_SOURCE: SkillsSource = {
  format: "skills-json",
};

export function createInitialState(): State {
  return {
    tabIndex: 0,
    inputMode: "none",
    inputBuffer: "",
    promptBuffer: "",
    argsBuffer: "",
    filterQuery: "",
    selectedIndex: 0,
    selectedIds: new Set<string>(),
    pinnedIds: new Set<string>(),
    toolIndex: 0,
    interactive: false,
    status: "Ready",
    statusToken: 0,
    toastToken: 0,
    lastCommand: "",
    lastExit: null,
    runHistory: [],
    undoAction: null,
    data: null,
    busy: false,
    previewAll: [],
    previewOffset: 0,
    helpOpen: false,
    predefined: [],
    predefinedError: null,
    predefinedSource: null,
    predefinedFormat: "array",
    updateRemote: [],
    updateCandidates: [],
    updateRemoved: [],
    updateError: null,
    updateAvailable: false,
    updateCheckedAt: null,
    updateCommit: null,
    updateLastRequestedAt: null,
    confirmUpdateOpen: false,
    updateInProgress: false,
    skillLabelCache: {},
    skillLabelPending: new Set<string>(),
    installedOverrides: new Set<string>(),
    previewOpen: false,
    runOptionsOpen: false,
    missingConfig: false,
    missingConfigOpen: false,
    verifyOpen: false,
    verifyMessage: "",
    verifyDetails: [],
    verifyConfirmAction: null,
    runTestOpen: false,
  };
}
