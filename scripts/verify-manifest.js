#!/usr/bin/env node
/**
 * Manifest smoke test — runs in CI + before `npm publish` via prepublishOnly.
 *
 * Validates that:
 *   1. skill-manifest.json parses as JSON and has the required top-level shape
 *   2. Every active skill in the manifest has a SKILL.md at the declared path
 *   3. Every SKILL.md has YAML frontmatter with name + description fields
 *   4. The package.json `version` matches the manifest `version`
 *
 * Exits 0 on pass, non-zero with stderr breadcrumb on fail.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..");

function fail(msg) {
  console.error(`✗ verify-manifest: ${msg}`);
  process.exit(1);
}

function parseFrontmatter(skillMdPath) {
  if (!existsSync(skillMdPath)) {
    return { error: `SKILL.md not found at ${skillMdPath}` };
  }
  const content = readFileSync(skillMdPath, "utf-8");
  const m = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) {
    return { error: `no frontmatter block (--- ... ---) at top of ${skillMdPath}` };
  }
  const fm = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^(\w+):\s*(.+)$/);
    if (kv) fm[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, "");
  }
  return { frontmatter: fm };
}

function main() {
  const manifestPath = join(REPO, "skill-manifest.json");
  const pkgPath = join(REPO, "package.json");

  if (!existsSync(manifestPath)) fail("skill-manifest.json missing");
  if (!existsSync(pkgPath)) fail("package.json missing");

  let manifest, pkg;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
  } catch (e) {
    fail(`skill-manifest.json doesn't parse: ${e.message}`);
  }
  try {
    pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  } catch (e) {
    fail(`package.json doesn't parse: ${e.message}`);
  }

  // Shape: top-level required fields.
  for (const key of ["name", "version", "description", "license", "skills"]) {
    if (!(key in manifest)) fail(`skill-manifest.json missing required key '${key}'`);
  }
  if (!Array.isArray(manifest.skills)) fail("manifest.skills must be an array");

  // Version sync.
  if (manifest.version !== pkg.version) {
    fail(
      `version mismatch: manifest=${manifest.version} package.json=${pkg.version}`,
    );
  }

  // Each active skill: SKILL.md exists with valid frontmatter.
  let activeCount = 0;
  let placeholderCount = 0;
  for (const skill of manifest.skills) {
    if (!skill.id) fail(`skill entry missing 'id'`);
    if (skill.status === "placeholder") {
      placeholderCount++;
      continue;
    }
    if (!skill.path) fail(`active skill '${skill.id}' missing 'path'`);
    const skillMd = join(REPO, skill.path);
    const { frontmatter, error } = parseFrontmatter(skillMd);
    if (error) fail(`skill '${skill.id}': ${error}`);
    if (!frontmatter.name) fail(`skill '${skill.id}' frontmatter missing 'name'`);
    if (!frontmatter.description) {
      fail(`skill '${skill.id}' frontmatter missing 'description'`);
    }
    if (frontmatter.description.length > 250) {
      fail(
        `skill '${skill.id}' description is ${frontmatter.description.length} chars (max 250)`,
      );
    }
    if (frontmatter.name !== skill.id) {
      fail(
        `skill '${skill.id}' frontmatter name '${frontmatter.name}' != manifest id '${skill.id}'`,
      );
    }
    activeCount++;
  }

  console.log(
    `✓ verify-manifest: ${activeCount} active skill${activeCount === 1 ? "" : "s"}, ${placeholderCount} placeholder${placeholderCount === 1 ? "" : "s"} (v${manifest.version})`,
  );
}

main();
