# Changelog

[English](CHANGELOG.md) | 简体中文

## [Unreleased]

### Added

- 在英文版旁发布简体中文 README（`README.zh-CN.md`），并随 npm 包发布。
- 在英文版旁发布简体中文变更记录（`CHANGELOG.zh-CN.md`），并随 npm 包发布。

### Changed

- 围绕安装、使用、配置、限制与开发重写 README；带日期的验证记录不再包含在内。

## [0.1.0] - 2026-10-15

### Added

- 新增 `@vamdawn/dsh-appearance-plus`，在官方 Web 与 Desktop 设置面板中提供 **Appearance+** 页面。无需修改 Host 样式表即可自定义界面字体、代码字体和窗口背景。
- 按字体族名称搜索已安装的系统字体以及一个可选的额外目录。额外目录中的字体会通过 Host 的鉴权文件路由从其原始文件加载，字体加载失败时保留上一次可用的字体族。
- 通过绝对路径设置 PNG、JPEG 或 WebP 背景图片，支持 cover、contain 或平铺方式，并可调整随浅色或深色配色变化的蒙层。图片缺失、过大或格式不受支持时会显示本地化错误，并保留原有背景。
- 可通过 macOS 原生对话框选择背景图片或额外字体目录，也可在任何平台手动输入路径。
- 设置保存在 `profile` 的 `cordis.patch.yml` 中，因此设置页面与文件中的修改保持同步。禁用插件会移除它添加的所有 token 覆盖、样式和字体。
- 提供中英文文案、严格的 Host 与 Client 类型检查、针对构建后插件的自动化测试，以及分发内容中的 MIT 许可证声明。
