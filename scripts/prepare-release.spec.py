#!/usr/bin/env python3
"""Exercise release preparation without contacting npm or changing this checkout."""

import fcntl
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
VERSION = "0.9.0"
PACKAGE = "@vamdawn/demo"
ASSET = "demo"


class PrepareReleaseTest(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.repo = Path(temporary.name)
        self.scripts = self.repo / "scripts"
        self.scripts.mkdir()
        shutil.copyfile(SCRIPT_DIR / "prepare-release.py", self.scripts / "prepare-release.py")
        self.asset = self.repo / "plugins" / ASSET
        self.asset.mkdir(parents=True)
        self.manifest = self.asset / "package.json"
        self.manifest.write_text(
            '{\n  "name": "@vamdawn/demo",\n  "version": "0.8.1",\n'
            '  "keywords": ["small", "diff"],\n  "custom": {"version": "0.8.1"}\n}\n',
            encoding="utf-8",
        )
        self.lockfile = self.asset / "package-lock.json"
        self.lockfile.write_text(
            '{\n  "packages": {\n    "node_modules/dep": {"version": "0.8.1"},\n'
            '    "": {"name": "@vamdawn/demo", "version": "0.8.1"}\n  },\n'
            '  "version": "0.8.1",\n  "lockfileVersion": 3\n}\n',
            encoding="utf-8",
        )
        self.files = [self.manifest, self.lockfile]
        for suffix, change in (
            (".md", "Keep the [concise summary](README.md)\n  when it wraps."),
            (".zh-CN.md", "保留摘要。"),
        ):
            asset_log = self.asset / f"CHANGELOG{suffix}"
            self.files.append(asset_log)
            asset_log.write_text(
                f"# Changelog\n\n## [Unreleased]\n\n### Fixed\n\n- {change}\n\n"
                "## [0.8.1] - 2026-01-01\n\n### Added\n\n- Older entry.\n",
                encoding="utf-8",
            )
            root_log = self.repo / f"CHANGELOG{suffix}"
            self.files.append(root_log)
            root_log.write_text(
                "# Releases\n\n- Previous release.\n\n## Repository milestones\n\n- Keep this entry.\n",
                encoding="utf-8",
            )

        self.commands = self.repo / "commands.log"
        self.bin = self.repo / "bin"
        self.bin.mkdir()
        npm = self.bin / "npm"
        npm.write_text(
            "#!/bin/sh\n"
            "printf 'npm %s\\n' \"$*\" >> \"$PREPARE_TEST_COMMANDS\"\n"
            "test \"$1\" != \"$PREPARE_TEST_FAILURE\"\n",
            encoding="utf-8",
        )
        npm.chmod(0o755)
        (self.scripts / "verify-docs.py").write_text(
            "import os\nfrom pathlib import Path\n"
            "with Path(os.environ['PREPARE_TEST_COMMANDS']).open('a') as log:\n"
            "    log.write('verify-docs\\n')\n"
            "raise SystemExit(int(os.environ['PREPARE_TEST_DOC_FAILURE']))\n",
            encoding="utf-8",
        )

    def prepare(self, package=PACKAGE, version=VERSION, failure="", docs_failure=0):
        env = {**os.environ, "PATH": f"{self.bin}{os.pathsep}{os.environ['PATH']}",
               "PREPARE_TEST_COMMANDS": str(self.commands), "PREPARE_TEST_FAILURE": failure,
               "PREPARE_TEST_DOC_FAILURE": str(docs_failure)}
        return subprocess.run(
            [sys.executable, self.scripts / "prepare-release.py", package, version],
            cwd=self.asset, env=env, capture_output=True, text=True,
        )

    def snapshot(self):
        return {path: path.read_bytes() for path in self.files}

    def test_prepares_manifest_lockfile_and_both_release_indexes(self):
        before = self.snapshot()
        result = self.prepare()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(
            self.manifest.read_bytes(), before[self.manifest].replace(b'"0.8.1"', b'"0.9.0"', 1),
        )
        lock = json.loads(self.lockfile.read_bytes())
        self.assertEqual(lock["version"], VERSION)
        self.assertEqual(lock["packages"][""]["version"], VERSION)
        self.assertEqual(lock["packages"]["node_modules/dep"]["version"], "0.8.1")
        self.assertIn(b'    "node_modules/dep": {"version": "0.8.1"},', self.lockfile.read_bytes())
        for suffix, summary, link in (
            (".md", "Keep the concise summary when it wraps.", "Details"),
            (".zh-CN.md", "保留摘要。", "详情"),
        ):
            asset_log = self.asset / f"CHANGELOG{suffix}"
            text = asset_log.read_text(encoding="utf-8")
            match = re.search(r"^## \[Unreleased\]\n\n## \[0\.9\.0\] - (\d{4}-\d{2}-\d{2})$", text, re.M)
            self.assertIsNotNone(match)
            self.assertIn("### Fixed", text)
            self.assertTrue(text.endswith(before[asset_log].decode().split("## [0.8.1]", 1)[1]))
            index = (self.repo / f"CHANGELOG{suffix}").read_text(encoding="utf-8")
            self.assertIn(
                f"- `demo@0.9.0` ({match[1]}) — {summary} → [{link}](plugins/demo/CHANGELOG{suffix})"
                "\n\n## Repository milestones\n\n- Keep this entry.\n",
                index,
            )
        commands = self.commands.read_text().splitlines()
        self.assertEqual(len(commands), 5)
        self.assertEqual(commands[0], "verify-docs")
        self.assertTrue(commands[1].startswith("npm ci --ignore-scripts"))
        self.assertEqual(commands[2:], ["npm run typecheck", "npm test", "npm pack --dry-run"])
        self.assertIn(" diff -- plugins/demo/package.json", result.stdout)

    def test_accepts_directory_name_and_empty_unreleased_sections(self):
        for suffix in (".md", ".zh-CN.md"):
            log = self.asset / f"CHANGELOG{suffix}"
            log.write_text("# Changelog\n\n## [Unreleased]\n\n## [0.8.1] - 2026-01-01\n", encoding="utf-8")
        result = self.prepare(package=ASSET)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("- `demo@0.9.0`", (self.repo / "CHANGELOG.md").read_text())

    def test_rejects_invalid_and_nonincreasing_versions_without_touching_files(self):
        before = self.snapshot()
        for version in ("patch", "0.9.0-rc.1", "0.8.1", "0.8.0", "01.0.0"):
            with self.subTest(version=version):
                result = self.prepare(version=version)
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(self.snapshot(), before)
        self.assertFalse(self.commands.exists())

    def test_rejects_inconsistent_lockfile_and_existing_release(self):
        self.lockfile.write_text(self.lockfile.read_text().replace('"version": "0.8.1"', '"version": "0.8.0"'))
        before = self.snapshot()
        self.assertNotEqual(self.prepare().returncode, 0)
        self.assertEqual(self.snapshot(), before)
        self.assertFalse(self.commands.exists())
        self.lockfile.write_bytes(before[self.lockfile].replace(b'"0.8.0"', b'"0.8.1"'))
        log = self.repo / "CHANGELOG.zh-CN.md"
        log.write_text(log.read_text().replace("- Previous release.", "- `demo@0.9.0` (2026-01-01) — 已发布。"))
        before = self.snapshot()
        self.assertNotEqual(self.prepare().returncode, 0)
        self.assertEqual(self.snapshot(), before)
        self.assertFalse(self.commands.exists())

    def test_rolls_back_every_release_file_when_validation_fails(self):
        before = self.snapshot()
        for options in ({"docs_failure": 1}, {"failure": "test"}, {"failure": "pack"}):
            with self.subTest(options=options):
                self.assertNotEqual(self.prepare(**options).returncode, 0)
                self.assertEqual(self.snapshot(), before)

    def test_rejects_overlapping_preparation(self):
        before = self.snapshot()
        lock_fd = os.open(self.repo, os.O_RDONLY)
        try:
            fcntl.flock(lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
            result = self.prepare()
        finally:
            os.close(lock_fd)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Another release is being prepared", result.stderr)
        self.assertEqual(self.snapshot(), before)
        self.assertFalse(self.commands.exists())


if __name__ == "__main__":
    unittest.main(verbosity=2)
