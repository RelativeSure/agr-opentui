# Repository Guidelines

## Project Structure & Module Organization
- `src/`: TypeScript runtime and UI logic. Use `src/services/` for app/service logic, `src/runtime/` for startup and handlers, and `src/ui/` for rendering/controller code.
- `src/generated/embedded_skills.ts`: generated from `skills.json` (do not edit by hand).
- `test/`: Bun tests, mostly `*_service.test.ts` plus integration-style runtime/UI tests.
- `agr_opentui/`: Python launcher package (`cli.py`, `bridge.py`) and bundled binary at `agr_opentui/bin/agr-opentui`.
- `scripts/`: project scripts (for example, skill payload generation).
- `bin/` and `dist/`: build outputs.

## Build, Test, and Development Commands
- `bun install`: install JavaScript dependencies.
- `bun run dev` (or `bun run src/main.ts`): run the TUI in development.
- `bun test`: run the Bun test suite.
- `bun run check`: run TypeScript typecheck and tests (CI baseline).
- `make build` (or `bun run build`): regenerate embedded skills and compile `bin/agr-opentui`.
- `make py-build`: build Python distribution artifacts in `dist/` with bundled binary.

## Coding Style & Naming Conventions
- TypeScript is strict (`tsconfig.json`); keep types explicit at module boundaries.
- Match existing style: 2-space indentation, double quotes, small focused functions.
- Name service files by behavior (`render_preview.ts`, `verify_coordinator.ts`).
- Keep tests named after target modules, e.g. `render_list_service.test.ts`.
- Regenerate generated code with `make build` after editing `skills.json` or generation logic.

## Testing Guidelines
- Test framework: `bun:test`.
- Add or update tests for every behavior change, including failure and edge cases.
- Run `bun run check` before opening a PR.
- For packaging or launcher changes, also run `make py-build` to validate wheel/sdist output.

## Commit & Pull Request Guidelines
- Use short, imperative commit messages; prefixes like `fix:`, `ci:`, and `chore:` are common.
- Reference issues when relevant (example: `Fix issue #16 UI regressions`).
- PRs should include: change summary, test evidence (`bun run check`), and UI screenshots/terminal captures for TUI-visible changes.
- Keep PRs focused; update generated outputs when source inputs change.
