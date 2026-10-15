/** Placement of the background image behind the window surfaces. */
export type BackgroundFit = 'cover' | 'contain' | 'tile';

/** Persisted settings shared by the Host schema and the settings page. Empty strings select host defaults. */
export interface AppearanceSettings {
  uiFont: string;
  codeFont: string;
  fontDir: string;
  backgroundImage: string;
  backgroundFit: BackgroundFit;
  overlayOpacity: number;
}

/** One loadable face of a font family from the extra directory. */
export interface FontFile {
  path: string;
  weight: number;
  italic: boolean;
}

/** One searchable family. System families load by name and carry no files. */
export interface FontFamily {
  family: string;
  source: 'system' | 'extra';
  files: FontFile[];
}

/** Native dialog requested from the Host. */
export type PickKind = 'image' | 'directory';

/** Enumerates Host failures that have dedicated UI translations. */
export type AppearanceReason = 'invalid-request' | 'busy' | 'unsupported-platform' | 'picker-failed' | 'failed';

/** Describes a Host route's success or structured failure response. */
export type AppearanceResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: string; message: string } };
