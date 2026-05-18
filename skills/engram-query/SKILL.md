---
name: engram-query
description: Natural-language structural queries over your repo's code graph. Replaces ad-hoc Grep with AST-aware lookups that cost a fraction of the tokens. Auto-fires on architecture/dependency questions.
license: Apache-2.0
requires: engramx>=4.0.0
version: 0.2.0
---

# engram-query

Read this when the user asks a structural question about the repo. The skill shells `engramx query "<question>"` and returns the AST-mined entities most relevant to the question — typically 5-15 files / functions / classes with their relationships, in a token budget under 2 KB.

It is the **structural-not-functional answer to "where is X" and "what does Y depend on"** for any repo with an indexed engram graph.

## Layer 1 — Control Dials

Three parameters control every invocation.

| Dial | Default | Scale |
|------|---------|-------|
| **Budget** | 2000 tokens | 1 = ~500 tokens (single result). 5 = 2 KB (typical 5-15 entities). 10 = 8 KB (full subgraph + neighbors). Higher budget = more context, faster tokens burned. |
| **Scope** | repo | 1 = single file. 4-7 = repo. 8-10 = repo + indexed dependencies (`node_modules` graphs if `with-skills` was used). |
| **Depth** | 2 | Graph traversal depth from each hit. 1 = the entity itself. 2 = the entity + immediate edges (default — answers "what calls X" cleanly). 3+ = the local neighborhood (slower, more tokens). |

**Override rules:** Budget → 5000 when the user asks "explain the architecture" (broader question, more entities needed). Depth → 1 when the user asks "where is X defined" (just want the file). Scope → file when the user asks "in this file, ..." (current file context narrows the scope).

## Layer 2 — Core Principles

1. **Structural beats functional.** `Grep "useReducer"` finds string matches across the entire repo including comments and tests. `engram query "useReducer state management"` returns the AST entities that actually use the pattern in production code, ranked by recency + co-change density. Different signal class.
2. **Token budget is a contract.** Default 2 KB means a query returns 5-15 entities with summaries, not full file content. If the agent needs the source, it issues a `Read` on the surfaced paths. Engram surfaces *which files to read*, not the file contents.
3. **No vector embedding required.** The graph is AST + git + skills + mistakes. Queries are tree-walks + co-change ranking. No nomic-embed-text, no Ollama, no Pinecone. Local SQLite is the entire database.
4. **Fail open.** A missing engramx, empty graph, or unrelated question returns zero results silently. The agent falls back to whatever it would have done without the skill. Never blocks the conversation.
5. **Recency wins ties.** When two entities tie on relevance score, the one touched more recently in git wins. The graph encodes `lastVerified` per node and uses it as the tiebreaker.

## Layer 3 — Decision Tree

```
What's the user asking?
├── "where is X defined / declared" (single entity lookup)
│   ├── X is clearly a function/class/symbol  → engramx query "X" -p . --budget 1000 --depth 1
│   └── X is a concept or pattern             → engramx query "X" -p . --budget 2000 --depth 2
├── "what calls / uses / depends on X" (graph traversal)
│   └──                                         engramx query "callers of X" -p . --depth 2
├── "explain the architecture / structure"
│   └──                                         engramx query "architecture overview" -p . --budget 5000 --depth 2
├── "what's in this file / module"
│   └──                                         engramx query "entities in <file>" -p . --depth 1
├── "show me dependencies of X"
│   └──                                         engramx query "dependencies of X" -p . --depth 3
└── Vague / open-ended question
    └── Generate a QUERY.md spec first → then invoke
```

**Additional reads by need:**
- Need the underlying ranking algorithm? → `references/query-ranking.md`
- Need the output format spec? → `references/output-format.md`
- Need trigger pattern detail? → `references/trigger-patterns.md`
- Wondering why a query returned nothing? → `references/anti-patterns.md` (zero-results section)

## Layer 4 — Query Variants

Pick by question shape. Each variant has its own ranking weights.

| Variant | Invocation | When to use |
|---------|-----------|-------------|
| **Structural** | `engramx query "X"` (default) | "where is", "what is", "find". Returns top entities by relevance + recency. |
| **Graph-walk** | `engramx query "X" --depth 3` | "what depends on", "callers of", "uses of". Returns the entity + its k-hop neighbors. |
| **Architecture overview** | `engramx query "architecture" --budget 5000` | "explain", "structure", "overview". Returns the top-importance entities (uses the same scoring as `engramx gods`) plus their key edges. |
| **File-local** | `engramx query "X" --scope <file>` | "in this file, ...". Restricts to entities defined in or imported by the specified file. |

## Layer 5 — Custom Queries

For unusual requests ("find all React components that use useEffect without a cleanup", "show me files that import lodash and changed in the last 30 days"), generate a `QUERY.md` spec first:

```
question:  <natural-language question>
scope:     repo | <file glob>
filter:    <substring or regex on label/sourceFile>
depth:     <int, default 2>
budget:    <tokens, default 2000>
```

Then map to a single `engramx query` invocation. The pack ships no new query primitives — every variation is a flag combination on the existing CLI.

## Layer 7 — Quality Gate

Before claiming the skill answered the question, verify ALL of these.

| Check | Fail criterion |
|-------|---------------|
| Output fits the budget | Returned > 1.5× the requested token budget |
| Each entity has a source ref | Any returned item with empty `sourceFile` |
| Source refs are project-relative | Absolute paths leaked (`/Users/...` instead of `src/...`) |
| Ranking reflects recency on ties | Two equally-relevant entities, the older one shown first |
| Zero-result case stays silent | An unrelated question produces noise / hallucinated entities |
| Depth respected | Query with `--depth 1` returned 3-hop neighbors |
| Architecture variant returns top entities | "explain architecture" returns leaf-level helpers instead of central modules |

If any check fails, the response isn't a high-quality answer — return to the underlying `engramx query` invocation and verify the flag values + graph contents.

## See also

- `references/query-ranking.md` — how engramx scores entity relevance
- `references/output-format.md` — token-efficient summary shape per entity
- `references/trigger-patterns.md` — the auto-fire matrix for structural questions
- `references/anti-patterns.md` — query shapes that produce zero results or noise

## Privacy

Same as the rest of engram-skill-pack: zero egress, local SQLite only. The query traverses `~/.engram/graph.db` for the current project and returns plain text to Claude's context. No network calls.

## Cross-IDE parity

Continue.dev users get the same query path via `engramx-continue`'s `@engram` provider. VS Code / Cursor users get it via the OpenVSX extension's command palette. All three surfaces hit the same `~/.engram/graph.db` and the same `engramx query` invocation underneath.
