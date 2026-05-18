# Output format

`engramx query` returns a token-efficient summary block. Every line carries information; no decorative whitespace. The format is designed for Claude's context window — what fits in 2 KB returns 5-15 entities with their relationships.

## Default block shape

```
[engram:query] N entities for "<original question>" (budget B used)

  1. <id> — <kind> · <sourceFile>
     <one-line summary if present>
     ↳ calls: <id1>, <id2>, <id3>
     ↳ called_by: <id4>

  2. <id> — <kind> · <sourceFile>
     <one-line summary>
     ↳ defined_in: <module>

  ...
```

Key invariants:

- Index numbers are **1-based**, not 0-based (matches CLI conventions).
- `<id>` is the engramx stable ID (e.g. `usereducer_form`), useful for follow-up queries.
- `<kind>` is one of: `file`, `class`, `function`, `method`, `interface`, `type`, `variable`, `import`, `module`, `decision`, `pattern`, `concept`. Mistakes are returned via `engramx mistakes`, not `query`.
- `<sourceFile>` is project-relative — never absolute.
- The `↳` arrow indicates an edge. Edge label is the relation kind from the graph schema.
- Edges shown per result are capped by depth: depth 1 = no edges, depth 2 = direct edges, depth 3 = 2-hop.

## Token budget math

A typical line is ~60 tokens (mixed text + identifier). The output formula:

```
overhead (header + footer)        = ~50 tokens
per-entity base (id + kind + path) = ~30 tokens
per-entity summary (if present)   = ~40 tokens
per-edge group (↳ ... )           = ~20 tokens per direction
```

So a 5-entity result with depth-2 (each entity has ~2-3 edges) lands at roughly:
- 50 overhead
- + 5 × (30 + 40) = 350 for entities
- + 5 × 2 × 20 = 200 for edges
- = **~600 tokens total**

That comfortably fits the default 2 KB budget with room for 10-15 entities or deeper neighborhoods.

## Architecture-overview variant

When the query is "architecture" / "explain the structure" / "overview", the format changes:

```
[engram:query] architecture overview (top N entities by importance)

  ▶ <id> (importance: 0.94) — <kind> · <sourceFile>
    <summary>

  ▶ <id> (importance: 0.91) — <kind> · <sourceFile>
    <summary>

  Key edges:
    <idA> → calls → <idB>
    <idA> → calls → <idC>
    <idC> → defined_in → <module>
```

Importance is the same score used by `engramx gods` — it surfaces entities with high query_count + high co-change density. The edges section is rendered after the entity list (not interleaved) so the agent can pattern-match the structure separately from the entities.

## Zero-result format

When the query returns nothing:

```
[engram:query] no entities matched "<original question>"
  Try a broader pattern, or check that `engram init` has been run.
```

Note: the skill never invents entities. A zero-result response is honest. The agent should fall back to `Grep` or `Read` if it needs to keep looking.

## JSON output (`--format json`)

For programmatic consumers (the benchmark page, MCP tools), `engramx query --format json` emits:

```json
{
  "query": "...",
  "budget_used": 1842,
  "budget_max": 2000,
  "results": [
    {
      "id": "...",
      "kind": "function",
      "source_file": "...",
      "summary": "...",
      "score": 0.87,
      "edges": [
        { "relation": "calls", "target": "...", "direction": "out" },
        { "relation": "called_by", "target": "...", "direction": "in" }
      ]
    }
  ]
}
```

The skill itself never asks for JSON — the agent gets the plain-text shape. JSON is for downstream tooling.

## Ranking signals shown when `--explain`

For debugging / introspection: `engramx query "X" --explain` adds a `→ score: <total>` line per entity showing the breakdown:

```
  1. usereducer_form — function · src/forms/useForm.tsx
     → score: 0.78 (text=0.42 query=0.16 recency=0.10 co_change=0.06 confidence=0.04)
```

The agent does NOT see `--explain` output by default — it's manual-debug territory.
