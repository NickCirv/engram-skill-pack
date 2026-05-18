#!/usr/bin/env node
/**
 * engram-skill-pack postinstall.
 *
 * Friendly detection of the engramx CLI on PATH. Never fails the install —
 * the user may be installing the pack first and engramx separately, or
 * resolving from a workspace pnpm setup. Print a styled one-liner if the
 * binary isn't found so they know what to do next.
 *
 * Suppress all output (silent install) by setting ENGRAM_SKILL_PACK_QUIET=1
 * — useful for CI installs that don't want post-install noise.
 */
import { execFileSync } from "node:child_process";

const QUIET = process.env.ENGRAM_SKILL_PACK_QUIET === "1";

function colorize(s, code) {
  // Pico-color style, zero-dep. NO_COLOR respected per the convention.
  if (process.env.NO_COLOR === "1" || !process.stdout.isTTY) return s;
  return `\x1b[${code}m${s}\x1b[0m`;
}

const dim = (s) => colorize(s, "2");
const cyan = (s) => colorize(s, "36");
const yellow = (s) => colorize(s, "33");

function detectEngramx() {
  try {
    const out = execFileSync("engramx", ["--version"], {
      encoding: "utf-8",
      timeout: 3000,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const m = out.match(/(\d+\.\d+\.\d+)/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

function main() {
  if (QUIET) return;

  const version = detectEngramx();

  if (version === null) {
    // engramx missing — print a friendly fix, but never fail.
    console.log("");
    console.log(yellow("⚠ engram-skill-pack: engramx CLI not found on PATH"));
    console.log(dim("  This pack wraps engramx. Install it once:"));
    console.log(`    ${cyan("npm i -g engramx")}`);
    console.log(
      dim("  Then run 'engram init' in any project to populate the graph."),
    );
    console.log("");
    return;
  }

  // Version check — best effort. Major-version mismatch warns but doesn't fail.
  const major = Number(version.split(".")[0]);
  if (major < 4) {
    console.log("");
    console.log(
      yellow(
        `⚠ engram-skill-pack v0.1.0 expects engramx >= 4.0.0 (found ${version}).`,
      ),
    );
    console.log(dim("  Upgrade for the bi-temporal mistakes layout:"));
    console.log(`    ${cyan("npm i -g engramx@latest")}`);
    console.log("");
    return;
  }

  // Healthy.
  console.log(dim(`engram-skill-pack: engramx ${version} detected ✓`));
}

try {
  main();
} catch {
  // Never let postinstall fail the install. Swallow everything.
}
