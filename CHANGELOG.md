# Changelog

All notable changes to engram-skill-pack will be documented in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] — 2026-05-18 — "Structural Bootstrap"

Three active skills now. `engram-mistakes` (the rave moment) is joined by two skills that bootstrap repo understanding before the agent makes its first edit: `engram-query` (structural lookups) and `engram-gods` (importance ranking). Together they replace 10-20 turns of `ls`/`Grep`/`Read` browsing with 2-3 budgeted invocations under 5 KB total context.

### Added

- **`engram-query`** auto-discoverable skill. Wraps `engramx query` with natural-language trigger patterns for structural questions: "where is X defined", "what calls X", "explain the architecture", "show me dependencies of X". Five-term ranking formula (text match + query count + recency + co-change density + confidence) returns 5-15 entities ranked by relevance within a token budget. Default budget 2000 tokens — the agent gets entity references + summaries + edges, then `Read`s the surfaced files only when source is needed. Replaces ad-hoc Grep for structural questions at a fraction of the token cost.
- **`engram-gods`** auto-discoverable skill. Wraps `engramx gods` to surface the top N entities by importance score (graph degree + query count + co-change density + recency + confidence). Auto-fires on onboarding/orientation questions: "where do I start", "what's important here", "what are the main classes". Test files excluded by default. Kind filter supports `class`/`function`/`module`/`decision` etc. for targeted top-N lists. Healthy mixed-kind output is the design — the actual top of a repo includes code AND ADRs.
- **8 new reference files** under `skills/engram-query/references/` and `skills/engram-gods/references/`: `query-ranking.md` / `importance-score.md` (the underlying score math), `output-format.md` (byte-level layout spec), `trigger-patterns.md` (reactive trigger matrix), `anti-patterns.md` (12 documented failure modes), `evaluation.md` (5-dimension 0/2/4 scoring framework).
- **Skill-manifest schema bump:** every active skill now has its `triggers` array populated. The marketplace can index by trigger phrase.

### Changed

- **Manifest status:** `engram-query` and `engram-gods` flipped from `placeholder` → `active`. The two skills that remain in placeholder state (`engram-gen`, `engram-learn`) target v0.3.0.

### Still placeholder (queued for v0.3.0)

- `engram-gen` — generate task-grounded context prompts. Wraps `engramx gen --task <kind>`.
- `engram-learn` — interactive 4-field bi-temporal mistake capture. Wraps `engramx learn --interactive` (interactive mode lands in engramx v4.0.x).

### Compatibility

Same as v0.1.0: requires `engramx >= 4.0.0`, Node ≥22, Apache-2.0. Falls back gracefully on older engramx — query and gods both work on v3.x but without the v9 schema additions.

## [0.1.0] — 2026-05-18 — "Memory Preview"

First public release. Ships the hero skill and the marketplace plumbing so the remaining four skills can land incrementally without restructuring the pack.

### Added

- **`engram-mistakes`** auto-discoverable Claude Code Skill. Fires reactively on `have i made this before` / `any mistakes` / `what did i learn` user-message patterns and proactively as a `PreToolUse` hook on `Edit` / `Write` / `Bash` for code-file paths outside `node_modules` / `dist` / `build`. Routes to `engramx mistakes` / `engramx intercept` and renders the bi-temporal layout introduced in engramx v4.0 (then-believed / found-false / truth-now / applies-to).
- **SKILL.md** with full Layer 1 (control dials) + Layer 2 (core principles) + Layer 3 (decision tree) + Layer 4 (invocation variants) + Layer 7 (quality gate) per the engramx-internal AAA template.
- **`references/bi-temporal-model.md`** — the theory behind two-axis time encoding and why pattern-keyed memory beats instance-keyed memory for AI agents.
- **`references/output-format.md`** — byte-level layout spec for both the CLI and hook surfaces, with backwards-compat behavior for v3.x legacy mistakes.
- **`references/trigger-patterns.md`** — exhaustive trigger matrix for reactive + proactive invocation, including the `ENGRAM_MISTAKE_GUARD` env-var override semantics.
- **`references/anti-patterns.md`** — 12 documented failure modes that turn the surface into noise. Reviewed before any future trigger expansion.
- **`references/evaluation.md`** — 5-dimension scoring framework (catch rate, false-positive rate, bi-temporal completeness, agent adaptation, reliability under failure) with measurable 0/2/4 anchors.
- **`skill-manifest.json`** declares all five skill slots (1 active, 4 placeholders). The manifest schema is forward-compatible — placeholders will become active in v0.2.0 and v0.3.0 without breaking marketplace consumers.
- **`scripts/postinstall.js`** detects the `engramx` CLI on PATH, reports the version, and emits a friendly install one-liner if missing. Never fails the install (`ENGRAM_SKILL_PACK_QUIET=1` suppresses output for CI).
- **`scripts/verify-manifest.js`** smoke-tests `skill-manifest.json` shape, version sync with `package.json`, and validates that every active skill has a SKILL.md with parseable YAML frontmatter (name + description, ≤250 chars). Runs in `prepublishOnly`.

### Not yet shipped (placeholders in manifest)

- `engram-query` — v0.2.0
- `engram-gods` — v0.2.0
- `engram-gen` — v0.3.0
- `engram-learn` — v0.3.0

### Compatibility

- **Peer dependency:** `engramx >= 4.0.0` (the version that introduced the v9 bi-temporal schema fields). Lower versions fall back to legacy single-line layout — the pack will still install but the rave moment requires v4.0+.
- **Node:** `>= 22`. Uses native ESM, top-level await in the postinstall, and modern `node:` imports.
- **License:** Apache-2.0.

### Distribution

- npm: `engram-skill-pack`
- Claude Code Marketplace: `nickcirv/engram-skill-pack`
- GitHub: `https://github.com/NickCirv/engram-skill-pack`
