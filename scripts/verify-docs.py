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
LINK_CHECKED_GLOBS = ["AGENTS.md", "docs/*.md", "mcp/*/docs/*.md"]

SKIP_DIRS = {".git", "node_modules", "dist", "tmp", ".claude", ".agents", ".venv", "__pycache__"}
# Non-canonical spellings of the paired document names.
BROKEN_NAMES = {
    "readme.zh.md", "readme.zh_cn.md", "readme_cn.md", "readme-zh_cn.md",
    "changelog.zh.md", "changelog_cn.md", "changelog-zh_cn.md",
}
LINK_RE = re.compile(r"\[[^\]]*\]\(([^)\s]+)\)")
FENCE_RE = re.compile(r"^\s*```")
HEADING_RE = re.compile(r"^(#+)\s")
LIST_RE = re.compile(r"^- ")
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


def fenced_blocks(lines: list[str]) -> list[str]:
    """The body of every fenced code block, in document order."""
    blocks: list[str] = []
    current: list[str] | None = None
    for line in lines:
        if FENCE_RE.match(line):
            if current is None:
                current = []
            else:
                blocks.append("\n".join(current))
                current = None
        elif current is not None:
            current.append(line)
    return blocks


def commands_only(block: str) -> list[str]:
    """A block reduced to its commands.

    A translation may rewrite a code block's comments, so the text from a `#`
    at line start or after whitespace is dropped; what precedes it is the
    command, and a line that is nothing but a comment disappears.
    """
    kept: list[str] = []
    for line in block.split("\n"):
        command = re.split(r"(?:^|\s)#", line, maxsplit=1)[0].rstrip()
        if command:
            kept.append(command)
    return kept


def heading_levels(lines: list[str]) -> list[int]:
    """The level of every heading, in document order."""
    return [len(match.group(1)) for match in (HEADING_RE.match(line) for line in lines) if match]


def section_list_counts(lines: list[str]) -> list[int]:
    """Top-level `- ` entries per heading section, counted outside code blocks."""
    counts: list[int] = []
    inside = False
    count: int | None = None
    for line in lines:
        if FENCE_RE.match(line):
            inside = not inside
            continue
        if inside:
            continue
        if HEADING_RE.match(line):
            if count is not None:
                counts.append(count)
            count = 0
        elif count is not None and LIST_RE.match(line):
            count += 1
    if count is not None:
        counts.append(count)
    return counts


def check_pair_structure(english: Path, chinese: Path) -> None:
    """Both sides carry the same shape: headings, list entries, and code.

    Only the *shape* is compared. Heading text, list prose, and code comments
    are meant to differ, so equivalence of meaning stays a reading task.
    """
    left, right = read(english), read(chinese)
    if heading_levels(left) != heading_levels(right):
        fail(f"{english}: the pair's heading levels differ: {heading_levels(left)} vs {heading_levels(right)}")
    counts = section_list_counts(left), section_list_counts(right)
    if counts[0] != counts[1]:
        fail(f"{english}: the pair's list entries per section differ: {counts[0]} vs {counts[1]}")
    left_blocks, right_blocks = fenced_blocks(left), fenced_blocks(right)
    if len(left_blocks) != len(right_blocks):
        fail(f"{english}: the pair carries {len(left_blocks)} code blocks against {len(right_blocks)}")
        return
    for number, (one, other) in enumerate(zip(left_blocks, right_blocks), start=1):
        if commands_only(one) != commands_only(other):
            fail(f"{english}: code block {number} differs beyond its comments: {commands_only(one)} vs {commands_only(other)}")


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
        check_pair_structure(english, chinese)


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
    for pattern in ("prompts/*.md", "rules/*.md", "tools/*/README.md", "plugins/*/README.md", "mcp/*/README.md"):
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
