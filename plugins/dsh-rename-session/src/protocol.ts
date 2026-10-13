export type RenameReason =
  | 'invalid-request' | 'session-not-open' | 'busy' | 'no-model' | 'empty-context'
  | 'model-failed' | 'incomplete-output' | 'tool-output' | 'empty-title' | 'title-changed'
  | 'timeout' | 'cancelled' | 'failed'

export interface RenameValue {
  title: string
}

export type RenameResult =
  | { ok: true; value: RenameValue }
  | { ok: false; error: { code: string; message: string; details: Record<string, unknown> } }
