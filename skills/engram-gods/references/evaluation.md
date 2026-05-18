# Evaluation

Five dimensions for whether `engram-gods` is delivering on its "fastest repo bootstrap" promise.

## 1. Onboarding speed vs reading-the-repo baseline

Same goal — understand a new repo enough to make a reasonable first edit. Two paths: (a) `engram-gods --count 10` + Read top 3 entities; (b) `ls src/` + Read 10-15 files until you find the anchors. Measure total turns and total tokens.

| Score | Anchor |
|-------|--------|
| 0 | Gods path is the same or slower. The list misses the actual important entities — graph is stale or weighted wrong. |
| 2 | Gods path saves 2-4 turns. Top 3 entities are roughly right; agent still does some browsing. |
| 4 | Gods path saves 8+ turns. Top 3 entities are the real anchors; agent reads them and is ready to work. |

Measure: pick 3 unfamiliar repos, time both paths, compare.

## 2. Top-N accuracy

What fraction of the surfaced entities would the repo's maintainer agree are "the important ones to understand first"?

| Score | Anchor |
|-------|--------|
| 0 | Less than 30% of returned entities match the maintainer's intuition. Often dominated by test infrastructure or low-level utilities. |
| 2 | 50-70% match. Most of the top-10 is right; 2-3 surprises (and "surprise" isn't always wrong — sometimes the graph spots centrality the maintainer underweights). |
| 4 | 80%+ match. The maintainer says "yeah, that's a good top-10" without needing to remove or reorder. |

Measure: send the gods list to the actual maintainer, ask them to flag mismatches.

## 3. Kind diversity

Does the default top-10 surface a healthy mix of entity kinds (some classes, some functions, some modules, ideally a decision or two)?

| Score | Anchor |
|-------|--------|
| 0 | Single-kind dominance (all classes or all files). The graph is shallow — try `engram init --with-skills`. |
| 2 | 2-3 kinds represented. Acceptable for small repos. |
| 4 | 3-5 kinds represented, including at least one architectural-level kind (module / decision / concept). |

Measure: count distinct `kind` values across the top-10 entities.

## 4. Score range tightness

Does the importance score have meaningful spread, or are all entities scored similarly?

| Score | Anchor |
|-------|--------|
| 0 | All 10 entities score 0.6-0.7 (tight range, low discrimination). The score doesn't help the agent prioritize. |
| 2 | Score range spans ~0.25 (e.g. 0.62-0.87). Some signal, some noise. |
| 4 | Score range spans 0.3+ (e.g. 0.62-0.95) with clear leaders. Top 3 are visibly more important than positions 8-10. |

Measure: subtract bottom score from top score in the returned list.

## 5. Reliability under edge cases

Does the skill handle small repos, fresh inits, missing graphs?

| Score | Anchor |
|-------|--------|
| 0 | Small repo (5 files): gods throws or returns 0 entities. Fresh `engram init`: gods returns stale data from a previous index. |
| 2 | Small repo: gods returns the available entities with no helpful note. Fresh init: gods returns updated data eventually but with delay. |
| 4 | Small repo: gods returns the entities with explicit note ("only 5 entities meet threshold"). Fresh init: gods immediately reflects the new index. |

Measure: test on a 5-file repo, a 5000-file repo, a freshly re-indexed repo, and a graph-deleted repo. Score on the four scenarios.

## Scoring

- **Total 17+**: Skill is delivering. Mention onboarding speed in launch material.
- **Total 12-16**: Acceptable; identify the low-scoring dimension.
- **Total < 12**: Re-check graph freshness, scoring weights, kind exclusions. Likely a configuration mismatch.

## The maintainer-validation loop

The best evaluation is having a repo's maintainer score their own gods list. Ask:

> Here's what engram thinks are the top-10 entities in this repo. For each, mark: Important (would brief a new engineer on this) / Surprised but correct (didn't realize this is central) / Wrong (shouldn't be in top-10).

Track the percentage of "Important" + "Surprised but correct" hits across repos. v4.0 target: 75% on engram's own repo (Nick's own ground truth). If you hit that, the scoring weights are calibrated correctly for at least one mid-sized TypeScript codebase.
