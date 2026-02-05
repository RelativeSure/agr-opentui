# OpenTUI for agr

This folder contains an isolated OpenTUI app for installing and running skills.

## Requirements

- Bun
- Zig (required by OpenTUI build tooling)
- uv (for Python commands)

## Run

```bash
bun install
bun run src/main.ts
```

## Notes

- This app calls `uv run agr` and `uv run agrx` for all operations (via uv).
- It reads data via `uv run python -m agr_opentui.bridge`.
- This folder can be copied into a new repo as-is.

## Target Repo

By default, commands run in the current working directory.
To target another repo, either:

- Set `AGR_TUI_REPO=/path/to/repo` before launching, or
- Press `R` in the UI and enter the repo path.
