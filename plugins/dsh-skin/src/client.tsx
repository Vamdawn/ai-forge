import { createElement as h, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Context } from '@deepseek-ai/cordis';
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store';
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store';
import { Button, Input, SegmentedControl } from '@deepseek-ai/dsh-client-ui-primitives';
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { ConfigForm } from '@deepseek-ai/dsh-client-ui-settings/client';
import type { ThemeTokenModes, ThemeTokenOverrides } from '@deepseek-ai/dsh-client-ui-theme/client';
// These imports provide service types; the Desktop loader owns runtime services.
import type {} from '@deepseek-ai/dsh-client-locale/client';
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client';
import { DICTIONARIES } from './locales.js';
import type { ClientReason, ErrorKey } from './locales.js';
import type { BackgroundFit, FontFamily, PickKind, SkinResult, SkinSettings } from './protocol.js';

const NS = 'dshSkin';
const SOURCE = 'dsh-skin';
const MAX_MATCHES = 200;
const COMMIT_DELAY_MS = 300;
const DEFAULTS: SkinSettings = {
  uiFont: '', codeFont: '', fontDir: '', backgroundImage: '', backgroundFit: 'cover', overlayOpacity: 60,
};
// The selected family goes first; the host's shipped stacks remain as fallbacks.
const UI_FALLBACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", '
  + '"Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif';
const CODE_FALLBACK = '"SF Mono", "JetBrains Mono", "Fira Code", Consolas, "Liberation Mono", Menlo, Courier, '
  + '"PingFang SC", "Microsoft YaHei"';
const FONT_FIELDS = [
  ['uiFont', '--dsw-font-family', UI_FALLBACK],
  ['codeFont', '--ds-font-family-code', CODE_FALLBACK],
] as const;
// Clearing the window surfaces lets the body background show through. The
// sidebar keeps a translucent fill so it stays distinct from the conversation.
const BACKGROUND_TOKENS: ThemeTokenOverrides = {
  '--dsw-alias-bg-base': { light: 'transparent', dark: 'transparent' },
  '--dsw-specific-sidebar-fill': { light: 'rgb(249 250 251 / 0.5)', dark: 'rgb(27 27 28 / 0.5)' },
};
const FIT: Record<BackgroundFit, string> = {
  cover: 'center / cover no-repeat fixed',
  contain: 'center / contain no-repeat fixed',
  tile: 'left top / auto repeat fixed',
};
const IMAGE_EXTENSION = /\.(png|jpe?g|webp)$/i;
const ABSOLUTE_PATH = /^(\/|[A-Za-z]:[\\/])/;
const FILE_STATUS: Record<number, ClientReason> = { 403: 'denied', 404: 'not-found', 413: 'too-large' };

type IssueField = 'uiFont' | 'codeFont' | 'fontDir' | 'backgroundImage' | 'save';
type Issues = Partial<Record<IssueField, ErrorKey>>;

/** What the plugin currently contributes to the document. */
interface Applied {
  tokens: ThemeTokenOverrides;
  css: string;
  faces: Partial<Record<'uiFont' | 'codeFont', FontFace[]>>;
}

interface CatalogState {
  status: 'idle' | 'loading' | 'ready' | 'failed';
  fonts: FontFamily[];
}

interface PageInjected {
  hooks: {
    form: ConfigForm<SkinSettings>;
    applyIssues: SnapshotStore<Issues>;
    actionIssues: SnapshotStore<Issues>;
    catalog: SnapshotStore<CatalogState>;
  };
  save: (field: keyof SkinSettings, value: string | number) => void;
  pick: (kind: PickKind, field: 'fontDir' | 'backgroundImage') => void;
  loadCatalog: (refresh: boolean) => void;
}

type PageProps = PropsRuntime<'settings.section'> & PropsLocale<typeof NS> & InjectFace<PageInjected>;
type Translate = PageProps['t'];

const PAGE_STYLE = { display: 'flex', flexDirection: 'column', gap: 24 } as const;
const SECTION_STYLE = { display: 'flex', flexDirection: 'column', gap: 8 } as const;
const ROW_STYLE = { display: 'flex', alignItems: 'center', gap: 8 } as const;
const HEADING_STYLE = { margin: 0, font: 'var(--dsw-font-s-strong-14)', color: 'var(--dsw-alias-label-primary)' };
const HINT_STYLE = { margin: 0, font: 'var(--dsw-font-xs-13)', color: 'var(--dsw-alias-label-secondary)' };
const ERROR_STYLE = { ...HINT_STYLE, color: 'var(--dsw-alias-state-error-primary)' };
// The host Input wrapper is inline-flex; a column container stretches it to the full width.
const FIELD_STYLE = { position: 'relative', display: 'flex', flexDirection: 'column' } as const;
// An opaque layer fill: translucent menu materials let the fields below show through here.
const POPUP_STYLE = {
  position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 10, maxHeight: 280, overflowY: 'auto',
  padding: 4, borderRadius: 'var(--dsw-radius-lg)', background: 'var(--dsw-alias-bg-layer-1)',
  boxShadow: 'var(--dsw-elevation-panel)',
} as const;
const OPTION_STYLE = {
  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 'var(--dsw-radius-sm)',
  cursor: 'pointer', font: 'var(--dsw-font-s-14)', color: 'var(--dsw-alias-label-primary)',
} as const;
// Tags use the interface font even when the option previews another family.
const TAG_STYLE = { marginLeft: 'auto', font: 'var(--dsw-font-xs-13)', color: 'var(--dsw-alias-label-secondary)' };
const STATUS_STYLE = { ...HINT_STYLE, padding: '6px 8px' };

function fileUrl(path: string): string {
  return `api/file?path=${encodeURIComponent(path)}`;
}

/** Quotes a family name for CSS, dropping control characters. */
function cssString(value: string): string {
  return `"${value.replace(/\p{Cc}/gu, '').replace(/["\\]/g, '\\$&')}"`;
}

function both(value: string): ThemeTokenModes {
  return { light: value, dark: value };
}

function errorKey(code: string): ErrorKey {
  const key = code.replace(/^dsh-skin\//, 'error.');
  return key.startsWith('error.') && Object.hasOwn(DICTIONARIES.en, key) ? key as ErrorKey : 'error.failed';
}

/** Layers the overlay over the image; the dark rule follows the host's palette attribute. */
function backgroundCss(path: string, fit: BackgroundFit, opacity: number): string {
  const image = `url("${fileUrl(path)}") ${FIT[fit]}`;
  const layer = (rgb: string, base: string): string => {
    const overlay = `rgb(${rgb} / ${opacity / 100})`;
    return `background:linear-gradient(${overlay},${overlay}),${image},${base}`;
  };
  return `html:root body{${layer('255 255 255', '#fff')}}`
    + `html:root body[data-ds-dark-theme]{${layer('21 21 23', '#151517')}}`;
}

/**
 * Searchable font picker. The input shows the saved family; focusing it lists
 * every family, typing filters them, and the first option restores the default.
 */
function FontField({ id, label, value, catalog, onChange, t }: {
  id: string;
  label: string;
  value: string;
  catalog: CatalogState;
  onChange: (family: string) => void;
  t: Translate;
}) {
  // Null while the list is closed; otherwise the filter typed since opening.
  const [query, setQuery] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const open = query !== null;
  const needle = (query ?? '').trim().toLowerCase();
  const matches = useMemo(() => catalog.fonts
    .filter(font => font.family.toLowerCase().includes(needle)), [catalog.fonts, needle]);
  // Null stands for the host default, offered until the user starts filtering.
  const options = useMemo(() => [...needle ? [] : [null], ...matches.slice(0, MAX_MATCHES)], [needle, matches]);
  const current = Math.min(active, options.length - 1);
  const listId = `${id}-list`;
  const optionId = (index: number): string => `${id}-option-${index}`;
  useEffect(() => {
    if (open && current >= 0) {
      document.getElementById(optionId(current))?.scrollIntoView({ block: 'nearest' });
    }
  }, [open, current]);
  const show = (): void => {
    // A closed field lists every family, so the saved one can be highlighted.
    setActive(Math.max(0, options.findIndex(font => (font?.family ?? '') === value)));
    setQuery('');
  };
  const choose = (font: FontFamily | null): void => {
    setQuery(null);
    if ((font?.family ?? '') !== value) {
      onChange(font?.family ?? '');
    }
  };
  let status: 'fontsLoading' | 'fontsFailed' | 'fontsEmpty' | 'fontsMore' | undefined;
  if (catalog.status === 'failed') {
    status = 'fontsFailed';
  } else if (catalog.status !== 'ready') {
    status = 'fontsLoading';
  } else if (matches.length === 0) {
    status = 'fontsEmpty';
  } else if (matches.length > MAX_MATCHES) {
    status = 'fontsMore';
  }
  return (
    <section style={SECTION_STYLE}>
      <label htmlFor={id} style={HEADING_STYLE}>{label}</label>
      <div style={FIELD_STYLE}>
        <Input id={id} role="combobox" autoComplete="off" spellCheck={false}
          aria-expanded={open} aria-controls={listId} aria-autocomplete="list"
          aria-activedescendant={open && current >= 0 ? optionId(current) : undefined}
          value={query ?? value} placeholder={open ? value || t('search') : t('fontDefault')}
          style={!open && value ? { fontFamily: cssString(value) } : undefined}
          onFocus={show}
          onClick={() => {
            if (!open) {
              show();
            }
          }}
          onBlur={() => setQuery(null)}
          onChange={event => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={event => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              if (!open) {
                show();
              } else if (options.length > 0) {
                const step = event.key === 'ArrowDown' ? 1 : -1;
                setActive((current + step + options.length) % options.length);
              }
            } else if (event.key === 'Enter' && open && current >= 0) {
              event.preventDefault();
              choose(options[current]);
            } else if (event.key === 'Escape' && open) {
              // Escape closes only the list, not the settings panel around it.
              event.preventDefault();
              event.stopPropagation();
              setQuery(null);
            }
          }} />
        {open ? (
          // Keep focus in the input while the pointer selects or scrolls the list.
          <div style={POPUP_STYLE} onMouseDown={event => event.preventDefault()}>
            <div id={listId} role="listbox" aria-label={label}>
              {options.map((font, index) => {
                const family = font?.family ?? '';
                const tags = [font?.source === 'extra' ? t('extraSource') : '', family === value ? '✓' : ''];
                return (
                  <div key={family} id={optionId(index)} role="option" aria-selected={family === value}
                    style={{
                      ...OPTION_STYLE,
                      background: index === current ? 'var(--dsw-alias-interactive-bg-hover)' : undefined,
                      fontFamily: font ? cssString(family) : undefined,
                    }}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => choose(font)}>
                    {font ? family : t('fontDefault')}
                    <span style={TAG_STYLE}>{tags.filter(Boolean).join(' ')}</span>
                  </div>
                );
              })}
            </div>
            {status ? <p role="status" style={STATUS_STYLE}>{t(status)}</p> : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function PathField({ id, label, hint, value, onCommit, onPick, children, t }: {
  id: string;
  label: string;
  hint: string;
  value: string;
  onCommit: (path: string) => void;
  onPick: () => void;
  children?: ReactNode;
  t: Translate;
}) {
  // The caller keys this field by value, so external edits reset the draft.
  const [draft, setDraft] = useState(value);
  const commit = (): void => {
    if (draft.trim() !== value) {
      onCommit(draft.trim());
    }
  };
  return (
    <section style={SECTION_STYLE}>
      <label htmlFor={id} style={HEADING_STYLE}>{label}</label>
      <p style={HINT_STYLE}>{hint}</p>
      <div style={ROW_STYLE}>
        <Input id={id} value={draft} placeholder={t('pathPlaceholder')} onBlur={commit}
          onChange={event => setDraft(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              commit();
            }
          }} />
        <Button variant="outline" size="sm" onClick={onPick}>{t('choose')}</Button>
        {value ? <Button variant="ghost" size="sm" onClick={() => onCommit('')}>{t('clear')}</Button> : null}
        {children}
      </div>
    </section>
  );
}

function OverlayField({ value, disabled, onCommit, t }: {
  value: number;
  disabled: boolean;
  onCommit: (opacity: number) => void;
  t: Translate;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    setDraft(value);
  }, [value]);
  // Dragging emits many values; persist only after the slider settles.
  useEffect(() => {
    if (draft === value) {
      return undefined;
    }
    const timer = setTimeout(() => onCommit(draft), COMMIT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [draft]);
  return (
    <section style={SECTION_STYLE}>
      <label htmlFor="dsh-skin-overlay" style={HEADING_STYLE}>{t('overlay')}</label>
      <div style={ROW_STYLE}>
        <input id="dsh-skin-overlay" type="range" min={0} max={100} step={1} value={draft} disabled={disabled}
          onChange={event => setDraft(Number(event.target.value))} />
        <output htmlFor="dsh-skin-overlay">{`${draft}%`}</output>
      </div>
    </section>
  );
}

function SkinPage({ useForm, useApplyIssues, useActionIssues, useCatalog, save, pick, loadCatalog, t }: PageProps) {
  const settings = { ...DEFAULTS, ...useForm(snapshot => snapshot.value) };
  const applied = useApplyIssues(value => value);
  const action = useActionIssues(value => value);
  const catalog = useCatalog(value => value);
  useEffect(() => {
    loadCatalog(false);
  }, [settings.fontDir]);
  const issue = (field: IssueField) => {
    const key = action[field] ?? applied[field];
    return key ? <p role="alert" style={ERROR_STYLE}>{t(key)}</p> : null;
  };
  const noImage = !settings.backgroundImage;
  return (
    <div style={PAGE_STYLE}>
      {issue('save')}
      <FontField id="dsh-skin-ui-font" label={t('uiFont')} value={settings.uiFont} catalog={catalog} t={t}
        onChange={family => save('uiFont', family)} />
      {issue('uiFont')}
      <FontField id="dsh-skin-code-font" label={t('codeFont')} value={settings.codeFont} catalog={catalog} t={t}
        onChange={family => save('codeFont', family)} />
      {issue('codeFont')}
      <PathField key={`dir:${settings.fontDir}`} id="dsh-skin-font-dir" label={t('fontDir')} hint={t('fontDirHint')}
        value={settings.fontDir} t={t} onCommit={path => save('fontDir', path)} onPick={() => pick('directory', 'fontDir')}>
        <Button variant="ghost" size="sm" onClick={() => loadCatalog(true)}>{t('rescan')}</Button>
      </PathField>
      {issue('fontDir')}
      <PathField key={`image:${settings.backgroundImage}`} id="dsh-skin-background" label={t('backgroundImage')}
        hint={t('backgroundHint')} value={settings.backgroundImage} t={t}
        onCommit={path => save('backgroundImage', path)} onPick={() => pick('image', 'backgroundImage')} />
      {issue('backgroundImage')}
      <SegmentedControl id="dsh-skin-fit" label={t('fit')} value={settings.backgroundFit} disabled={noImage}
        options={(['cover', 'contain', 'tile'] as const).map(fit => ({ value: fit, label: t(`fit.${fit}`) }))}
        onChange={fit => save('backgroundFit', fit)} />
      <OverlayField value={settings.overlayOpacity} disabled={noImage} t={t}
        onCommit={opacity => save('overlayOpacity', opacity)} />
    </div>
  );
}

export const name = 'dsh-skin-client';
export const inject = ['slots', 'locale', 'theme', 'configForms'];

/** Applies the persisted fonts and background, and registers the settings page. */
export function apply(ctx: Context): void {
  const form = ctx.configForms.get<SkinSettings>('dsh-skin');
  const applyIssues = createSnapshotStore<Issues>({});
  const actionIssues = createSnapshotStore<Issues>({});
  const catalog = createSnapshotStore<CatalogState>({ status: 'idle', fonts: [] });
  const catalogs = new Map<string, Promise<FontFamily[]>>();
  const lifetime = new AbortController();
  const style = document.createElement('style');
  let applied: Applied = { tokens: {}, css: '', faces: {} };
  let removeLayer = (): void => {};
  let generation = 0;
  let appliedKey: string | undefined;
  let catalogRequest = 0;

  const currentSettings = (): SkinSettings => ({ ...DEFAULTS, ...form.getSnapshot().value });
  const fontDir = (settings: SkinSettings): string =>
    ABSOLUTE_PATH.test(settings.fontDir.trim()) ? settings.fontDir.trim() : '';

  const fetchCatalog = (dir: string): Promise<FontFamily[]> => {
    let pending = catalogs.get(dir);
    if (!pending) {
      const request = fetch(`api/dsh-skin/fonts?${new URLSearchParams(dir ? { dir } : {})}`, { signal: lifetime.signal })
        .then(async response => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          const result: SkinResult<FontFamily[]> = await response.json();
          if (!result.ok) {
            throw new Error(result.error.code);
          }
          return result.value;
        });
      pending = request;
      catalogs.set(dir, request);
      // A failed scan is retried on the next request instead of staying cached.
      request.catch(() => {
        if (catalogs.get(dir) === request) {
          catalogs.delete(dir);
        }
      });
    }
    return pending;
  };

  const loadCatalog = async (refresh: boolean): Promise<void> => {
    const request = ++catalogRequest;
    const dir = fontDir(currentSettings());
    if (refresh) {
      catalogs.clear();
      // The Host clears its own scan cache when asked to refresh.
      await fetch('api/dsh-skin/fonts?refresh=', { signal: lifetime.signal }).catch(() => undefined);
    }
    catalog.set({ status: 'loading', fonts: [] });
    try {
      const fonts = await fetchCatalog(dir);
      if (request === catalogRequest) {
        catalog.set({ status: 'ready', fonts });
      }
    } catch {
      if (request === catalogRequest && !lifetime.signal.aborted) {
        catalog.set({ status: 'failed', fonts: [] });
      }
    }
  };

  // Families from the extra folder are served by the host's file route.
  const loadFamily = async (family: string, dir: string): Promise<FontFace[]> => {
    const entry = dir ? (await fetchCatalog(dir)).find(font => font.family === family) : undefined;
    if (entry?.source !== 'extra') {
      return [];
    }
    return Promise.all(entry.files.map(file => new FontFace(family, `url("${fileUrl(file.path)}")`, {
      weight: String(file.weight), style: file.italic ? 'italic' : 'normal',
    }).load()));
  };

  const checkImage = async (path: string): Promise<ClientReason | undefined> => {
    if (!ABSOLUTE_PATH.test(path)) {
      return 'not-absolute';
    }
    if (!IMAGE_EXTENSION.test(path)) {
      return 'unsupported-format';
    }
    try {
      const response = await fetch(fileUrl(path), { method: 'HEAD', signal: lifetime.signal });
      return response.ok ? undefined : FILE_STATUS[response.status] ?? 'unavailable';
    } catch {
      return 'unavailable';
    }
  };

  // Resolves every setting before touching the document. A font or image that
  // fails keeps its previously applied value instead of dropping to defaults.
  const sync = async (settings: SkinSettings): Promise<void> => {
    const key = JSON.stringify(settings);
    if (key === appliedKey) {
      return;
    }
    appliedKey = key;
    const current = ++generation;
    const issues: Issues = {};
    const next: Applied = { tokens: {}, css: '', faces: {} };
    const keep = (tokens: readonly string[]): void => {
      for (const token of tokens) {
        if (applied.tokens[token]) {
          next.tokens[token] = applied.tokens[token];
        }
      }
    };
    const dir = fontDir(settings);
    if (settings.fontDir.trim() && !dir) {
      issues.fontDir = 'error.not-absolute';
    }
    for (const [field, token, fallback] of FONT_FIELDS) {
      const family = settings[field].trim();
      if (!family) {
        continue;
      }
      try {
        next.faces[field] = await loadFamily(family, dir);
        next.tokens[token] = both(`${cssString(family)}, ${fallback}`);
      } catch {
        issues[field] = 'error.font-load-failed';
        next.faces[field] = applied.faces[field];
        keep([token]);
      }
    }
    const image = settings.backgroundImage.trim();
    if (image) {
      const reason = await checkImage(image);
      if (reason) {
        issues.backgroundImage = `error.${reason}`;
        next.css = applied.css;
        keep(Object.keys(BACKGROUND_TOKENS));
      } else {
        next.css = backgroundCss(image, settings.backgroundFit, settings.overlayOpacity);
        Object.assign(next.tokens, BACKGROUND_TOKENS);
      }
    }
    if (current !== generation) {
      return;
    }
    const previousFaces = Object.values(applied.faces).flat();
    const nextFaces = Object.values(next.faces).flat();
    for (const face of previousFaces.filter(face => !nextFaces.includes(face))) {
      document.fonts.delete(face);
    }
    for (const face of nextFaces.filter(face => !previousFaces.includes(face))) {
      document.fonts.add(face);
    }
    // Re-overriding the same source replaces this plugin's whole token layer.
    removeLayer = ctx.theme.overrideTokens(SOURCE, next.tokens);
    style.textContent = next.css;
    applied = next;
    applyIssues.set(issues);
  };

  const refresh = (): void => {
    if (form.getSnapshot().value !== undefined) {
      void sync(currentSettings());
    }
  };

  ctx.effect(() => {
    document.head.append(style);
    const unsubscribe = form.subscribe(refresh);
    refresh();
    return () => {
      unsubscribe();
      generation++;
      lifetime.abort();
      removeLayer();
      style.remove();
      for (const face of Object.values(applied.faces).flat()) {
        document.fonts.delete(face);
      }
      applied = { tokens: {}, css: '', faces: {} };
    };
  });
  ctx.effect(() => ctx.locale.register(NS, DICTIONARIES));

  const save = (field: keyof SkinSettings, value: string | number): void => {
    actionIssues.set({});
    form.set(field, value).then(accepted => {
      if (!accepted) {
        actionIssues.set({ save: 'error.save-failed' });
      }
    }, () => {
      actionIssues.set({ save: 'error.save-failed' });
    });
  };

  const pick = async (kind: PickKind, field: 'fontDir' | 'backgroundImage'): Promise<void> => {
    actionIssues.set({});
    try {
      const response = await fetch('api/dsh-skin/pick', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind }),
        signal: lifetime.signal,
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const result: SkinResult<string | null> = await response.json();
      if (!result.ok) {
        actionIssues.set({ [field]: errorKey(result.error.code) });
      } else if (result.value !== null) {
        save(field, result.value);
      }
    } catch {
      if (!lifetime.signal.aborted) {
        actionIssues.set({ [field]: 'error.failed' });
      }
    }
  };

  const t = ctx.locale.bind(NS);
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'dsh-skin',
    order: 10,
    label: () => t('nav'),
    locale: NS,
    inject: (): PageInjected => ({
      hooks: { form, applyIssues, actionIssues, catalog },
      save,
      pick: (kind, field) => {
        void pick(kind, field);
      },
      loadCatalog: refreshCatalog => {
        void loadCatalog(refreshCatalog);
      },
    }),
  }, SkinPage));
}
