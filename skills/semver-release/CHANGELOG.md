# Changelog

本文件遵循 [Keep a Changelog](https://keepachangelog.com/) 格式，记录 `semver-release` skill 的用户可见变更。

## [Unreleased]

### Added

- 新增 monorepo 资产模式：以单个资产为发布单位，支持 `<asset-name>@X.Y.Z` tag、按资产路径限定 commit 分析范围、资产目录内版本文件探测，并在发版时向根 CHANGELOG 的发布索引追加条目。原有整库发布行为不变，作为默认模式保留。
