import { homedir } from 'node:os';
import { isAbsolute } from 'node:path';
import z from '@deepseek-ai/schemastery';
import type { Context, Volatile } from '@deepseek-ai/cordis';
// Load Cordis service type augmentations without adding runtime dependencies.
import type {} from '@deepseek-ai/dsh-client-connection';
import type {} from '@deepseek-ai/dsh-settings';
import { scanFonts, systemFontDirs } from './fonts.js';
import { pickPath, SkinError } from './picker.js';
import type { BackgroundFit, FontFamily, PickKind, SkinResult } from './protocol.js';

export const name = 'dsh-skin';
export const inject = ['connection'];

/** Live settings; the settings page and `cordis.patch.yml` edit the same values. */
export interface Config {
  uiFont: Volatile<string>;
  codeFont: Volatile<string>;
  fontDir: Volatile<string>;
  backgroundImage: Volatile<string>;
  backgroundFit: Volatile<BackgroundFit>;
  overlayOpacity: Volatile<number>;
}

/** Settings schema validated by the Host and serialized to the browser form. */
export const Config = z.object({
  uiFont: z.string().default('').volatile(),
  codeFont: z.string().default('').volatile(),
  fontDir: z.string().default('').volatile(),
  backgroundImage: z.string().default('').volatile(),
  backgroundFit: z.union(['cover', 'contain', 'tile'] as const).default('cover').volatile(),
  overlayOpacity: z.number().step(1).min(0).max(100).default(60).volatile(),
});

async function respond<T>(operation: () => Promise<T>): Promise<Response> {
  let result: SkinResult<T>;
  try {
    result = { ok: true, value: await operation() };
  } catch (error) {
    const code = error instanceof SkinError ? error.code : 'dsh-skin/failed';
    result = { ok: false, error: { code, message: error instanceof Error ? error.message : code } };
  }
  return Response.json(result);
}

/** Registers the font catalog and native picker routes behind host authentication. */
export function apply(ctx: Context): void {
  // The plugin renders its own settings page instead of a generated form.
  ctx.inject(['settings'], child => {
    child.effect(() => child.settings.configure({ auto: false }, ctx.fiber));
  });
  const lifetime = new AbortController();
  ctx.effect(() => () => {
    lifetime.abort();
  });
  // Scans are cached for the process; `refresh` picks up newly installed fonts.
  let systemFonts: Promise<FontFamily[]> | undefined;
  const extraFonts = new Map<string, Promise<FontFamily[]>>();
  let picking = false;

  ctx.effect(() => ctx.connection.fetch.register({
    path: '/api/dsh-skin/fonts',
    methods: ['GET'],
    requestBody: 'buffered',
    fetch: request => respond(async () => {
      const params = new URL(request.url).searchParams;
      const dir = params.get('dir') ?? '';
      if (dir && !isAbsolute(dir)) {
        throw new SkinError('invalid-request');
      }
      if (params.has('refresh')) {
        systemFonts = undefined;
        extraFonts.clear();
      }
      systemFonts ??= scanFonts(systemFontDirs(process.platform, homedir(), process.env), 'system');
      let extra = dir ? extraFonts.get(dir) : undefined;
      if (dir && !extra) {
        extra = scanFonts([dir], 'extra');
        extraFonts.set(dir, extra);
      }
      const system = await systemFonts;
      const installed = new Set(system.map(font => font.family));
      // An installed family already resolves by name, so its extra copy is not loaded.
      return [...system, ...(await extra ?? []).filter(font => !installed.has(font.family))]
        .sort((a, b) => a.family.localeCompare(b.family));
    }),
  }));

  ctx.effect(() => ctx.connection.fetch.register({
    path: '/api/dsh-skin/pick',
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: async request => {
      const payload: unknown = await request.json().catch(() => undefined);
      return respond(async () => {
        if (typeof payload !== 'object' || payload === null || !('kind' in payload)
          || (payload.kind !== 'image' && payload.kind !== 'directory')) {
          throw new SkinError('invalid-request');
        }
        if (picking) {
          throw new SkinError('busy');
        }
        picking = true;
        try {
          return await pickPath(payload.kind as PickKind, AbortSignal.any([request.signal, lifetime.signal]));
        } finally {
          picking = false;
        }
      });
    },
  }));
}
