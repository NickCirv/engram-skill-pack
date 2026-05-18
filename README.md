# engram-skill-pack

> engramx's AST code-graph + bi-temporal mistakes, as auto-discoverable Claude Code Skills.

**v0.2.0 "Structural Bootstrap"** — three active skills, two queued for v0.3.0. The pack now covers the full "before-you-make-the-edit" loop: orient the agent in a new repo, answer structural questions, surface past mistakes. All under 5 KB of context.

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![npm](https://img.shields.io/badge/npm-engram--skill--pack-cb3837)](https://www.npmjs.com/package/engram-skill-pack)
[![requires engramx](https://img.shields.io/badge/requires-engramx_%E2%89%A5_4.0.0-d97706)](https://github.com/NickCirv/engram)

---

## What it does

When your AI agent is about to edit a file, `engram-mistakes` auto-fires and injects bi-temporal context — what was once believed about the code, when that belief was found false, and what the truth is now. The agent reads the warning *before* making the edit and adapts.

```
⛔ engramx pre-mortem — you've made this mistake before:

  ⚠ useReducer + async + form-event handlers
     ┌─ then you believed: useReducer dispatch is safe in onChange handlers
     ├─ found false:       2026-04-19
     └─ truth now:         useReducer with async dispatch needs useCallback wrapping
        file: src/forms/ContactForm.tsx
```

The skill doesn't invent new primitives. It wraps the existing `engramx` CLI with the auto-discovery metadata the Claude Code skills marketplace expects.

## Install

```bash
# Install the pack
npm i -g engram-skill-pack

# Add to your Claude Code via marketplace
npx @anthropic-ai/claude-code add nickcirv/engram-skill-pack
```

Requires `engramx >= 4.0.0` installed and `engram init` run in any project you want context for.

```bash
# One-time engramx install (if you don't have it)
npm i -g engramx

# In each project where you want bi-temporal mistakes
cd ~/your-project && engram init
```

The init command auto-installs the Sentinel hook into the project's `.claude/settings.local.json`. The hook fires PreToolUse and is permissive by default. Opt out via `engram init --no-hook` or `ENGRAM_MISTAKE_GUARD=0`.

## The five skills

| Skill | Status | What it does |
|---|---|---|
| **engram-mistakes** | ✅ v0.1.0 | Surface bi-temporal mistakes (the rave moment — auto-fires PreToolUse) |
| **engram-query** | ✅ v0.2.0 | Natural-language structural queries — replaces ad-hoc Grep |
| **engram-gods** | ✅ v0.2.0 | Bootstrap repo understanding — top-N entities by importance |
| engram-gen | 🚧 v0.3.0 | Generate task-grounded context prompts |
| engram-learn | 🚧 v0.3.0 | Capture bi-temporal mistakes manually (interactive 4-field prompt) |

## How is this different from claude-mem?

| | engram-skill-pack | claude-mem | serena | hermes | caveman |
|---|---|---|---|---|---|
| Memory primitive | **Structural (AST + git graph)** | Functional (literal context capture) | Functional | Functional | Functional |
| Bi-temporal mistakes | **Yes — `then-believed` vs `truth-now`** | No | No | No | No |
| Auto-capture from git revert | **Yes (v4.0+)** | No | No | No | No |
| PreToolUse hook | **Yes — fires before edit, surfaces past corrections** | No | No | No | No |
| Local-first / zero cloud | **Yes** | Yes | Yes | Mixed | Yes |
| Multi-IDE support | **Yes — Claude Code, Continue, VS Code, Cursor** | Claude Code only | Editor extension | Various | Cursor focus |

The structural moat is the moat. `claude-mem` captures **what was said** in a session. `engramx` captures **what's structurally true** about the codebase — and what your team *learned was false*. That's what catches your agent before it repeats a fix the repo already burned to revert.

## FAQ

**Q: Do I need engramx installed?**
Yes. The pack is a thin Skills-marketplace wrapper around the engramx CLI. Install once: `npm i -g engramx`. The pack's postinstall script detects the binary and prints a friendly fix if it's missing — install never fails.

**Q: Does this work with Cursor / Continue.dev / VS Code?**
The pack itself ships only the Claude Code Skills surface. For other IDEs, install the matching wrapper that reads the same `~/.engram/graph.db`:
- Continue.dev → `npm i -g engramx-continue`
- VS Code / Cursor → `nickcirv.engram-vscode` on OpenVSX

All four wrappers (this pack + the three above) read the same underlying engramx graph. Install once, surface everywhere.

**Q: How is `engram-mistakes` different from `claude-mem`?**
claude-mem captures whatever you said in a session — literal context strings that the agent can re-read later. `engram-mistakes` captures what was *structurally true* about your code (AST entities, files, patterns) and what your team *learned was false* (git reverts, session corrections, explicit `engram learn` captures). The bi-temporal axis is the wedge: claude-mem can't tell you what you used to believe versus what you now know.

**Q: What's the AAA gate I see referenced?**
engramx skills follow an internal "AAA" template (control dials + decision tree + variants + quality gate) — the same shape your existing `~/.claude/skills/_aaa-template/` defines. For the marketplace surface, the gate is loosened to: valid frontmatter, name matches manifest, description ≤250 chars, SKILL.md exists. The full AAA bar is enforced for engram-internal skills, not Anthropic Marketplace skills.

**Q: Privacy?**
Zero egress in this pack. engramx (peer dependency) routes all graph data through local SQLite at `~/.engram/` and `<project>/.engram/`. No network calls happen during install or skill invocation. Safe on air-gapped workstations.

## Roadmap

- **v0.1.0** (2026-05-18) — Memory Preview: `engram-mistakes` only ✅
- **v0.2.0** (2026-05-18) — Structural Bootstrap: adds `engram-query` + `engram-gods` ✅
- **v0.3.0** (~7 days) — Capture Layer: adds `engram-gen` + `engram-learn` with the interactive 4-field bi-temporal prompt
- **v0.4.0** — AAA-elevation pass (full Layer 1-7 across all 5 skills + cross-ecosystem sync)
- **v1.0.0** — Marketplace launch, comparison-benchmark page (`engramx-bench.dev`) live, Show HN

## Related repos

- [engram](https://github.com/NickCirv/engram) — core engramx CLI + MCP server + graph store
- [engramx-continue](https://www.npmjs.com/package/engramx-continue) — Continue.dev wrapper
- [nickcirv.engram-vscode](https://open-vsx.org/extension/nickcirv/engram-vscode) — VS Code / Cursor extension

## License

Apache-2.0. Same as engramx.
