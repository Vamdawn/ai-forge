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
