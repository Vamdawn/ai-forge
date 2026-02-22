## Project Context

- Language / framework: {{TECH_STACK}}
- Test command: {{TEST_COMMAND}}
- Coding conventions: {{CONVENTIONS_OR_NONE}}
- Relevant existing files: {{FILE_LIST_OR_NONE}}

## Task

{{TASK_ID}}: {{TASK_DESCRIPTION}}

## Acceptance Criteria

{{ACCEPTANCE_CRITERIA}}

## Instructions

Follow TDD (Test-Driven Development) strictly:

1. **RED** — Write tests that cover the acceptance criteria. Run them with
   `{{TEST_COMMAND}}`. They MUST fail. If they pass, the tests are not testing
   new behavior — fix them.
2. **GREEN** — Write the minimal implementation to make all tests pass.
   Run `{{TEST_COMMAND}}` to confirm. Do not add anything beyond what the tests require.
3. **REFACTOR** — If the code can be simplified without changing behavior, do it.
   Run `{{TEST_COMMAND}}` to confirm they still pass. Skip if no cleanup is needed.

## Rules

- Run `{{TEST_COMMAND}}` after EVERY phase (RED, GREEN, REFACTOR).
- Do not modify files outside the scope of this task.
- If you encounter a blocker that prevents completion, describe it clearly in
  your final output instead of guessing.
