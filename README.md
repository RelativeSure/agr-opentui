<div align="center">

# OpenTUI for `agr` and `agrx`

An OpenTUI interface for the `agr`/`agrx` CLI: view configured skills, trigger `agr` actions and preview `SKILL.md`

[![CI](https://img.shields.io/github/actions/workflow/status/RelativeSure/agr-opentui/ci.yml?branch=master&label=ci)](https://github.com/RelativeSure/agr-opentui/actions/workflows/ci.yml)
[![PyPI](https://img.shields.io/pypi/v/agr-opentui)](https://pypi.org/project/agr-opentui/)
[![Python](https://img.shields.io/pypi/pyversions/agr-opentui)](https://pypi.org/project/agr-opentui/)
[![PyPI - Downloads](https://img.shields.io/pypi/dm/agr-opentui)](https://pypi.org/project/agr-opentui/)
[![GitHub Release](https://img.shields.io/github/v/release/RelativeSure/agr-opentui)](https://github.com/RelativeSure/agr-opentui/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

---

`agr-opentui` is an OpenTUI front-end for `agr`/`agrx`.
The default discover source in this repo points to `https://github.com/kasperjunge/agent-resources`.

## Install from PyPI

With `uv`:

```bash
uv tool install agr-opentui
```

With `pip`:

```bash
python -m pip install agr-opentui
```

Then run:

```bash
agr-opentui
```

Check installed version:

```bash
agr-opentui --version
```

## Usage

Tabs:
- `Skills`: shows dependencies from `agr.toml` and install state.
- `Discover`: shows skills embedded in the binary.

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
- `v`: preview `SKILL.md`
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
- `v` to preview, `i` to add, `y` to copy handle

## Requirements

### Runtime (using `agr-opentui`):
- Python 3.10+
- `uv`
- `agr` + `agrx` on your `PATH`

### Build/Development (working on this repo):
- Bun 1.3.8+
- Zig (required by OpenTUI build tooling)

#### Build

```bash
bun run build
```
or
```bash
make build
```
This creates `bin/agr-opentui`.


#### Install

```bash
bun install
```

#### Run

```bash
bun run src/main.ts
```

Run it from the repo you want to manage (the current working directory is the target repo).
`agr.toml` is expected in that target repo for `agr add/remove/sync` operations.

### Run From Target Repo

```bash
cd /path/to/your/project
agr-opentui
```

`agr-opentui` itself does not need to contain your target repo's `agr.toml`.

## Discover List (Embedded)

The `Discover` tab is bundled into the compiled binary from this repository's `skills.json` at build time.

To change the list, update `skills.json` in this repository and rebuild (`make build`).

To avoid repeating repo metadata, `skills.json` can also be a DRY repo-group array like `skills-multi-repo-example.json`:
- One array item per repository with this schema: `repo`, optional `branch`, `handlePrefix`, and `skills[]`.
- Each `skills[]` item must include `id` and an explicit relative `path` ending in `/SKILL.md`; `label` is optional.
- At build time this expands into Discover entries with:
  `handle = handlePrefix + "/" + id`, preserved `repo`, preserved `label` (defaulting to handle), and explicit `skillMdPath` metadata for preview resolution.

Example:

```json
[
  {
    "repo": "kasperjunge/agent-resources",
    "branch": "main",
    "handlePrefix": "kasperjunge",
    "skills": [
      {
        "id": "code-review",
        "path": "skills/development/workflow/code-review/SKILL.md",
        "label": "Code Review"
      }
    ]
  }
]
```

Migration from legacy `skills.json`:
- Existing object/array payloads are still supported.
- To migrate, group skills by repository and replace per-skill `repo` duplication with one repo-group entry.

## Troubleshooting

- `Missing agr.toml`: run the app from a repo that has `agr.toml`, or create one.
- `uv not found`: install `uv` and ensure it’s on `PATH`.
- `agr/agrx not found`: install `agr` and ensure it’s on `PATH`.
- `python not found`: install Python 3.
- Discover list out of date: update this repository's `skills.json` and rebuild the binary.
- Discover list not updating: check the `source` URL/repo/branch/path and network access.
- `SKILL.md` preview says “not found”: the skill may not ship a `SKILL.md` or the path is nonstandard.

## Notes

- All actions run through `uv` (`uv run agr`, `uv run agrx`).
- Bridge loading runs with the launcher Python when available (`AGR_OPENTUI_LAUNCHER_PYTHON`), with `uv run python -m agr_opentui.bridge` as fallback.
- Startup runs a lightweight preflight for `uv`, `agr`, and `agrx`; press `d` to run full Doctor checks.
- If `agr.toml` is missing in the current directory, install/remove/sync commands are blocked and a warning is shown.
- Logs are written to `/tmp/agr-opentui.log`.
