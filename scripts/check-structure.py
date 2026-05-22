#!/usr/bin/env python3
"""Check Story Foundry repository structure and public hygiene."""

from __future__ import annotations

import pathlib
import sys


REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
WORKS_DIR = REPO_ROOT / "works"

REQUIRED_ROOT_DIRS = ["ai", "works", "imports", "references", "archive", "scripts"]
REQUIRED_WORK_FILES = ["README.md", "ka.yaml"]
REQUIRED_WORK_DIRS = {
    "song-of-blaze": ["drafts", "canon", "plan", "style", "fragments", "evals", "reviews", "legacy"],
    "madoka-fanfic": ["drafts", "canon", "fragments", "evals", "reviews"],
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
