# Changelog

English | [简体中文](CHANGELOG.zh-CN.md)

This file follows the [Keep a Changelog](https://keepachangelog.com/) format and records user-visible changes to the `retrospect-session` skill.

## [Unreleased]

### Changed

- The rules home directory is no longer hard-coded to `docs/rules/`: added a Rules Home Resolution step that prefers `agents/rules/` when the project has one (aligning with the Agent Harness convention that "`agents/` is the Harness source of truth"), otherwise falls back to `docs/rules/`, and creates it according to the project's shape when neither exists.
