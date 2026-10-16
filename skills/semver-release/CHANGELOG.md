# Changelog

English | [简体中文](CHANGELOG.zh-CN.md)

This file follows the [Keep a Changelog](https://keepachangelog.com/) format and records user-visible changes to the `semver-release` skill.

## [Unreleased]

### Added

- Added the monorepo asset mode: a single asset is the release unit, supporting `<asset-name>@X.Y.Z` tags, commit analysis scoped by asset path, version file detection inside the asset directory, and appending an entry to the root CHANGELOG's release index at release time. The previous whole-repository release behavior is unchanged and is kept as the default mode.
