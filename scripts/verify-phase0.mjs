// Phase 0 acceptance harness.
//
// Proves the Eleventy build is semantically identical to the previously
// hand-authored static site committed on `main`. For each page it fetches the
// ORIGINAL committed HTML (git show <base>:<file>) and checks it against the
// freshly built _site/<file> on four axes:
//
//   structure  — markup (tags/attrs/text/order) is identical. Comments and
//                <script> bodies are removed from BOTH sides first (they are
//                checked separately), then Prettier (parser:"html") formats
//                each and the results are compared (blank lines ignored).
//   comments   — the ordered list of HTML comments is identical, except the
//                obsolete "<!-- SHARED NAVBAR/FOOTER — keep in sync … -->"
//                scaffolding comments, whose removal is migration diff "(a)".
//   json-ld    — every <script type="application/ld+json"> block is deep-equal
//                (order-insensitive) to the original. [index/competition/
//                workshop/contact]
//   extra      — contact.html: data-slug values + slug-keyed inline script +
//                untouched form internals. contact-test.html: inline behavior
//                <script> is byte-for-byte unchanged.
//
// Expected: every page PASSES every applicable axis. The only intended diffs
// are (a) shared chrome now comes from includes (sync comments removed) and
// (b) contact.html gains data-slug attributes + a rewritten inline script.
//
// Usage:  node scripts/verify-phase0.mjs            (builds, then verifies)
//         node scripts/verify-phase0.mjs --no-build (verify an existing _site)
//         BASE_REF=origin/main node scripts/verify-phase0.mjs
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import prettier from "prettier";

const ROOT = process.cwd();
const SITE = path.join(ROOT, "_site");

const PAGES = [
  "index.html",
  "competition.html",
  "workshop.html",
  "contact.html",
  "404.html",
  "contact-success.html",
  "contact-test.html",
];
const JSONLD_PAGES = new Set(["index.html", "competition.html", "workshop.html", "contact.html"]);
const CONTACT = "contact.html";
const SCRIPT_UNCHANGED = new Set(["contact-test.html"]);

const GREEN = (s) => `\x1b[32m${s}\x1b[0m`;
const RED = (s) => `\x1b[31m${s}\x1b[0m`;
const BOLD = (s) => `\x1b[1m${s}\x1b[0m`;
const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, "");

// ─────────────────────────────────────────────────────────────── helpers ──

const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { encoding: "utf8", ...opts });
const normalizeEol = (s) => s.replace(/\r\n/g, "\n");

function buildSite() {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(ROOT, "node_modules/@11ty/eleventy/package.json"), "utf8"),
  );
  const bin = typeof pkg.bin === "string" ? pkg.bin : pkg.bin.eleventy;
  const entry = path.join(ROOT, "node_modules/@11ty/eleventy", bin);
  const res = run(process.execPath, [entry], { stdio: "inherit" });
  if (res.status !== 0) throw new Error("Eleventy build failed");
}

let RESOLVED_BASE = null;
function resolveBaseRef() {
  if (RESOLVED_BASE) return RESOLVED_BASE;
  const candidates = [process.env.BASE_REF, "main", "origin/main"].filter(Boolean);
  for (const ref of candidates) {
    if (run("git", ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`]).status === 0) {
      return (RESOLVED_BASE = ref);
    }
  }
  throw new Error(
    `Could not resolve a base ref (tried: ${candidates.join(", ")}). ` +
      `In CI, check out with fetch-depth: 0 or set BASE_REF.`,
  );
}

function getOriginal(file) {
  const ref = resolveBaseRef();
  const res = run("git", ["show", `${ref}:${file}`]);
  if (res.status !== 0) throw new Error(`git show ${ref}:${file} failed: ${res.stderr.trim()}`);
  return normalizeEol(res.stdout);
}
function getBuilt(file) {
  const p = path.join(SITE, file);
  if (!fs.existsSync(p)) throw new Error(`Built file missing: _site/${file} (did the build run?)`);
  return normalizeEol(fs.readFileSync(p, "utf8"));
}

// Match each HTML comment individually (lazy to its own first "-->"), so nothing
// ever spans across other comments / markup.
const COMMENT_RE = /<!--[\s\S]*?-->/g;
const removeComments = (html) => html.replace(COMMENT_RE, "");
const isSyncComment = (c) => /keep in sync/.test(c);
// Empty every <script>…</script> body (run AFTER removeComments so a "<script>"
// appearing inside a comment can't fool the matcher).
const stripScriptBodies = (html) => html.replace(/(<script\b[^>]*>)[^]*?(<\/script>)/g, "$1$2");
const stripDataSlug = (html) => html.replace(/\s+data-slug="[^"]*"/g, "");

const fmt = (html) => prettier.format(html, { parser: "html" });
// Drop blank lines + trailing whitespace ("insignificant whitespace" per spec).
const collapse = (s) =>
  s
    .split("\n")
    .map((l) => l.replace(/\s+$/, ""))
    .filter((l) => l !== "")
    .join("\n");

function firstDiff(a, b) {
  const la = a.split("\n");
  const lb = b.split("\n");
  const n = Math.max(la.length, lb.length);
  for (let i = 0; i < n; i++) {
    if (la[i] !== lb[i]) {
      const ctx = [];
      for (let j = Math.max(0, i - 3); j <= i + 3 && j < n; j++) {
        const mark = j === i ? RED("✗") : " ";
        ctx.push(`    ${mark} ${String(j + 1).padStart(4)} exp: ${JSON.stringify(la[j] ?? "")}`);
        if (la[j] !== lb[j]) ctx.push(`           ${String(j + 1).padStart(4)} got: ${JSON.stringify(lb[j] ?? "")}`);
      }
      return `first difference at line ${i + 1} (exp ${la.length} / got ${lb.length}):\n${ctx.join("\n")}`;
    }
  }
  return null;
}

// ── JSON-LD deep-equality (order-insensitive) ──
function canonicalize(v) {
  if (Array.isArray(v)) {
    return v.map(canonicalize).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }
  if (v && typeof v === "object") {
    const out = {};
    for (const k of Object.keys(v).sort()) out[k] = canonicalize(v[k]);
    return out;
  }
  return v;
}
function extractJsonLd(html) {
  const re = /<script type="application\/ld\+json">([^]*?)<\/script>/g;
  const blocks = [];
  let m;
  while ((m = re.exec(html))) blocks.push(JSON.parse(m[1]));
  return blocks;
}

// The attribute-less inline behavior script body (comment-safe), or null.
function inlineScriptBody(html) {
  const re = /<script\b([^>]*)>([^]*?)<\/script>/g;
  const clean = removeComments(html);
  let m;
  while ((m = re.exec(clean))) if (m[1].trim() === "") return m[2];
  return null;
}

// ─────────────────────────────────────────────────────────────── checks ──

async function checkStructure(file) {
  const prep = (html, isBuilt) => {
    let h = removeComments(html);
    if (file === CONTACT && isBuilt) h = stripDataSlug(h);
    return stripScriptBodies(h);
  };
  const fo = collapse(await fmt(prep(getOriginal(file), false)));
  const fb = collapse(await fmt(prep(getBuilt(file), true)));
  return fo === fb ? { ok: true } : { ok: false, detail: firstDiff(fo, fb) };
}

function checkComments(file) {
  const norm = (c) => c.replace(/\s+/g, " ").trim();
  const orig = (getOriginal(file).match(COMMENT_RE) || []).filter((c) => !isSyncComment(c)).map(norm);
  const built = (getBuilt(file).match(COMMENT_RE) || []).map(norm);
  if (built.some(isSyncComment)) return { ok: false, detail: "build still contains a sync comment" };
  if (orig.length !== built.length)
    return { ok: false, detail: `comment count: orig(−sync) ${orig.length} vs built ${built.length}` };
  for (let i = 0; i < orig.length; i++)
    if (orig[i] !== built[i])
      return { ok: false, detail: `comment #${i + 1} differs:\n    exp: ${orig[i]}\n    got: ${built[i]}` };
  return { ok: true, count: built.length };
}

function checkJsonLd(file) {
  const orig = extractJsonLd(getOriginal(file)).map(canonicalize);
  const built = extractJsonLd(getBuilt(file)).map(canonicalize);
  if (orig.length !== built.length)
    return { ok: false, detail: `block count: orig ${orig.length} vs built ${built.length}` };
  for (let i = 0; i < orig.length; i++)
    if (JSON.stringify(orig[i]) !== JSON.stringify(built[i]))
      return { ok: false, detail: `JSON-LD block #${i + 1} differs (deep-equal failed)` };
  return { ok: true, count: orig.length };
}

function checkInlineScriptUnchanged(file) {
  const o = inlineScriptBody(getOriginal(file));
  const b = inlineScriptBody(getBuilt(file));
  if (o === null) return { ok: false, detail: "no inline <script> in original" };
  if (b === null) return { ok: false, detail: "no inline <script> in build" };
  return collapse(o) === collapse(b)
    ? { ok: true }
    : { ok: false, detail: firstDiff(collapse(o), collapse(b)) };
}

function checkContactSpecific() {
  const built = getBuilt(CONTACT);
  const problems = [];

  // 1) data-slug present + correct on each real option (placeholder excluded).
  const expectSlug = {
    "Competition Question": "competition",
    "Competition — Register Interest": "register",
    "Workshop / Poster Submission": "workshop",
    "Partnership Inquiry": "partner",
    "Media / Press": "media",
    "Technical (Platform / Website)": "tech",
    "Partnership / Testbed Hosting": "testbed",
    "Other / General": "other",
  };
  const optRe = /<option value="([^"]*)"([^>]*)>/g;
  const seen = {};
  let m;
  while ((m = optRe.exec(built))) {
    const value = m[1];
    const slugM = m[2].match(/data-slug="([^"]*)"/);
    if (value === "") {
      if (slugM) problems.push("placeholder <option> should NOT have data-slug");
      continue;
    }
    if (!slugM) problems.push(`option "${value}" missing data-slug`);
    else seen[value] = slugM[1];
  }
  for (const [value, slug] of Object.entries(expectSlug)) {
    if (seen[value] !== slug)
      problems.push(`option "${value}" data-slug=${JSON.stringify(seen[value])}, expected "${slug}"`);
  }

  // 2) option value= attributes (the Web3Forms payload) unchanged from today.
  const origValues = [...getOriginal(CONTACT).matchAll(optRe)].map((x) => x[1]);
  const builtValues = [...built.matchAll(optRe)].map((x) => x[1]);
  if (JSON.stringify(origValues) !== JSON.stringify(builtValues))
    problems.push("option value= attributes differ from the original (payload changed!)");

  // 3) inline script slug-keyed as specified.
  const js = inlineScriptBody(built) || "";
  const must = [
    [/var DISCORD_TOPICS = \['competition', 'register', 'workshop'\]/, "DISCORD_TOPICS slug array"],
    [/dataset\.slug/, "reads option dataset.slug"],
    [/prefixMap\[slug\]\s*\|\|\s*'\[CONTACT\] '/, "subject = prefixMap[slug] || [CONTACT]"],
    [/competition:\s*'\[COMPETITION\] '/, "prefixMap keyed by slug"],
    [/partnership:\s*'testbed'/, "?topic=partnership → testbed"],
    [/headers:\s*\{\s*'Accept':\s*'application\/json'\s*\}/, "AJAX Accept: application/json header"],
  ];
  for (const [re, label] of must) if (!re.test(js)) problems.push(`inline script: missing ${label}`);

  // 4) untouched form internals.
  for (const [needle, label] of [
    ['name="access_key" value="748f5c30-e7fd-49b0-9eb5-5c1c92f03f78"', "access_key hidden field"],
    ['name="redirect" value="https://ebim-benchmark.github.io/contact-success.html"', "redirect hidden field"],
    ['name="botcheck"', "honeypot field"],
    ['action="https://api.web3forms.com/submit"', "form action"],
  ]) {
    if (!built.includes(needle)) problems.push(`${label} changed/missing`);
  }

  return { ok: problems.length === 0, problems };
}

// Show the exact intended remaining diff on contact.html (data-slug + script).
async function showContactIntendedDiff() {
  const a = collapse(await fmt(getOriginal(CONTACT).replace(COMMENT_RE, (c) => (isSyncComment(c) ? "" : c))));
  const b = collapse(await fmt(getBuilt(CONTACT)));
  const setA = new Set(a.split("\n"));
  const setB = new Set(b.split("\n"));
  return {
    removed: a.split("\n").filter((l) => !setB.has(l) && l.trim()),
    added: b.split("\n").filter((l) => !setA.has(l) && l.trim()),
  };
}

// ───────────────────────────────────────────────────────────────── main ──

async function main() {
  if (!process.argv.includes("--no-build")) {
    console.log(BOLD("Building site (eleventy)…"));
    buildSite();
  }
  console.log(BOLD(`\nVerifying against base ref: ${resolveBaseRef()}\n`));

  const rows = [];
  let allOk = true;
  const fail = (row, msg) => {
    allOk = false;
    row.details.push(msg);
  };
  const guard = async (row, key, label, fn) => {
    try {
      const r = await fn();
      row[key] = r.ok ? GREEN(typeof r.count === "number" ? `PASS (${r.count})` : "PASS") : RED("FAIL");
      if (!r.ok) fail(row, `${label}: ${r.detail}`);
    } catch (e) {
      row[key] = RED("ERROR");
      fail(row, `${label}: ${e.message}`);
    }
  };

  for (const file of PAGES) {
    const row = { file, structure: "—", comments: "—", jsonld: "—", extra: "—", details: [] };
    await guard(row, "structure", "structure", () => checkStructure(file));
    await guard(row, "comments", "comments", async () => checkComments(file));
    if (JSONLD_PAGES.has(file)) await guard(row, "jsonld", "json-ld", async () => checkJsonLd(file));
    if (file === CONTACT) {
      await guard(row, "extra", "contact", async () => {
        const c = checkContactSpecific();
        return c.ok ? { ok: true } : { ok: false, detail: c.problems.join("\n    ") };
      });
    } else if (SCRIPT_UNCHANGED.has(file)) {
      await guard(row, "extra", "inline-script", async () => {
        const c = checkInlineScriptUnchanged(file);
        return c.ok ? { ok: true } : c;
      });
    }
    rows.push(row);
  }

  // ── Table ──
  const pad = (s, n) => s + " ".repeat(Math.max(0, n - stripAnsi(s).length));
  const W = [24, 12, 12, 14, 10];
  console.log(BOLD("Per-page results"));
  console.log("  " + ["page", "structure", "comments", "json-ld", "extra"].map((s, i) => pad(s, W[i])).join(""));
  console.log("  " + "─".repeat(70));
  for (const r of rows)
    console.log(
      "  " + [pad(r.file, W[0]), pad(r.structure, W[1]), pad(r.comments, W[2]), pad(r.jsonld, W[3]), pad(r.extra, W[4])].join(""),
    );

  // ── Failure details ──
  const failures = rows.filter((r) => r.details.length);
  if (failures.length) {
    console.log("\n" + BOLD("Failure details"));
    for (const r of failures) {
      console.log(`\n• ${BOLD(r.file)}`);
      for (const d of r.details) console.log("  " + d.replace(/\n/g, "\n  "));
    }
  }

  // ── Intended contact diff (informational) ──
  try {
    const { removed, added } = await showContactIntendedDiff();
    console.log("\n" + BOLD("contact.html — intended remaining diff (data-slug + inline behavior script)"));
    console.log(`  lines only in ORIGINAL: ${removed.length}, only in BUILT: ${added.length}`);
    removed.slice(0, 10).forEach((l) => console.log(`  ${RED("−")} ${l.trim().slice(0, 118)}`));
    added.slice(0, 10).forEach((l) => console.log(`  ${GREEN("+")} ${l.trim().slice(0, 118)}`));
  } catch (e) {
    console.log("  (could not compute intended diff: " + e.message + ")");
  }

  console.log("\n" + (allOk ? GREEN(BOLD("✓ ALL CHECKS PASSED")) : RED(BOLD("✗ CHECKS FAILED"))));
  process.exit(allOk ? 0 : 1);
}

main().catch((e) => {
  console.error(RED("Harness crashed: " + e.stack));
  process.exit(2);
});
