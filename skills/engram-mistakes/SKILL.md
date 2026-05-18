---
name: engram-mistakes
description: Surface bi-temporal mistakes from this repo's history — what you used to believe vs what's now true. Auto-fires before risky Edit/Write/Bash to inject past corrections into context.
license: Apache-2.0
requires: engramx>=4.0.0
version: 0.1.0
---

# engram-mistakes

Read this when about to modify code that has historical regret. The skill shells `engramx mistakes` and renders a bi-temporal block: what was believed at the time of the original change, when that belief was falsified, what the truth is now, and which pattern the lesson applies to.

It is the **fastest way to stop your agent from repeating a mistake the repo has already burned to fix.**

## Layer 1 — Control Dials

Three parameters control every invocation. Override from user request or infer from context.

| Dial | Default | Scale |
|------|---------|-------|
| **Window** | 90 days | 1 = today only. 5 = last 30d. 8 = last 90d. 10 = all-time. Older mistakes have less signal — the v9 schema's `validUntil` field auto-suppresses entries whose source code was refactored away. |
| **Mode** | reactive | 1-3 = react only to explicit user questions. 4-7 = react + PreToolUse on Edit/Write. 8-10 = react + PreToolUse on Edit/Write/Bash + deny risky operations (strict guard mode). |
| **Depth** | 5 | How many mistakes to surface per invocation. 1 = top one only. 5 = bi-temporal pre-mortem default. 20 = full audit listing. |

**Override rules:** mode → 1-3 when the file path is in `node_modules`, `dist`, `build`, `.next`, `.nuxt`, or `coverage`. Window → 5 when the user asks "lately" or "recent". Depth → 1 when the tool surface is a one-line edit and noise must stay low.

## Layer 2 — Core Principles

1. **Bi-temporal first.** Every output must distinguish `then-believed` from `truth-now`. A flat single-line "X was a mistake" is the v3.x fallback — only used when the v9 fields are absent. Never invent the bi-temporal fields; if they're not in the graph, fall back legacy.
2. **Pattern over instance.** The `applies-to` field describes the *kind* of mistake (e.g. "useReducer + async + form-event handlers"). That's what trips the next agent, not the specific commit SHA. Lead with pattern in the heading.
3. **Fail open, never silent.** A missing engramx, corrupt graph.db, or unreachable mistake record never blocks an edit. Wrap every IO in try/catch; on failure emit zero output and let the operation proceed.
4. **Proactive trumps reactive.** A `Mistake #1` warning that fires *before* Claude edits the file is worth ten warnings the user has to ask for. The PreToolUse hook does the proactive work. The CLI direct-invoke is the reactive surface for audits.
5. **Truncate, don't bury.** Surface the top `depth` entries. A 47-mistake list is noise — engram surfaces a "+42 more" indicator and trusts the user to ask for `engramx mistakes --full` if they want the dump.

## Layer 3 — Decision Tree

```
What's the trigger?
├── User question matches /have i made this|any mistakes|past attempt|did i try/i
│   ├── File context detected from current message  → engramx mistakes -p . --source <file>
│   └── No file context                              → engramx mistakes -p . --since 30d
├── PreToolUse Edit / Write
│   ├── file_path matches /(ts|tsx|js|jsx|py|rb|go|rs|java|c|cpp|cs|php)$/
│   │   ├── path NOT in node_modules|dist|build       → fire engramx intercept (mistake-guard wraps)
│   │   └── path in excluded dir                      → stay silent
│   └── file_path is docs / config / lock file        → stay silent
├── PreToolUse Bash
│   ├── command contains a known dangerous pattern    → fire engramx intercept
│   └── otherwise                                      → stay silent
└── Manual /engram-mistakes invocation                 → engramx mistakes -p . --since 90d
```

**Additional reads by need:**
- Need the visual format spec? → `references/output-format.md`
- Need bi-temporal model background? → `references/bi-temporal-model.md`
- Need trigger pattern detail? → `references/trigger-patterns.md`
- Wondering why a mistake didn't fire? → `references/anti-patterns.md` (false-negative section)

## Layer 4 — Invocation Variants

The same engramx data renders in three different surfaces. Pick by context.

| Variant | Surface | When |
|---------|---------|------|
| **CLI direct** | `engramx mistakes -p . --since 30d` | User asks reactively. Full color, full bi-temporal layout. Power-user audit. |
| **PreToolUse hook (permissive)** | injected as `additionalContext` to Claude | Default. Claude reads + adapts before producing tool output. The rave moment. |
| **PreToolUse hook (strict)** | tool call denied with bi-temporal block as reason | Opt-in via `ENGRAM_MISTAKE_GUARD=2`. For teams that want hard blocks on recurring patterns. |

The skill itself never picks the variant — it routes the user's intent to the correct engramx subcommand. The guard mode is configured separately via env var.

## Layer 5 — Custom Invocations

For non-standard requests ("show me mistakes from last sprint only", "filter to authentication-related"), generate a `MISTAKES.md` spec first:

```
target:   <file glob or repo>
window:   <since date or duration>
filter:   <substring or regex on applies-to>
format:   structured | json | plain
limit:    <int>
```

Then map to `engramx mistakes --since <window> --source <target> --format <format> --limit <limit>`. The pack ships no new mistake-extraction logic — every query is a CLI invocation.

## Layer 7 — Quality Gate

Before claiming the skill fired correctly, verify ALL of these.

| Check | Fail criterion |
|-------|---------------|
| Output renders bi-temporal layout | Any mistake with v9 fields in the graph but rendered as legacy single-line |
| Header names the pattern, not the file | Header starts with file path (e.g. `src.ts: foo`) instead of the `applies-to` value |
| `then-believed` text is preserved verbatim | Belief text mangled, truncated mid-word, or replaced with a paraphrase |
| File ref is project-relative | Absolute path leaked (e.g. `/Users/...`) instead of `src/forms/ContactForm.tsx` |
| Date format YYYY-MM-DD UTC | Locale-dependent format (`5/18/2026`, `18.05.2026`) |
| Tree characters match ┌├└─ | Box characters degraded to `+-|` outside Unicode-aware terminals |
| Output stays under depth | More entries shown than the `depth` dial allows |

If any check fails, the rendered output is not a rave-quality mistake surface — return to the underlying engramx invocation and verify the graph data shape before retry.

## See also

- `references/bi-temporal-model.md` — why "then vs now" matters more than "what failed"
- `references/output-format.md` — exact byte-level format spec for the hook layout
- `references/trigger-patterns.md` — the auto-fire decision matrix expanded with examples
- `references/anti-patterns.md` — what makes a mistake surface noise instead of signal
- `references/evaluation.md` — measurable criteria for whether the skill is working in your repo

## Privacy

engram-skill-pack ships zero egress. engramx (peer dependency) routes all graph data through local SQLite at `~/.engram/` and the per-project `<project>/.engram/`. No network calls happen during skill invocation. The pack is safe to install on a fully air-gapped workstation.

## Cross-IDE

This pack targets Claude Code Skills. Same engramx data, different surfaces:
- **Continue.dev** → `engramx-continue` npm package
- **VS Code / Cursor extension** → `nickcirv.engram-vscode` on OpenVSX
- **Other MCP clients** → `engramx-serve` (HTTP) or direct CLI

All four wrappers read the same `~/.engram/graph.db`. Install once, surface everywhere.
