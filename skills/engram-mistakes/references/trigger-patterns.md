# Trigger patterns

The skill fires reactively (user asks) and proactively (PreToolUse hook). Each pattern below maps a real signal to a specific `engramx` invocation. Patterns are deliberately conservative — every false-positive auto-fire burns trust faster than a false-negative recovers it.

## Reactive — user asks

Match the user's most recent message. If any pattern below matches, the skill auto-fires.

| Pattern | Example user message | Invocation |
|---------|---------------------|-----------|
| `have i made this before` | "did i hit this before?" | `engramx mistakes -p . --since 90d` |
| `any mistakes` | "any mistakes in this file?" | `engramx mistakes -p . --source <currentFile>` |
| `what did i learn` | "what did i learn from this last time?" | `engramx mistakes -p . --since 90d --limit 10` |
| `remind me of past attempts` | "remind me what i tried before" | `engramx mistakes -p . --since 180d` |
| `did i try this already` | "i feel like i tried this — did i?" | `engramx mistakes -p . --since 365d --limit 20` |
| `tried this before` | "haven't i tried this before?" | `engramx mistakes -p . --since 365d` |
| `regret` | "any regrets on this file?" | `engramx mistakes -p . --source <currentFile>` |

If the file context is ambiguous, omit `--source` and surface repo-wide mistakes ranked by recency.

## Proactive — PreToolUse Edit / Write

Matched by the hook installer's manifest. Fires when ALL conditions are true:

1. Tool is `Edit`, `Write`, or `MultiEdit`
2. `file_path` matches `\.(ts|tsx|js|jsx|py|rb|go|rs|java|c|cpp|cs|php)$`
3. `file_path` does NOT match `node_modules|dist|build|\.next|\.nuxt|coverage|\.engram|\.git`

If all conditions are met, `engramx intercept` is invoked with the full PreToolUse payload. The `mistake-guard.ts` handler runs the file-axis lookup, populates v9 fields, and returns the bi-temporal block as `additionalContext`.

The hook itself is installed by `engram init` (default behavior in v4.0+). To re-install: `engram install-hook --scope local`. To uninstall: `engram uninstall-hook`.

## Proactive — PreToolUse Bash

Fires when ALL conditions are true:

1. Tool is `Bash`
2. Command contains a substring that matches any mistake's `metadata.commandPattern` (≥ 5 chars)
3. OR command contains a substring that matches any mistake's `sourceFile` (≥ 6 chars)

The minimum-length thresholds prevent false-positives on short identifiers like `db`, `rm`, `test`, `src`. These were raised from `>2/>3` to `>4/>5` in engramx v4.0 per the reliability audit.

## When NOT to fire

These signals look like correction-seeking but are actually different intent. The skill stays silent:

- "what should i do here" — open-ended, not history-seeking. The user wants forward-looking advice; engram-mistakes is backwards-looking.
- "anything wrong with this" — code-quality question, not history. Different skill (lint / `engram query` for structural issues).
- "fix this" — execution request. The agent should fix; mistakes can surface as input but shouldn't gate the fix.
- "did this work before" — present-tense; user wants current state, not historical regret.

When in doubt, prefer silence. A noise-free hook is more valuable than a "we found something for you" interruption.

## Mode override via env var

| Env var | Effect |
|---------|--------|
| `ENGRAM_MISTAKE_GUARD=2` | Strict deny mode — PreToolUse with a matching mistake DENIES the tool call. For teams that want hard blocks on recurring failures. |
| `ENGRAM_MISTAKE_GUARD=0` | Off — disable the proactive hook entirely. Reactive surface still works. |
| `ENGRAM_MISTAKE_GUARD=1` (or unset) | Permissive (default in v4.0+) — inject as `additionalContext`, let the tool proceed. |
| `ENGRAM_MISTAKE_GUARD_QUIET=1` | Suppress stderr telemetry on guard failures. |

The skill itself does NOT set these. They're operator-level controls. The skill respects whatever the user has configured.
