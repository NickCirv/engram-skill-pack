# Trigger patterns

When `engram-gods` auto-fires vs stays silent. Same conservative bias as the rest of the pack.

## Reactive — user-message patterns

Match the user's most recent message. If any pattern below applies, auto-fire with the suggested invocation.

| Pattern | Example user message | Invocation |
|---------|---------------------|-----------|
| `where (do I\|should I) start` | "where do I start in this repo?" | `engramx gods -p . --count 10` |
| `what (is\|are) important` | "what's important in this codebase?" | `engramx gods -p . --count 10` |
| `give me (the) (executive\|top) (summary\|few)` | "give me the executive summary" | `engramx gods -p . --count 5` |
| `what (anchors\|holds together) this <noun>` | "what anchors this codebase?" | `engramx gods -p . --count 10` |
| `main <noun>s` (classes / functions / modules / decisions) | "what are the main classes?" | `engramx gods -p . --kind <noun-mapped> --count 10` |
| `onboarding` / `new to this repo` | "I'm new to this repo, where do I start?" | `engramx gods -p . --count 10` |
| `audit` / `full inventory` | "give me a full audit of the important entities" | `engramx gods -p . --count 25` |

## Proactive — none (reactive-only)

Same as `engram-query`: no PreToolUse hook. The gods list is explicitly user-initiated. Auto-firing on every Edit would be noise.

That said, when the agent ITSELF is approaching a new file for the first time in a session, it can issue a `gods` invocation as part of its own information-gathering loop. The skill responds; the trigger is the agent's internal decision, not a user message.

## When NOT to fire

- "show me the code" — wants file contents, not entity ranking. Use Read.
- "what's wrong with this" — code-quality question. Use a review skill.
- "explain this function" — single-entity question. Use engram-query.
- "what changed recently" — git-log territory. Use Bash git.
- Pattern that names a specific entity ("what does parseToken do") — narrower than gods. Use engram-query.

When in doubt, prefer `engram-query` for specific questions and reserve `engram-gods` for the bird's-eye view.

## Manual override

`/engram-gods` always fires. The user can pass flags:
- `/engram-gods --count 5` — short summary
- `/engram-gods --kind class` — top classes
- `/engram-gods --scope src/auth/` — top entities in a sub-tree

The free-form invocation lets power users get exactly what they want regardless of pattern matching.

## Onboarding workflow

Common multi-skill flow for a new engineer:

```
Turn 1: engram-gods --count 10 (top entities for repo overview)
Turn 2: engram-gods --kind decision (the ADRs / decisions, if any)
Turn 3: engram-query for the user's specific area of focus
Turn 4: engram-mistakes --since 90d (recent regret history)
```

This 4-turn flow bootstraps an agent's understanding of the repo in well under 5 KB of context, replacing what would otherwise be 20+ Read calls totaling 50K+ tokens.

## Kind mapping for natural language

When the user says "main X", map to engramx kind:

| User noun | Maps to `--kind` |
|-----------|-----------------|
| class / classes | class |
| function / functions / methods | function |
| module / modules / packages | module |
| type / types / interface / interfaces | type |
| decision / decisions / ADR / ADRs | decision |
| concept / concepts | concept |
| file / files | file |

Plural-aware. Defaults to `all` when the noun doesn't map.
