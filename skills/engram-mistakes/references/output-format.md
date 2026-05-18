# Output format spec

Two surfaces, two byte-level layouts. Both are derived from the same v9 schema fields. Both are rendered by engramx itself — the skill never reformats; it just routes the user's intent to the right invocation.

## CLI surface — `engramx mistakes`

Human-readable, color-coded, terminal-targeted. Uses chalk + Unicode box-drawing characters.

```
⚠️  N mistake(s) recorded:

⚠ Mistake #1 — YYYY-MM-DD
  ┌─ then you believed: <thenBelieved verbatim, single line, no truncation>
  ├─ found false:       YYYY-MM-DD
  └─ truth now:         <truthNow verbatim>
     ref:        <sourceFile, project-relative>
     applies to: <appliesTo pattern>

⚠ Mistake #2 — YYYY-MM-DD
  ...
```

Key invariants:
- Header date is `lastVerified` for the original belief (when the mistake was last seen relevant)
- `found false` line shows `foundFalseAt` formatted as YYYY-MM-DD UTC
- Tree characters: `┌` (top), `├` (middle), `└` (bottom), `─` (filler)
- The `ref:` line is project-relative — never absolute. Strips the project root prefix.
- The `applies to:` line is the `appliesTo` field directly.
- Mixed lists (some bi-temporal, some legacy) render bi-temporal entries separated by blank lines and legacy entries on single lines. The renderer auto-detects.

Legacy v3.x mistakes (no v9 fields) render as:
```
  [<sourceFile>, <Nd ago>] <label>
```

## Hook surface — `additionalContext` injection

Plain text (no ANSI codes) because the output goes into Claude Code's context window, not a terminal. Same data shape, simplified tree.

```
⛔ engramx pre-mortem — you've made this mistake before:

  ⚠ <appliesTo pattern, or fall back to label>
     ┌─ then you believed: <thenBelieved>
     ├─ found false:       YYYY-MM-DD
     └─ truth now:         <truthNow>
        file: <sourceFile>
```

Key differences from CLI:
- No `⚠️` (the chalk-bold variant); just the plain `⚠`
- Pattern (`appliesTo`) becomes the entry title — replaces the `Mistake #N — date` header
- No `applies to:` continuation line (the pattern is already in the title)
- File ref is shown as `file: <path>` rather than `ref: <path>`
- Mixed bi-temporal + legacy: bi-temporal blocks separated by blank lines; legacy entries `⚠ <label> (flagged Nd ago, file: <path>)` on single lines

When the hook fires PreToolUse, the full `additionalContext` block reaches Claude before tool execution. The structured fields are stable across versions — Claude can parse the pattern, infer the rule, and adapt the proposed edit.

## What never goes in the output

- Commit SHAs longer than 7 characters (truncated to short SHA for legibility)
- The user's home directory or any absolute path
- Network identifiers (everything is local)
- The full original commit body (only the subject — bodies are noise)
- ANSI codes in the hook surface (degrades to garbage in Claude's context)

## Backwards compatibility

The schema v9 fields are nullable. Any v3.x mistake (legacy single-string `label` only) renders via the legacy path with zero loss. This is intentional — engramx never deletes existing mistakes during the v3 → v4 migration, and the user's accumulated graph stays valuable.
