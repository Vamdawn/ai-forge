#!/usr/bin/env python3
"""Accept an image-only change between two effective Compose JSON documents."""
import json
import sys
from pathlib import Path


def main():
    if len(sys.argv) != 5:
        raise ValueError("arguments")
    before_path, after_path, service, image = sys.argv[1:]
    before = json.loads(Path(before_path).read_text())
    after = json.loads(Path(after_path).read_text())
    # Modify only the permitted field. Full equality protects proxy settings,
    # mounts, ports, networks, healthchecks, and every other Compose service.
    before["services"][service]["image"] = image
    if before != after:
        raise ValueError("non-image change")
    print("COMPOSE_IMAGE_CHANGE_OK")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, KeyError, TypeError):
        # Effective configuration can contain credentials. Never print a diff.
        print("COMPOSE_IMAGE_CHANGE_REJECTED", file=sys.stderr)
        sys.exit(1)
