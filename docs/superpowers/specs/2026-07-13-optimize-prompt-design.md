# Optimize Prompt Skill Design

## Goal

Create one `optimize-prompt` skill under `./skills` that improves both general-purpose and coding-task prompts. When essential information is missing, ask the user focused questions before producing the result. When enough information is available, output one complete prompt that can be copied and used directly.

## Source Principles

Use [ChatGPT Learn: Best practices](https://learn.chatgpt.com/guides/best-practices) as the primary reference. Apply its prompt structure:

- Goal: what the user wants to achieve.
- Context: relevant files, documents, examples, errors, or background.
- Constraints: standards, boundaries, safety requirements, and conventions.
- Done when: observable completion and verification criteria.

For difficult or ambiguous work, clarify or plan before execution. Keep reusable workflow guidance in the skill and avoid adding unnecessary supporting files.

## Scope

Support two task classes through one adaptive workflow:

- General prompts, including writing, analysis, research, planning, and other LLM tasks.
- Coding prompts, including implementation, debugging, refactoring, review, and repository maintenance.

Do not bind the skill to one model, API, framework, or repository. Do not invent missing business facts or technical context.

## Invocation Policy

Allow only explicit human invocation through `$optimize-prompt`. Set the top-level `disable-model-invocation: true` field in `SKILL.md` frontmatter and configure `agents/openai.yaml` with `policy.allow_implicit_invocation: false` so the model cannot activate the skill automatically based on conversation content.

The current `skill-creator` validator does not recognize `disable-model-invocation` and reports it as an unexpected frontmatter key. Preserve the user-required field despite that compatibility mismatch. Treat only that specific validator error as expected, and separately parse the YAML to confirm the field is the boolean value `true`; do not ignore other validation failures.

## Structure

Create only the files needed by the skill:

```text
skills/optimize-prompt/
├── SKILL.md
├── agents/
│   └── openai.yaml
└── references/
    └── best-practices.md
```

Keep the operational workflow in `SKILL.md`. Put the detailed optimization checklist and task-specific fields in `references/best-practices.md` so they are loaded only when needed. Add no scripts or assets because the workflow is judgment-based and does not require deterministic file processing.

## Workflow

1. Read the original prompt and any supplied context.
2. Identify the intended outcome and classify the task as general or coding-related.
3. Extract explicit goals, context, constraints, output requirements, and completion criteria.
4. Identify only missing information that could materially change the optimized prompt.
5. If essential information is missing, use Ask User to ask one to three focused questions. If Ask User is unavailable, ask concise questions in plain text. Do not output a partial optimized prompt yet.
6. When sufficient information is available, rewrite the prompt with the minimum structure needed for clarity and execution.
7. Check that the result preserves the user's intent, facts, language, and hard constraints.
8. Output one complete, standalone prompt in a fenced code block.

## Adaptive Fields

For all prompts, consider:

- Objective and desired outcome.
- Relevant context and source material.
- Requirements, constraints, and exclusions.
- Expected process when it materially improves reliability.
- Output format, audience, tone, and level of detail.
- Observable completion criteria.

For coding prompts, additionally consider:

- Repository, files, directories, examples, and error evidence in scope.
- Existing architecture, project conventions, and allowed change boundaries.
- Required tests, linting, type checks, builds, or reproduction steps.
- Regression risks and behavior-based acceptance criteria.

Do not force every field into every prompt. Simple prompts should remain concise.

## Question Policy

Ask only when a missing answer would materially affect the result. Do not ask for information that is already present, safely inferable, or merely nice to have. Prefer one interaction containing no more than three high-impact questions, ordered by importance.

When options are known and mutually exclusive, use Ask User choices. Otherwise, ask an open question. After receiving answers, continue the workflow instead of repeating already resolved questions.

## Output Contract

When information is insufficient, output only the clarification request.

When information is sufficient:

- Output exactly one complete prompt in a fenced code block.
- Make the prompt usable without the surrounding conversation.
- Match the user's language unless the user requests another language.
- Do not include analysis, a change log, alternatives, placeholders, or usage instructions unless explicitly requested.
- Preserve factual content and hard constraints from the original prompt.

## Validation

Run the skill validator and forward-test these cases:

1. A sufficiently detailed general prompt produces one concise, copy-ready prompt without unnecessary questions.
2. A sufficiently detailed coding prompt includes scope and verification criteria without inventing repository details.
3. A vague prompt missing a material goal or context asks focused questions and does not emit a partial prompt.
4. A short but sufficient prompt remains short instead of being expanded mechanically.

Review the final files for placeholders, contradictions, unnecessary scope, and alignment between `SKILL.md` and `agents/openai.yaml`.
Confirm that `SKILL.md` sets `disable-model-invocation: true`, `agents/openai.yaml` disables implicit invocation, and the default prompt demonstrates explicit `$optimize-prompt` usage.
