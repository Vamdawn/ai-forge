# Prompt Template Standard

Read when: adding, editing, moving, or removing a template under `prompts/`.

## Template files

- Store each manually invoked prompt or reusable rule template in one `.md` file under `prompts/`. A prompt that needs resources, automatic triggering, or versioning belongs under `skills/` ([asset-layout.md](asset-layout.md)).
- Name each template file with lowercase English words (`a`–`z`) separated by single hyphens. Keep the `.md` extension, as in `prd-implementation-plan.md`.
- Put the instructions to run in the body. For a request scoped to the template body, edit that text and preserve the frontmatter, attribution, and index entry.
- To use a rule template in another project, copy its body into that project's instruction file.

## Frontmatter

Start each prompt file with a YAML block delimited by `---`. Give each field a non-empty value on its own line and use the order below.

| Field | When to include it | Value |
| --- | --- | --- |
| `title` | Always | A recognizable template name in the prompt's language. |
| `description` | Always | One sentence in the prompt's language describing the task and the expected result. |
| `language` | Always | `zh` or `en`, matching the language of the prompt instructions. |
| `source` | Quoted or adapted templates | URL of the original publication or the credited work that inspired the template. |
| `author` | Quoted or adapted templates | Name or handle of the author or project credited by `source`. |

Include `source` and `author` together for third-party material. Omit both for an original template. Use only the fields listed above.

```yaml
---
title: PRD Implementation Plan
description: Turn a PRD into an implementation plan with verification steps.
language: en
---
```

## Checks

- `python3 scripts/verify-docs.py` checks template filenames, frontmatter fields, index coverage, and documentation links.
- Verify that the description reflects the expected output, the language matches the instructions, and the attribution identifies the cited work.
