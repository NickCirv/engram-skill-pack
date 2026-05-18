# Trigger patterns

When `engram-query` auto-fires vs stays silent. Conservative bias — false-positive fires burn trust faster than false-negative recovers it.

## Reactive — user-message patterns

Match the user's most recent message. If any pattern below applies, auto-fire with the suggested invocation.

| Pattern | Example user message | Invocation |
|---------|---------------------|-----------|
| `where is X (defined\|declared)` | "where is parseToken defined?" | `engramx query "parseToken" --depth 1 --budget 1000` |
| `what calls X` / `callers of X` | "what calls handleSubmit?" | `engramx query "callers of handleSubmit" --depth 2` |
| `what (depends on\|uses) X` | "what uses the auth module?" | `engramx query "auth module dependents" --depth 2` |
| `explain the (architecture\|structure)` | "explain the architecture" | `engramx query "architecture overview" --budget 5000 --depth 2` |
| `show me dependencies` | "show me dependencies of paymentService" | `engramx query "dependencies of paymentService" --depth 3` |
| `entities in <file>` | "what's in src/auth/index.ts?" | `engramx query "entities in src/auth/index.ts" --depth 1` |
| `find <pattern>` | "find all React components that use useEffect" | `engramx query "React components using useEffect" --budget 5000` |

## Proactive — none (this is a reactive-only skill)

Unlike `engram-mistakes`, `engram-query` has NO PreToolUse hook. Queries are explicitly user-initiated. Auto-firing on every Edit would burn tokens for value the user didn't ask for.

That said, the engram graph IS surfaced PreToolUse via the `engram intercept` mistake-guard path. So when Claude is about to edit, it reads the bi-temporal pre-mortem — and if it wants more structural context (callers, dependencies), it can issue an explicit `engram-query` invocation.

## When NOT to fire

These look query-like but aren't structural questions. Skill stays silent:

- "what should I do here" — open-ended; user wants forward-looking advice, not codebase lookup.
- "fix this" — execution request. Use Edit/Write, not query.
- "show me the code" — wants file contents. Use Read.
- "what's the right way to do X" — wants design advice, not codebase facts.
- "anything wrong with this" — code-quality question. Different skill (lint / review).
- Questions that name no concrete identifier — "explain this" without a referent.

When in doubt, the agent asks a clarifying question before firing the query. A targeted second-turn query beats a wasted first-turn query.

## Manual override

`/engram-query <free-form question>` always fires regardless of pattern match. Useful when the user wants the structural answer but their phrasing didn't match the patterns above. The free-form arg goes directly to `engramx query` as the question string.

## Combining with other skills

| Pattern | First skill | Second skill |
|---------|-----------|-------------|
| "show me past mistakes in this file AND what calls the buggy function" | `engram-mistakes` (file-scoped) | `engram-query` (callers of returned function) |
| "what's important here and have we made mistakes" | `engram-gods` (top entities) | `engram-mistakes` (last 90d) |
| "explain the architecture and surface any landmines" | `engram-query` (architecture variant) | `engram-mistakes` (repo-wide top 5) |

The skills compose naturally because each wraps a single `engramx` subcommand with no shared state. Two invocations = two budget allocations, two structured results, no conflicts.

## Budget defaults under user phrasing

These heuristics are baked into the skill's invocation logic — adjust as needed but they reflect typical user intent.

| Phrasing signal | Budget default |
|-----------------|----------------|
| Question contains "explain" / "overview" / "architecture" | 5000 tokens |
| Question contains "where is" / "find" | 1000 tokens |
| Question contains "what calls" / "depends on" | 2500 tokens |
| Question contains a file path literal | 2000 tokens (scope to file) |
| Default | 2000 tokens |
