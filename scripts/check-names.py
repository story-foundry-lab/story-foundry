#!/usr/bin/env python3
"""Check for legacy names listed in the novel-fiction skill name map."""

from __future__ import annotations

import argparse
import pathlib
import re
import sys


REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
NAME_MAP_PATH = REPO_ROOT / ".agents" / "skills" / "novel-fiction" / "references" / "name-map.md"
WORKS_DIR = REPO_ROOT / "works"


def parse_name_map(path: pathlib.Path) -> dict[str, str]:
    mapping: dict[str, str] = {}
    text = path.read_text("utf-8")
    for line in text.splitlines():
        line = line.strip()
        if not line.startswith("|") or "---" in line:
            continue
        cols = [col.strip() for col in line.split("|")[1:-1]]
        if len(cols) < 2 or cols[0] == "旧名":
            continue
        old_names_raw, new_name = cols[0], cols[1]
        for old_name in re.split(r"\s*/\s*", old_names_raw):
            old_name = old_name.strip()
            if old_name and old_name != "（匿名化）":
                mapping[old_name] = new_name
    return mapping


def markdown_files(work: str | None) -> list[pathlib.Path]:
    search_dir = WORKS_DIR / work if work else WORKS_DIR
    if not search_dir.exists():
        raise SystemExit(f"work not found: {search_dir}")
    return list(search_dir.rglob("*.md"))


def should_skip(path: pathlib.Path) -> bool:
    path_text = path.as_posix()
    return any(part in path_text for part in ["/legacy/", "/旧稿存档/", "/原版", "/旧版/"]) or "name-map" in path.name


def check(work: str | None = None) -> int:
    if not NAME_MAP_PATH.is_file():
        print(f"name map not found: {NAME_MAP_PATH}")
        return 1

    mapping = parse_name_map(NAME_MAP_PATH)
    if not mapping:
        print("[PASS] name map has no legacy names")
        return 0

    issues: list[tuple[str, int, str, str, str]] = []
    for path in markdown_files(work):
        if should_skip(path):
            continue
        try:
            text = path.read_text("utf-8")
        except UnicodeDecodeError:
            continue
        for old_name, new_name in mapping.items():
            for line_number, line in enumerate(text.splitlines(), start=1):
                if old_name in line and "原名" not in line and "旧名" not in line:
                    preview = line.strip()[:100]
                    rel_path = path.relative_to(REPO_ROOT).as_posix()
                    issues.append((rel_path, line_number, old_name, new_name, preview))

    if issues:
        print(f"[FAIL] found {len(issues)} legacy-name occurrence(s):")
        for rel_path, line_number, old_name, new_name, preview in issues:
            print(f"  {rel_path}:{line_number} [{old_name}] -> [{new_name}]")
            print(f"    > {preview}")
        return 1

    print("[PASS] name check passed")
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Check legacy names in works/")
    parser.add_argument("--work", "-w", help="Only check one work id, for example song-of-blaze")
    args = parser.parse_args()
    sys.exit(check(args.work))
