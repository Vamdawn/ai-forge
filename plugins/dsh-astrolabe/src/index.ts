import type { Context } from '@deepseek-ai/cordis';

export const name = 'dsh-astrolabe';

/**
 * The spike is client-only. The Host half exists so the bundle entry loads and
 * keeps a place for the Host-side work a later revision may need.
 */
export function apply(_ctx: Context): void {}
