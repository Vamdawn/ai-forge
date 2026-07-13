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
6. If essential information is missing, follow the clarification policy and stop until the user answers.
7. Rewrite the prompt with the minimum structure needed for reliable execution.
8. Check the result against the preservation and output rules before returning it.

## Clarification Policy

When essential information is missing:

- Use Ask User when it is available; otherwise ask concise questions in plain text.
- Ask one to three highest-impact questions in one interaction, ordered by importance.
- Use mutually exclusive choices when the valid options are known; otherwise use an open question.
- Do not ask for details that are present, safely inferable, or merely nice to have.
- Do not output a partial optimized prompt.
- Resume the workflow after the user answers without repeating resolved questions.

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
