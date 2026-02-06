"""CLI launcher for the packaged OpenTUI binary."""

from __future__ import annotations

import os
import re
import sys
from importlib.metadata import PackageNotFoundError, version
from pathlib import Path

_BINARY_NAME = "agr-opentui"


def _binary_path() -> Path:
    return Path(__file__).resolve().parent / "bin" / _BINARY_NAME


def _package_version() -> str:
    try:
        return version("agr-opentui")
    except PackageNotFoundError:
        pyproject = Path(__file__).resolve().parent.parent / "pyproject.toml"
        try:
            raw = pyproject.read_text(encoding="utf-8")
            match = re.search(r'^\s*version\s*=\s*"([^"]+)"\s*$', raw, flags=re.MULTILINE)
            if match:
                return match.group(1)
        except OSError:
            pass
        return "0.0.0+local"


def main() -> None:
    if any(arg in {"--version", "-V"} for arg in sys.argv[1:]):
        print(_package_version())
        return

    binary = _binary_path()
    if not binary.exists():
        raise SystemExit(
            "agr-opentui binary is not bundled in this build. "
            "Install a wheel that includes the binary for your platform."
        )

    env = os.environ.copy()
    env["AGR_OPENTUI_LAUNCHER_PYTHON"] = sys.executable
    os.execve(str(binary), [str(binary), *sys.argv[1:]], env)


if __name__ == "__main__":
    main()
