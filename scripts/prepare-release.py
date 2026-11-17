#!/usr/bin/env python3
"""Prepare one npm release in the ai-forge working tree."""

import argparse
from datetime import date
import fcntl
import json
import os
from pathlib import Path
import re
import shlex
import stat
import subprocess
import sys
import tempfile


ROOT = Path(__file__).resolve().parents[1]
STABLE_VERSION = re.compile(r"(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)")
JSON = json.JSONDecoder()
SPACE = re.compile(r"[ \t\r\n]*")
UNRELEASED = re.compile(r"^## \[Unreleased\][ \t]*\r?$", re.MULTILINE)
SECTION = re.compile(r"^## ", re.MULTILINE)


class ReleaseError(Exception):
    pass


def find_package(root, name):
    matches = []
    for group in ("tools", "plugins", "mcp"):
        for manifest in (root / group).glob("*/package.json"):
            content = manifest.read_bytes()
            data = json.loads(content)
            if name in (manifest.parent.name, data.get("name")):
                matches.append((manifest, data, content))
    if not matches:
        raise ReleaseError(f"Unknown npm package or asset: {name}")
    if len(matches) != 1:
        raise ReleaseError(f"Ambiguous asset {name!r}. Use the exact npm package name.")
    manifest, data, content = matches[0]
    if data.get("private") or not data.get("name"):
        raise ReleaseError(f"{manifest.parent.name} is not a publishable npm package")
    return manifest, data, content


def json_field_span(text, keys):
    """Find a JSON value by member path while preserving the surrounding text."""
    offset = 0
    for key in keys:
        offset = SPACE.match(text, offset).end()
        if text[offset] != "{":
            raise ReleaseError(f"Expected a JSON object while looking for {'.'.join(keys)}")
        offset = SPACE.match(text, offset + 1).end()
        while text[offset] != "}":
            member, end = JSON.raw_decode(text, offset)
            colon = SPACE.match(text, end).end()
            value_start = SPACE.match(text, colon + 1).end()
            if member == key:
                offset = value_start
                break
            _, end = JSON.raw_decode(text, value_start)
            offset = SPACE.match(text, end).end()
            if text[offset] == ",":
                offset = SPACE.match(text, offset + 1).end()
        else:
            raise ReleaseError(f"Missing JSON field {'.'.join(keys)}")
    _, end = JSON.raw_decode(text, offset)
    return offset, end


def update_versions(text, paths, version):
    expected = json.loads(text)
    for keys in paths:
        member = expected
        for key in keys[:-1]:
            member = member[key]
        member[keys[-1]] = version
    spans = sorted((json_field_span(text, keys) for keys in paths), reverse=True)
    for start, end in spans:
        text = text[:start] + json.dumps(version) + text[end:]
    if json.loads(text) != expected:
        raise ReleaseError("Could not update version fields. Check for duplicate JSON keys.")
    return text


def roll_changelog(text, version, release_date):
    headings = list(UNRELEASED.finditer(text))
    if len(headings) != 1:
        raise ReleaseError("Expected one '## [Unreleased]' heading")
    if re.search(rf"^## \[{re.escape(version)}\](?:[ \t]|\r?$)", text, re.MULTILINE):
        raise ReleaseError(f"Changelog already contains {version}")
    heading = headings[0]
    following = SECTION.search(text, heading.end())
    end = following.start() if following else len(text)
    newline = "\r\n" if "\r\n" in text else "\n"
    notes = text[heading.end():end].strip("\r\n")
    release = f"## [{version}] - {release_date}"
    if notes.strip():
        release += newline * 2 + notes
    trailing = newline * 2 if following else newline
    return text[:heading.end()].removesuffix("\r") + newline * 2 + release + trailing + text[end:], notes


def root_summary(notes, fallback):
    bullet = re.search(r"^- (.+(?:\r?\n[ \t]+\S[^\r\n]*)*)", notes, re.MULTILINE)
    if not bullet:
        return fallback
    # The draft index entry has a different base directory from the asset log.
    summary = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", bullet[1])
    return " ".join(summary.split())


def update_index(text, tag, entry):
    if text.splitlines()[:1] != ["# Releases"]:
        raise ReleaseError("Expected '# Releases' at the start of the release index")
    section = SECTION.search(text)
    end = section.start() if section else len(text)
    if re.search(rf"^- `{re.escape(tag)}`(?:[ \t]|\r?$)", text[:end], re.MULTILINE):
        raise ReleaseError(f"Release index already contains {tag}")
    newline = "\r\n" if "\r\n" in text else "\n"
    index = text[:end].rstrip("\r\n")
    spacing = newline if index.splitlines()[-1].startswith("- ") else newline * 2
    trailing = newline * 2 if section else newline
    return index + spacing + entry + trailing + text[end:]


def plan_release(root, name, version):
    manifest, data, manifest_content = find_package(root, name)
    current = data.get("version", "")
    if not isinstance(current, str) or not STABLE_VERSION.fullmatch(current):
        raise ReleaseError(f"Expected a stable version in {manifest.relative_to(root)}")
    if tuple(map(int, version.split("."))) <= tuple(map(int, current.split("."))):
        raise ReleaseError(f"Requested version {version} must be greater than {current}")

    asset = manifest.parent
    lockfile = asset / "package-lock.json"
    files = [lockfile]
    for suffix in (".md", ".zh-CN.md"):
        files.extend((asset / f"CHANGELOG{suffix}", root / f"CHANGELOG{suffix}"))
    originals = {manifest: manifest_content}
    originals.update((path, path.read_bytes()) for path in files)
    text = {path: content.decode("utf-8") for path, content in originals.items()}

    lock = json.loads(text[lockfile])
    lock_paths = [("version",)]
    if "packages" in lock:
        lock_paths.append(("packages", "", "version"))
    for keys in lock_paths:
        start, end = json_field_span(text[lockfile], keys)
        if json.loads(text[lockfile][start:end]) != current:
            raise ReleaseError(f"{lockfile.relative_to(root)} does not match package.json version {current}")

    updates = {
        manifest: update_versions(text[manifest], [("version",)], version),
        lockfile: update_versions(text[lockfile], lock_paths, version),
    }
    release_date = date.today().isoformat()
    tag = f"{asset.name}@{version}"
    for suffix, label, fallback in (
        (".md", "Details", "package version update"),
        (".zh-CN.md", "详情", "更新包版本"),
    ):
        changelog = asset / f"CHANGELOG{suffix}"
        index = root / f"CHANGELOG{suffix}"
        try:
            updates[changelog], notes = roll_changelog(text[changelog], version, release_date)
        except ReleaseError as error:
            raise ReleaseError(f"{changelog.relative_to(root)}: {error}") from error
        summary = root_summary(notes, fallback)
        entry = f"- `{tag}` ({release_date}) — {summary} → [{label}]({changelog.relative_to(root).as_posix()})"
        try:
            updates[index] = update_index(text[index], tag, entry)
        except ReleaseError as error:
            raise ReleaseError(f"{index.relative_to(root)}: {error}") from error
    return asset, originals, {path: content.encode("utf-8") for path, content in updates.items()}


def replace_file(path, content):
    mode = stat.S_IMODE(path.stat().st_mode)
    with tempfile.NamedTemporaryFile(dir=path.parent, prefix=f".{path.name}.", delete=False) as handle:
        temporary = Path(handle.name)
        try:
            handle.write(content)
            handle.close()
            temporary.chmod(mode)
            temporary.replace(path)
        finally:
            temporary.unlink(missing_ok=True)


def apply_and_check(root, asset, originals, updates):
    written = []
    try:
        for path, content in updates.items():
            if path.read_bytes() != originals[path]:
                raise ReleaseError(f"{path.relative_to(root)} changed during preparation")
            replace_file(path, content)
            written.append(path)
        for cwd, command in (
            (root, [sys.executable, "scripts/verify-docs.py"]),
            (asset, ["npm", "ci", "--ignore-scripts"]),
            (asset, ["npm", "run", "typecheck"]),
            (asset, ["npm", "test"]),
            (asset, ["npm", "pack", "--dry-run"]),
        ):
            print(f"+ {shlex.join(command)}", flush=True)
            subprocess.run(command, cwd=cwd, check=True)
        for path in written:
            if path.read_bytes() != updates[path]:
                raise ReleaseError(f"{path.relative_to(root)} changed during validation")
    except BaseException:
        for path in reversed(written):
            try:
                if path.read_bytes() == updates[path]:
                    replace_file(path, originals[path])
                else:
                    print(f"Review {path.relative_to(root)} manually. It changed during validation.", file=sys.stderr)
            except OSError as error:
                print(f"Could not restore {path.relative_to(root)}: {error}", file=sys.stderr)
        raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("package", help="npm package name or asset directory name")
    parser.add_argument("version", help="exact stable release version (X.Y.Z)")
    args = parser.parse_args()
    if not STABLE_VERSION.fullmatch(args.version):
        parser.error("version must be an exact stable version (X.Y.Z)")

    try:
        lock_fd = os.open(ROOT, os.O_RDONLY)
        try:
            try:
                fcntl.flock(lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError as error:
                raise ReleaseError("Another release is being prepared in this checkout") from error
            asset, originals, updates = plan_release(ROOT, args.package, args.version)
            apply_and_check(ROOT, asset, originals, updates)
        finally:
            os.close(lock_fd)
    except (ReleaseError, OSError, ValueError, subprocess.CalledProcessError) as error:
        print(f"prepare-release: {error}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print("prepare-release: interrupted", file=sys.stderr)
        return 130

    paths = [str(path.relative_to(ROOT)) for path in updates]
    print(f"Prepared {asset.name}@{args.version}. Review the working-tree diff.")
    print(f"  {shlex.join(['git', '-C', str(ROOT), 'diff', '--', *paths])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
