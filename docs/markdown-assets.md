# Markdown Assets

Read when: editing a Markdown asset that carries YAML frontmatter; adding or editing a file under `prompts/`.

## Rules

1. Treat the `---` frontmatter block and the body as two separate regions: a request about the "body" keeps the metadata intact.
   - Rationale: the frontmatter carries the description, type, language, and source that make the asset findable; dropping it breaks retrieval silently.
   - Review: the file still opens with `---` and keeps the same fields, and `git diff` shows body-only changes.
2. Read scope words at their narrowest: "keep only", "just", "only the body" name the regions to change, so leave every unnamed field, index entry, and note in place.
   - Review: every deleted block in `git diff` maps to a region the request named.
3. Give every prompt YAML frontmatter with `title`, `type: prompt-template`, and `language` (`zh` or `en`, matching the language of the body).
4. Prompts taken from a third party keep `source` (the original link) and `author`, plus `article` when an article accompanies it; prompts you wrote yourself carry none of those three fields.
   - Rationale: attribution cannot be recovered once lost, and a fabricated source misleads exactly as badly.
5. `prompts/` holds single `.md` files. A prompt that needs resources, automatic triggering, or versioning is a skill instead ([asset-layout.md](asset-layout.md)).

## Anti-Patterns

- Rewriting a whole file when the request named one region → change the named region and leave the rest untouched.
- Adding frontmatter to a prompt that already has it under a different field name → keep the existing fields and add only what is missing.

## Checks

- `python3 scripts/verify-docs.py` — relative links resolve and every prompt is indexed.
- Manual: `ls prompts/` lists `.md` files only; each file's first line is `---` and the required fields close it.
