# Output format

`engramx gods` returns a compact ranked list. Each entry is two lines — header + summary — to fit many entities in a small token budget. The list is the "executive summary" of the repo, not the full detail.

## Default format

```
[engram:gods] top N entities for <project name> (rank order)

  ★ <id> — <kind> · <sourceFile>   (importance: 0.94)
    <one-line summary>
    ↳ degree: <in> in / <out> out

  ★ <id> — <kind> · <sourceFile>   (importance: 0.91)
    <one-line summary>
    ↳ degree: <in> in / <out> out

  ...

  Total entities considered: M
  Top score: 0.94 | Bottom score in list: 0.62
```

Key invariants:

- `★` marker for each entry — different from `engram-query`'s numbered list to signal "these are the anchors, not search hits."
- `<id>` is the engramx stable ID, useful for follow-up `engramx query <id> --depth 2` to see neighbors.
- `<kind>` is one of: `file`, `class`, `function`, `method`, `module`, `interface`, `type`, `decision`, `concept`, `pattern`.
- `<sourceFile>` is project-relative, never absolute.
- `(importance: <score>)` shown to 2 decimal places. Helps the agent gauge whether the list is mostly top-tier (all > 0.8) or includes lower-confidence entries (some < 0.5).
- `↳ degree: N in / M out` shows graph connectivity. Inbound = "called by N other entities." Outbound = "calls M other entities." Together they signal centrality at a glance.

## Token budget

A typical entry is ~50 tokens. For count=10 default:

```
overhead (header + footer)       = ~50 tokens
per-entity (header + summary + degree) = ~50 tokens × 10
                                 = ~500 tokens
total                            ~550 tokens
```

The full executive summary lands at under 600 tokens — fits anywhere in the agent's context with room.

## `--scope <path>` format

When scoped to a file or directory, the header reflects the scope:

```
[engram:gods] top 5 entities in src/auth/ (rank order, scope-filtered)

  ★ ...
```

This signals to the agent: "these are the local anchors, not the repo-wide anchors."

## `--kind <kind>` format

When kind-filtered, the header reflects the kind:

```
[engram:gods] top 10 classes in <project name> (rank order)

  ★ ...
```

The agent can pattern-match on the header to know the result is one-kind, useful for downstream filtering or display.

## ADR-included variant

When the repo has `decision` nodes (typically from `engramx learn-adr` in v4.2+), the default top-10 may include 1-2 decision entries:

```
  ★ adr_001_use_react_query — decision · docs/adr/001-react-query.md   (importance: 0.88)
    Replaced custom data-fetching with React Query for staleness handling.
    ↳ degree: 6 in / 0 out  (cited by 6 implementation files)
```

Decisions don't have outbound edges in the same sense as code (they don't "call" anything), so their `out` count is usually 0. The `in` count reflects "how many files reference this decision in their commit messages or code comments."

## JSON output (`--format json`)

For programmatic consumers:

```json
{
  "project": "...",
  "count_requested": 10,
  "entities": [
    {
      "id": "...",
      "kind": "function",
      "source_file": "...",
      "importance": 0.94,
      "summary": "...",
      "degree_in": 12,
      "degree_out": 3
    }
  ],
  "total_considered": 487,
  "score_range": [0.62, 0.94]
}
```

The agent gets plain text; JSON is for downstream tooling.

## When there are fewer than `--count` entities

Small repos may have fewer indexable entities than the count requested. The output shows what's available:

```
[engram:gods] top 4 entities for <project name> (rank order)

  ★ ...
  ★ ...
  ★ ...
  ★ ...

  Note: requested 10 but only 4 entities meet the EXTRACTED-confidence + non-test threshold.
```

The note line is important — it tells the agent "I'm not hiding the rest; the rest doesn't exist." Avoids spurious follow-up queries.
