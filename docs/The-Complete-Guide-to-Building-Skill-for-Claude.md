# The Complete Guide to Building Skills for Claude

## Introduction

A **Skill** is a set of instructions packaged as a simple folder that teaches Claude how to handle specific tasks or workflows. Skills are one of the most powerful ways to customize Claude — instead of re-explaining your preferences, processes, and domain expertise every conversation, you teach Claude once and benefit consistently.

Skills work well for repeatable workflows: generating frontend designs from specs, conducting research with a consistent methodology, creating documentation that follows your team's style guide, or orchestrating multi-step processes. They pair naturally with Claude's built-in capabilities like code execution and document creation. For developers building MCP integrations, Skills are a powerful layer that transforms raw tool access into reliable, optimized workflows.

### What This Guide Covers

- Technical requirements and best practices for Skill structure
- Patterns for standalone Skills and MCP-enhanced workflows
- Patterns that work across different use cases
- How to test, iterate, and distribute your Skills

### Who This Is For

- Developers who want Claude to follow specific workflows consistently
- Power users who want Claude to follow specific workflows
- Teams who want to standardize how Claude is used across their organization

### Two Paths

- **Building standalone Skills**: Focus on "Foundations", "Planning & Design", and Categories 1-2
- **Enhancing MCP integrations**: Focus on the "Skills + MCP" section and Category 3

---

## Chapter 1: Foundations

### What Is a Skill?

A Skill is a folder containing:

- **`SKILL.md`** (required): A Markdown instruction file with YAML frontmatter
- **`scripts/`** (optional): Executable code (Python, Bash, etc.)
- **`references/`** (optional): Documentation loaded on demand
- **`assets/`** (optional): Templates, fonts, icons used in outputs

### Core Design Principles

#### Progressive Disclosure

Skills use a three-tier system:

| Tier | Vehicle | Description |
|------|---------|-------------|
| **Tier 1** | YAML frontmatter | Always loaded into Claude's system prompt. Provides just enough information for Claude to know when to use the Skill without loading everything into context. |
| **Tier 2** | SKILL.md body | Loaded when Claude determines the Skill is relevant to the current task. Contains full instructions and guidance. |
| **Tier 3** | Linked files | Additional files in the Skill directory that Claude navigates and discovers only when needed. |

This progressive disclosure minimizes token usage while maintaining specialized capabilities.

#### Composability

Claude can load multiple Skills simultaneously. Your Skill should work well alongside others — don't assume it's the only capability available.

#### Portability

Skills work identically across Claude.ai, Claude Code, and the API. Create once, use across all platforms, as long as the environment supports the Skill's required dependencies.

### Skills + MCP Connectors

> Building a standalone Skill that doesn't involve MCP? Skip this section.

If you already have a working MCP server, the hard part is done. Skills are the knowledge layer built on top — capturing workflows and best practices you already know so Claude can apply them consistently.

**Kitchen Analogy:**

- **MCP provides the professional kitchen**: Access to tools, ingredients, and equipment
- **Skills provide the recipes**: Step-by-step instructions for creating valuable outcomes

**How They Work Together:**

| MCP (Connectivity) | Skills (Knowledge) |
|--------------------|-------------------|
| Connects Claude to your services (Notion, Asana, Linear, etc.) | Teaches Claude how to use your services effectively |
| Provides real-time data access and tool calls | Captures workflows and best practices |
| What Claude **can do** | What Claude **should do** |

**Problems Without Skills:**

- Users connect MCP but don't know what to do next
- Support tickets asking "how do I do X with your integration"
- Every conversation starts from scratch
- Inconsistent results due to varying user prompts
- Users blame the connector when the real issue is missing workflow guidance

**With Skills:**

- Pre-built workflows activate automatically when needed
- Consistent, reliable tool usage
- Best practices embedded in every interaction
- Reduced learning curve for your integration

---

## Chapter 2: Planning & Design

### Start with Use Cases

Before writing any code, identify 2-3 specific use cases.

**Good Use Case Definition Example:**

```
Use Case: Project Sprint Planning
Trigger: User says "help me plan this sprint" or "create sprint tasks"
Steps:
  1. Fetch current project status from Linear (via MCP)
  2. Analyze team velocity and capacity
  3. Suggest task prioritization
  4. Create tasks in Linear with proper labels and estimates
Result: Fully planned sprint with tasks created
```

**Ask Yourself:**

- What does the user want to accomplish?
- What multi-step workflows does this require?
- What tools are needed (built-in or MCP)?
- What domain knowledge or best practices should be embedded?

### Common Skill Use Case Categories

#### Category 1: Document and Asset Creation

**Purpose:** Create consistent, high-quality outputs including documents, presentations, apps, designs, code, etc.

**Real Example:** `frontend-design` skill

**Key Techniques:**
- Embedded style guides and brand standards
- Template structures for consistent output
- Quality check checklists before completion
- No external tools needed — uses Claude's built-in capabilities

#### Category 2: Workflow Automation

**Purpose:** Multi-step processes that benefit from a consistent methodology, including coordination across multiple MCP servers.

**Real Example:** `skill-creator` skill

**Key Techniques:**
- Step-by-step workflows with validation gates
- Templates for common structures
- Built-in review and improvement suggestions
- Iterative refinement loops

#### Category 3: MCP Enhancement

**Purpose:** Workflow guidance that enhances the tool access provided by MCP servers.

**Real Example:** `sentry-code-review` skill (from Sentry)

**Key Techniques:**
- Orchestrating multiple MCP calls in sequence
- Embedding domain expertise
- Providing context the user would otherwise need to specify
- Error handling for common MCP issues

### Defining Success Criteria

#### Quantitative Metrics

- **Skill triggers on 90% of relevant queries**
  - How to measure: Run 10-20 test queries that should trigger the Skill, track auto-load vs. requiring explicit invocation
- **Workflow completes in X tool calls**
  - How to measure: Compare the same task with and without the Skill enabled, count tool calls and total token consumption
- **0 failed API calls per workflow**
  - How to measure: Monitor MCP server logs during test runs, track retry rates and error codes

#### Qualitative Metrics

- Users don't need to prompt Claude about next steps
- Workflows complete without user correction
- Results are consistent across sessions

### Technical Requirements

#### File Structure

```
your-skill-name/
├── SKILL.md                # Required - main skill file
├── scripts/                # Optional - executable code
│   ├── process_data.py
│   └── validate.sh
├── references/             # Optional - documentation
│   ├── api-guide.md
│   └── examples/
└── assets/                 # Optional - templates, etc.
    └── report-template.md
```

#### Key Rules

**SKILL.md Naming:**
- Must be exactly `SKILL.md` (case-sensitive)
- No variants accepted (`SKILL.MD`, `skill.md`, etc.)

**Skill Folder Naming:**
- Use kebab-case: `notion-project-setup` ✅
- No spaces: `Notion Project Setup` ❌
- No underscores: `notion_project_setup` ❌
- No uppercase: `NotionProjectSetup` ❌

**Do Not Include README.md:**
- Do not include README.md inside the Skill folder
- All documentation goes in SKILL.md or `references/`
- Note: When distributing via GitHub, you still need a repository-level README for human users

### YAML Frontmatter: The Most Important Part

YAML frontmatter is how Claude decides whether to load your Skill.

#### Minimum Required Format

```yaml
---
name: your-skill-name
description: What it does. Use when user asks to [specific phrases].
---
```

#### Field Requirements

**`name` (required):**
- Kebab-case only
- No spaces or uppercase
- Should match the folder name

**`description` (required):**
- **Must include both:** what it does + when to use it (trigger conditions)
- No more than 1024 characters
- No XML tags (`<` or `>`)
- Include specific tasks the user might say
- Mention file types if relevant

**`license` (optional):** Open-source license, commonly MIT, Apache-2.0

**`compatibility` (optional):** 1-500 characters indicating environment requirements

**`metadata` (optional):** Custom key-value pairs

```yaml
metadata:
  author: ProjectHub
  version: 1.0.0
  mcp-server: projecthub
```

#### Security Restrictions

**Prohibited in frontmatter:**
- XML angle brackets (`<` `>`)
- Names containing "claude" or "anthropic" (reserved)

Reason: Frontmatter appears in Claude's system prompt — malicious content could inject instructions.

### Writing Effective Skills

#### The description Field

Structure: `[what it does] + [when to use] + [key capabilities]`

**Good Examples:**

```yaml
# Specific and actionable
description: Analyzes Figma design files and generates developer handoff documentation. Use when user uploads .fig files, asks for "design specs", "component documentation", or "design-to-code handoff".

# Includes trigger phrases
description: Manages Linear project workflows including sprint planning, task creation, and status tracking. Use when user mentions "sprint", "Linear tasks", "project planning", or asks to "create tickets".

# Clear value proposition
description: End-to-end customer onboarding workflow for PayFlow. Handles account creation, payment setup, and subscription management. Use when user says "onboard new customer", "set up subscription", or "create PayFlow account".
```

**Bad Examples:**

```yaml
# Too vague
description: Helps with projects.

# Missing trigger conditions
description: Creates sophisticated multi-page documentation systems.

# Too technical, no user trigger phrases
description: Implements the Project entity model with hierarchical relationships.
```

#### Writing Main Instructions

After frontmatter, write the actual instructions in Markdown.

**Recommended Structure Template:**

````markdown
---
name: your-skill
description: [...]
---

# Your Skill Name

## Instructions

### Step 1: [First Major Step]
Clear explanation of what happens.

Example:
```bash
python scripts/fetch_data.py --project-id PROJECT_ID
Expected output: [describe what success looks like]
```

(Add more steps as needed)

## Examples

### Example 1: [common scenario]
User says: "Set up a new marketing campaign"
Actions:
1. Fetch existing campaigns via MCP
2. Create new campaign with provided parameters
Result: Campaign created with confirmation link

## Troubleshooting

### Error: [Common error message]
**Cause:** [Why it happens]
**Solution:** [How to fix]
````

#### Instruction Best Practices

**Be specific and actionable:**

```markdown
# ✅ Good
Run `python scripts/validate.py --input {filename}` to check data format.
If validation fails, common issues include:
- Missing required fields (add them to the CSV)
- Invalid date formats (use YYYY-MM-DD)

# ❌ Bad
Validate the data before proceeding.
```

**Include error handling:**

```markdown
## Common Issues

### MCP Connection Failed
If you see "Connection refused":
1. Verify MCP server is running: Check Settings > Extensions
2. Confirm API key is valid
3. Try reconnecting: Settings > Extensions > [Your Service] > Reconnect
```

**Clearly reference bundled resources:**

```markdown
Before writing queries, consult `references/api-patterns.md` for:
- Rate limiting guidance
- Pagination patterns
- Error codes and handling
```

**Use progressive disclosure:** Keep SKILL.md focused on core instructions, move detailed documentation to `references/` and link to it.

---

## Chapter 3: Testing & Iteration

Skills can be tested at different levels of rigor as needed:

- **Manual testing in Claude.ai** — Run queries directly and observe behavior, iterate quickly with no setup
- **Scripted testing in Claude Code** — Automate test cases for repeatable validation across changes
- **Programmatic testing via the Skills API** — Build evaluation suites that run against defined test sets systematically

> **Pro Tip:** Iterate on a single task first until Claude succeeds, then extract what works into a Skill. This leverages Claude's in-context learning and gives you faster signal than broad testing.

### Recommended Testing Methods

#### 1. Trigger Testing

**Goal:** Ensure the Skill loads at the right time.

```
Should trigger:
- "Help me set up a new ProjectHub workspace"
- "I need to create a project in ProjectHub"
- "Initialize a ProjectHub project for Q4 planning"

Should NOT trigger:
- "What's the weather in San Francisco?"
- "Help me write Python code"
- "Create a spreadsheet" (unless ProjectHub skill handles sheets)
```

#### 2. Functional Testing

**Goal:** Verify the Skill produces correct outputs.

```
Test: Create project with 5 tasks
Given: Project name "Q4 Planning", 5 task descriptions
When: Skill executes workflow
Then:
  - Project created in ProjectHub
  - 5 tasks created with correct properties
  - All tasks linked to project
  - No API errors
```

#### 3. Performance Comparison

**Goal:** Prove the Skill improves outcomes.

```
Without skill:                    With skill:
- User provides instructions      - Automatic workflow execution
  each time
- 15 back-and-forth messages      - 2 clarifying questions only
- 3 failed API calls              - 0 failed API calls
- 12,000 tokens consumed          - 6,000 tokens consumed
```

### Using skill-creator

`skill-creator` is available in Claude.ai's plugin directory or in Claude Code:

- **Create Skills:** Generate from natural language descriptions, produces correctly formatted SKILL.md
- **Review Skills:** Flags common issues, identifies over/under-triggering risks, suggests test cases
- **Iterate:** Bring edge cases or failures back to skill-creator for refinement

Invoke with: `"Use the skill-creator skill to help me build a skill for [your use case]"`

### Feedback-Based Iteration

**Under-triggering signals:**
- Skill doesn't load when it should
- User manually enables it
- Solution: Add more detail and keywords to the description

**Over-triggering signals:**
- Skill loads for unrelated queries
- User disables it
- Solution: Add negative triggers, be more specific

**Execution issues:**
- Inconsistent results
- API calls fail
- Solution: Improve instructions, add error handling

---

## Chapter 4: Distribution & Sharing

### Current Distribution Model (January 2026)

**Individual Users Get Skills:**
1. Download the Skill folder
2. Zip the folder (if needed)
3. Upload via Claude.ai Settings > Capabilities > Skills
4. Or place in Claude Code skills directory

**Organization-Level Skills:**
- Admins can deploy Skills to entire workspaces (launched December 18, 2025)
- Automatic updates
- Centralized management

### Open Standard

Agent Skills has been published as an open standard. Similar to MCP, Skills should be portable across tools and platforms — the same Skill should work whether used in Claude or other AI platforms. Authors can note platform-specific capabilities in the `compatibility` field.

### Using Skills via API

- `/v1/skills` endpoint for listing and managing Skills
- Add Skills to Messages API requests via the `container.skills` parameter
- Version control and management through Claude Console
- Pair with the Claude Agent SDK for building custom Agents

**Note:** Skills in the API require the Code Execution Tool beta.

**When to use which platform:**

| Use Case | Best Platform |
|----------|--------------|
| End users using Skills directly | Claude.ai / Claude Code |
| Manual testing and iteration during development | Claude.ai / Claude Code |
| Personal ad-hoc workflows | Claude.ai / Claude Code |
| Programmatic Skill usage | API |
| Large-scale production deployment | API |
| Automated pipelines and Agent systems | API |

### Best Practices

1. **Host on GitHub** — Public repo, clear README, usage examples and screenshots
2. **Document in MCP repositories** — Link from MCP docs to Skills, explain the value of the combination
3. **Create installation guides**

### Positioning Your Skill

**Focus on outcomes, not features:**

```
# ✅ Good
"The ProjectHub skill enables teams to set up complete project
workspaces in seconds — including pages, databases, and
templates — instead of spending 30 minutes on manual setup."

# ❌ Bad
"The ProjectHub skill is a folder containing YAML frontmatter
and Markdown instructions that calls our MCP server tools."
```

---

## Chapter 5: Patterns & Troubleshooting

### Choosing an Approach: Problem-First vs. Tool-First

- **Problem-first:** "I need to set up a project workspace" → Skill orchestrates MCP calls in the correct order
- **Tool-first:** "I've connected the Notion MCP" → Skill teaches Claude best workflows and practices

### Pattern 1: Sequential Workflow Orchestration

**When to use:** Users need multi-step processes executed in a specific order.

```markdown
## Workflow: Onboard New Customer

### Step 1: Create Account
Call MCP tool: `create_customer`
Parameters: name, email, company

### Step 2: Setup Payment
Call MCP tool: `setup_payment_method`
Wait for: payment method verification

### Step 3: Create Subscription
Call MCP tool: `create_subscription`
Parameters: plan_id, customer_id (from Step 1)

### Step 4: Send Welcome Email
Call MCP tool: `send_email`
Template: welcome_email_template
```

**Key Techniques:** Explicit step ordering, inter-step dependencies, validation at each stage, failure rollback instructions

### Pattern 2: Multi-MCP Coordination

**When to use:** Workflows span multiple services.

```markdown
### Phase 1: Design Export (Figma MCP)
1. Export design assets from Figma
2. Generate design specifications
3. Create asset manifest

### Phase 2: Asset Storage (Drive MCP)
1. Create project folder in Drive
2. Upload all assets
3. Generate shareable links

### Phase 3: Task Creation (Linear MCP)
1. Create development tasks
2. Attach asset links to tasks
3. Assign to engineering team

### Phase 4: Notification (Slack MCP)
1. Post handoff summary to #engineering
2. Include asset links and task references
```

**Key Techniques:** Clear phase separation, data passing between MCPs, validation before moving to the next phase, centralized error handling

### Pattern 3: Iterative Refinement

**When to use:** Output quality improves through iteration.

```markdown
## Iterative Report Creation

### Initial Draft
1. Fetch data via MCP
2. Generate first draft report
3. Save to temporary file

### Quality Check
1. Run validation script: `scripts/check_report.py`
2. Identify issues:
   - Missing sections
   - Inconsistent formatting
   - Data validation errors

### Refinement Loop
1. Address each identified issue
2. Regenerate affected sections
3. Re-validate
4. Repeat until quality threshold met

### Finalization
1. Apply final formatting
2. Generate summary
3. Save final version
```

**Key Techniques:** Explicit quality standards, iterative improvement, validation scripts, knowing when to stop iterating

### Pattern 4: Context-Aware Tool Selection

**When to use:** Same outcome, different tools depending on context.

```markdown
## Smart File Storage

### Decision Tree
1. Check file type and size
2. Determine best storage location:
   - Large files (>10MB): Use cloud storage MCP
   - Collaborative docs: Use Notion/Docs MCP
   - Code files: Use GitHub MCP
   - Temporary files: Use local storage

### Execute Storage
Based on decision:
- Call appropriate MCP tool
- Apply service-specific metadata
- Generate access link

### Provide Context to User
Explain why that storage was chosen
```

**Key Techniques:** Clear decision criteria, fallback options, transparency of choice

### Pattern 5: Domain-Specific Intelligence

**When to use:** The Skill adds expertise beyond tool access.

```markdown
## Payment Processing with Compliance

### Before Processing (Compliance Check)
1. Fetch transaction details via MCP
2. Apply compliance rules:
   - Check sanctions lists
   - Verify jurisdiction allowances
   - Assess risk level
3. Document compliance decision

### Processing
IF compliance passed:
    - Call payment processing MCP tool
    - Apply appropriate fraud checks
    - Process transaction
ELSE:
    - Flag for review
    - Create compliance case

### Audit Trail
- Log all compliance checks
- Record processing decisions
- Generate audit report
```

**Key Techniques:** Domain expertise embedded in logic, compliance before action, comprehensive documentation, clear governance

### Troubleshooting

#### Skill Fails to Upload

| Error | Cause | Solution |
|-------|-------|----------|
| "Could not find SKILL.md in uploaded folder" | File not named exactly SKILL.md | Rename to `SKILL.md` (case-sensitive) |
| "Invalid frontmatter" | YAML formatting issue (missing delimiters, unclosed quotes) | Ensure wrapped with `---` delimiters |
| "Invalid skill name" | Name has spaces or uppercase | Use kebab-case, e.g. `my-cool-skill` |

#### Skill Doesn't Trigger

**Symptom:** Skill never auto-loads

**Fix:** Revise the description field:
- Is it too generic? ("Helps with projects" won't work)
- Does it include trigger phrases the user would actually say?
- Does it mention relevant file types?

**Debug method:** Ask Claude: "When would you use the [skill name] skill?" Claude will answer by referencing the description — adjust accordingly.

#### Skill Over-Triggers

**Solutions:**

1. **Add negative triggers:**
   ```yaml
   description: Advanced data analysis for CSV files. Use for statistical modeling, regression, clustering. Do NOT use for simple data exploration (use data-viz skill instead).
   ```

2. **Be more specific:**
   ```yaml
   # Too broad
   description: Processes documents
   # More specific
   description: Processes PDF legal documents for contract review
   ```

3. **Clarify scope:**
   ```yaml
   description: PayFlow payment processing for e-commerce. Use specifically for online payment workflows, not for general financial queries.
   ```

#### MCP Connection Issues

**Checklist:**
1. Verify MCP server is connected (Settings > Extensions)
2. Check authentication (API key valid, permissions/scopes correct, OAuth token refreshed)
3. Test MCP independently (call MCP directly, not through the Skill)
4. Verify tool names (case-sensitive, check MCP server documentation)

#### Instructions Not Being Followed

**Common causes and solutions:**

1. **Instructions too verbose** — Keep concise, use lists, move detailed references to separate files
2. **Instructions buried** — Put critical instructions at the top, use `## Important` or `## Critical` headings
3. **Vague language** — Use precise instructions instead of vague wording:
   ```markdown
   # ❌ Bad
   Make sure to validate things properly

   # ✅ Good
   CRITICAL: Before calling create_project, verify:
   - Project name is non-empty
   - At least one team member assigned
   - Start date is not in the past
   ```
4. **Model "laziness"** — Adding encouraging notes in the user prompt (not in SKILL.md) is more effective

> **Advanced Technique:** For critical validations, consider bundling scripts to execute checks programmatically rather than relying on language instructions. Code is deterministic, language interpretation is not.

#### Large Context Issues

**Symptom:** Skill responses slow down or quality degrades

**Solutions:**
1. **Optimize SKILL.md size** — Move detailed documentation to `references/`, keep SKILL.md under 5,000 words
2. **Reduce number of enabled Skills** — Evaluate if you have more than 20-50 simultaneously enabled, suggest selective enablement

---

## Chapter 6: Resources & References

### Official Documentation

- Best Practices Guide
- Skills Documentation
- API Reference
- MCP Documentation

### Blog Posts

- Introducing Agent Skills
- Engineering Blog: Equipping Agents for the Real World
- Skills Explained
- How to Create Skills for Claude
- Building Skills for Claude Code
- Improving Frontend Design through Skills

### Example Skills

- GitHub: `anthropics/skills` — Contains customizable Skills created by Anthropic
- Document Skills — PDF, DOCX, PPTX, XLSX creation
- Partner Skills Directory — Asana, Atlassian, Canva, Figma, Sentry, Zapier, etc.

### Tools

- **skill-creator skill** — Built into Claude.ai, available in Claude Code; generates Skills from descriptions, reviews and provides suggestions
- **Validation** — skill-creator can evaluate your Skill; ask: "Review this skill and suggest improvements"

### Getting Support

- Technical questions: Claude Developers Discord community forum
- Bug reports: GitHub Issues `anthropics/skills/issues` (include Skill name, error message, reproduction steps)

---

## Appendix A: Quick Checklist

### Before Starting
- [ ] Identify 2-3 specific use cases
- [ ] Identify required tools (built-in or MCP)
- [ ] Read this guide and example Skills
- [ ] Plan folder structure

### During Development
- [ ] Folder uses kebab-case naming
- [ ] `SKILL.md` file exists (exact spelling)
- [ ] YAML frontmatter has `---` delimiters
- [ ] `name` field: kebab-case, no spaces, no uppercase
- [ ] `description` includes "what it does" and "when to use"
- [ ] No XML tags (`<` `>`)
- [ ] Instructions are clear and actionable
- [ ] Error handling included
- [ ] Examples provided
- [ ] References clearly linked

### Before Upload
- [ ] Test triggering on obvious tasks
- [ ] Test triggering on rephrased requests
- [ ] Verify no triggering on unrelated topics
- [ ] Functional tests pass
- [ ] Tool integrations work (if applicable)
- [ ] Zipped as .zip file

### After Upload
- [ ] Test in real conversations
- [ ] Monitor under/over-triggering
- [ ] Collect user feedback
- [ ] Iterate on description and instructions
- [ ] Update version in metadata

---

## Appendix B: YAML Frontmatter Reference

### Required Fields

```yaml
---
name: skill-name-in-kebab-case
description: What it does and when to use it. Include specific trigger phrases.
---
```

### All Optional Fields

```yaml
name: skill-name
description: [required description]
license: MIT
allowed-tools: "Bash(python:*) Bash(npm:*) WebFetch"
metadata:
  author: Company Name
  version: 1.0.0
  mcp-server: server-name
  category: productivity
  tags: [project-management, automation]
  documentation: https://example.com/docs
  support: support@example.com
```

### Security Notes

**Allowed:** Any standard YAML types, custom metadata fields, long descriptions up to 1024 characters

**Prohibited:** XML angle brackets (`<` `>`), code execution in YAML, Skill names prefixed with "claude" or "anthropic"
