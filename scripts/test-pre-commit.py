#!/usr/bin/env python3
"""Exercise the commit gate through Git with isolated packages and an npm stub."""
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

HOOK = Path(__file__).resolve().parent / "hooks" / "pre-commit"


class CommitGateTest(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="ai-forge-hook-")
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name).resolve() / "repo"
        self.root.mkdir()
        self.log = Path(self.temporary.name) / "npm.log"
        binaries = Path(self.temporary.name) / "bin"
        binaries.mkdir()
        npm = binaries / "npm"
        npm.write_text('#!/bin/sh\nprintf "%s:%s\\n" "$PWD" "$*" >> "$NPM_LOG"\n[ "$*" != "$FAIL_TASK" ]\n')
        npm.chmod(0o755)
        self.env = {**os.environ, "PATH": f"{binaries}:{os.environ['PATH']}",
                    "NPM_LOG": str(self.log), "FAIL_TASK": ""}
        self.run_git("init", "-q")
        self.run_git("config", "user.name", "Commit gate test")
        self.run_git("config", "user.email", "gate@example.invalid")
        self.run_git("config", "core.hooksPath", ".hooks")
        (self.root / ".hooks").mkdir()
        shutil.copy2(HOOK, self.root / ".hooks" / "pre-commit")
        (self.root / "scripts").mkdir()
        (self.root / "scripts" / "verify-docs.py").write_text("raise SystemExit(0)\n")

    def run_git(self, *args, check=True):
        return subprocess.run(["git", *args], cwd=self.root, env=self.env,
                              text=True, capture_output=True, check=check)

    def package(self, path):
        directory = self.root / path
        directory.mkdir(parents=True)
        (directory / "package.json").write_text('{}\n')
        (directory / "source.ts").write_text('export {};\n')
        self.run_git("add", path)

    def test_mcp_nested_package_is_checked_once_for_product_docs_and_code(self):
        self.package("mcp/noticeflow/apps/server")
        readme = self.root / "mcp/noticeflow/README.md"
        readme.write_text("# Noticeflow\n")
        self.run_git("add", str(readme))
        self.run_git("commit", "-qm", "test MCP gate")
        self.assertEqual(self.log.read_text().splitlines(), [
            f"{self.root}/mcp/noticeflow/apps/server:run typecheck",
            f"{self.root}/mcp/noticeflow/apps/server:test",
        ])

    def test_mcp_typecheck_and_tests_each_block_a_commit(self):
        self.package("mcp/noticeflow/apps/server")
        for command in ("run typecheck", "test"):
            with self.subTest(command=command):
                self.env["FAIL_TASK"] = command
                result = self.run_git("commit", "-qm", "reject failing package", check=False)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("pre-commit:", result.stderr)
                self.assertIn("mcp/noticeflow/apps/server", result.stderr)

    def test_existing_tool_and_plugin_gates_still_run(self):
        self.package("tools/example")
        self.package("plugins/example")
        self.run_git("commit", "-qm", "test existing gates")
        self.assertEqual(len(self.log.read_text().splitlines()), 4)


if __name__ == "__main__":
    unittest.main()
