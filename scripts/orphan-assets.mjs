// Shipped-asset orphan audit — the COMPLEMENT to scripts/check-links.mjs.
//
// check-links.mjs asks "does every reference resolve to a file that exists?"
// (references → files). This asks the mirror question: "does every shipped file
// have at least one reference pointing at it?" (files → references). A file that
// nothing references is dead weight served to production — the shape PR #97
// pruned by hand (five orphaned sponsor logos, one a de-listed partner's, all
// publicly reachable long after the pages stopped using them).
//
// MANUAL TOOL — this deliberately does NOT gate CI, and must not be wired into
// verify:all or a workflow. Orphan detection has legitimate false positives by
// nature: an intentional design master (img/og-cover.svg) and a licence file that
// must ship with its fonts (fonts/OFL.txt) are both correctly unreferenced. Those
// live in ALLOWLIST below, and every future intentionally-unreferenced file would
// otherwise turn into a spurious CI red that someone "fixes" by deleting a file
// that should stay. Run it by hand after pruning assets or inlining a stylesheet.
//
// Reference SOURCES scanned (not just .html — a file referenced only from the
// sitemap or a stylesheet is still referenced):
//
//   *.html       — src=, href=, srcset=, url(), og:image/twitter:image, JSON-LD
//   *.css        — url(...) targets
//   sitemap.xml  — <loc> URLs
//   robots.txt   — Sitemap: and any absolute URL
//
// Resolution mirrors check-links.mjs, plus one rule that tool does not need:
// a SAME-ORIGIN absolute URL is resolved, not skipped. img/og-cover.png is
// referenced ONLY as content="https://ebim-benchmark.github.io/img/og-cover.png"
// in the og:image and twitter:image metas, so a tool that skips every absolute
// URL as "external" reports an 87 KB in-use file as an orphan. Genuinely external
// origins are skipped.
//
// WHAT THIS DOES NOT COVER:
//   - It cannot tell you whether a REFERENCED file is the right one, only that
//     something points at it. Use check-links.mjs for the other direction.
//   - It reasons about the BUILT site only. A file that exists in src/ but never
//     ships (e.g. a build input like src/_data/inlineCss.js) is invisible here.
//   - Reference extraction is regex-based, matching check-links.mjs. A reference
//     built at runtime by JavaScript would be missed, and its target reported as
//     an orphan. The site has no such references today.
//
// ALWAYS rebuild first: `rm -rf _site && npx @11ty/eleventy`. Eleventy does not
// clean its output directory, so a stale tree still holds files deleted commits
// ago and will manufacture phantom orphans.
//
// Usage:  node scripts/orphan-assets.mjs             (audits ./_site)
//         node scripts/orphan-assets.mjs <siteDir>   (audits another tree)
import fs from "node:fs";
import path from "node:path";

const SITE = path.resolve(process.argv[2] || "_site");
const ORIGIN = "https://ebim-benchmark.github.io";

const GREEN = (s) => `\x1b[32m${s}\x1b[0m`;
const RED = (s) => `\x1b[31m${s}\x1b[0m`;
const BOLD = (s) => `\x1b[1m${s}\x1b[0m`;

// Floors. Same discipline as check-links.mjs: an orphan checker that finds no
// orphans because it parsed nothing is the same trap in the other direction.
// The site ships 80 non-HTML files and ~1900 references as of PR #101. That count
// is higher than check-links.mjs reports for the same build because this tool also
// reads sitemap.xml, robots.txt and shipped CSS as reference sources.
// Raise these as the site grows; never lower them to make a run pass.
const MIN_FILES = 60;
const MIN_REFS = 1200;

// Legitimately unreferenced — each with the reason it is not an orphan.
const ALLOWLIST = new Map([
  ["sitemap.xml", "crawler entry point; named in robots.txt and fetched externally"],
  ["robots.txt", "crawler entry point; fetched by path convention, never linked"],
  [".nojekyll", "GitHub Pages build marker; zero bytes, never referenced"],
  ["fonts/OFL.txt", "SIL Open Font License — required to ship alongside the Inter fonts"],
  ["img/og-cover.svg", "editable vector master for og-cover.png (documented in README)"],
]);

// ────────────────────────────────────────────────────────────────── helpers ──
const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
};

const rel = (abs) => path.relative(SITE, abs).split(path.sep).join("/");

// Strip #fragment and ?query; drop anchors, data:, mailto: and foreign origins.
// A same-origin absolute URL is rewritten to a root-absolute path so it resolves.
const normalize = (raw) => {
  let s = String(raw).trim();
  if (!s || s.startsWith("#")) return null;
  // Match the origin on a path boundary: a bare startsWith would also swallow a
  // look-alike host such as ebim-benchmark.github.io.example.com and resolve its
  // path locally, which could mark a file "referenced" and hide a real orphan.
  if (s === ORIGIN || s.startsWith(ORIGIN + "/")) s = s.slice(ORIGIN.length) || "/";
  else if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(s)) return null; // external / data: / mailto:
  s = s.split("#")[0].split("?")[0];
  return s || null;
};

// ──────────────────────────────────────────────────────────── extraction ──
const refsFromHtml = (html) => {
  const out = [];
  for (const m of html.matchAll(/\s(?:src|href)\s*=\s*"([^"]*)"/gi)) out.push(m[1]);
  for (const m of html.matchAll(/\ssrcset\s*=\s*"([^"]*)"/gi))
    for (const cand of m[1].split(",")) out.push(cand.trim().split(/\s+/)[0]);
  for (const m of html.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/gi)) out.push(m[1]);
  for (const m of html.matchAll(/<meta[^>]+>/gi)) {
    if (/(?:property|name)\s*=\s*"(?:og:image(?::secure_url)?|twitter:image)"/i.test(m[0])) {
      const c = m[0].match(/content\s*=\s*"([^"]*)"/i);
      if (c) out.push(c[1]);
    }
  }
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi))
    for (const v of m[1].matchAll(/"(?:image|logo|url)"\s*:\s*"([^"]+)"/g)) out.push(v[1]);
  return out;
};

const refsFromCss = (css) =>
  [...css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/gi)].map((m) => m[1]);

const refsFromSitemap = (xml) =>
  [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);

const refsFromRobots = (txt) =>
  [...txt.matchAll(/https?:\/\/\S+/gi)].map((m) => m[0]);

// ─────────────────────────────────────────────────────────────────── audit ──
if (!fs.existsSync(SITE)) {
  console.log(RED(`\n✗ ${SITE} does not exist — run: rm -rf _site && npx @11ty/eleventy\n`));
  process.exit(1);
}

const all = walk(SITE);
const referenced = new Set();
let refCount = 0;

for (const file of all) {
  const name = path.basename(file);
  const ext = path.extname(file).toLowerCase();
  let raws = [];
  if (ext === ".html") raws = refsFromHtml(fs.readFileSync(file, "utf8"));
  else if (ext === ".css") raws = refsFromCss(fs.readFileSync(file, "utf8"));
  else if (name === "sitemap.xml") raws = refsFromSitemap(fs.readFileSync(file, "utf8"));
  else if (name === "robots.txt") raws = refsFromRobots(fs.readFileSync(file, "utf8"));
  else continue;

  for (const raw of raws) {
    const ref = normalize(raw);
    if (!ref) continue;
    refCount++;
    const target = ref.startsWith("/")
      ? path.join(SITE, ref)
      : path.resolve(path.dirname(file), ref);
    if (!target.startsWith(SITE)) continue; // escapes the tree; check-links flags these
    // A directory reference ("zh/") is satisfied by, and marks as used, its index.html.
    referenced.add(fs.existsSync(target) && fs.statSync(target).isDirectory()
      ? path.join(target, "index.html")
      : target);
  }
}

const candidates = all.filter((f) => path.extname(f).toLowerCase() !== ".html");
const orphans = candidates.filter((f) => !referenced.has(f) && !ALLOWLIST.has(rel(f)));

console.log(BOLD("\nSHIPPED-ASSET ORPHAN AUDIT\n"));
console.log(
  `  scanned ${BOLD(all.length - candidates.length)} pages, ` +
    `${BOLD(candidates.length)} shipped non-HTML files, ` +
    `${BOLD(refCount)} references`
);

let failed = false;
if (candidates.length < MIN_FILES) {
  console.log(RED(`  ✗ floor: found ${candidates.length} shipped files, expected at least ${MIN_FILES}`));
  failed = true;
}
if (refCount < MIN_REFS) {
  console.log(RED(`  ✗ floor: found ${refCount} references, expected at least ${MIN_REFS}`));
  failed = true;
}

if (orphans.length) {
  console.log(RED(`\n  ✗ ${orphans.length} orphaned file(s) — shipped, referenced by nothing:\n`));
  let total = 0;
  for (const f of orphans.sort((a, b) => fs.statSync(b).size - fs.statSync(a).size)) {
    const size = fs.statSync(f).size;
    total += size;
    console.log(`      ${String(Math.round(size / 1024)).padStart(6)} KB   ${rel(f)}`);
  }
  console.log(`\n      ${Math.round(total / 1024)} KB total`);
  console.log(`\n  Each is either dead weight to prune, or intentional — in which case add it`);
  console.log(`  to ALLOWLIST with the reason, so the next run stays quiet for a stated cause.`);
  failed = true;
}

console.log(
  failed
    ? RED("\n✗ ORPHAN AUDIT: review the findings above\n")
    : GREEN("\n✓ EVERY SHIPPED FILE IS REFERENCED\n")
);
console.log(`  (${ALLOWLIST.size} file(s) allowlisted as intentionally unreferenced)\n`);
process.exit(failed ? 1 : 0);
