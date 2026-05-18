# Evaluation

Five measurable dimensions for whether `engram-query` is working in your repo. Each with 0/2/4 anchors so you can score and improve.

## 1. Token efficiency vs Grep + Read baseline

Same question, two paths: (a) `engram-query` returns surfaced entities, agent Reads the top 3; (b) `Grep` returns line matches, agent Reads the matching files. Total tokens consumed end-to-end.

| Score | Anchor |
|-------|--------|
| 0 | Query path uses MORE tokens than Grep + Read because the graph is stale or the question doesn't fit the AST shape. |
| 2 | Query path saves 30-50% over Grep + Read on focused questions, breaks even on broad ones. |
| 4 | Query path saves 70%+ over Grep + Read on focused questions, saves at least 30% on broad ones. Architecture queries net 5-10× savings. |

Measure: instrument 10 representative questions, run both paths, sum tokens, compare.

## 2. Answer precision

Of the entities returned, what fraction are actually relevant to the user's question?

| Score | Anchor |
|-------|--------|
| 0 | Less than 30% of returned entities are relevant. Ranking is broken or query is too generic. |
| 2 | 50-70% relevant. Top result is usually right; bottom of list has noise. |
| 4 | 80%+ relevant. The agent reads top 3 and is confident the answer is in there. |

Measure: for 10 questions, manually flag each returned entity as relevant or noise. Average across questions.

## 3. Architecture-query usefulness

When the user asks "explain the architecture", does the result actually help Claude answer the next question?

| Score | Anchor |
|-------|--------|
| 0 | Architecture variant returns the same flat list of recently-touched files as the default variant. No prioritization signal. |
| 2 | Returns the top entities but no edge information. Agent has to do follow-up queries for relationships. |
| 4 | Returns top entities by importance + their key edges, in one budgeted call. Agent reads the result and can answer architectural questions without follow-up. |

Measure: ask 5 architecture questions, see how many follow-up queries the agent needs to issue.

## 4. Graph freshness vs repo state

How often does the graph go stale, and how does the skill behave when it does?

| Score | Anchor |
|-------|--------|
| 0 | Graph stale > 2 weeks. Query results full of refactored-away entities. `validUntil` filter not catching them. |
| 2 | Graph refreshed weekly. Some stale entities present but the `validUntil` filter catches most. |
| 4 | Graph auto-refreshed on git commit (via `engram hooks install`). Queries always reflect current code. |

Measure: `engramx db status` reports the last index time. If older than 7 days and the repo has activity, that's a configuration gap.

## 5. Reliability under edge cases

Does the skill fail gracefully on unusual inputs?

| Score | Anchor |
|-------|--------|
| 0 | Query throws or hangs on empty repo, missing graph.db, malformed query string. Blocks the conversation. |
| 2 | Returns "no entities matched" silently on edge cases. User has no signal that the query path is broken. |
| 4 | Returns "no entities matched" with a helpful next-step hint, AND emits stderr telemetry on actual errors (graph corruption, IO timeout) so operators can diagnose. |

Measure: deliberately break the graph (rename graph.db), run 5 queries, observe behavior.

## Scoring

- **Total 17+**: Skill is delivering on its token-efficiency promise. Mention it in launch material.
- **Total 12-16**: Acceptable; file specific improvements for the low-scoring dimensions.
- **Total < 12**: Configuration issue or bug. Check `engramx db status`, run `engramx init --incremental`, verify the query examples produce expected results.

## Continuous evaluation

The `engramx cost --watch` subcommand surfaces per-skill token usage in real time. For engram-query specifically:

```
$ engramx cost --watch --filter engram-query
[engram:query] 32 invocations today
  avg budget used: 1842 tokens (target: 2000)
  zero-result rate: 6% (target: <15%)
  follow-up Read rate: 78% (target: 60-80% — high enough that queries are useful, low enough that the budget isn't too tight)
```

If the zero-result rate climbs above 25%, either the graph is stale or the trigger patterns are firing on non-structural questions. Investigate before users hit the friction.
