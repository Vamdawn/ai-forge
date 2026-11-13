# @vamdawn/dsh-sidebar-plus

[English](README.md) | 简体中文

[![npm version](https://img.shields.io/npm/v/@vamdawn/dsh-sidebar-plus.svg)](https://www.npmjs.com/package/@vamdawn/dsh-sidebar-plus)

Sidebar Plus — DeepSeek Harness 的标签式会话侧边栏：一个工作区标签页，一个按状态分组的会话标签页。

它接管随产品发布的侧边栏中的会话区域，并在其上放置一条标签条，让同一个侧边栏沿两个维度——**工作区**或**状态**——浏览同一批会话，不必跳转到任何其他位置。它面向需要同时保留这两种分组方式的 DeepSeek Harness 用户。

状态：实验性（`0.x`），已针对 DeepSeek Harness Client 包 `0.2.0-rc.2` 与 Cordis `4.0.4` 完成测试。`0.x` 版本不附带任何稳定性承诺，而本插件的公开接口就是它所依赖的 Host slot 合约——随产品发布的工作区浏览器自己的 slot——因此 Host 升级可能使其失效。更早的版本以 `@vamdawn/dsh-astrolabe` 发布，下面的命令使用新的包名。

## 安装

### 从 npm 安装

```sh
dsh plugin --profile desktop add @vamdawn/dsh-sidebar-plus
```

Web `profile` 请使用 `--profile web`。

### 从源码检出安装

```sh
cd plugins/dsh-sidebar-plus
npm ci --ignore-scripts
npm run build
```

然后把该目录安装到当前启用的 `profile`，通常是 `desktop` 或 `web`：

```sh
dsh plugin --profile <profile> add "$PWD/plugins/dsh-sidebar-plus"
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
dsh plugin --profile desktop add @vamdawn/dsh-sidebar-plus
```

### 卸载

```sh
dsh plugin --profile <profile> remove @vamdawn/dsh-sidebar-plus
```

更早的 `@vamdawn/dsh-astrolabe` 安装用同一条命令卸载。请在安装本包之前先卸载它，因为两者抢占同一个侧边栏 slot。

## 用法

- **工作区**按已注册的 Workspace 分组会话，其后是未分组；**状态**依次按 Working／进行中（运行中或等子任务、后台工作）、Waiting／待输入（等人输入或审批）、Done／已完成（本轮结束但结果未看）、Idle／空闲（没有活跃工作或未读结果）分组。人工请求优先于活跃工作；打开已完成会话后，它从 Done 移到 Idle。
- 只要存在已置顶的会话，两个标签页都会打开一个**已置顶**分区，而已置顶的会话不再出现在它原本所属的分区中。
- 状态分组使用与会话标题左侧对齐的半粗体文字和更大的组间留白，不显示分组图标或收起控件。仅工作中的会话行有动效；等待行使用琥珀色圆圈叹号，已完成但未读的结果带绿点，空白和空闲行的前导单元格留空。
- Workspace 分区可折叠，菜单显示会话数量；超过一批的行可继续展开，全部显示后提供收起。Status 分区始终展开，包含 Idle；每组首次显示 50 行，每次继续显示最多 50 行，全部显示后不提供收起操作。
- 搜索先即时匹配标题与 Workspace 名称，随后加入防抖的对话内容匹配及片段。它沿用 Host 的 `session.search` 绑定（默认 ⌘K / Ctrl+K，也支持自定义按键）；插件不注册重复的快捷键。归档结果通过所在行的操作恢复。
- subagent 会话用竖线和折角线连接到父会话，按最近活动排序。点击即可打开，标题取委派标签，行尾显示各自的时间。
- 父会话正在工作、等待输入或存在未查看的完成时才展开这一层，最多补足五行；正在运行或等待输入的子代理始终保留。
- 悬停会话时补充其 Workspace 名称、目录与该 Workspace 的创建时间。
- Workspaces 对齐官方浏览器的 34px 工作区行、32px 会话行、单行标题、悬停箭头与操作按钮及选中底色。各行保留 Host 和第三方菜单操作；原生目录选择器用于添加 Workspace，移除工作区使用官方 Modal，不再把确认内容插入列表。
- 会话与 Workspace 分组都可以拖拽以重新排序，自动重排带有动画，并遵循减少动态效果偏好。
- 侧边栏折叠时渲染 56px 图标栏。
- 插件文案提供中文和英文两种。

## 限制

- Workspaces 使用对齐宿主 `0.2.0-rc.2` 的独立渲染器；宿主将整个浏览器作为一个 slot 提供，无法只嵌入原生工作区列表。官方浏览器的视图选项未被重新承载：其分组方式不再提供，没有归档筛选，也没有复制操作。定时任务的时钟标记与悬停卡片的任务分区同样缺失。
- 归档的搜索结果必须先恢复才能打开，恢复失败会就地显示，以便重试。
- 会话拖拽会切换到已保存的手动顺序，且没有控件可以回到最近活动顺序，同时只在同一分组内接受重排。
- Workspace 分组折叠在五个空闲会话；运行中、等待输入以及被选中的空白会话不占用配额。关闭工作区后，配额与官方浏览器一样重置；Status 分区在组件挂载期间保留已展开的数量。
- 嵌套层仅列出 subagent 会话。所属的运行中或停止中的后台任务参与 Working 分类，但不新增行；定时提醒不参与这些分类。任务状态为每个已列出的会话及其目录中的直接子会话建立一条共享订阅，移除或卸载时释放。
- 每个会话一次最多显示五行嵌套子会话，更多的委派只能在会话头部的官方子代理菜单里查看。
- 图标栏使用占位字形，而不是随产品发布的图标集。
- 完整的原生拖放尚未验证：自动化触发了 `dragstart`，但从未完成一次可靠的 `drop`。实机桌面端的指针、布局与目录选择器行为同样没有做过手动验证，Web 与非 macOS 平台也尚未做过实机验证。

## 开发

```sh
cd plugins/dsh-sidebar-plus
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
