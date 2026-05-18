---
name: engram-gods
description: Surface the most-important entities in a repo — the classes, functions, files that anchor everything else. Auto-fires on onboarding and "where do I start" questions to bootstrap repo understanding in seconds.
license: Apache-2.0
requires: engramx>=4.0.0
version: 0.2.0
---

# engram-gods

Read this when the user is onboarding to a repo or asks "where do I start" / "what's important here". The skill shells `engramx gods` and returns the top N entities by an importance score that combines query frequency, co-change density, and centrality in the call graph.

It is the **fastest way to bootstrap repo understanding** without reading 50 files. Engram answers "the agent's question: what should I look at first?" in 5-10 entities.

## Layer 1 — Control Dials

Three parameters control every invocation.

| Dial | Default | Scale |
|------|---------|-------|
| **Count** | 10 | How many entities to surface. 1 = the single most important entity. 5 = the executive summary. 10 = the working set. 25 = full inventory. |
| **Scope** | repo | 1 = single file (entities defined in or imported by that file). 4-7 = repo. 8-10 = repo + indexed dependencies. |
| **Kind filter** | all | "all" returns mixed entity kinds. "class" / "function" / "file" / "module" / "decision" restricts to one kind. Use when the user asks "what are the main classes" specifically. |

**Override rules:** Count → 5 when the user says "give me the top few". Scope → file when the user names a file explicitly. Kind filter → match user's noun ("classes", "modules", "decisions" → corresponding kind).

## Layer 2 — Core Principles

1. **Centrality is the signal.** A function called by 30 other functions is more important to understand first than a leaf-level helper, even if both have the same line count. The importance score uses graph degree as a primary input.
2. **Recency tempers age.** A central function untouched in 18 months is still important but less actionable than one touched last week. The score decays old entities by ~50% over 90 days.
3. **No artificial inflation.** A test file with many imports isn't "important" in the sense the user means. The score excludes test paths from the importance pool by default (override with `--include-tests`).
4. **Mixed kinds are normal.** Returning a class, a function, a config file, and a decision in the same top-10 is correct — that's the actual top of the repo. Don't artificially force one kind unless the user asks for one.
5. **Fail open.** Empty graph or missing engramx returns nothing silently. The agent falls back to `ls src/` and `Read package.json` — the human-default path.

## Layer 3 — Decision Tree

```
What's the user asking?
├── "where do I start" / "what's important here"   → engramx gods -p . --count 10
├── "what are the main <noun>s" (named kind)
│   ├── classes      → engramx gods -p . --count 10 --kind class
│   ├── functions    → engramx gods -p . --count 10 --kind function
│   ├── modules      → engramx gods -p . --count 10 --kind module
│   └── decisions    → engramx gods -p . --count 10 --kind decision
├── "what's in this <file/module>"
│   └──                                              engramx gods -p . --scope <path> --count 5
├── "give me the executive summary"
│   └──                                              engramx gods -p . --count 5
└── "show me the full inventory"
    └──                                              engramx gods -p . --count 25
```

**Additional reads by need:**
- Need the importance scoring breakdown? → `references/importance-score.md`
- Need the output format spec? → `references/output-format.md`
- Need trigger pattern detail? → `references/trigger-patterns.md`
- Wondering why a key file didn't make the list? → `references/anti-patterns.md`

## Layer 4 — Onboarding Variants

The same data shape, different question framing.

| Variant | Invocation | When to use |
|---------|-----------|-------------|
| **Top entities (default)** | `engramx gods -p .` | Repo onboarding, "where do I start" |
| **Module-scoped** | `engramx gods -p . --scope src/auth/` | New to a specific area within a known repo |
| **Kind-filtered** | `engramx gods -p . --kind class` | Pedagogical questions ("what classes anchor this codebase") |
| **Full inventory** | `engramx gods -p . --count 25` | Code audits, refactor planning, dependency review |

## Layer 5 — Custom Onboarding Brief

For deeper onboarding (a new engineer joining the project, a documentation pass), generate an `ONBOARDING.md` spec:

```
target_audience:   junior | senior | non-engineering
focus:             architecture | data-flow | testing | deployment
depth:             5 | 10 | 25 entities
include_decisions: true | false  (surfaces ADRs / decision nodes)
```

Then map to a sequence: `gods --count <depth> --kind decision` (for context) + `gods --count <depth>` (for code) + agent narrative wrapper. The skill itself only handles the engramx invocation; the narrative is the agent's job.

## Layer 7 — Quality Gate

Before claiming the gods list is useful, verify ALL of these.

| Check | Fail criterion |
|-------|---------------|
| Top result has a clear summary | Top entity returned with empty `label` or `summary` field |
| No test files in default top-10 | A `*.test.ts` / `*.spec.js` / `__tests__/*` entity appears without `--include-tests` |
| Importance reflects graph degree | A leaf-level helper outranks a 30-caller central function |
| Kind diversity in default top-10 | All 10 entities are the same kind (when user didn't filter) |
| Mixed-kind ordering is by importance, not kind | Classes always first, then functions — should be interleaved by score |
| Scope filter actually constrains | `--scope src/auth/` returns entities defined outside src/auth/ |
| Decisions surface when present | Repo has decision-kind nodes but `--kind decision` returns zero |

If any check fails, the list is suspect — check whether the graph has been refreshed (`engramx init --incremental`) and whether the scoring weights match the user's intuition for what "important" means in this codebase.

## See also

- `references/importance-score.md` — the math behind which entities surface
- `references/output-format.md` — token-efficient summary shape
- `references/trigger-patterns.md` — when to auto-fire vs ask first
- `references/anti-patterns.md` — what makes a gods list misleading

## Privacy

Local SQLite, zero egress. Same posture as the rest of engram-skill-pack.

## Cross-IDE parity

Same engramx invocation underneath all three IDE wrappers (Claude Code, Continue.dev, VS Code). The "gods" list is a single point of truth — install engramx once, surface the top entities from any agent.
