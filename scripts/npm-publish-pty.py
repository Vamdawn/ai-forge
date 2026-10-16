#!/usr/bin/env python3
"""Publish an asset with `npm publish` running under a pseudo-terminal.

npm asks for a one-time password when the account uses two-factor
authentication, and its fallback is a browser flow that needs an interactive
terminal: with piped stdin and stdout, `npm publish` exits at once with `EOTP`,
and the authentication URL it prints is redacted from captured output. This
wrapper gives npm a pseudo-terminal, mirrors its output to stdout and to a log
file a human can open to read that URL, and answers the "Press ENTER to open in
the browser" prompt so the CLI opens the browser and polls until the browser
half of the flow finishes.

    python3 scripts/npm-publish-pty.py plugins/dsh-astrolabe

The URL is single-use and belongs to the run that printed it: keep this process
alive until the human has authenticated. See `docs/versioning-and-release.md`.
"""

from __future__ import annotations

import argparse
import os
import pty
import select
import sys
import threading
import time

DEFAULT_LOG = '/tmp/npm-publish.log'
DEFAULT_OPEN_DELAY = 20.0
OUTPUT_TIMEOUT_SECONDS = 1800


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description='Run `npm publish` in a package directory under a pseudo-terminal.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument('directory', help='package directory to publish from')
    parser.add_argument(
        '--log', default=DEFAULT_LOG,
        help=f'file receiving the full output, including the authentication URL (default: {DEFAULT_LOG})',
    )
    parser.add_argument('--tag', help="npm dist-tag, passed through as --tag")
    parser.add_argument(
        '--open-delay', type=float, default=DEFAULT_OPEN_DELAY,
        help=f'seconds to wait before answering the browser prompt; negative to never answer (default: {DEFAULT_OPEN_DELAY})',
    )
    parser.add_argument(
        '--npm-arg', action='append', default=[], metavar='ARG',
        help='extra argument passed through to `npm publish`, repeatable',
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    directory = os.path.abspath(args.directory)
    if not os.path.isdir(directory):
        sys.exit(f'not a directory: {directory}')

    command = ['npm', 'publish']
    if args.tag is not None:
        command += ['--tag', args.tag]
    command += args.npm_arg

    log_path = os.path.abspath(args.log)
    log = open(log_path, 'wb', buffering=0)
    print(f'{" ".join(command)} in {directory}\nfull output: {log_path}', flush=True)

    pid, fd = pty.fork()
    if pid == 0:
        os.chdir(directory)
        os.execvp(command[0], command)

    def answer_browser_prompt() -> None:
        """Let npm open the browser and start polling for the authenticated token."""
        time.sleep(args.open_delay)
        try:
            os.write(fd, b'\n')
        except OSError:
            pass

    if args.open_delay >= 0:
        threading.Thread(target=answer_browser_prompt, daemon=True).start()

    while True:
        try:
            ready, _, _ = select.select([fd], [], [], OUTPUT_TIMEOUT_SECONDS)
            if not ready:
                break
            chunk = os.read(fd, 4096)
        except OSError:
            break
        if not chunk:
            break
        log.write(chunk)
        sys.stdout.buffer.write(chunk)
        sys.stdout.buffer.flush()

    _, status = os.waitpid(pid, 0)
    log.close()
    print(f'\nfull output: {log_path}', flush=True)
    return os.waitstatus_to_exitcode(status)


if __name__ == '__main__':
    raise SystemExit(main())
