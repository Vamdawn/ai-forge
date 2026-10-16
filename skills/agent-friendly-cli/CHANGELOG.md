# Changelog

English | [简体中文](CHANGELOG.zh-CN.md)

This file follows the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format and records user-visible changes to the `agent-friendly-cli` skill.

## [Unreleased]

### Added

- Added a skill for designing and reviewing agent-friendly CLIs, covering discovery, arguments, machine output, errors, idempotency, security, side effects, and composability.

### Changed

- Explicitly forbade the model from invoking the skill on its own in the skill metadata, keeping the explicit invocation entry point.
