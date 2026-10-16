# @vamdawn/dsh-appearance-plus

[English](README.md) | 简体中文

[![npm version](https://img.shields.io/npm/v/@vamdawn/dsh-appearance-plus.svg)](https://www.npmjs.com/package/@vamdawn/dsh-appearance-plus)

定制 DeepSeek Harness 的界面字体、代码字体与窗口背景图片。插件在官方设置面板中新增 **外观+** 页面，并把改动叠加在当前主题之上，因此内置的 Light、Dark 和 System 配色仍可正常使用。

已在 DSH `0.2.0-rc.2` 上验证。它支持回环地址页面上的 Web UI，以及使用该 Web UI 的 Desktop 应用；TUI 没有设置面板。界面文案以官方中文（`zh`）和英文（`en`）两种语言提供。

## 安装

### 从 npm 安装

```sh
dsh plugin --profile desktop add @vamdawn/dsh-appearance-plus
```

若使用 Web 的 `profile`，请改用 `--profile web`。包内已包含编译后的 JavaScript，使用方无需构建；它面向 Node.js 24 或更高版本，以及 `peerDependencies` 中声明的 DSH 版本。

### 从源码检出安装

```sh
cd plugins/dsh-appearance-plus
npm ci --ignore-scripts
npm run typecheck
npm run build
cd ../..
```

然后把该目录安装到当前启用的 `profile` 中（通常是 `desktop` 或 `web`）：

```sh
dsh plugin --profile <profile> add "$PWD/plugins/dsh-appearance-plus"
```

安装会链接本地目录，因此请保留该目录及其 `dist/` 产物，并在修改源文件后重新构建。刷新 **Plugins**（插件）页面，确认 `@vamdawn/dsh-appearance-plus` 已启用；如果应用尚未加载该插件，请重启应用。如果 macOS Desktop CLI 不在 PATH 中，请使用：

```sh
"/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh"
```

卸载：

```sh
dsh plugin --profile <profile> remove @vamdawn/dsh-appearance-plus
```

## 用法

在侧边栏底部打开 **Settings**（设置），然后在左侧导航中选择 **外观+**。改动立即生效，无需重新加载。

- **界面字体**和**代码字体**：字段中显示已选中的字体族。点击可列出全部字体族，输入即可按名称筛选，用鼠标或方向键加回车选择。列表顶部的**默认**可恢复 Host 默认值。所选字体族排在最前，其后是 Host 内置的字体栈作为回退。
- **额外字体目录**：可再添加一个目录，其中的字体会出现在搜索结果中，并标记为*额外目录*。支持的文件为 `.ttf`、`.otf`、`.ttc`、`.woff` 和 `.woff2`，子目录也会包含在内。**重新扫描**可发现新安装的字体。
- **背景图片**：PNG、JPEG 或 WebP 文件的绝对路径。**填充方式**可选择铺满、适应或平铺。**遮罩不透明度**（0–100，默认 60）会在图片上叠加浅色或深色遮罩，以保持文字可读，并与当前配色保持一致。

**选择…**在 macOS 上会打开系统原生文件或文件夹对话框；在其他平台上请手动输入路径。插件引用原始文件，不会复制它们。

## 配置

设置保存在 `profile` 的 `cordis.patch.yml` 中对应的插件条目下。编辑该文件会更新已打开的设置页，而设置页上的改动也会写回文件：

```yaml
- id: dsh-appearance-plus
  name: "@vamdawn/dsh-appearance-plus"
  config:
    uiFont: LXGW WenKai          # 留空则使用 Host 默认值
    codeFont: JetBrains Mono
    fontDir: /Users/<user>/Fonts # 可选
    backgroundImage: /Users/<user>/Pictures/background.jpg
    backgroundFit: cover         # 取值：cover | contain | tile
    overlayOpacity: 60           # 整数 0-100
```

Host 会校验每个值：超出范围的不透明度或未知的填充方式会被拒绝，而不会生效。

## 限制

- 额外目录中的字体与背景图片通过 Host 已鉴权的 `GET /api/file` 路由加载，单个文件上限为 20 MiB；更大的文件会失败并显示当前语言的错误提示。已安装的系统字体按名称加载，不受影响。
- 背景引用的是原始图片。移动或删除该图片会在设置页显示错误，而最近一次可用的背景会保持不变，直到重新加载。
- 为了显示图片，插件会把基础窗口表面设为透明，并把侧边栏设为半透明。自行绘制不透明填充的面板仍保持原样。
- 路径指向运行 DSH Host 的机器。非回环地址的 Web 页面不受支持，也可能无法持久化设置，Host 的语言和主题偏好也是如此。
- 系统原生文件与文件夹对话框仅针对 macOS 实现。

## 开发

```sh
cd plugins/dsh-appearance-plus
npm ci --ignore-scripts
npm run typecheck
npm test
```

测试覆盖字体族名称选择、字体与字体集合解析、目录扫描、路由输入校验、schema 默认值、字体与背景的应用与还原、保留最近一次可用值的错误处理、选择窗口请求，以及卸载清理。

源码：`src/index.ts` 设置 schema 与已鉴权路由，`src/fonts.ts` 目录扫描与字体元数据，`src/picker.ts` 系统原生对话框，`src/client.tsx` 设置页与主题覆盖，`src/locales.ts` 双语语言词条，`build.mjs` esbuild 打包。

## 链接

- [CHANGELOG.zh-CN.md](CHANGELOG.zh-CN.md) — 发布说明。
- [LICENSE](LICENSE) — MIT。
- [仓库发布规则](https://github.com/Vamdawn/ai-forge/blob/main/docs/versioning-and-release.md) — 版本、标签与 npm 发布的管理方式。
