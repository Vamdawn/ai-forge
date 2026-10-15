import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { PickKind, SkinReason } from './protocol.js';

const run = promisify(execFile);

// `choose folder` returns a trailing slash, which is trimmed below.
const SCRIPTS: Record<PickKind, string> = {
  image: 'POSIX path of (choose file of type {"public.png", "public.jpeg", "org.webmproject.webp"})',
  directory: 'POSIX path of (choose folder)',
};

/** Carries a failure reason that the client translates. */
export class SkinError extends Error {
  readonly code: `dsh-skin/${SkinReason}`;

  constructor(reason: SkinReason) {
    super(reason);
    this.code = `dsh-skin/${reason}`;
  }
}

/**
 * Shows the native dialog on the Host machine and resolves the chosen absolute
 * path, or null when the user dismisses it. Only macOS is implemented.
 */
export async function pickPath(kind: PickKind, signal: AbortSignal, platform = process.platform): Promise<string | null> {
  if (platform !== 'darwin') {
    throw new SkinError('unsupported-platform');
  }
  try {
    // `activate` raises the dialog above the DSH window instead of behind it.
    const { stdout } = await run('osascript', ['-e', 'activate', '-e', SCRIPTS[kind]], { signal });
    return stdout.replace(/\n$/, '').replace(/(.)\/$/, '$1');
  } catch (error) {
    // AppleScript reports a dismissed dialog as error -128.
    if (typeof error === 'object' && error !== null && 'stderr' in error && String(error.stderr).includes('(-128)')) {
      return null;
    }
    throw new SkinError('picker-failed');
  }
}
