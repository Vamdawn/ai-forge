import type { SkinReason } from './protocol.js';

/** Failures detected in the browser before or while applying a setting. */
export type ClientReason =
  | 'not-absolute' | 'unsupported-format' | 'not-found' | 'too-large' | 'denied'
  | 'unavailable' | 'font-load-failed' | 'save-failed';
/** Maps Host and client failure reasons to localized message keys. */
export type ErrorKey = `error.${SkinReason | ClientReason}`;
/** Defines the keys available to the dshSkin UI namespace. */
export type LocaleKey =
  | 'nav' | 'uiFont' | 'codeFont' | 'fontDefault' | 'search' | 'fontsLoading' | 'fontsEmpty'
  | 'fontsFailed' | 'extraSource' | 'fontDir' | 'fontDirHint' | 'rescan' | 'backgroundImage'
  | 'backgroundHint' | 'choose' | 'clear' | 'pathPlaceholder' | 'fit' | 'fit.cover' | 'fit.contain'
  | 'fit.tile' | 'overlay' | ErrorKey;

/** Supplies both officially shipped locales, including every failure reason. */
export const DICTIONARIES = {
  zh: {
    nav: '字体与背景',
    uiFont: '界面字体',
    codeFont: '代码字体',
    fontDefault: '默认',
    search: '搜索字体',
    fontsLoading: '正在扫描字体…',
    fontsEmpty: '没有匹配的字体。',
    fontsFailed: '无法读取字体列表。',
    extraSource: '额外目录',
    fontDir: '额外字体目录',
    fontDirHint: '系统已安装的字体会自动列出；这里可以再添加一个目录。',
    rescan: '重新扫描',
    backgroundImage: '背景图片',
    backgroundHint: '支持 PNG、JPEG、WebP，单个文件不超过 20 MiB。',
    choose: '选择…',
    clear: '清除',
    pathPlaceholder: '绝对路径',
    fit: '填充方式',
    'fit.cover': '铺满',
    'fit.contain': '适应',
    'fit.tile': '平铺',
    overlay: '遮罩不透明度',
    'error.invalid-request': '请求无效。',
    'error.busy': '已有一个选择窗口打开。',
    'error.unsupported-platform': '当前系统不支持选择窗口，请手动填写路径。',
    'error.picker-failed': '无法打开选择窗口，请手动填写路径。',
    'error.failed': '操作失败，请重试。',
    'error.not-absolute': '请填写绝对路径。',
    'error.unsupported-format': '仅支持 PNG、JPEG、WebP 图片。',
    'error.not-found': '文件不存在。',
    'error.too-large': '文件超过 20 MiB 上限。',
    'error.denied': '没有读取该文件的权限。',
    'error.unavailable': '无法读取该文件。',
    'error.font-load-failed': '字体加载失败。',
    'error.save-failed': '设置未保存，请重试。',
  },
  en: {
    nav: 'Fonts & Background',
    uiFont: 'Interface font',
    codeFont: 'Code font',
    fontDefault: 'Default',
    search: 'Search fonts',
    fontsLoading: 'Scanning fonts…',
    fontsEmpty: 'No matching fonts.',
    fontsFailed: 'Could not load the font list.',
    extraSource: 'extra folder',
    fontDir: 'Extra font folder',
    fontDirHint: 'Installed system fonts are listed automatically. Add one more folder here.',
    rescan: 'Rescan',
    backgroundImage: 'Background image',
    backgroundHint: 'PNG, JPEG, or WebP, up to 20 MiB.',
    choose: 'Choose…',
    clear: 'Clear',
    pathPlaceholder: 'Absolute path',
    fit: 'Fit',
    'fit.cover': 'Cover',
    'fit.contain': 'Contain',
    'fit.tile': 'Tile',
    overlay: 'Overlay opacity',
    'error.invalid-request': 'Invalid request.',
    'error.busy': 'A picker window is already open.',
    'error.unsupported-platform': 'This system has no picker window. Enter the path manually.',
    'error.picker-failed': 'Could not open the picker window. Enter the path manually.',
    'error.failed': 'The operation failed. Please try again.',
    'error.not-absolute': 'Enter an absolute path.',
    'error.unsupported-format': 'Only PNG, JPEG, and WebP images are supported.',
    'error.not-found': 'The file does not exist.',
    'error.too-large': 'The file exceeds the 20 MiB limit.',
    'error.denied': 'Permission to read the file was denied.',
    'error.unavailable': 'The file could not be read.',
    'error.font-load-failed': 'The font could not be loaded.',
    'error.save-failed': 'The setting was not saved. Please try again.',
  },
} satisfies Record<'zh' | 'en', Record<LocaleKey, string>>;

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    dshSkin: LocaleKey;
  }
}
