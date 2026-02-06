from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

from hatchling.builders.hooks.plugin.interface import BuildHookInterface


class CustomBuildHook(BuildHookInterface):
    PLUGIN_NAME = "custom"

    def initialize(self, version: str, build_data: dict) -> None:
        root = Path(self.root)
        bin_dir = root / "bin"
        packaged_bin = root / "agr_opentui" / "bin" / "agr-opentui"
        source_bin = bin_dir / "agr-opentui"
        js_deps_ready = (root / "node_modules" / "@opentui" / "core").exists()

        if js_deps_ready:
            subprocess.run(
                ["bun", "scripts/generate-embedded-skills.ts"],
                cwd=root,
                check=True,
            )
            bin_dir.mkdir(parents=True, exist_ok=True)
            subprocess.run(
                ["bun", "build", "src/main.ts", "--compile", "--outfile", str(source_bin)],
                cwd=root,
                check=True,
            )
            packaged_bin.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source_bin, packaged_bin)
            packaged_bin.chmod(0o755)
            return

        # Wheel builds from sdist may run without JS dependencies installed.
        # Reuse the binary already produced during sdist creation.
        if not packaged_bin.exists():
            raise RuntimeError(
                f"Packaged binary missing at {packaged_bin}. "
                "Run build in a JS-enabled environment before creating the sdist."
            )
