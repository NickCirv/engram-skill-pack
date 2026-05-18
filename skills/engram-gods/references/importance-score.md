# Importance score

How engramx ranks entities for `engramx gods`. Understanding the score is how you know whether the top-10 list reflects your repo's actual structure or some quirk of the indexing.

## The score formula (engramx v4.0)

For each candidate entity in the graph:

```
importance = 0.40 * graph_degree_weight
           + 0.25 * query_count_weight
           + 0.20 * co_change_density
           + 0.10 * recency_weight
           + 0.05 * confidence_weight
```

| Term | What it measures | Why this weight |
|------|------------------|-----------------|
| `graph_degree_weight` | Log-scaled count of inbound + outbound edges. A function called by 30 others outranks one called by 3. | 0.40 — centrality IS importance. The whole point of the gods list is "what holds the codebase together." |
| `query_count_weight` | How often this entity has been looked up via `engramx query` or context provider. Your past attention is data. | 0.25 — high frequency means high relevance, but not certainty. |
| `co_change_density` | Average files this entity co-changes with per commit. High = central; commits touching this also touch many others. | 0.20 — git-validated centrality. Cross-checks the degree-based signal. |
| `recency_weight` | Decay curve over `lastVerified`. Touched in the last 30 days = full weight; > 90 days = 0.5×. | 0.10 — modern code matters more for onboarding. Old central modules still surface but lose ground. |
| `confidence_weight` | EXTRACTED=1.0, INFERRED=0.7, AMBIGUOUS=0.4. | 0.05 — small bias against tree-sitter fallback nodes in close ties. |

## What this means for the top-10

In a typical mid-sized TypeScript repo (~500-2000 files), the top-10 by default surfaces:

- 2-3 high-traffic services or controllers (high graph_degree, central in the call graph)
- 2-3 shared utility modules imported by many files (high degree + co-change density)
- 1-2 config files (high query_count — you keep looking up the config)
- 1-2 type definition files for core domain (high degree via type imports)
- 0-1 ADR / decision nodes if the repo has any

If your top-10 surfaces only one kind (e.g. 10 utility files), the graph is shallow — try `engram init --with-skills` to bring in the skills/agents/plugins layer.

## Test-file exclusion

By default, files matching `*.test.*`, `*.spec.*`, `__tests__/*`, `tests/**` are excluded from the importance pool. They're useful for understanding behavior but rarely the right "where do I start" answer. Override with `engramx gods --include-tests`.

## Tiebreakers (when scores within 0.05)

1. **Higher graph_degree** wins (more callers/callees in the immediate neighborhood).
2. **More recent `lastVerified`** wins.
3. **EXTRACTED** beats **INFERRED** beats **AMBIGUOUS**.
4. Alphabetical id (deterministic for snapshot tests).

## Common surprises

1. **Your `index.ts` doesn't rank high.** Often `index.ts` files just re-export — low graph degree internally even if the project's entry point is conceptually there. The actual top entities are usually the modules `index.ts` re-exports from.

2. **Test setup files rank high if `--include-tests`.** A shared `setupTests.ts` is imported by every test file → very high graph degree. Real but not informative for onboarding. The default exclusion is for a reason.

3. **README / config files don't rank.** They're not AST entities — they're files outside the parsed graph. To surface them, the agent should `Read` them after `engram-gods` returns, not expect them in the list.

4. **A 5K-line monolith ranks below a 300-line shared utility.** Centrality > size. The monolith might be high-traffic but if no one imports from it (it's all internal logic), its graph_degree is low. The utility imported by 50 files outranks.

5. **A decision node outranks code.** ADRs / decision-kind nodes get inflated query_count from the context provider surfacing them PreToolUse. This is correct — architectural decisions ARE more important to read first than implementation details. Use `--kind decision` to filter to them.

## How `--kind` interacts with the score

`engramx gods --kind class --count 10` doesn't return "the top-10 entities, then filter to classes." It returns "the top-10 CLASSES by the importance score, with the same weights applied." A class ranked #47 overall may be the #3 most important class.

This is correct semantically — the user asked for the top classes, not "of the top-10 things, the classes." But it means you'll see different entities depending on filter usage. That's intentional.

## How freshness affects the list

If the graph hasn't been re-indexed in 30+ days, the recency_weight decays old entities — but new entities (added since the last index) aren't in the graph at all. The gods list can lag reality.

Refresh with `engramx init --incremental` (mtime-based, fast on repos with few changes). The auto-refresh hook (installed via `engram hooks install`) rebuilds on every git commit, keeping the graph current with zero manual effort.
