# Anti-patterns

What makes a mistake surface noise instead of signal. The skill is not "found at all costs" — silence is cheaper than wrong-fire.

## 1. Fire on every "actually" or "wait"

Bad: the agent says "actually let me think about this" mid-reasoning → skill fires → injects mistake history → derails the reasoning.

The pattern `\bactually|wait\b` is too broad. Self-corrections in reasoning aren't the same as belief-was-falsified events. The skill matches only on user-message intent patterns, not agent reasoning markers.

## 2. Surface mistakes for files outside the edit

Bad: user edits `src/a.ts` → skill also surfaces every mistake in `src/b.ts`, `src/c.ts`, etc. because the engramx provider scanned the whole repo.

The hook is keyed on `sourceFile === editedFile`. Don't broaden to "files in the same directory" or "files that import this one." The signal-to-noise drops below 1.

## 3. Pre-mortem on docs / configs / lockfiles

Bad: user edits `package.json` or `README.md` → engram surfaces three mistakes about `src/auth.ts` → user dismisses → trust eroded for the next real fire.

The skill's trigger pattern excludes non-source paths. Docs and configs almost never carry recurring code-bug patterns. The exclusion list is in `references/trigger-patterns.md`.

## 4. Fire identically twice for the same mistake

Bad: hook fires for `Edit` → injects warning → agent issues a follow-up `Write` to the same file → warning fires again → context window now has the same block twice → token budget burned.

engramx caches the lookup per turn. A second tool call in the same turn doesn't re-inject. The cache is invalidated on `SessionStart` / `CwdChanged`.

## 5. Include the full original commit body

Bad: the `thenBelieved` field is set to the entire reverted commit's body — five paragraphs of "I'm adding X because Y because Z" — instead of just the subject.

The git-revert miner uses only `%s` (subject), not `%s%n%b`. Bodies are valuable for human commit-history browsing but noise for agent context.

## 6. Render mistakes from a refactored-away file

Bad: src/auth.ts had a regret mistake. Two months ago, auth.ts was deleted and replaced with a different module. The mistake still surfaces every Edit anywhere near the new module — but the underlying code doesn't exist anymore.

engramx schema v8 introduced the `validUntil` field for exactly this. The git-miner sets `validUntil` when the source file changes structurally; the renderer filters out mistakes whose `validUntil <= now`. v3.x mistakes (validUntil = null) stay valid forever and are user-pruned via `engram learn --forget`.

## 7. Pick fight with the user about a deleted mistake

Bad: user runs `engram learn --forget <mistake-id>` to dismiss a no-longer-relevant warning. Hook re-fires next turn because the in-process cache is stale.

The fix is hook-level cache invalidation on graph writes. engramx broadcasts a "graph mutated" event after `learn --forget`; the hook's cache listens and clears. If you're seeing this in production, file an issue — it's a regression.

## 8. Heading shows "Mistake #1" with no pattern

Bad output:
```
⚠ Mistake #1 — 2026-04-18
  ┌─ then you believed: ...
```

The CLI surface shows `Mistake #N — DATE` as the heading. That's fine for an audit listing. But the *hook* surface — what Claude sees PreToolUse — should lead with the pattern (`⚠ useReducer + async + form-event handlers`), not a counter. Counters are meaningless when there's one entry; patterns are always meaningful.

## 9. Truncate the `thenBelieved` text

Bad: original commit subject is "feat: add useReducer for form state to support concurrent updates" — gets truncated to "feat: add useReducer for fo…" because of an over-eager 30-char cap.

The text is the belief verbatim. If the original commit subject was long, that's information — the developer thought enough about the change to write a sentence. Render the full subject; let the terminal wrap.

## 10. Strict mode that doesn't explain the override path

Bad: `ENGRAM_MISTAKE_GUARD=2` denies a tool call but the deny reason is just the bi-temporal block. The user doesn't know how to override for this one edit.

Strict-mode deny messages should always end with:
```
To proceed anyway: rerun with ENGRAM_MISTAKE_GUARD=1 (or 0 to disable).
```
Users who hit a deny in CI shouldn't have to search docs to find the bypass.

## 11. Sort by recency only

Bad: 47 mistakes in the file. Surface the 5 most recent. The 5 most recent are all from a refactor sprint last week. The actual recurring pattern — recorded 6 months ago, applies-to-still-true — is buried.

Default sort is `lastVerified DESC` (recency). For high-mistake files, the right sort is `lastVerified` *AND* a recurrence boost (mistakes with the same `applies_to` pattern as a not-yet-shown mistake get a one-time +1 priority). v0.1.0 doesn't implement this; v0.2.0 follow-up issue tracks it.

## 12. Hide failures to look "smart"

Bad: the engramx CLI errors silently → skill returns "no mistakes" → user thinks the file has no history → makes the same mistake again.

The skill emits to stderr when the CLI throws (`[engram:mistake-guard] lookup failed (kind=edit-write, project=/path): <message>`). Suppress only via `ENGRAM_MISTAKE_GUARD_QUIET=1`. The default-loud posture is intentional — fail-open with telemetry beats fail-open silent.
