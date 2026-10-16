#!/usr/bin/env python3
"""Basic checks for ai-forge documentation.

Covers what a script decides cheaply: file pairing, the language switcher, the
fixed suffix, relative links, index coverage, and the length limits each document
class documents. Whether the two sides of a pair say the same thing, and the
internal structure of a document, stay a reading task.
Run from anywhere: python3 scripts/verify-docs.py
"""

from __future__ import annotations

import os
import re
import sys
from fnmatch import fnmatchcase
from pathlib import Path

ZH_SUFFIX = ".zh-CN.md"
AGENTS_MAX_LINES = 200
RULE_MAX_LINES = 60
RULE_TRIGGER_PREFIX = "Read when:"
DEFAULT_README_BUDGET = 110

# Line budgets per README location; any other README gets the asset budget.
README_BUDGETS = [
    ("README.md", 120),
    ("tools/*/README.md", DEFAULT_README_BUDGET),
    ("plugins/*/README.md", DEFAULT_README_BUDGET),
]
STEMS = ("README", "CHANGELOG")
PAIRED_NAMES = {f"{stem}.md" for stem in STEMS} | {f"{stem}{ZH_SUFFIX}" for stem in STEMS}
# Rule files: everything in docs/ that is not a paired document.
RULE_GLOBS = ["docs/*.md"]
# Documents whose relative links are checked, beyond the paired documents.
LINK_CHECKED_GLOBS = ["AGENTS.md", "docs/*.md"]

SKIP_DIRS = {".git", "node_modules", "dist", "tmp", ".claude", ".agents", ".venv", "__pycache__"}
# Non-canonical spellings of the paired document names.
BROKEN_NAMES = {
    "readme.zh.md", "readme.zh_cn.md", "readme_cn.md", "readme-zh_cn.md",
    "changelog.zh.md", "changelog_cn.md", "changelog-zh_cn.md",
}
LINK_RE = re.compile(r"\[[^\]]*\]\(([^)\s]+)\)")
# Code spans hold examples (`[English](README.md)`), not links to follow.
CODE_SPAN_RE = re.compile(r"``.+?``|`[^`]*`")

errors: list[str] = []


def switcher(stem: str, language: str) -> str:
    if language == "en":
        return f"English | [简体中文]({stem}{ZH_SUFFIX})"
    return f"[English]({stem}.md) | 简体中文"


def fail(message: str) -> None:
    errors.append(message)


def read(path: Path) -> list[str]:
    """Split a document into lines, independent of a trailing newline."""
    return path.read_text(encoding="utf-8").rstrip("\n").split("\n")


def walk(root: Path):
    """Yield every file under root, pruning vendor and build output before descending."""
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = sorted(name for name in dirnames if name not in SKIP_DIRS)
        for name in sorted(filenames):
            yield Path(dirpath) / name


def relative_links(lines: list[str]) -> list[tuple[int, str]]:
    links, in_fence = [], False
    for number, line in enumerate(lines, 1):
        if line.strip().startswith("```"):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        for target in LINK_RE.findall(CODE_SPAN_RE.sub("", line)):
            if target.startswith(("http://", "https://", "mailto:", "#", "{{")):
                continue
            links.append((number, target))
    return links


def first_content_line(lines: list[str]) -> str:
    """The first non-empty line after the H1, which is where the switcher belongs."""
    h1 = next((index for index, line in enumerate(lines) if line.startswith("# ")), None)
    if h1 is None:
        return ""
    return next((line.strip() for line in lines[h1 + 1:] if line.strip()), "")


def check_names(root: Path) -> None:
    for path in walk(root):
        if path.suffix == ".md" and path.name.lower() in BROKEN_NAMES:
            fail(f"{path.relative_to(root)}: use the fixed suffix `{ZH_SUFFIX}`")


def check_pairs(root: Path) -> None:
    """Both sides of a pair exist, and each opens with the switcher under its H1."""
    seen: set[Path] = set()
    for path in walk(root):
        if path.name not in PAIRED_NAMES:
            continue
        stem = path.name[: -len(ZH_SUFFIX)] if path.name.endswith(ZH_SUFFIX) else path.name[: -len(".md")]
        english, chinese = path.parent / f"{stem}.md", path.parent / f"{stem}{ZH_SUFFIX}"
        if english in seen:
            continue
        seen.add(english)
        missing = False
        for side, language in ((english, "English"), (chinese, "Simplified Chinese")):
            if not side.exists():
                fail(f"{side.relative_to(root)}: missing the {language} side of the pair")
                missing = True
        if missing:
            continue
        for side, language in ((english, "en"), (chinese, "zh")):
            expected = switcher(stem, language)
            if first_content_line(read(side)) != expected:
                fail(f"{side.relative_to(root)}: the language switcher `{expected}` belongs directly under the H1")


def check_links(root: Path, path: Path, lines: list[str], is_chinese: bool) -> None:
    rel = path.relative_to(root)
    for number, target in relative_links(lines):
        line = lines[number - 1].strip()
        if is_chinese and any(line == switcher(stem, "zh") for stem in STEMS):
            continue  # the switcher intentionally points at the English side
        anchor = target.split("#", 1)[0]
        if not anchor:
            continue
        if not (path.parent / anchor).exists():
            fail(f"{rel}:{number}: link target does not exist: {target}")
            continue
        if not is_chinese:
            continue
        # A Chinese page should reach the Chinese side of a paired document.
        for stem in STEMS:
            name = f"{stem}.md"
            if anchor == name or anchor.endswith(f"/{name}"):
                twin = (path.parent / anchor).with_name(f"{stem}{ZH_SUFFIX}")
                if twin.exists():
                    fail(f"{rel}:{number}: link the Chinese counterpart instead: {anchor[: -len(name)]}{stem}{ZH_SUFFIX}")


def check_index(root: Path) -> None:
    """The root README pair indexes every product asset."""
    assets: list[str] = []
    for skill in sorted((root / "skills").glob("*/SKILL.md")):
        assets.append(f"skills/{skill.parent.name}/SKILL.md")
    for pattern in ("prompts/*.md", "rules/*.md", "tools/*/README.md", "plugins/*/README.md"):
        assets.extend(sorted(str(path.relative_to(root)) for path in root.glob(pattern)))
    for index in ("README.md", f"README{ZH_SUFFIX}"):
        path = root / index
        if not path.exists():
            continue  # reported by the pairing check
        targets = {target.split("#", 1)[0].removeprefix("./")
                   for _, target in relative_links(read(path)) if target.split("#", 1)[0]}
        for asset in assets:
            candidates = {asset}
            if asset.endswith("README.md"):
                candidates.add(asset[: -len("README.md")] + f"README{ZH_SUFFIX}")
            if not candidates & targets:
                fail(f"{index}: asset is not indexed: {asset}")


def check_rule_index(root: Path) -> None:
    """AGENTS.md stays within its limit, names every rule file, and each rule states its trigger."""
    agents = root / "AGENTS.md"
    if not agents.exists():
        fail("AGENTS.md is missing; it carries the standing conventions and the rule triggers")
        return
    lines = read(agents)
    if len(lines) > AGENTS_MAX_LINES:
        fail(f"AGENTS.md: {len(lines)} lines exceeds the {AGENTS_MAX_LINES}-line limit")
    text = "\n".join(lines)
    rules: list[Path] = []
    for pattern in RULE_GLOBS:
        rules.extend(sorted(path for path in root.glob(pattern) if path.name not in PAIRED_NAMES))
    for rule in rules:
        rel = rule.relative_to(root)
        if rule.name not in text:
            fail(f"AGENTS.md: rule is not indexed: {rel}")
        body = read(rule)
        if len(body) > RULE_MAX_LINES:
            fail(f"{rel}: {len(body)} lines exceeds the {RULE_MAX_LINES}-line rule budget")
        if not first_content_line(body).startswith(RULE_TRIGGER_PREFIX):
            fail(f"{rel}: the line after the title must state the trigger as `{RULE_TRIGGER_PREFIX} ...`")


def check_budget(root: Path, path: Path) -> None:
    rel = str(path.relative_to(root)).replace(ZH_SUFFIX, ".md")
    budget = next((limit for pattern, limit in README_BUDGETS if fnmatchcase(rel, pattern)), None)
    if budget is None and rel != "README.md":
        budget = DEFAULT_README_BUDGET
    if budget is not None:
        lines = len(read(path))
        if lines > budget:
            fail(f"{rel}: {lines} lines exceeds the {budget}-line budget")


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    print(f"checking documentation in {root}")

    check_names(root)
    check_pairs(root)

    for path in walk(root):
        rel = str(path.relative_to(root))
        if path.name in PAIRED_NAMES:
            check_links(root, path, read(path), is_chinese=path.name.endswith(ZH_SUFFIX))
            if path.name.startswith("README"):
                check_budget(root, path)
        elif any(fnmatchcase(rel, pattern) for pattern in LINK_CHECKED_GLOBS):
            check_links(root, path, read(path), is_chinese=False)

    check_index(root)
    check_rule_index(root)

    for message in errors:
        print(f"error: {message}")
    print(f"{len(errors)} error(s)")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
