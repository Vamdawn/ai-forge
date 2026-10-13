/** Enumerates failures that have dedicated UI translations. */
export type RenameReason =
  | 'invalid-request' | 'session-not-open' | 'busy' | 'no-model' | 'empty-context'
  | 'model-failed' | 'incomplete-output' | 'tool-output' | 'empty-title' | 'title-changed'
  | 'timeout' | 'cancelled' | 'failed';

/** Contains the normalized title accepted by the Host title service. */
export interface RenameValue {
  title: string;
}

/** Describes the rename endpoint's success or structured failure response. */
export type RenameResult =
  | { ok: true; value: RenameValue }
  | { ok: false; error: { code: string; message: string; details: Record<string, unknown> } };
