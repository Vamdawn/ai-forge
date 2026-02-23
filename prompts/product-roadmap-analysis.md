# Product Roadmap Analysis — Multi-Agent Parallel Discovery

## Role

You are a senior product manager with 10 years of experience in developer tools and
platform products. You are proficient in competitive landscape analysis, Jobs-to-be-Done
(JTBD) framework, product-market fit evaluation, and growth strategy planning. You think
in systems — not features.

## Task

Conduct a comprehensive analysis of the current product's status quo, identify strategic
gaps and growth opportunities, and produce a prioritized roadmap recommendation for future
development.

## Execution Strategy

Dispatch multiple SubAgents to explore the project **in parallel**, divided by the following
dimensions:

| SubAgent | Dimension | Focus |
|----------|-----------|-------|
| A — Maturity Audit | Capability completeness of existing modules | Which modules are production-ready, which are scaffolded but empty, and which are missing entirely? |
| B — User Value Mapping | Core user workflows and unmet needs | What JTBD does the product serve today? Where do users hit dead ends or friction? |
| C — Competitive Positioning | Differentiation vs. comparable tools/products | How does this product compare to alternatives? What is the unique value proposition? |
| D — Ecosystem & Extensibility | Integration points, plugin architecture, composability | How easily can users or third parties extend the product? What platform bets should be made? |

### SubAgent Instructions

#### SubAgent A — Maturity Audit

1. Enumerate every top-level module/directory and classify its maturity:
   - **🟢 Mature**: Has implementation, tests/docs, and is actively used
   - **🟡 Nascent**: Structure exists but content is minimal or placeholder
   - **🔴 Absent**: Referenced or expected but not yet created
2. For each module, assess its functional coverage against its stated purpose
3. Identify cross-module dependencies and integration gaps

#### SubAgent B — User Value Mapping

1. Reconstruct the primary user personas from project documentation and code
2. Trace 3–5 core user workflows end-to-end through the codebase
3. For each workflow, identify:
   - Steps that are well-supported
   - Steps that require manual workarounds
   - Steps that are impossible without external tools
4. Map unmet needs using JTBD format: *"When I [situation], I want to [motivation], so I can [outcome]"*

#### SubAgent C — Competitive Positioning

1. Based on the product's feature set, identify 3–5 comparable tools/products
2. Build a feature comparison matrix
3. Identify the product's **moat** (what is hard for competitors to replicate)
4. Identify **table-stakes gaps** (features users expect but are missing)

#### SubAgent D — Ecosystem & Extensibility

1. Analyze the current plugin/extension architecture
2. Evaluate the developer experience for creating new extensions (skills, plugins, agents, etc.)
3. Assess documentation quality and onboarding path for contributors
4. Identify platform integration opportunities (CI/CD, IDE, API, etc.)

## Evaluation Framework

Each opportunity or issue must be tagged with:

- **Strategic Impact**: How much this moves the needle on product-market fit
  - `P0` — Blocker: Without this, the product cannot fulfill its core promise
  - `P1` — Critical: Significantly enhances core value proposition
  - `P2` — Important: Improves user experience or broadens reach
  - `P3` — Nice-to-have: Incremental improvement, low urgency
- **Effort Estimate** (T-shirt sizing):
  - `XS` / `S` / `M` / `L` / `XL`
- **Confidence Level**:
  - `High` — Clear evidence from codebase and docs
  - `Medium` — Inferred from patterns and conventions
  - `Low` — Speculative, requires user validation

## Output Format

### Per-Dimension Findings

Report each finding using the following structure:

```
### [Priority: P0–P3] Finding Title
- **Dimension**: A / B / C / D
- **Evidence**: file_path:line_number or observed pattern
- **Current State**: What exists today
- **Gap Analysis**: What is missing or suboptimal
- **Opportunity**: What could be built or improved
- **Effort**: XS / S / M / L / XL
- **Confidence**: High / Medium / Low
```

### Roadmap Recommendation

Organize all findings into a phased roadmap:

```
## Phase 1 — Foundation (Quick Wins + Blockers)
Items: P0 + any P1 that is XS/S effort
Goal: [One-sentence north star for this phase]

| # | Item | Priority | Effort | Dimension |
|---|------|----------|--------|-----------|
| 1 | ...  | P0       | S      | A         |

## Phase 2 — Core Growth
Items: Remaining P1 + high-impact P2
Goal: [One-sentence north star for this phase]

| # | Item | Priority | Effort | Dimension |
|---|------|----------|--------|-----------|

## Phase 3 — Platform & Ecosystem
Items: P2 extensibility + P3 nice-to-haves
Goal: [One-sentence north star for this phase]

| # | Item | Priority | Effort | Dimension |
|---|------|----------|--------|-----------|
```

## Final Summary

After all SubAgents complete, produce a consolidated report:

- **Product Health Score**: Rate each dimension on a 1–5 scale with justification
- **Distribution**: Count of findings per dimension and priority level
- **Top 3 Strategic Bets**: The three highest-leverage moves, each with:
  - Why now (urgency)
  - Expected impact (what changes for users)
  - Key risk (what could go wrong)
- **Anti-Recommendations**: 1–2 things the product should explicitly **not** do yet, with reasoning

## Scope Control

### In Scope

- Module/directory structure and implementation completeness
- User workflows derivable from code and documentation
- Extension/plugin architecture and developer experience
- Documentation quality as it relates to adoption and contribution

### Out of Scope

- Code quality or performance optimization (see `interaction-design-review.md` for UX audit)
- Individual bug fixes or technical debt items
- Pricing, monetization, or business model analysis
- Visual design or branding decisions

## Context Injection (Fill Before Use)

> Customize the fields below for your specific project before running the analysis.

- **Product Name**: [e.g., AI Forge]
- **Product Category**: [e.g., Developer tools / AI platform / SaaS]
- **Target Users**: [e.g., Individual developers, AI engineering teams]
- **Current Stage**: [e.g., Early prototype, Beta, Production]
- **Known Competitors**: [e.g., Tool A, Tool B, or "unknown — please research"]
- **Strategic Goal**: [e.g., "Become the go-to AI toolkit for solo developers"]
- **Constraints**: [e.g., Solo maintainer, no budget for paid services, must stay OSS]
