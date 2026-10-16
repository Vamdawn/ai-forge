# @vamdawn/dsh-rename-session

[English](README.md) | 简体中文

[![npm version](https://img.shields.io/npm/v/@vamdawn/dsh-rename-session.svg)](https://www.npmjs.com/package/@vamdawn/dsh-rename-session)

为 DeepSeek Harness 会话的“...”菜单添加 **根据上下文重命名**。该插件会合并当前对话中的用户与助手文本，使用会话最近一次请求所用的模型生成简洁名称，并将其保存为固定名称。

已使用 DSH `0.2.0-rc.2` 验证。它支持 Web UI 以及使用该 UI 的 Desktop 应用；TUI 不提供此菜单。文案随官方中文（`zh`）与英文（`en`）语言包一起提供，切换 **Settings（设置）→ General（通用）→ Language（语言）** 后，菜单、进行中提示以及成功与错误提示会立即更新，无需重新加载。生成的名称遵循对话的主要语言，而非界面语言。

## 安装

### 从 npm 安装

```sh
dsh plugin --profile desktop add @vamdawn/dsh-rename-session
```

Web `profile` 请使用 `--profile web`。该包内含已编译的 JavaScript，消费端无需构建；它面向 Node.js 24 或更高版本，以及 `peerDependencies` 中声明的 DSH 版本。

### 从源码检出安装

```sh
cd plugins/dsh-rename-session
npm ci --ignore-scripts
npm run typecheck
npm run build
cd ../..
```

然后将该目录安装到当前启用的 `profile` 中（通常为 `desktop` 或 `web`）：

```sh
dsh plugin --profile <profile> add "$PWD/plugins/dsh-rename-session"
```

安装过程会链接本地目录，因此请保持该目录及其 `dist/` 产物可用，并在修改源码文件后重新构建。刷新 Plugins（插件）页面，确认 `@vamdawn/dsh-rename-session` 已启用；如果应用尚未加载该插件，请重启应用。如果 macOS Desktop CLI 不在 PATH 中，请使用：

```sh
"/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh"
```

要在独立的 Web `profile` 中试用该插件：

```sh
dsh --profile rename-demo --from-default-profile web --dump-config
dsh plugin --profile rename-demo add "$PWD/plugins/dsh-rename-session"
dsh --profile rename-demo
```

### 替换更早的非 scoped 安装

如果该 `profile` 中已存在名为 `dsh-rename-session` 的开发包，请先移除它，再添加 scoped 包：两者注册相同的 action 与 endpoint，因此不能同时运行。

```sh
dsh plugin --profile <profile> remove dsh-rename-session
```

然后从 npm、已构建的检出或 tarball 安装该 scoped 包。仓库目录与组件 ID 仍为 `dsh-rename-session`。

卸载该 scoped 包：

```sh
dsh plugin --profile <profile> remove @vamdawn/dsh-rename-session
```

## 用法

该会话必须至少发起过一次模型请求。

1. 打开会话所在行的“...”菜单，选择 **根据上下文重命名**，它位于 **Rename**（重命名）与 **Fork session**（派生会话）之间。
2. 等待完成。新名称会出现在会话列表中，并被固定，不再受自动重新生成影响；你仍可以手动重命名，或再次生成名称。

每次操作都会使用 Host 现有的凭据发起一次辅助模型请求，并消耗相应的配额。它不会向主对话追加用户消息，也不会执行工具；历史会话通过临时 Host 引用打开，随后释放，不会改变当前选中的会话。

## 限制

- 该插件使用 Host 当前的对话投影，包括已压缩的历史记录。它提取用户与助手文本，过滤 Host 标记的指令、目录与环境快照，并排除隐藏推理、工具输出与图像内容。
- 超过 48,000 个 UTF-16 代码单元的输入会保留前 12,000 个与后 36,000 个单元。生成过程有 60 秒的期限与 256 token 的输出上限，名称在 Host 归一化之前最多为 60 个 Unicode 字符。
- 上下文为空、缺少模型路由、模型失败、输出被截断以及取消都不会触发重命名。每个会话同一时间只运行一个名称请求。
- 如果生成期间现有名称发生变化，结果不会覆盖较新的名称，卸载插件会取消未完成的请求。
- 实际的名称质量取决于所选模型。

## 开发

```sh
cd plugins/dsh-rename-session
npm ci --ignore-scripts
npm run typecheck
npm test
npm pack --dry-run
```

`npm test` 会先构建，然后借助 Node 原生 TypeScript 支持，针对已编译的 Host 与 Client 产物运行 `tests/*.test.ts`。测试覆盖上下文选择、模型路由、失败时保留现有名称、取消、并发名称变更、重复请求、卸载清理，以及 Client 到 Host 的请求流程。

源码：`src/index.ts` 为需要认证的路由、上下文读取与重命名调用；`src/client.tsx` 为菜单项与常驻提示；`src/locales.ts` 与 `src/protocol.ts` 为双语词典与 Client-Host 类型；`build.mjs` 为 esbuild bundle；`cordis.patch.yml` 为可安装的 bundle 配置。

## 链接

- [CHANGELOG.zh-CN.md](CHANGELOG.zh-CN.md) — 发布说明。
- [LICENSE](LICENSE) — MIT。
- [仓库发布规则](https://github.com/Vamdawn/ai-forge/blob/main/docs/versioning-and-release.md) — 版本、标签与 npm 发布的处理方式。
