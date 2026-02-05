"""JSON bridge for the OpenTUI interface."""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path

from agr.config import AgrConfig, Dependency, find_config, find_repo_root
from agr.fetcher import get_installed_skills
from agr.handle import ParsedHandle, parse_handle
from agr.skill import SKILL_MARKER
from agr.tool import get_tool


@dataclass(frozen=True)
class BridgeDependency:
    identifier: str
    handle: str | None
    path: str | None
    is_local: bool
    display: str
    candidates: list[str]
    candidates_by_tool: dict[str, list[str]]
    installed: bool
    skill_md_path: str | None


def _parse_dependency(dep: Dependency) -> ParsedHandle:
    if dep.handle:
        return parse_handle(dep.handle, prefer_local=False)
    if dep.path:
        path = Path(dep.path)
        return ParsedHandle(is_local=True, name=path.name, local_path=path)
    raise ValueError("Dependency missing handle/path")


def _candidates_for_install(handle: ParsedHandle, tool_name: str) -> list[str]:
    tool = get_tool(tool_name)
    candidates = [
        handle.to_skill_path(tool).as_posix(),
        handle.name,
        handle.to_installed_name(),
    ]
    if handle.is_local:
        candidates.append(f"local/{handle.name}")
    return list(dict.fromkeys(candidates))


def _installed_by_tool(repo_root: Path, tools: list[str]) -> dict[str, list[str]]:
    installed: dict[str, list[str]] = {}
    for tool in tools:
        try:
            installed[tool] = get_installed_skills(repo_root, get_tool(tool))
        except Exception:
            installed[tool] = []
    return installed


def _resolve_skill_md_path(
    dep: Dependency,
    *,
    handle: ParsedHandle,
    repo_root: Path | None,
    default_tool: str | None,
) -> str | None:
    if repo_root is None:
        return None

    if dep.path:
        path = Path(dep.path)
        if not path.is_absolute():
            path = repo_root / path
        skill_md = path / SKILL_MARKER
        return str(skill_md) if skill_md.exists() else None

    if not default_tool:
        return None

    tool = get_tool(default_tool)
    skills_dir = tool.get_skills_dir(repo_root)
    candidates = _candidates_for_install(handle, default_tool)
    for candidate in candidates:
        skill_md = skills_dir / candidate / SKILL_MARKER
        if skill_md.exists():
            return str(skill_md)
    return None


def build_payload() -> dict[str, object]:
    repo_root = find_repo_root()
    config_path = find_config()
    config = AgrConfig.load(config_path) if config_path else AgrConfig()

    tool_names = list(config.tools)
    default_tool = config.default_tool or (tool_names[0] if tool_names else None)

    installed = (
        _installed_by_tool(repo_root, tool_names) if repo_root and tool_names else {}
    )

    deps_payload: list[dict[str, object]] = []
    for dep in config.dependencies:
        handle = _parse_dependency(dep)
        candidates = (
            _candidates_for_install(handle, default_tool)
            if default_tool
            else []
        )
        candidates_by_tool = {
            tool_name: _candidates_for_install(handle, tool_name)
            for tool_name in tool_names
        }
        installed_names = installed.get(default_tool or "", [])
        is_installed = any(name in installed_names for name in candidates)
        skill_md_path = _resolve_skill_md_path(
            dep,
            handle=handle,
            repo_root=repo_root,
            default_tool=default_tool,
        )

        deps_payload.append(
            BridgeDependency(
                identifier=dep.identifier,
                handle=dep.handle,
                path=dep.path,
                is_local=dep.is_local,
                display=dep.identifier,
                candidates=candidates,
                candidates_by_tool=candidates_by_tool,
                installed=is_installed,
                skill_md_path=skill_md_path,
            ).__dict__
        )

    return {
        "repo_root": str(repo_root) if repo_root else None,
        "config_path": str(config_path) if config_path else None,
        "tools": tool_names,
        "default_tool": default_tool,
        "dependencies": deps_payload,
        "installed": installed,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="OpenTUI data bridge")
    parser.parse_args()

    payload = build_payload()
    print(json.dumps(payload))


if __name__ == "__main__":
    main()
