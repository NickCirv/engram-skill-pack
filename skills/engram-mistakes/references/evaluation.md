# Evaluation

How to tell if engram-mistakes is working in your repo. Five measurable dimensions, each with concrete 0/2/4 anchors.

## 1. Catch rate on recurring patterns

Does the skill fire when the *next instance* of a known pattern appears in a new file?

| Score | Anchor |
|-------|--------|
| 0 | Hook never fires across 10 edits on patterns that have been recorded as mistakes. |
| 2 | Hook fires 30-60% of the time. Pattern-axis matching works but is missing cases. |
| 4 | Hook fires 80%+ of the time. The `appliesTo` pattern matches across file paths. |

Measure: install the pack on a repo with 5+ recorded bi-temporal mistakes, do 10 edits to new files that touch the same patterns, count fires.

## 2. False-positive rate

Does the skill fire when it shouldn't?

| Score | Anchor |
|-------|--------|
| 0 | Hook fires on more than 1 in 5 unrelated edits. Trust erodes within a session. |
| 2 | Hook fires on 1 in 20 unrelated edits. Manageable but visible. |
| 4 | Hook fires on fewer than 1 in 100 unrelated edits. Effectively zero noise. |

Measure: run a session of 100 edits across files with no recorded mistakes. Count any fire as a false positive.

## 3. Bi-temporal completeness

Does the output show all 4 v9 fields when available?

| Score | Anchor |
|-------|--------|
| 0 | Output is single-line legacy format even though the graph has v9 fields populated. |
| 2 | Output shows v9 fields but inconsistently (some entries bi-temporal, some legacy when both have data). |
| 4 | Output shows the full bi-temporal layout whenever the underlying mistake has the fields, falls back legacy only when fields are NULL. |

Measure: query the graph (`sqlite3 .engram/graph.db "SELECT count(*) FROM nodes WHERE then_believed IS NOT NULL"`), then `engramx mistakes` and verify rendered count matches.

## 4. Agent adaptation

Does Claude actually adapt the proposed edit based on the surfaced mistake?

| Score | Anchor |
|-------|--------|
| 0 | Claude produces the same buggy fix the prior commit reverted. The warning was ignored. |
| 2 | Claude acknowledges the warning ("I see there was a past issue with...") but produces the same fix anyway. |
| 4 | Claude reads the warning, restructures the edit to avoid the documented failure mode, and ships a different (correct) fix. |

Measure: seed a known bi-temporal mistake, ask Claude to do something that would re-trigger it, score the resulting code.

## 5. Reliability under failure

Does the skill stay invisible when engramx is unavailable?

| Score | Anchor |
|-------|--------|
| 0 | Hook throws or hangs when graph.db is missing. Blocks the tool call. |
| 2 | Hook returns "no mistakes" silently when engramx fails. User has no signal that surfacing is broken. |
| 4 | Hook fails open (returns no warning) AND emits a stderr log so operators can diagnose. Tool call proceeds unblocked. |

Measure: rename `.engram/graph.db` mid-session, do 5 edits, verify no errors block tool calls AND `[engram:mistake-guard]` lines appear in stderr.

## Scoring

- **Total 17+**: Pack is working as designed. Ship and amplify.
- **Total 12-16**: Acceptable. File specific improvements for the low-scoring dimensions.
- **Total < 12**: Configuration issue or bug. Re-check `ENGRAM_MISTAKE_GUARD` env var, verify the hook is installed (`engram install-hook --scope local`), look at graph contents (`engramx mistakes --since 9999`), and file an issue with the score + reproduction.

## Running the eval continuously

`engramx` ships a hook-stats subsystem that logs every hook fire. Use it for ongoing evaluation:

```
engramx cost --watch
# Surfaces hook fire frequency + mistake-guard catches per session
```

This is the closed-loop signal — without measuring, you won't know if the skill is delivering the rave moment in production.
