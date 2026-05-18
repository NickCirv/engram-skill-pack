# Query ranking

How engramx scores entity relevance when you ask `engramx query "X"`. Understanding the score is the difference between a 5-result query that's perfect and a 5-result query where the actual answer is at position 47.

## The score formula (engramx v4.0)

For each candidate entity in the graph, engramx computes:

```
score = 0.45 * text_match
      + 0.20 * query_count_weight
      + 0.15 * recency_weight
      + 0.10 * co_change_density
      + 0.10 * confidence_weight
```

| Term | What it measures | Why this weight |
|------|------------------|-----------------|
| `text_match` | Token overlap between query and entity label/sourceFile. BM25-style with field boosts. | 0.45 — the literal question dominates. A query for "useReducer" should not rank a regex helper at top, even if regex is hot. |
| `query_count_weight` | Log-scaled count of past lookups for this entity. Entities you query often get a small boost. | 0.20 — your past attention is signal, not certainty. Avoids dominance loops. |
| `recency_weight` | Decay-curve over `lastVerified`. Edits in the last week get full weight; >90 days back gets 0.5×. | 0.15 — modern code is more likely the relevant answer; legacy entities lose ground. |
| `co_change_density` | Number of files this entity co-changes with on average, normalized. High-density = central. | 0.10 — central modules surface for "architecture" queries. |
| `confidence_weight` | EXTRACTED=1.0, INFERRED=0.7, AMBIGUOUS=0.4. From the AST miner's confidence label. | 0.10 — INFERRED entities (e.g. tree-sitter fallbacks on unsupported languages) shouldn't outrank EXTRACTED ones in close ties. |

## Tiebreakers (when scores are within 0.05)

1. **Recency** wins — newer `lastVerified` first.
2. **EXTRACTED** beats **INFERRED** beats **AMBIGUOUS**.
3. **Smaller file** wins (smaller `sourceFile` length, tracking the heuristic that smaller files are more focused).
4. Alphabetical id (deterministic for snapshot tests).

## What this means for crafting queries

| User query | What ranks high | Avoid by |
|-----------|----------------|----------|
| "useReducer" | useReducer-using components in active code | Don't add "hook" / "react" — too generic, dilutes text_match. |
| "auth middleware" | files in src/auth/ with co-change density to user.ts | If you mean a specific function, name it: "validateToken middleware". |
| "what calls handleSubmit" | Caller files via `--depth 2` graph walk | Without `--depth 2`, only the definition itself; add depth flag. |
| "explain the architecture" | High-importance entities + their immediate neighbors | Use `--budget 5000` to get the broader subgraph; 2000 is too tight. |
| "recent changes" | Files touched in last 7 days, by edit count | Ranking falls back to `lastVerified` since text-match is weak. |

## Common failure modes

1. **Too-specific text match returns 0 results** — query has a typo or uses a name that doesn't appear in any entity label. Try the looser concept: "auth" instead of "AuthValidatorImpl".

2. **Too-generic query returns noise** — "function" matches everything. Add a domain qualifier: "form validation function".

3. **Recency too aggressive on slow-moving repos** — repos that haven't been touched in 60+ days will score everything below 0.5 recency. The text_match still wins, but ties get arbitrary. Acceptable — these repos rarely have ambiguous queries.

4. **Co-change density spikes for refactors** — a big refactor changes 50 files in one commit, briefly inflating their co-change scores. The decay handles this within ~30 days as the refactor commit ages out of the rolling window.

## How the v9 schema affects ranking

The bi-temporal fields (`then_believed`, `truth_now`) are NOT used in the query ranker. They're only surfaced when the kind is `mistake` and the surface is the mistake-guard hook or `engramx mistakes` CLI. A `query` invocation returns mistakes alongside other entities (if relevant), but their scoring uses the same five terms above.

The `validUntil` field IS used — entities whose `validUntil` has passed are filtered out before scoring. This prevents refactored-away modules from polluting query results.
