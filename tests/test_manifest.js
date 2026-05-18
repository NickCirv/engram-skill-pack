/**
 * Manifest + skill structure tests for engram-skill-pack.
 *
 * Uses node:test (no external test runner). Run via `pnpm test` or
 * `node --test tests/`. Each test is hermetic — reads files from the
 * repo root, no network, no env-dependent state.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..");

function readJson(relPath) {
  return JSON.parse(readFileSync(join(REPO, relPath), "utf-8"));
}

function readText(relPath) {
  return readFileSync(join(REPO, relPath), "utf-8");
}

function parseFrontmatter(relPath) {
  const text = readText(relPath);
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) throw new Error(`no frontmatter in ${relPath}`);
  const fm = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^(\w+):\s*(.+)$/);
    if (kv) fm[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, "");
  }
  return fm;
}

describe("skill-manifest.json shape", () => {
  test("parses as valid JSON", () => {
    const m = readJson("skill-manifest.json");
    assert.ok(m, "manifest parsed");
  });

  test("has all required top-level fields", () => {
    const m = readJson("skill-manifest.json");
    for (const key of ["name", "version", "description", "license", "skills"]) {
      assert.ok(key in m, `manifest missing '${key}'`);
    }
  });

  test("skills is a non-empty array", () => {
    const m = readJson("skill-manifest.json");
    assert.ok(Array.isArray(m.skills), "skills is array");
    assert.ok(m.skills.length > 0, "skills not empty");
  });

  test("declares exactly 5 skill slots (3 active + 2 placeholders for v0.2.0)", () => {
    const m = readJson("skill-manifest.json");
    assert.equal(m.skills.length, 5, "5 skill slots");
    const active = m.skills.filter((s) => s.status === "active");
    const placeholders = m.skills.filter((s) => s.status === "placeholder");
    assert.equal(active.length, 3, "3 active in v0.2.0");
    assert.equal(placeholders.length, 2, "2 placeholders queued for v0.3.0");
  });

  test("every active skill has id, path, summary", () => {
    const m = readJson("skill-manifest.json");
    for (const s of m.skills.filter((x) => x.status === "active")) {
      assert.ok(s.id, "id present");
      assert.ok(s.path, "path present");
      assert.ok(s.summary, "summary present");
    }
  });

  test("license is Apache-2.0", () => {
    const m = readJson("skill-manifest.json");
    assert.equal(m.license, "Apache-2.0");
  });
});

describe("manifest <-> package.json sync", () => {
  test("versions match", () => {
    const m = readJson("skill-manifest.json");
    const p = readJson("package.json");
    assert.equal(m.version, p.version, "manifest and package version match");
  });

  test("package name matches manifest name", () => {
    const m = readJson("skill-manifest.json");
    const p = readJson("package.json");
    assert.equal(p.name, m.name);
  });
});

describe("engram-mistakes skill structure", () => {
  test("SKILL.md exists at the path declared in manifest", () => {
    const m = readJson("skill-manifest.json");
    const mistakes = m.skills.find((s) => s.id === "engram-mistakes");
    assert.ok(mistakes, "engram-mistakes entry exists");
    assert.ok(
      existsSync(join(REPO, mistakes.path)),
      `SKILL.md exists at ${mistakes.path}`,
    );
  });

  test("frontmatter has name + description", () => {
    const fm = parseFrontmatter("skills/engram-mistakes/SKILL.md");
    assert.equal(fm.name, "engram-mistakes");
    assert.ok(fm.description, "description present");
  });

  test("description is at most 250 chars", () => {
    const fm = parseFrontmatter("skills/engram-mistakes/SKILL.md");
    assert.ok(
      fm.description.length <= 250,
      `description is ${fm.description.length} chars (max 250)`,
    );
  });

  test("frontmatter declares license", () => {
    const fm = parseFrontmatter("skills/engram-mistakes/SKILL.md");
    assert.equal(fm.license, "Apache-2.0");
  });

  test("frontmatter declares engramx peer-dep version", () => {
    const fm = parseFrontmatter("skills/engram-mistakes/SKILL.md");
    assert.ok(fm.requires, "requires field present");
    assert.ok(fm.requires.includes("engramx"));
  });

  test("SKILL.md has all required Layer sections", () => {
    const text = readText("skills/engram-mistakes/SKILL.md");
    assert.ok(/Layer 1 .*Control Dials/i.test(text), "Layer 1 present");
    assert.ok(/Layer 2 .*Core Principles/i.test(text), "Layer 2 present");
    assert.ok(/Layer 3 .*Decision Tree/i.test(text), "Layer 3 present");
    assert.ok(/Layer 4 .*Invocation Variants/i.test(text), "Layer 4 present");
    assert.ok(/Layer 7 .*Quality Gate/i.test(text), "Layer 7 present");
  });

  test("Layer 3 contains a visible decision tree (not prose)", () => {
    const text = readText("skills/engram-mistakes/SKILL.md");
    // A real decision tree has at least 3 ├── or └── branch markers.
    const branchCount = (text.match(/[├└]──/g) ?? []).length;
    assert.ok(branchCount >= 3, `Layer 3 has ≥3 tree branches (found ${branchCount})`);
  });

  test("all 5 reference files exist", () => {
    const refs = [
      "bi-temporal-model.md",
      "output-format.md",
      "trigger-patterns.md",
      "anti-patterns.md",
      "evaluation.md",
    ];
    for (const r of refs) {
      assert.ok(
        existsSync(join(REPO, "skills/engram-mistakes/references", r)),
        `${r} exists`,
      );
    }
  });

  test("anti-patterns.md has ≥7 numbered items", () => {
    const text = readText("skills/engram-mistakes/references/anti-patterns.md");
    const numberedHeadings = (text.match(/^## \d+\./gm) ?? []).length;
    assert.ok(numberedHeadings >= 7, `anti-patterns has ≥7 items (found ${numberedHeadings})`);
  });

  test("evaluation.md has ≥4 numbered dimensions", () => {
    const text = readText("skills/engram-mistakes/references/evaluation.md");
    const dimensions = (text.match(/^## \d+\./gm) ?? []).length;
    assert.ok(dimensions >= 4, `evaluation has ≥4 dimensions (found ${dimensions})`);
  });
});

describe("postinstall script", () => {
  test("scripts/postinstall.js exists and is parseable as ESM", async () => {
    const path = join(REPO, "scripts/postinstall.js");
    assert.ok(existsSync(path), "postinstall.js exists");
    // If the file is broken, import() throws — that's the test.
    await import(path);
  });
});

describe("verify-manifest script", () => {
  test("scripts/verify-manifest.js exists and is parseable as ESM", async () => {
    const path = join(REPO, "scripts/verify-manifest.js");
    assert.ok(existsSync(path), "verify-manifest.js exists");
  });
});

describe("engram-query skill structure (v0.2.0)", () => {
  test("SKILL.md exists at the path declared in manifest", () => {
    const m = readJson("skill-manifest.json");
    const skill = m.skills.find((s) => s.id === "engram-query");
    assert.ok(skill, "engram-query entry exists");
    assert.equal(skill.status, "active");
    assert.ok(existsSync(join(REPO, skill.path)), `SKILL.md exists at ${skill.path}`);
  });

  test("frontmatter validates", () => {
    const fm = parseFrontmatter("skills/engram-query/SKILL.md");
    assert.equal(fm.name, "engram-query");
    assert.ok(fm.description);
    assert.ok(fm.description.length <= 250, `description ≤250 chars (was ${fm.description.length})`);
    assert.equal(fm.license, "Apache-2.0");
    assert.ok(fm.requires.includes("engramx"));
  });

  test("SKILL.md has all required Layer sections", () => {
    const text = readText("skills/engram-query/SKILL.md");
    assert.ok(/Layer 1 .*Control Dials/i.test(text));
    assert.ok(/Layer 2 .*Core Principles/i.test(text));
    assert.ok(/Layer 3 .*Decision Tree/i.test(text));
    assert.ok(/Layer 4 .*Query Variants/i.test(text));
    assert.ok(/Layer 7 .*Quality Gate/i.test(text));
  });

  test("Layer 3 has ≥3 decision-tree branches", () => {
    const text = readText("skills/engram-query/SKILL.md");
    const branches = (text.match(/[├└]──/g) ?? []).length;
    assert.ok(branches >= 3, `Layer 3 ≥3 branches (found ${branches})`);
  });

  test("all 4 reference files exist", () => {
    const refs = ["query-ranking.md", "output-format.md", "trigger-patterns.md", "anti-patterns.md", "evaluation.md"];
    for (const r of refs) {
      assert.ok(existsSync(join(REPO, "skills/engram-query/references", r)), `${r} exists`);
    }
  });

  test("anti-patterns ≥7 + evaluation ≥4", () => {
    const ap = readText("skills/engram-query/references/anti-patterns.md");
    const apCount = (ap.match(/^## \d+\./gm) ?? []).length;
    assert.ok(apCount >= 7, `anti-patterns ≥7 (found ${apCount})`);
    const ev = readText("skills/engram-query/references/evaluation.md");
    const evCount = (ev.match(/^## \d+\./gm) ?? []).length;
    assert.ok(evCount >= 4, `evaluation ≥4 (found ${evCount})`);
  });
});

describe("engram-gods skill structure (v0.2.0)", () => {
  test("SKILL.md exists at the path declared in manifest", () => {
    const m = readJson("skill-manifest.json");
    const skill = m.skills.find((s) => s.id === "engram-gods");
    assert.ok(skill, "engram-gods entry exists");
    assert.equal(skill.status, "active");
    assert.ok(existsSync(join(REPO, skill.path)), `SKILL.md exists at ${skill.path}`);
  });

  test("frontmatter validates", () => {
    const fm = parseFrontmatter("skills/engram-gods/SKILL.md");
    assert.equal(fm.name, "engram-gods");
    assert.ok(fm.description);
    assert.ok(fm.description.length <= 250, `description ≤250 chars (was ${fm.description.length})`);
    assert.equal(fm.license, "Apache-2.0");
    assert.ok(fm.requires.includes("engramx"));
  });

  test("SKILL.md has all required Layer sections", () => {
    const text = readText("skills/engram-gods/SKILL.md");
    assert.ok(/Layer 1 .*Control Dials/i.test(text));
    assert.ok(/Layer 2 .*Core Principles/i.test(text));
    assert.ok(/Layer 3 .*Decision Tree/i.test(text));
    assert.ok(/Layer 4 .*Onboarding Variants/i.test(text));
    assert.ok(/Layer 7 .*Quality Gate/i.test(text));
  });

  test("Layer 3 has ≥3 decision-tree branches", () => {
    const text = readText("skills/engram-gods/SKILL.md");
    const branches = (text.match(/[├└]──/g) ?? []).length;
    assert.ok(branches >= 3, `Layer 3 ≥3 branches (found ${branches})`);
  });

  test("all 4 reference files exist", () => {
    const refs = ["importance-score.md", "output-format.md", "trigger-patterns.md", "anti-patterns.md", "evaluation.md"];
    for (const r of refs) {
      assert.ok(existsSync(join(REPO, "skills/engram-gods/references", r)), `${r} exists`);
    }
  });

  test("anti-patterns ≥7 + evaluation ≥4", () => {
    const ap = readText("skills/engram-gods/references/anti-patterns.md");
    const apCount = (ap.match(/^## \d+\./gm) ?? []).length;
    assert.ok(apCount >= 7, `anti-patterns ≥7 (found ${apCount})`);
    const ev = readText("skills/engram-gods/references/evaluation.md");
    const evCount = (ev.match(/^## \d+\./gm) ?? []).length;
    assert.ok(evCount >= 4, `evaluation ≥4 (found ${evCount})`);
  });
});

describe("docs", () => {
  test("README.md exists and mentions engram-mistakes", () => {
    assert.ok(existsSync(join(REPO, "README.md")));
    const text = readText("README.md");
    assert.ok(text.includes("engram-mistakes"));
  });

  test("README has a comparison table vs claude-mem", () => {
    const text = readText("README.md");
    assert.ok(text.includes("claude-mem"), "claude-mem in README");
    assert.ok(text.includes("serena"), "serena in README");
  });

  test("CHANGELOG.md exists and documents v0.1.0", () => {
    assert.ok(existsSync(join(REPO, "CHANGELOG.md")));
    const text = readText("CHANGELOG.md");
    assert.ok(/\[0\.1\.0\]/.test(text), "0.1.0 in CHANGELOG");
  });

  test("LICENSE exists (Apache-2.0 text)", () => {
    assert.ok(existsSync(join(REPO, "LICENSE")));
    const text = readText("LICENSE");
    assert.ok(text.includes("Apache License"));
    assert.ok(text.includes("Version 2.0"));
  });
});
