# @vamdawn/dsh-astrolabe

[English](README.md) | 简体中文

[![npm version](https://img.shields.io/npm/v/@vamdawn/dsh-astrolabe.svg)](https://www.npmjs.com/package/@vamdawn/dsh-astrolabe)

Astrolabe — DeepSeek Harness 的标签式左侧边栏：一个工作区标签页，一个按状态分组的会话标签页。

它接管随产品发布的侧边栏中的会话区域，并在其上放置一条标签条，让同一个侧边栏沿两个维度——**工作区**或**状态**——浏览同一批会话，不必跳转到任何其他位置。它面向需要同时保留这两种分组方式的 DeepSeek Harness 用户。

状态：实验性（`0.x`），已针对 DeepSeek Harness Client 包 `0.2.0-rc.2` 与 Cordis `4.0.4` 完成测试。`0.x` 版本不附带任何稳定性承诺，而本插件的公开接口就是它所依赖的 Host slot 合约——随产品发布的工作区浏览器自己的 slot——因此 Host 升级可能使其失效。

## 安装

### 从 npm 安装

```sh
dsh plugin --profile desktop add @vamdawn/dsh-astrolabe
```

Web `profile` 请使用 `--profile web`。

### 从源码检出安装

```sh
cd plugins/dsh-astrolabe
npm ci --ignore-scripts
npm run build
```

然后把该目录安装到当前启用的 `profile`，通常是 `desktop` 或 `web`：

```sh
dsh plugin --profile <profile> add "$PWD/plugins/dsh-astrolabe"
```

安装会以链接方式引用该目录，因此请保持目录及其 `dist/` 可用，并在改动源文件后重新构建。如果 macOS 桌面端 CLI 不在 PATH 中，请使用：

```sh
"/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh"
```

### 安装之后

重新加载 Client 页面。Host 会加载 bundle，但浏览器只在页面加载时才会执行 Client 部分。

### 升级

`0.x` 的版本范围不跨 minor，因此安装在 `0.3.0` 的 profile 会一直运行该版本，直到显式安装新版本：

```sh
dsh plugin --profile desktop add @vamdawn/dsh-astrolabe
```

### 卸载

```sh
dsh plugin --profile <profile> remove @vamdawn/dsh-astrolabe
```

## 用法

- **工作区**按已注册的 Workspace 分组会话，其后是未分组；**状态**按待处理、进行中、已完成分组。
- 只要存在已置顶的会话，两个标签页都会打开一个**已置顶**分区，而已置顶的会话不再出现在它原本所属的分区中。
- 每个状态分区带自己状态的标记，进行中用的是静止的弧，行内则仍带着会旋转的 loader。会话行只在需要注意时显示标记：在等你处理、正在工作——自己的回合或它派出的子代理——或有未查看的完成。空白与会话空闲时前导单元格留空。
- 分区可折叠，Workspace 菜单会显示各自分区内的会话数量。行数超过一个折叠步长的分区带一个折叠控件：标签承诺的是这一次按压会展开的行数，最后一次按压把余量一次展开，只有完全展开后才提供收起。已完成分区保持折叠在 20 行，未查看的已完成会话优先。
- 搜索先即时匹配标题与 Workspace 名称，随后加入防抖的对话内容匹配及片段。它沿用 Host 的 `session.search` 绑定（默认 ⌘K / Ctrl+K，也支持自定义按键）；插件不注册重复的快捷键。归档结果通过所在行的操作恢复。
- subagent 会话嵌套在创建它的会话之下，点击即可打开；按最近活动排序，标题取委派标签，行尾显示各自的时间。
- 父会话正在工作、有子代理在跑或存在未查看的完成时才展开这一层，一次显示五行，正在运行的子代理不会被省掉。
- 悬停会话时补充其 Workspace 名称、目录与该 Workspace 的创建时间。
- 各行保留 Host 与第三方提供的会话操作菜单项，包括置顶、取消置顶和归档。原生目录选择器用于添加 Workspace 或打开新会话；Workspace 菜单提供重命名和移除。
- 会话与 Workspace 分组都可以拖拽以重新排序，自动重排带有动画，并遵循减少动态效果偏好。
- 侧边栏折叠时渲染 56px 图标栏。
- 插件文案提供中文和英文两种。

## 限制

- 官方浏览器的视图选项未被重新承载：其分组方式不再提供，没有归档筛选，也没有复制操作。定时任务的时钟标记与悬停卡片的任务分区同样缺失。
- 归档的搜索结果必须先恢复才能打开，恢复失败会就地显示，以便重试。
- 会话拖拽会切换到已保存的手动顺序，且没有控件可以回到最近活动顺序，同时只在同一分组内接受重排。
- Workspace 分组折叠在五个空闲会话，已完成分区折叠在 20 行；运行中、等待输入以及被选中的空白会话不占用 Workspace 配额。两处折叠在分区折叠再展开后都会保留已展开的行，而官方浏览器会重置回第一批。
- 嵌套层只承载 subagent 会话：运行中的回合、后台任务和定时提醒都不会出现在侧边栏中。
- 每个会话一次最多显示五行嵌套子会话，更多的委派只能在会话头部的官方子代理菜单里查看。
- 图标栏使用占位字形，而不是随产品发布的图标集。
- 完整的原生拖放尚未验证：自动化触发了 `dragstart`，但从未完成一次可靠的 `drop`。实机桌面端的指针、布局与目录选择器行为同样没有做过手动验证，Web 与非 macOS 平台也尚未做过实机验证。

## 开发

```sh
cd plugins/dsh-astrolabe
npm ci --ignore-scripts
npm run typecheck
npm test
npm run build
```

`npm test` 会构建真实的 Client bundle，并运行交互、model、motion 与 mirror 测试。源码：Client 部分在 `src/client.tsx`，其投影、动画与镜像辅助模块就在旁边；回归检查在 `tests/`。

## 链接

- [CHANGELOG.zh-CN.md](CHANGELOG.zh-CN.md) — 发布说明。
- [Issues](https://github.com/Vamdawn/ai-forge/issues) — 缺陷反馈与提问。
- [仓库发布规则](https://github.com/Vamdawn/ai-forge/blob/main/docs/versioning-and-release.md) — 版本与标签的发布方式。
- [LICENSE](LICENSE) — MIT。
