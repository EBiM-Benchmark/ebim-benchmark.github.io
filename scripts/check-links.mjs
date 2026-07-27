// Local reference resolution harness.
//
// Proves that every LOCAL reference emitted by the build resolves to a file that
// actually exists in _site/. This closes a gap the parity harnesses cannot see:
// scripts/verify.mjs compares built HTML against the golden fixtures, so it is
// blind to whether a referenced FILE is present on disk. Deleting an asset that
// some page still points at leaves every golden untouched, passes verify:all
// green, and 404s in production. PR #97 (orphan sponsor prune) was exactly that
// shape of change.
//
// For every .html file under _site/ it extracts local references from:
//
//   src=          — img/script/iframe/source
//   href=         — link/a (stylesheets, preload, icon, page links)
//   srcset=       — comma-separated candidates, descriptors (2x / 640w) stripped
//   url(...)      — inline <style> blocks and style="" attributes
//   meta content= — og:image, og:image:secure_url, twitter:image
//   JSON-LD       — "image", "logo", "url" string values inside ld+json blocks
//
// and resolves each one:
//
//   http:// https:// //host  mailto: tel: data: javascript:  → EXTERNAL, skipped
//   #anchor-only                                             → intra-page, skipped
//   /root/absolute                                           → resolved from _site/
//   ../relative  ./relative  bare                            → resolved from the
//                                                              referring page's dir
//
// #fragments and ?queries are stripped before resolution, and a reference that
// resolves to a directory is satisfied by that directory's index.html. Getting
// these three wrong is what produces a flood of phantom failures.
//
// FLOOR ASSERTIONS (why this harness cannot pass by finding nothing):
// A checker that parses zero pages reports zero broken references, which is
// indistinguishable from a healthy site. So the run FAILS if it discovers fewer
// than MIN_PAGES pages or fewer than MIN_REFS local references. Raise these
// floors when the site grows; never lower them to make a run pass.
//
// SELF-TEST (--self-test):
// Copies _site/ to a temp dir, injects four known-broken references (one per
// resolution mode), and asserts the checker reports EXACTLY those four and exits
// non-zero. Then asserts the floor fires on an empty tree. This proves the
// harness is capable of failing on the run that matters, rather than only that
// it printed a zero. Run it in CI immediately before the real check.
//
// Usage:  node scripts/check-links.mjs             (builds, then checks)
//         node scripts/check-links.mjs --no-build  (check an existing _site)
//         node scripts/check-links.mjs --self-test (prove the checker can fail)
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const SITE = path.join(ROOT, "_site");

const GREEN = (s) => `\x1b[32m${s}\x1b[0m`;
const RED = (s) => `\x1b[31m${s}\x1b[0m`;
const BOLD = (s) => `\x1b[1m${s}\x1b[0m`;

// Floors. The site is 14 EN + 12 zh pages and ~1750 local refs as of PR #100.
// These are deliberately below current reality but far above zero.
const MIN_PAGES = 20;
const MIN_REFS = 1200;

const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

// ────────────────────────────────────────────────────────────────── helpers ──
const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
};

// Strip #fragment and ?query. A bare "#anchor" or "" yields null (nothing to resolve).
const clean = (raw) => {
  const s = String(raw).trim();
  if (!s || s.startsWith("#")) return null;
  if (EXTERNAL.test(s)) return null;
  const cut = s.split("#")[0].split("?")[0];
  return cut ? cut : null;
};

const extractRefs = (html) => {
  const refs = [];
  const push = (v, kind) => {
    const c = clean(v);
    if (c) refs.push({ ref: c, kind });
  };

  for (const m of html.matchAll(/\ssrc\s*=\s*"([^"]*)"/gi)) push(m[1], "src");
  for (const m of html.matchAll(/\shref\s*=\s*"([^"]*)"/gi)) push(m[1], "href");

  // srcset: "a.webp 1x, b.webp 2x" → each candidate is the token before whitespace.
  for (const m of html.matchAll(/\ssrcset\s*=\s*"([^"]*)"/gi))
    for (const cand of m[1].split(","))
      push(cand.trim().split(/\s+/)[0], "srcset");

  // url(...) in <style> bodies and style="" attributes; quotes optional.
  for (const m of html.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/gi))
    push(m[1], "url()");

  // Social images. content= is generic, so only pull the image-bearing metas.
  for (const m of html.matchAll(/<meta[^>]+>/gi)) {
    const tag = m[0];
    if (/(?:property|name)\s*=\s*"(?:og:image(?::secure_url)?|twitter:image)"/i.test(tag)) {
      const c = tag.match(/content\s*=\s*"([^"]*)"/i);
      if (c) push(c[1], "meta");
    }
  }

  // JSON-LD image/logo/url string values.
  for (const m of html.matchAll(
    /<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi
  )) {
    for (const v of m[1].matchAll(/"(?:image|logo|url)"\s*:\s*"([^"]+)"/g))
      push(v[1], "json-ld");
  }

  return refs;
};

// Resolve one reference against the site tree. Returns the absolute path it
// should exist at, or null when the reference is not resolvable to a file.
const resolveRef = (siteDir, pageFile, ref) => {
  const base = ref.startsWith("/")
    ? path.join(siteDir, ref)
    : path.resolve(path.dirname(pageFile), ref);
  // Keep resolution inside the site tree; an escape is itself a failure.
  if (!base.startsWith(siteDir)) return { target: base, ok: false, escaped: true };
  if (fs.existsSync(base)) {
    const st = fs.statSync(base);
    if (st.isDirectory()) {
      const idx = path.join(base, "index.html");
      return { target: idx, ok: fs.existsSync(idx) };
    }
    return { target: base, ok: true };
  }
  return { target: base, ok: false };
};

// ──────────────────────────────────────────────────────────────────── check ──
const check = (siteDir, { quiet = false } = {}) => {
  if (!fs.existsSync(siteDir))
    return { pages: 0, refs: 0, broken: [{ page: "-", ref: "-", why: "_site missing" }] };

  const pages = walk(siteDir).filter((f) => f.endsWith(".html"));
  const broken = [];
  let refCount = 0;

  for (const page of pages) {
    const html = fs.readFileSync(page, "utf8");
    for (const { ref, kind } of extractRefs(html)) {
      refCount++;
      const r = resolveRef(siteDir, page, ref);
      if (!r.ok)
        broken.push({
          page: path.relative(siteDir, page),
          ref,
          kind,
          why: r.escaped ? "escapes _site/" : "no such file",
        });
    }
  }

  if (!quiet) {
    console.log(
      `  scanned ${BOLD(pages.length)} pages, ${BOLD(refCount)} local references`
    );
  }
  return { pages: pages.length, refs: refCount, broken };
};

// ──────────────────────────────────────────────────────────────── self-test ──
// Four injected breaks, one per resolution mode, so a regression in any single
// mode is caught rather than masked by the other three.
const SELF_TEST_BREAKS = [
  { needle: /<\/head>/i, inject: '<link rel="stylesheet" href="/css/__selftest_root.css">', ref: "/css/__selftest_root.css" },
  { needle: /<\/head>/i, inject: '<link rel="stylesheet" href="css/__selftest_rel.css">', ref: "css/__selftest_rel.css" },
  { needle: /<\/body>/i, inject: '<img src="img/__selftest_q.png?v=2#x" alt="">', ref: "img/__selftest_q.png" },
  { needle: /<\/body>/i, inject: '<img srcset="img/__selftest_ss.webp 2x" alt="">', ref: "img/__selftest_ss.webp" },
];

const selfTest = () => {
  console.log(BOLD("\nSELF-TEST — proving the checker can fail\n"));
  let ok = true;

  // 1. Floor must fire on an empty tree.
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), "cl-empty-"));
  const er = check(empty, { quiet: true });
  const floorFired = er.pages < MIN_PAGES || er.refs < MIN_REFS;
  console.log(
    `  ${floorFired ? GREEN("PASS") : RED("FAIL")}  floor assertion fires on an empty tree ` +
      `(${er.pages} pages, ${er.refs} refs)`
  );
  if (!floorFired) ok = false;
  fs.rmSync(empty, { recursive: true, force: true });

  // 2. Injected breaks must ALL be detected.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cl-seed-"));
  fs.cpSync(SITE, path.join(tmp, "_site"), { recursive: true });
  const seedDir = path.join(tmp, "_site");
  const victim = path.join(seedDir, "index.html");
  let html = fs.readFileSync(victim, "utf8");
  for (const b of SELF_TEST_BREAKS) html = html.replace(b.needle, b.inject + "$&");
  fs.writeFileSync(victim, html);

  const sr = check(seedDir, { quiet: true });
  for (const b of SELF_TEST_BREAKS) {
    const found = sr.broken.some((x) => x.ref === b.ref);
    console.log(`  ${found ? GREEN("PASS") : RED("FAIL")}  detects seeded break  ${b.ref}`);
    if (!found) ok = false;
  }

  // 3. And it must report NOTHING ELSE — a checker that flags real refs as
  //    broken is the failure mode that made the first implementation useless.
  const spurious = sr.broken.filter((x) => !SELF_TEST_BREAKS.some((b) => b.ref === x.ref));
  console.log(
    `  ${spurious.length === 0 ? GREEN("PASS") : RED("FAIL")}  no false positives on the seeded copy` +
      (spurious.length ? ` (${spurious.length} spurious)` : "")
  );
  if (spurious.length) {
    for (const s of spurious.slice(0, 10)) console.log(`        ${s.page}  →  ${s.ref}`);
    ok = false;
  }
  fs.rmSync(tmp, { recursive: true, force: true });

  console.log(ok ? GREEN("\n✓ SELF-TEST PASSED\n") : RED("\n✗ SELF-TEST FAILED\n"));
  return ok;
};

// ───────────────────────────────────────────────────────────────────── main ──
const args = process.argv.slice(2);
if (!args.includes("--no-build") && !args.includes("--self-test")) {
  const b = spawnSync("npx", ["@11ty/eleventy"], { stdio: "inherit", shell: true });
  if (b.status !== 0) process.exit(b.status ?? 1);
}

if (args.includes("--self-test")) process.exit(selfTest() ? 0 : 1);

console.log(BOLD("\nLOCAL REFERENCE CHECK\n"));
const { pages, refs, broken } = check(SITE);

let failed = false;
if (pages < MIN_PAGES) {
  console.log(RED(`  ✗ floor: found ${pages} pages, expected at least ${MIN_PAGES}`));
  failed = true;
}
if (refs < MIN_REFS) {
  console.log(RED(`  ✗ floor: found ${refs} references, expected at least ${MIN_REFS}`));
  failed = true;
}
if (broken.length) {
  console.log(RED(`\n  ✗ ${broken.length} broken reference(s):\n`));
  for (const b of broken) console.log(`      ${b.page}  [${b.kind}]  →  ${b.ref}   (${b.why})`);
  failed = true;
}

console.log(failed ? RED("\n✗ LINK CHECK FAILED\n") : GREEN("\n✓ ALL LOCAL REFERENCES RESOLVE\n"));
process.exit(failed ? 1 : 0);
