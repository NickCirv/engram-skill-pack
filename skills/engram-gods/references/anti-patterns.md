# Anti-patterns

What makes the gods list misleading or useless. The skill is "fastest path to repo understanding" — when it fails, it fails by either over-promising or surfacing the wrong layer.

## 1. Using gods for code search

Bad: user asks "where is parseToken defined" → agent fires `engramx gods` → list returns top-10 important entities, parseToken isn't in it (it's a specific function, not central) → agent says "engram doesn't know" and gives up.

Wrong skill. Code lookup goes through `engram-query`. Gods is for "the anchors of the codebase," not "find this specific thing."

The trigger patterns prevent most of this — gods doesn't fire on "where is X defined" phrasing — but if the agent invokes gods manually, it's the agent's mistake.

## 2. Treating the gods list as exhaustive

Bad: agent calls `engramx gods --count 10`, gets 10 entities, then concludes "those are the only important things in this 5000-file repo."

The gods list is the **top of a distribution**, not the full set. The score range is shown in the footer (`Top score: 0.94 | Bottom score in list: 0.62`). Plenty of entities below 0.62 are still useful — they just aren't in the top-10.

If the agent needs the full picture, bump `--count` to 25 or 50. The token cost scales linearly.

## 3. Filtering out tests when the task is about tests

Bad: user asks "what are the main test files in this repo" → agent fires `engramx gods --kind file --count 10` → tests are excluded by default → agent returns implementation files.

Pattern matching needs to catch the "test" qualifier and add `--include-tests`:

```
engramx gods -p . --kind file --include-tests --count 10
```

The trigger-patterns matrix should be extended in v0.3 to handle this explicitly.

## 4. Surfacing decisions when the user asked for code

Bad: repo has an `engramx learn-adr` history; default gods returns 8 code entities + 2 decision nodes. Agent presents the list, user is confused why ADR markdown files are "important" alongside TypeScript functions.

Decisions ARE important — they explain *why* the code is structured the way it is. The list is correct; the presentation is wrong. The agent should annotate decision entries differently:

```
Top entities in this repo:

CODE
  ★ AuthService (importance: 0.92)
  ★ paymentFlow (importance: 0.87)
  ...

ARCHITECTURAL DECISIONS
  ★ ADR-001: Use React Query (importance: 0.88)
  ★ ADR-007: Postgres for storage (importance: 0.81)
```

This is the agent's job, not the skill's. The skill returns mixed-kind output by design.

## 5. Re-running gods for every file the user mentions

Bad: user asks "show me the main entities" → agent runs gods, returns top-10. User then asks "tell me about src/auth/". Agent re-runs gods scoped to src/auth/. User then asks "and src/payments/?". Three invocations, three different lists, agent never composes them.

Better: one default gods + one scoped follow-up. Subsequent file-specific questions use `engram-query` for the specific file, not another gods invocation. Save the gods quota for the bird's-eye view.

## 6. Confusing centrality with quality

Bad: gods returns a god-class with importance 0.95. Agent recommends "start by understanding AuthService — it's the most important class."

True (high centrality) but possibly misleading. A god-class is often a *refactoring target*, not a design exemplar. The recommendation should be neutral:

> AuthService is the most-referenced class in the repo. It connects auth, sessions, and user management. Worth understanding early because it touches everything — though its breadth may indicate a refactor opportunity rather than a model to copy.

The skill returns importance; the agent's job is to add the nuance.

## 7. Not noticing when the graph is sparse

Bad: brand-new repo with 5 files. `engramx gods --count 10` returns 5 entities + the "only 5 entities meet the threshold" note. Agent ignores the note and presents 5 entities as if they're the curated top.

The note IS the signal. When the graph has fewer entities than requested, the gods list is the WHOLE graph, not a top-N filter. The agent should adjust framing:

> Only 5 indexable entities in this repo so far. Here's the full set — you'll have a richer gods list after a few hundred more lines of code.

## 8. Hardcoding the count to 5 to "stay tight"

Bad: every invocation uses `--count 5`. Agent's reasoning: "fewer entities = less context noise." Result: the actual useful entities at positions 6-10 (still importance > 0.7) get cut.

The default 10 exists for a reason — there's usually meaningful drop-off after position 10-12. Don't optimize for token cost at the expense of signal. Use 5 only when the user explicitly asks for "the top few."

## 9. Surfacing test-setup files as gods

Bad: `engramx gods --include-tests` returns `setupTests.ts` at position 1 with importance 0.97. Real — it's imported by every test file — but useless for onboarding.

If `--include-tests` is on, the agent should still filter the response: any entity matching `setup*`, `*conftest*`, `*globals*` is testing-infrastructure, not the test entities the user asked about. The skill itself doesn't do this filter; the agent should.

## 10. Comparing gods across repos

Bad: "in repo A, AuthService has importance 0.94. In repo B, AuthService has importance 0.82. So repo A's auth is more important than repo B's."

Importance scores are RELATIVE to the repo they're computed in. They aren't comparable across repos. A repo with 5000 files has different score distribution than one with 50 files.

If the agent wants cross-repo comparison, use raw graph_degree (callers count) — that's an absolute number. Importance is a normalized ranking within one graph.
