# OpenTUI for agr

OpenTUI front-end for managing `agr` skills: browse `agr.toml`, install/remove skills, preview `SKILL.md`, and run skills via `agrx`. Skill discovery is based on `https://github.com/kasperjunge/agent-resources`.

## Usage

Tabs:
- `Skills`: shows dependencies from `agr.toml` and install state.
- `Discover`: shows skills from `skills.json` (optional).

Common keys:
- `Tab` / `Shift+Tab`: switch tabs
- Arrow keys: move selection
- `space`: toggle select
- `H`: help
- `q`: quit

Skills tab keys:
- `a`: add skill (handle or `owner/repo/path`)
- `i`: install selected (bulk)
- `r`: remove selected (bulk)
- `v`: preview `SKILL.md`
- `g`: run with default options (`agrx`)
- `G`: open run options (tool, interactive, prompt, extra args)
- `u`: check discover list updates
- `U`: apply update (no confirm)
- `s`: apply update (confirm)
- `S`: apply update + sync (no confirm)
- `c`: reload config

Discover tab keys:
- `i`: add selected
- `y`: copy handle/repo to clipboard
- `a`: add skill
- `c`: reload config

Run options keys (when the modal is open):
- `t`: cycle tool
- `u`: toggle `--interactive`
- `p`: edit `--prompt`
- `e`: edit extra args
- `Enter`: run
- `Esc`: close

## Quick Cheat Sheet

Primary flow:
- `Tab` to `Skills`
- Arrow keys to select
- `g` to run, `G` for run options

Bulk actions:
- `space` to multi-select
- `i` install or `r` remove (Skills tab)

Discover flow:
- `Tab` to `Discover`
- Arrow keys to select
- `i` to add, `y` to copy handle

## Requirements

- Bun 1.3.8+
- Zig (required by OpenTUI build tooling)
- Python 3.10+
- `uv`
- `agr` + `agrx` on your `PATH`

## Install

```bash
bun install
```

## Run

```bash
bun run src/main.ts
```

Run it from the repo you want to manage (the current working directory is the target repo).
`agr.toml` is expected in that target repo for `agr add/remove/sync` operations.

### Run From Target Repo

```bash
cd /path/to/your/project
agr-tui
```

`agr-opentui` itself does not need to contain your target repo's `agr.toml`.

## Build

```bash
bun run build
```

This creates `bin/agr-tui`.

## Publish to PyPI

One-time setup:
- Create a `pypi` environment in this GitHub repo.
- In your PyPI project settings, add this repo/workflow as a Trusted Publisher for `.github/workflows/publish-pypi.yml`.
- Optional: add `testpypi` environment and TestPyPI Trusted Publisher too.

Publish via GitHub Actions:
- Release publish: creating a GitHub release triggers publish to PyPI.
- Manual: run `publish-pypi` workflow and choose `pypi` or `testpypi`.

Publish from local machine:

```bash
python -m pip install --upgrade build twine
make py-publish        # Upload to PyPI
make py-publish-test   # Upload to TestPyPI
```

## Discover List (`skills.json`)

If `skills.json` exists, the `Discover` tab will list its entries. It supports:

- An array of strings or objects (`{ "label": "...", "handle": "...", "repo": "owner/repo" }`).
- An object with `source` metadata and `skills` array (see `skills.json` in this repo).

When a `source` is configured, the app checks the remote list periodically (about every 6 hours) and can update `skills.json` using the `u`/`U`/`s`/`S` controls.

## Troubleshooting

- `Missing agr.toml`: run the app from a repo that has `agr.toml`, or create one.
- `uv not found`: install `uv` and ensure it’s on `PATH`.
- `agr/agrx not found`: install `agr` and ensure it’s on `PATH`.
- `python not found`: install Python 3.
- `skills.json not found` or parse errors: fix the file format (array or `{ "source": ..., "skills": [...] }`).
- Discover list not updating: check the `source` URL/repo/branch/path and network access.
- `SKILL.md` preview says “not found”: the skill may not ship a `SKILL.md` or the path is nonstandard.
- Copy to clipboard doesn’t work: install `pbcopy` (macOS), `wl-copy` (Wayland), or `xclip` (X11).

## Notes

- All actions run through `uv` (`uv run agr`, `uv run agrx`, and `uv run python -m agr_opentui.bridge`).
- If `agr.toml` is missing in the current directory, install/remove/sync commands are blocked and a warning is shown.
- Logs are written to `/tmp/agr-opentui.log`.
