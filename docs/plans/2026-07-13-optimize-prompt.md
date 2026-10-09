# Optimize Prompt Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create an explicitly invoked `optimize-prompt` skill that improves general and coding prompts, asks for essential missing information, and returns one complete copy-ready prompt.

**Architecture:** Use one adaptive Markdown workflow in `SKILL.md`, one detailed checklist in `references/best-practices.md`, and one UI policy file in `agents/openai.yaml`. Disable model invocation in both supported metadata surfaces and add no scripts or assets.

**Tech Stack:** Markdown, YAML, `skill-creator` initialization and validation scripts.

## Global Constraints

- Create the skill at `/Users/chen/Repository/ai-forge/skills/optimize-prompt`.
- Support both general-purpose and coding-task prompts through one adaptive workflow.
- Ask one to three focused questions only when missing information could materially change the result.
- When Ask User is unavailable, require the user to answer clarification questions by explicitly invoking `$optimize-prompt` again, then resume from the original prompt and answers in the current conversation.
- When information is sufficient, output exactly one complete, standalone prompt in a fenced code block.
- Preserve the user's intent, language, facts, and hard constraints; do not invent missing context.
- Set top-level `disable-model-invocation: true` in `SKILL.md`.
- Set `policy.allow_implicit_invocation: false` in `agents/openai.yaml`.
- Add no scripts, assets, or unrelated files.
- Accept only the known `quick_validate.py` incompatibility with `disable-model-invocation`; fix every other validation error.

---

### Task 1: Create And Validate The Optimize Prompt Skill

**Files:**
- Create: `skills/optimize-prompt/SKILL.md`
- Create: `skills/optimize-prompt/agents/openai.yaml`
- Create: `skills/optimize-prompt/references/best-practices.md`
- Include in commit: `docs/superpowers/plans/2026-07-13-optimize-prompt.md`

**Interfaces:**
- Consumes: an original prompt plus any context supplied in the current conversation.
- Produces: either one clarification interaction when essential information is missing, including explicit reinvocation instructions for the plain-text fallback, or exactly one complete prompt in a fenced code block when information is sufficient.

- [ ] **Step 1: Initialize the skill with the official scaffold**

Run:

```bash
python3 /Users/chen/.codex/skills/.system/skill-creator/scripts/init_skill.py optimize-prompt \
  --path /Users/chen/Repository/ai-forge/skills \
  --resources references \
  --interface 'display_name=Optimize Prompt' \
  --interface 'short_description=Improve prompts and ask for missing essentials' \
  --interface 'default_prompt=Use $optimize-prompt to turn my draft into one complete, copy-ready prompt.'
```

Expected: the command creates `SKILL.md`, `agents/openai.yaml`, and the empty `references/` directory without example files.

- [ ] **Step 2: Replace the scaffold with the complete skill content**

Write `skills/optimize-prompt/SKILL.md` exactly as follows:

```markdown
---
name: optimize-prompt
description: Optimize and rewrite general-purpose and coding-task prompts into complete, copy-ready instructions. Use only when the user explicitly invokes $optimize-prompt to improve, refine, restructure, or complete a prompt; ask focused questions when essential context is missing.
disable-model-invocation: true
---

# Optimize Prompt

## Workflow

1. Read the original prompt and all context the user supplied in the current conversation.
2. Match the user's language unless the user requests another language.
3. Read [best-practices.md](references/best-practices.md) and classify the task as general-purpose or coding-related.
4. Extract the explicit goal, context, constraints, requested output, and completion criteria.
5. Identify only missing information that could materially change the optimized prompt.
6. If essential information is missing, follow the clarification policy and stop until the user answers through Ask User or explicitly invokes $optimize-prompt again.
7. Rewrite the prompt with the minimum structure needed for reliable execution.
8. Check the result against the preservation and output rules before returning it.

## Clarification Policy

When essential information is missing:

- Use Ask User when it is available.
- When Ask User is unavailable, ask concise questions in plain text and instruct the user to answer by explicitly invoking `$optimize-prompt` again.
- Ask one to three highest-impact questions in one interaction, ordered by importance.
- Use mutually exclusive choices when the valid options are known; otherwise use an open question.
- Do not ask for details that are present, safely inferable, or merely nice to have.
- Do not output a partial optimized prompt.
- After the user answers through Ask User or explicitly invokes `$optimize-prompt` again, read the original prompt and their answers from the current conversation and resume the workflow without repeating resolved questions.

## Rewrite Rules

- Preserve the user's intent, language, facts, examples, and hard constraints.
- Do not invent business facts, technical context, source material, file paths, or acceptance criteria.
- Resolve ambiguity only from supplied context or user answers.
- Add headings, ordering, or explicit steps only when they improve clarity or reliability.
- Keep simple prompts concise; do not mechanically expand every checklist item into a section.
- Make the prompt standalone so it remains usable outside the current conversation.
- For coding tasks, include scope, project conventions, verification, and behavior-based completion criteria when known.

## Output Rules

If essential information is missing, output only the clarification request.

When information is sufficient:

- Output exactly one complete prompt in a fenced code block.
- Use a fence that does not conflict with fenced content inside the prompt.
- Do not add a preface, analysis, explanation, change log, alternative version, placeholder, or usage note unless the user explicitly requests it.
```

Write `skills/optimize-prompt/references/best-practices.md` exactly as follows:

```markdown
# Prompt Optimization Best Practices

Source: [ChatGPT Learn: Best practices](https://learn.chatgpt.com/guides/best-practices)

## Core Structure

Evaluate every prompt against four questions:

- Goal: What outcome should be produced or changed?
- Context: Which background, source material, examples, files, errors, or prior decisions matter?
- Constraints: Which requirements, boundaries, conventions, exclusions, or safety rules must be followed?
- Done when: Which observable result or verification proves completion?

Also identify the requested output format, audience, tone, and level of detail when they materially affect the result. Do not require a field that does not help the task.

## General-Purpose Tasks

Consider:

- The concrete deliverable and intended audience.
- Relevant source material or facts the model must use.
- Required tone, format, length, and exclusions.
- Whether the task needs a sequence, comparison criteria, or evidence standard.
- A completion condition that can be recognized from the output.

## Coding Tasks

Additionally consider:

- Repository, files, directories, examples, logs, and errors in scope.
- Existing architecture, project instructions, and conventions.
- The allowed change boundary and explicit non-goals.
- Reproduction steps for bugs or current behavior for changes.
- Tests, linting, type checks, builds, or manual checks required for verification.
- Regression risks and behavior-based acceptance criteria.

Never invent repository details. Ask only when a missing detail prevents a reliable, scoped prompt.

## Essential Information Test

Treat a gap as essential only when different plausible answers would produce materially different prompts or acceptance criteria. Typical essential gaps include an absent goal, an unidentified deliverable, unavailable required source material, or an unknown coding scope that cannot be discovered from the supplied context.

Do not ask about preferences that can be preserved from the original prompt, inferred without risk, or omitted without changing the result. When the prompt is already actionable, optimize it immediately.

## Final Review

Before returning the prompt, verify that it:

- Preserves every explicit must, must not, only, and completion condition.
- Contains no invented facts or unresolved placeholders.
- Uses only as much structure and detail as the task needs.
- Is self-contained and directly copyable.
- Defines observable completion for tasks that require execution or verification.
```

Write `skills/optimize-prompt/agents/openai.yaml` exactly as follows:

```yaml
interface:
  display_name: "Optimize Prompt"
  short_description: "Improve prompts and ask for missing essentials"
  default_prompt: "Use $optimize-prompt to turn my draft into one complete, copy-ready prompt."

policy:
  allow_implicit_invocation: false
```

- [ ] **Step 3: Validate structure and invocation metadata**

Run the official validator:

```bash
python3 /Users/chen/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  /Users/chen/Repository/ai-forge/skills/optimize-prompt
```

Expected: exit code `1` with only `Unexpected key(s) in SKILL.md frontmatter: disable-model-invocation`. This is the documented validator compatibility mismatch.

Run a strict semantic metadata check:

```bash
python3 - <<'PY'
import re
from pathlib import Path

import yaml

skill_dir = Path("/Users/chen/Repository/ai-forge/skills/optimize-prompt")
skill_text = (skill_dir / "SKILL.md").read_text()
match = re.match(r"^---\n(.*?)\n---", skill_text, re.DOTALL)
assert match, "invalid SKILL.md frontmatter"
frontmatter = yaml.safe_load(match.group(1))
assert set(frontmatter) == {"name", "description", "disable-model-invocation"}
assert frontmatter["name"] == "optimize-prompt"
assert frontmatter["disable-model-invocation"] is True

openai = yaml.safe_load((skill_dir / "agents/openai.yaml").read_text())
assert openai["policy"]["allow_implicit_invocation"] is False
assert "$optimize-prompt" in openai["interface"]["default_prompt"]
print("metadata checks passed")
PY
```

Expected: `metadata checks passed`.

Run content and whitespace checks:

```bash
rg -n 'TODO|TBD|FIXME|PLACEHOLDER' skills/optimize-prompt
git diff --check
find skills/optimize-prompt -type f | sort
```

Expected: `rg` returns no matches; `git diff --check` returns no output; `find` lists exactly the three planned files.

- [ ] **Step 4: Forward-test the behavior with fresh agents**

Run independent agents with only the skill path and one raw request each:

```text
Use $optimize-prompt at /Users/chen/Repository/ai-forge/skills/optimize-prompt to optimize this draft:
“为公司管理层写一份 800 字以内的中文摘要，基于我提供的季度报告，突出收入变化、主要风险和下一季度行动。只使用报告中的数字，输出 Markdown。”
```

Expected: one copy-ready fenced prompt, no clarification question, no invented report content.

```text
Use $optimize-prompt at /Users/chen/Repository/ai-forge/skills/optimize-prompt to optimize this draft:
“修复 src/cache.ts 中并发请求偶尔重复回源的问题。保持现有公开 API，不新增依赖。先添加能稳定复现问题的测试，再实现修复；运行 npm test 和 npm run lint，全部通过才算完成。”
```

Expected: one copy-ready fenced prompt that preserves file scope, API boundary, test-first requirement, commands, and completion condition.

```text
Use $optimize-prompt at /Users/chen/Repository/ai-forge/skills/optimize-prompt to optimize this draft: “帮我写个方案。”
```

Expected: one focused clarification interaction and no partial prompt code block. When Ask User is unavailable, the response explicitly tells the user to answer by invoking `$optimize-prompt` again.

```text
Use $optimize-prompt at /Users/chen/Repository/ai-forge/skills/optimize-prompt to optimize this draft:
“把标题 ‘Reliable systems’ 翻译成简体中文，只输出译文。”
```

Expected: one short copy-ready fenced prompt that does not add irrelevant sections or questions.

- [ ] **Step 5: Review and commit the completed skill**

Run:

```bash
git diff --check
git diff -- docs/superpowers/plans/2026-07-13-optimize-prompt.md skills/optimize-prompt
git status --short
```

Expected: only the implementation plan and the three skill files are new; the diff contains both invocation controls and no unrelated changes.

Commit:

```bash
git add docs/superpowers/plans/2026-07-13-optimize-prompt.md skills/optimize-prompt
git commit -m "feat: add explicit prompt optimization skill"
```
