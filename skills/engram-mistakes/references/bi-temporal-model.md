# Bi-temporal model

The "bi-temporal" in bi-temporal mistakes refers to **two independent time axes** on every mistake:

1. **Valid time** — when the belief was true. The original commit's author timestamp. The session turn where the agent said "let's use useReducer here." The moment in history the belief was held.
2. **Transaction time** — when the system *learned* the belief was wrong. The revert commit's timestamp. The turn where the agent said "actually wait, that breaks form validation." The moment the falsification was recorded.

A flat mistake log loses this distinction. It says "useReducer with async dispatch is buggy" as if that's a stable fact. But the team didn't always know that — they *learned* it on a specific day, often after a specific test failed. The agent reading this needs both:

- **Then-belief**: what made the original code reasonable at the time. Without this, the warning reads as scolding ("you're wrong") instead of education ("here's what we learned").
- **Truth-now**: what we now know to do instead. Without this, the warning is just a stop-sign — no path forward.

## Schema mapping

engramx schema v9 (introduced in v4.0) added four nullable columns to the `nodes` table to encode this:

| Column | Meaning | Source |
|--------|---------|--------|
| `then_believed` | The original belief text. For git-revert: the reverted commit's subject. For session: the agent's prior statement. For manual: the `engram learn --then ...` arg. | varies by miner |
| `found_false_at` | unix-ms when the belief was found false. For git-revert: revert commit timestamp. For session: the correction turn's timestamp. | varies |
| `truth_now` | Current best answer. For git-revert: `Reverted in <sha>`. For session: the corrected statement. | varies |
| `applies_to` | Pattern label — what *kind* of mistake this is. e.g. "useReducer + async + form-event handlers". | derived from heuristic |

All four are optional. v3.x mistakes have all four `NULL` and render via the legacy single-line layout. v4.0 mistakes from active miners populate all four.

## Why pattern over instance

The `applies_to` field is the most important for agent reuse. Consider two mistakes:

- Instance: "commit a3f2c91 in src/forms/ContactForm.tsx introduced a useReducer race"
- Pattern: "useReducer with async dispatch needs useCallback wrapping in form-event handlers"

The instance is one bug in one file. The pattern is the rule the team learned. When a new agent edits `src/forms/SubmitButton.tsx` (a *different* file) with the same pattern, only the pattern-keyed surface catches the next instance before it ships. The instance-keyed surface stays silent because the file path doesn't match.

engramx's mistake-guard hook does both file-axis matching (for known-affected files) and command/applies-to-axis matching (for pattern recurrence on new files). The bi-temporal `applies_to` field is what feeds the second axis.

## Why agents need this and humans get away without it

A senior human developer carries the pattern in their head. They've internalized "useReducer + async = wrap dispatch." They don't need to re-read the regret commit.

A coding agent has no carry-over between sessions. Every new chat is fresh. Without an external memory keyed on pattern, the agent has only training-data priors. The training data is general; your repo's hard-earned correction is specific. The pattern wins only when the agent can see it at the moment of the edit.

That's the entire point of `engram-mistakes`. It is the agent's external memory of the team's structurally-learned lessons.
