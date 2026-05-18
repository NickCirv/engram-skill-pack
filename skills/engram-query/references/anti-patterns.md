# Anti-patterns

What turns `engram-query` from a useful structural lookup into noise or wasted tokens. The skill is not "answer everything" — it's "answer structurally what's structurally answerable."

## 1. Treating Grep as a substitute

Bad: agent does `Grep "useReducer" src/` first, gets 47 matches, then does `engramx query "useReducer"`.

The query should be FIRST. Grep is line-scoped string match — it returns everything including comments and tests. The query returns AST entities ranked by relevance. Different signal class; running both is double the tokens.

The agent's pattern should be: structural question → engram-query → if not specific enough → Read the surfaced files. Never Grep before query when engram is initialized.

## 2. Querying without context narrowing

Bad: `engramx query "validate"` on a 50K-file repo. Returns the top 15 entities containing "validate" anywhere — most irrelevant.

Better: scope the question. `engramx query "validate user input on signup form"`. The text-match score rewards specific phrases.

## 3. Too many small queries instead of one budgeted one

Bad: agent issues 5 separate queries: `query "auth"`, `query "user"`, `query "session"`, `query "token"`, `query "permissions"`. Five round trips, five score calculations, five context injections — total ~10K tokens.

Better: one query with broader phrasing: `query "auth user session token permissions" --budget 5000`. One ranking pass produces the union of relevant entities, cheaper end-to-end.

## 4. Architecture queries at default budget

Bad: `engramx query "explain the architecture"` at default 2000 budget. Returns 5-7 entities, misses the supporting modules, the agent loses the structural shape.

Architecture is a broad question. Bump the budget: `--budget 5000` minimum, `8000` for large repos. The cost is recovered by NOT having to do follow-up clarification queries.

## 5. Depth without need

Bad: every query at `--depth 3`. Triples the edge count, fills the budget with neighbors, surfaces fewer direct hits.

Default depth is 2 because it matches "who calls X" semantics. Bump to 3 only when the question is explicitly multi-hop: "what eventually triggers X", "trace this dependency chain". Drop to 1 when the question is single-point: "where is X defined".

## 6. Querying refactored-away code

Bad: agent queries for an entity that doesn't exist anymore. Returns zero. Agent retries with synonyms. Still zero. Wastes turns.

If the engram graph is older than the current state of the repo, run `engramx init --incremental` first to refresh. The `validUntil` field filters out stale entities but the index needs to know about new entities too.

Diagnose with: `engramx db status` shows index freshness.

## 7. Asking for content via query

Bad: `engramx query "show me the implementation of validateToken"` expecting the function body.

The query returns the entity reference, not the file contents. The agent's follow-up is `Read src/auth/validate.ts`. Two-step pattern: query finds the file, Read returns the source. Don't conflate the two.

## 8. Forgetting the budget contract

Bad: setting `--budget 50000` "just in case". Engram complies, returns 100+ entities, fills Claude's context window with noise, the actual relevant answer is at position 73.

Budget is a trust contract. The token cost matches the budget. Use 2000 unless the question is genuinely broad. Don't oversize "for safety" — that's the OPPOSITE of token efficiency, which is engram's whole pitch.

## 9. Querying for negative cases

Bad: `engramx query "files that do NOT use useReducer"`.

The graph encodes what IS, not what isn't. Negative queries return whatever weakly matches the negation phrasing — usually garbage. Reframe positively: query "useReducer usage", get the set, the complement is what you need.

## 10. Hallucinating result counts

Bad: agent says "engram returned 15 matches" when the actual output was 5 + a "+10 more available" indicator.

The skill's output is verbatim. Parse the explicit count from the header line `[engram:query] N entities`. If `N=5`, that's the count. The "+X more available" line means *the query was capped at the budget*, not that 15 were returned.

## 11. Querying instead of mistakes for regret questions

Bad: `engramx query "what did i learn about useReducer"`.

Wrong skill. Regret/learning history goes through `engramx mistakes`. The query skill returns code entities; the mistakes skill returns bi-temporal regret records. The user's question signals which surface they want.

The `engram-mistakes` skill's trigger patterns ("what did i learn", "have i made this before") fire first when the message matches. If both could fire, mistakes wins because it has the specific historical signal.

## 12. Treating zero results as failure

Bad: `engramx query "nonexistent thing"` returns zero. Agent retries 3 times with variations. All zero. Agent gives up confused.

Zero results is information. It means: either the entity doesn't exist in the graph, or the phrasing doesn't match any entity's label/file. Both are useful signals. After one zero-result query, the next step is `Glob` or `Grep` — different tooling, not retry-the-same-tool.
