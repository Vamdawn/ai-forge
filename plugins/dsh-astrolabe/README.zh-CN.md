# @vamdawn/dsh-astrolabe

[English](README.md) | 简体中文

[![npm version](https://img.shields.io/npm/v/@vamdawn/dsh-astrolabe.svg)](https://www.npmjs.com/package/@vamdawn/dsh-astrolabe)

**Astrolabe** 接管 DeepSeek Harness 侧边栏的会话区域，并在其上放置一条标签条，让同一个侧边栏沿两个维度浏览同一批会话：**Workspace** 或**状态**。随产品发布的侧边栏把该区域交给单一视图；在这里，第二个维度只需一次点击，不必跳转到任何其他位置。

实验性功能（0.1.0），已针对 DeepSeek Harness Client 包 `0.2.0-rc.2` 与 Cordis `4.0.4` 完成测试。本插件依赖随产品发布的工作区浏览器所提供的 slot 合约，因此无法保证在其他 Host 版本上可用。

## 安装

### 从 npm 安装

```sh
dsh plugin --profile desktop add @vamdawn/dsh-astrolabe
```

Web `profile` 请使用 `--profile web`，随后重新加载 Client。

### 从源码检出安装

```sh
cd plugins/dsh-astrolabe
npm ci --ignore-scripts
npm run typecheck
npm run build
cd ../..
```

然后把该目录安装到当前启用的 `profile`（通常是 `desktop` 或 `web`）：

```sh
dsh plugin --profile <profile> add "$PWD/plugins/dsh-astrolabe"
```

安装会以链接方式引用本地目录，因此请保持该目录及其 `dist/` 构建产物可用，并在改动源文件后重新构建。安装或重新构建后**重新加载 Client 页面**：Host 会加载 bundle，但浏览器只在页面加载时才会执行 Client 部分。如果 macOS 桌面端 CLI 不在 PATH 中，请使用：

```sh
"/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh"
```

卸载：

```sh
dsh plugin --profile <profile> remove @vamdawn/dsh-astrolabe
```

## 用法

- **工作区**按已注册的 Workspace 分组会话，其后是未分组；**状态**按待处理、进行中、已完成分组。只要存在已置顶的会话，两个标签页都会打开一个**已置顶**分区，而已置顶的会话不再出现在它原本所属的分区中。每个状态分区带自己状态的标记：进行中用的是静止的弧，行内则仍带着会旋转的 loader。
- 分区可折叠，Workspace 菜单会显示各自分区内的会话数量。已完成分区保持折叠，每次操作再显示 20 行，未查看的已完成会话优先。
- 搜索先即时匹配标题与 Workspace 名称，随后加入防抖的对话内容匹配及片段。它沿用 Host 的 `session.search` 绑定（默认 ⌘K / Ctrl+K，也支持自定义按键）；插件不注册重复的快捷键。归档结果通过所在行的操作恢复。
- 会话行只在需要注意时显示标记：在等你处理、正在工作（自己的回合或它派出的子代理），或有未查看的完成。空白与会话空闲时前导单元格留空。
- subagent 会话嵌套在创建它的会话之下，点击即可打开；按最近活动排序，标题取委派标签，行尾显示各自的时间。父会话正在工作、有子代理在跑或存在未查看的完成时才展开这一层，一次显示五行，正在运行的子代理不会被省掉。
- 悬停会话时补充其 Workspace 名称、目录与该 Workspace 的创建时间。
- 各行保留 Host 与第三方提供的会话操作菜单项，包括置顶、取消置顶和归档。原生目录选择器用于添加 Workspace 或打开新会话；Workspace 菜单提供重命名和移除。
- 会话与 Workspace 分组都可以拖拽以重新排序。自动重排带有动画（同组内 200ms，跨组邻近移动 240ms，淡入淡出 120ms），并遵循减少动态效果偏好。
- 侧边栏折叠时渲染 56px 图标栏。插件文案提供中文和英文两种。

## 限制

- `sidebar.session.row.leading` 与 `sidebar.session.row.hover` 未被重新承载，因此定时任务的时钟标记与悬停卡片的任务分区仍然缺失；没有归档筛选，也没有复制操作。
- 归档的搜索结果必须先恢复才能打开，恢复失败会就地显示，以便重试。
- 会话拖拽会切换到已保存的手动顺序，且没有控件可以回到最近活动顺序，同时只在同一分组内接受重排。
- Workspace 分组每次显示五个空闲会话；运行中、等待输入以及被选中的空白会话不占用该配额。
- 嵌套层只承载 subagent 会话：运行中的回合、后台任务和定时提醒都不会出现在侧边栏中。
- 每个会话一次最多显示五行嵌套子会话，更多的委派只能在会话头部的官方子代理菜单里查看。
- 图标栏使用占位字形，而不是随产品发布的图标集。
- 完整的原生拖放尚未验证：自动化触发了 `dragstart`，但从未完成一次可靠的 `drop`。Web 与非 macOS 平台也尚未做过实机验证。

## 开发

```sh
cd plugins/dsh-astrolabe
npm ci --ignore-scripts
npm run typecheck
npm test
```

`npm test` 会构建真实的 Client bundle，然后针对已安装的 slot 注册表运行 React 交互、model、motion 与 mirror 测试；实机桌面端的指针、布局与选择器行为仍需手动验证。

源码：`src/client.tsx` 组件与注册，`src/model.ts` 投影与搜索，`src/motion.ts` 动画，`src/mirror.ts` 外部条目镜像，`src/store.ts` 视图状态，`src/index.ts` Host 入口，`tests/` 回归检查。

## 链接

- [CHANGELOG.zh-CN.md](CHANGELOG.zh-CN.md) — 发布说明。
- [LICENSE](LICENSE) — MIT。
- [仓库发布规则](https://github.com/Vamdawn/ai-forge/blob/main/docs/versioning-and-release.md) — 版本与标签的发布方式。
