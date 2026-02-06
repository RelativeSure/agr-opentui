"""CLI launcher for the packaged OpenTUI binary."""

from __future__ import annotations

import os
import sys
from pathlib import Path

_BINARY_NAME = "agr-opentui"


def _binary_path() -> Path:
    return Path(__file__).resolve().parent / "bin" / _BINARY_NAME


def main() -> None:
    binary = _binary_path()
    if not binary.exists():
        raise SystemExit(
            "agr-opentui binary is not bundled in this build. "
            "Install a wheel that includes the binary for your platform."
        )

    os.execv(str(binary), [str(binary), *sys.argv[1:]])


if __name__ == "__main__":
    main()
