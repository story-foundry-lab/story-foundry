#!/usr/bin/env python3
"""Check Story Foundry repository structure and public hygiene."""

from __future__ import annotations

import pathlib
import sys


REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
WORKS_DIR = REPO_ROOT / "works"

REQUIRED_ROOT_DIRS = [".agents", "ai", "works", "shared", "scripts"]
REQUIRED_ROOT_FILES = ["AGENTS.md", "WORKFLOW.md", "README.md"]
FORBIDDEN_ROOT_DIRS = [("ai", "skills")]
REQUIRED_AGENT_PATHS = [
    ".agents/skills/novel-fiction/SKILL.md",
    ".agents/skills/novel-fiction/references/name-map.md",
    ".agents/protocols/repository.md",
    ".agents/protocols/cross-repo-sync.md",
    ".agents/workflows/chapter-group-planning.md",
    ".agents/workflows/interactive-rehearsal.md",
    ".agents/workflows/language-review.md",
]
REQUIRED_SHARED_PATHS = [
    "shared/README.md",
    "shared/角色/README.md",
    "shared/角色/天泽近卫.md",
]
REQUIRED_WORK_FILES = ["README.md", "ka.yaml"]
REQUIRED_COMMON_WORK_DIRS = ["state", "tasks", "handoff"]
REQUIRED_COMMON_WORK_READMES = {
    "song-of-blaze": [
        "项目管理/当前状态/README.md",
        "项目管理/创作进度/README.md",
        "项目管理/待办任务/README.md",
        "项目管理/交接记录/README.md",
        "剧情大纲/分章大纲/章节组/README.md",
        "故事设定/资料库/README.md",
        "写作资料/互动试演/README.md",
    ],
    "madoka-fanfic": [
        "state/README.md",
        "progress/README.md",
        "tasks/README.md",
        "handoff/README.md",
        "plan/README.md",
        "plan/chapter-groups/README.md",
        "lore/README.md",
        "interactive/README.md",
    ],
}
REQUIRED_WORK_DIRS = {
    "song-of-blaze": [
        "故事设定",
        "剧情大纲",
        "正文草稿",
        "写作资料",
        "项目管理",
    ],
    "madoka-fanfic": [
        "state",
        "progress",
        "tasks",
        "handoff",
        "drafts",
        "canon",
        "lore",
        "plan",
        "interactive",
        "fragments",
    ],
}
FORBIDDEN_NAMES = {".DS_Store", "Thumbs.db"}
FORBIDDEN_SUFFIXES = {".zip", ".7z", ".rar"}
FORBIDDEN_PUBLIC_DIR_NAMES = {"原文", "raw"}
FORBIDDEN_WORK_FILES = {"package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml"}


def rel(path: pathlib.Path) -> str:
    return path.relative_to(REPO_ROOT).as_posix()


def check() -> int:
    issues: list[str] = []
    warnings: list[str] = []

    for dirname in REQUIRED_ROOT_DIRS:
        if not (REPO_ROOT / dirname).is_dir():
            issues.append(f"[MISSING] root directory: {dirname}/")

    for filename in REQUIRED_ROOT_FILES:
        if not (REPO_ROOT / filename).is_file():
            issues.append(f"[MISSING] root file: {filename}")

    for parts in FORBIDDEN_ROOT_DIRS:
        forbidden_path = REPO_ROOT.joinpath(*parts)
        if forbidden_path.exists():
            issues.append(f"[FORBIDDEN] old agent skill location: {'/'.join(parts)}/")

    for required_path in REQUIRED_AGENT_PATHS:
        if not (REPO_ROOT / required_path).is_file():
            issues.append(f"[MISSING] agent protocol file: {required_path}")

    for required_path in REQUIRED_SHARED_PATHS:
        if not (REPO_ROOT / required_path).is_file():
            issues.append(f"[MISSING] shared asset file: {required_path}")

    if not WORKS_DIR.is_dir():
        issues.append("[MISSING] works/")
    else:
        for work_dir in sorted(p for p in WORKS_DIR.iterdir() if p.is_dir()):
            work_id = work_dir.name
            for filename in REQUIRED_WORK_FILES:
                if not (work_dir / filename).is_file():
                    issues.append(f"[MISSING] works/{work_id}/{filename}")

            for dirname in REQUIRED_WORK_DIRS.get(work_id, []):
                if not (work_dir / dirname).is_dir():
                    issues.append(f"[MISSING] works/{work_id}/{dirname}/")

            readme_paths = REQUIRED_COMMON_WORK_READMES.get(
                work_id,
                [f"{dirname}/README.md" for dirname in REQUIRED_COMMON_WORK_DIRS],
            )
            for readme_path in readme_paths:
                readme = work_dir / readme_path
                if not readme.is_file():
                    issues.append(f"[MISSING] works/{work_id}/{readme_path}")

            for forbidden in FORBIDDEN_WORK_FILES:
                if (work_dir / forbidden).exists():
                    issues.append(f"[FORBIDDEN] old package artifact: works/{work_id}/{forbidden}")

            if work_id not in REQUIRED_WORK_DIRS:
                warnings.append(f"[UNKNOWN] works/{work_id}/ has no required-dir profile")

    for path in REPO_ROOT.rglob("*"):
        if ".git" in path.parts:
            continue
        if path.name in FORBIDDEN_NAMES:
            issues.append(f"[FORBIDDEN] generated OS file: {rel(path)}")
        if path.is_file() and path.suffix.lower() in FORBIDDEN_SUFFIXES:
            issues.append(f"[FORBIDDEN] archive artifact: {rel(path)}")
        if path.is_dir() and path.name in FORBIDDEN_PUBLIC_DIR_NAMES:
            issues.append(f"[FORBIDDEN] public repo should not track raw corpus directory: {rel(path)}/")

    if issues:
        print(f"[FAIL] {len(issues)} structure issue(s):")
        for issue in issues:
            print(f"  {issue}")

    if warnings:
        print(f"[WARN] {len(warnings)} warning(s):")
        for warning in warnings:
            print(f"  {warning}")

    if not issues and not warnings:
        print("[PASS] Story Foundry structure is clean")

    return 1 if issues else 0


if __name__ == "__main__":
    sys.exit(check())
