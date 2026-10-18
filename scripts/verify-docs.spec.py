#!/usr/bin/env python3
"""Self-test for scripts/verify-docs.py.

Every basic check must fire on the input it guards, the checker must survive a
missing file instead of crashing, and the repository itself must pass.
Tests mutate tracked files and restore them in tearDown.
Run from anywhere: python3 scripts/verify-docs.spec.py
"""

from __future__ import annotations

import shutil
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CHECKER = ROOT / "scripts" / "verify-docs.py"


def run_checker() -> tuple[int, str]:
    result = subprocess.run([sys.executable, str(CHECKER)], cwd=ROOT, capture_output=True, text=True)
    return result.returncode, result.stdout + result.stderr


class DocCheckTest(unittest.TestCase):
    def setUp(self) -> None:
        self.backups: dict[Path, bytes] = {}
        self.created: list[Path] = []

    def tearDown(self) -> None:
        for path, data in self.backups.items():
            path.write_bytes(data)
        for path in reversed(self.created):
            if path.is_dir():
                shutil.rmtree(path)
            elif path.exists():
                path.unlink()

    def edit(self, rel: str, old: str, new: str) -> None:
        path = ROOT / rel
        self.backups.setdefault(path, path.read_bytes())
        text = path.read_text(encoding="utf-8")
        self.assertIn(old, text, f"{rel} does not contain the text to replace")
        path.write_text(text.replace(old, new, 1), encoding="utf-8")

    def remove(self, rel: str) -> None:
        path = ROOT / rel
        self.backups.setdefault(path, path.read_bytes())
        path.unlink()

    def create(self, rel: str, content: str) -> Path:
        path = ROOT / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        self.created.append(path)
        path.write_text(content, encoding="utf-8")
        return path

    def assertReports(self, *fragments: str) -> None:
        code, out = run_checker()
        self.assertNotEqual(0, code, f"checker passed unexpectedly:\n{out}")
        self.assertNotIn("Traceback", out, f"checker crashed instead of reporting:\n{out}")
        for fragment in fragments:
            self.assertIn(fragment, out)

    def assertPasses(self) -> None:
        code, out = run_checker()
        self.assertEqual(0, code, f"checker reported an error:\n{out}")


class RepositoryTest(DocCheckTest):
    def test_repository_passes(self) -> None:
        self.assertPasses()


class PairingTest(DocCheckTest):
    def test_missing_english_side_is_reported(self) -> None:
        self.remove("plugins/dsh-rename-session/README.md")
        self.assertReports("missing the English side of the pair")

    def test_missing_chinese_side_is_reported_without_crashing(self) -> None:
        self.remove("README.zh-CN.md")
        self.assertReports("missing the Simplified Chinese side of the pair")

    def test_non_canonical_suffix_is_reported(self) -> None:
        self.create("plugins/dsh-astrolabe/README.zh.md", "# wrong suffix\n")
        self.assertReports("use the fixed suffix")

    def test_switcher_must_follow_the_h1(self) -> None:
        rel = "tools/claude-statusline/README.zh-CN.md"
        self.edit(rel, "# Claude Statusline\n", "# Claude Statusline\n\n补充说明。\n")
        self.assertReports("belongs directly under the H1")

    def test_switcher_above_the_h1_is_rejected(self) -> None:
        rel = "tools/claude-statusline/README.zh-CN.md"
        self.edit(rel, "[English](README.md) | 简体中文\n\n", "")
        self.edit(rel, "# Claude Statusline\n", "[English](README.md) | 简体中文\n\n# Claude Statusline\n")
        self.assertReports("belongs directly under the H1")


class PairStructureTest(DocCheckTest):
    """The pair's shape: heading levels, list entries per section, and code."""

    def test_heading_level_mismatch_is_reported(self) -> None:
        self.edit("plugins/dsh-astrolabe/README.zh-CN.md", "\n## 用法\n", "\n### 用法\n")
        self.assertReports("heading levels differ")

    def test_list_entry_count_mismatch_is_reported(self) -> None:
        self.edit("plugins/dsh-astrolabe/README.zh-CN.md",
                  "- 侧边栏折叠时渲染 56px 图标栏。\n", "")
        self.assertReports("list entries per section differ")

    def test_translated_command_in_a_code_block_is_reported(self) -> None:
        self.edit("plugins/dsh-astrolabe/README.zh-CN.md",
                  "dsh plugin --profile <profile> remove @vamdawn/dsh-astrolabe",
                  "dsh 插件 --profile <profile> remove @vamdawn/dsh-astrolabe")
        self.assertReports("differs beyond its comments")

    def test_translated_code_comment_is_accepted(self) -> None:
        self.edit("plugins/dsh-appearance-plus/README.zh-CN.md",
                  "# 留空则使用 Host 默认值", "# 留空则使用宿主的默认值")
        self.assertPasses()


class LinkTest(DocCheckTest):
    def test_broken_link_in_a_rule_file_is_reported(self) -> None:
        self.edit("docs/markdown-assets.md", "(asset-layout.md)", "(asset-layout-gone.md)")
        self.assertReports("link target does not exist")

    def test_broken_link_in_mcp_product_docs_is_reported(self) -> None:
        self.edit("mcp/noticeflow/docs/product-design.md", "(research-mcp-project-layout.md)",
                  "(research-mcp-project-layout-gone.md)")
        self.assertReports("link target does not exist")

    def test_broken_link_in_agents_is_reported(self) -> None:
        self.edit("AGENTS.md", "(docs/asset-layout.md)", "(docs/asset-layout-gone.md)")
        self.assertReports("link target does not exist")

    def test_chinese_side_must_link_the_chinese_counterpart(self) -> None:
        self.edit("README.zh-CN.md", "[CHANGELOG.zh-CN.md](CHANGELOG.zh-CN.md)",
                  "[CHANGELOG.md](CHANGELOG.md)")
        self.assertReports("link the Chinese counterpart instead")

    def test_index_accepts_a_dot_prefix_and_an_anchor(self) -> None:
        self.edit("README.md", "[ack-code-review](skills/ack-code-review/SKILL.md)",
                  "[ack-code-review](./skills/ack-code-review/SKILL.md#start)")
        self.assertPasses()


class IndexAndBudgetTest(DocCheckTest):
    def test_unindexed_asset_is_reported(self) -> None:
        self.edit("README.md", "- [git-commit](skills/git-commit/SKILL.md) — ", "- git-commit — ")
        self.assertReports("asset is not indexed")

    def test_unindexed_mcp_product_is_reported(self) -> None:
        self.edit("README.md", "- [noticeflow](mcp/noticeflow/README.md) — ", "- noticeflow — ")
        self.assertReports("asset is not indexed: mcp/noticeflow/README.md")

    def test_budget_applies_to_a_readme_anywhere(self) -> None:
        body = "\n".join(f"- line {index}" for index in range(130))
        self.create("skills/probe/README.md", f"# Probe\n\nEnglish | [简体中文](README.zh-CN.md)\n\n{body}\n")
        self.create("skills/probe/README.zh-CN.md", f"# Probe\n\n[English](README.md) | 简体中文\n\n{body}\n")
        self.assertReports("exceeds the 110-line budget")


class RuleFileTest(DocCheckTest):
    def test_missing_trigger_line_is_reported(self) -> None:
        self.edit("docs/markdown-assets.md", "Read when:", "Applies to:")
        self.assertReports("must state the trigger")

    def test_rule_budget_is_enforced(self) -> None:
        self.edit("docs/markdown-assets.md", "# Markdown Assets\n",
                  "# Markdown Assets\n" + "\n".join(f"filler {index}" for index in range(60)) + "\n")
        self.assertReports("exceeds the 60-line rule budget")

    def test_unindexed_rule_file_is_reported(self) -> None:
        self.create("docs/probe-rule.md", "# Probe Rule\n\nRead when: probing the checker.\n\n## Rules\n\n1. Exist.\n")
        self.assertReports("rule is not indexed")

    def test_missing_agents_is_reported_without_crashing(self) -> None:
        self.remove("AGENTS.md")
        self.assertReports("AGENTS.md is missing")


if __name__ == "__main__":
    unittest.main(verbosity=2)
