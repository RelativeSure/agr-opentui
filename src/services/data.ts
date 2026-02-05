import { join } from "node:path";
import { buildBridgeLoadSnapshot, formatLoadDataFailureStatus } from "../app_logic";
import type { BridgeData } from "../app_logic";
import type { AppDeps } from "../deps";
import { defaultAppDeps } from "../deps";
import type { State } from "../state";

export async function loadDataWithUi(input: {
  state: State;
  cwd: string;
  deps?: Pick<AppDeps, "existsSync" | "now" | "setTimeout">;
  loadPredefined: () => void;
  renderList: () => void;
  renderDetails: () => void;
  checkUpdates: () => Promise<void>;
  writeSkillsFile: () => void;
  runBridge: () => Promise<{ exitCode: number; stdout: string; stderr: string }>;
  setStatus: (message: string, options?: { clearAfterMs?: number }) => void;
  renderAll: () => void;
  refreshPreview: () => Promise<void>;
}): Promise<void> {
  const deps = input.deps ?? defaultAppDeps;
  try {
    input.loadPredefined();
    input.renderList();
    input.renderDetails();

    if (input.state.predefinedSource?.url || input.state.predefinedSource?.repo) {
      const lastChecked = input.state.predefinedSource?.lastChecked
        ? new Date(input.state.predefinedSource.lastChecked).getTime()
        : 0;
      const now = deps.now();
      const sixHoursMs = 6 * 60 * 60 * 1000;
      if (!lastChecked || Number.isNaN(lastChecked) || now - lastChecked > sixHoursMs) {
        input.setStatus("Loading discover list...");
        await input.checkUpdates();
        if (input.state.updateRemote.length > 0) {
          input.writeSkillsFile();
          input.loadPredefined();
          input.renderList();
          input.renderDetails();
          input.setStatus("Discover list updated", { clearAfterMs: 2500 });
        } else {
          input.setStatus("Discover list up to date", { clearAfterMs: 2500 });
        }
      } else if (!input.state.updateCheckedAt) {
        deps.setTimeout(() => {
          void input.checkUpdates();
        }, 0);
      }
    }

    const configPath = join(input.cwd, "agr.toml");
    input.state.missingConfig = !deps.existsSync(configPath);
    input.setStatus("Loading configuration...");

    const result = await input.runBridge();
    if (result.exitCode !== 0) {
      const errorLine = result.stderr.trim().split(/\r?\n/).slice(-1)[0];
      const message = errorLine || `bridge exited with ${result.exitCode}`;
      input.setStatus(formatLoadDataFailureStatus(message));
      return;
    }

    const snapshotResult = buildBridgeLoadSnapshot(result.stdout);
    if (!snapshotResult.ok) {
      input.setStatus(formatLoadDataFailureStatus(snapshotResult.error));
      return;
    }

    input.state.data = snapshotResult.snapshot.data as BridgeData;
    input.state.toolIndex = snapshotResult.snapshot.toolIndex;
    input.state.installedOverrides.clear();
    input.setStatus("Config loaded", { clearAfterMs: 2500 });
    input.renderAll();
    await input.refreshPreview();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    input.setStatus(formatLoadDataFailureStatus(message));
  }
}
