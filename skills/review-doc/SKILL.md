---
name: review-doc
description: "Structured document review and quality improvement. Use when the user asks to review, proofread, check, audit, or improve a document (Markdown, text, or any prose file). Triggers include: 'review this doc', 'check this document', 'proofread', 'audit this spec', 'review and fix', or any request to find and fix issues in written documents. Supports reviewing against referenced standards (PRD, design docs, style guides)."
argument-hint: "[file-path]"
allowed-tools: Read, Edit, Task, Grep, Glob
---

# Document Review

## Workflow

1. **Read target document** — Read the ENTIRE file at `$ARGUMENTS` in one pass. Note total line count.
2. **Read referenced documents** — Scan for mentions of PRDs, design docs, specs, or style guides. Read each one for context. If none found, proceed without.
3. **Spawn review sub-agent** — Use Task tool (subagent_type: "general-purpose"). Pass full document content and all referenced context. Instruct the sub-agent to:
   - Check correctness, structure, completeness, clarity, and grammar
   - Categorize each issue as Critical / Important / Minor
   - Return a markdown table: `Severity | Line | Category | Issue | Fix`
   - Sort by severity (Critical first), then line number
4. **Apply fixes** — Apply ALL fixes in one pass using Edit tool.
5. **Verify** — Re-read the document. If new issues remain, do ONE more fix pass maximum.
6. **Report** — Output summary to the user using the format below.

## Output Format

```
## Document Review: [filename]

### Issues Found
| Severity | Line | Category | Issue | Fix Applied |
|----------|------|----------|-------|-------------|
| Critical | 42   | Correctness | Wrong endpoint URL | ✅ |

### Summary
- Critical: N found, N fixed
- Important: N found, N fixed
- Minor: N found, N fixed
- Passes: 1 | Status: ✅ Complete
```

## Edge Cases

- **>1000 lines**: Read in 500-line chunks, complete full read before review.
- **No issues found**: Report clean result — do not invent issues.
- **User specifies focus area**: Prioritize that area but still do a full review pass.
- **File not found or unreadable**: Report error to user and terminate — do not proceed with review.
- **Sub-agent failure**: Fall back to reviewing directly in main session without spawning sub-agent.
- **Referenced document unreadable**: Log a warning in the report and continue review without that reference.
