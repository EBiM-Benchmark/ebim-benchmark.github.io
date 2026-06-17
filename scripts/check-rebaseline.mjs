// One-off GUARD for the EN re-baseline (regenerate fixtures from the build).
//
// Proves the OLD (committed at HEAD) tests/baseline/*.html and the NEW
// (working-tree, freshly copied from _site) fixtures differ ONLY in formatting:
//   • JSON-LD indentation (4-space hand-authored → dump(2) 2-space) — the
//     jsonld.njk include renders index + competition via dump(2).
//   • the footer copyright reflow (the single-line t.footer.copy) — all 7 pages.
//   • one JSON-LD-adjacent blank line the dump(2) include emits — index +
//     competition (whitespace only; Prettier / verify.mjs's collapse erase it).
// Any content, attribute, structural, or JSON-LD DATA difference is a FAIL.
//
// It reuses verify.mjs's exact comparators (EOL-normalize; strip comments +
// <script> bodies, then Prettier(parser:"html") for structure; canonicalized
// deep-equal for JSON-LD; the HTML-comment list; the attribute-less inline
// <script> body). On top of that it does a precise raw-byte check: after
// neutralizing (a) JSON-LD indentation, (b) the footer-copy inner whitespace,
// and (c) blank lines + trailing whitespace (all formatting), the bytes must be
// identical — so no content/attr/text difference can hide anywhere else.
//
// OLD is read via `git show HEAD:tests/baseline/<f>`; NEW from disk.
// Usage:  node scripts/check-rebaseline.mjs
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import prettier from "prettier";

const ROOT = process.cwd();
const BASELINE = path.join(ROOT, "tests", "baseline");
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
const INLINE_SCRIPT_PAGES = new Set(["contact.html", "contact-test.html"]);

const GREEN = (s) => `\x1b[32m${s}\x1b[0m`;
const RED = (s) => `\x1b[31m${s}\x1b[0m`;
const BOLD = (s) => `\x1b[1m${s}\x1b[0m`;

// ── verify.mjs comparators (replicated; verify.mjs is left untouched) ──
const normalizeEol = (s) => s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
const COMMENT_RE = /<!--[\s\S]*?-->/g;
const removeComments = (h) => h.replace(COMMENT_RE, "");
const stripScriptBodies = (h) => h.replace(/(<script\b[^>]*>)[^]*?(<\/script>)/g, "$1$2");
const fmt = (h) => prettier.format(h, { parser: "html" });
const collapse = (s) =>
  s
    .split("\n")
    .map((l) => l.replace(/\s+$/, ""))
    .filter((l) => l !== "")
    .join("\n");

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
const JSONLD_RE = /<script type="application\/ld\+json">([^]*?)<\/script>/g;
function extractJsonLd(h) {
  const out = [];
  let m;
  const re = new RegExp(JSONLD_RE.source, "g");
  while ((m = re.exec(h))) out.push(JSON.parse(m[1]));
  return out;
}
function inlineScriptBody(h) {
  const re = /<script\b([^>]*)>([^]*?)<\/script>/g;
  const clean = removeComments(h);
  let m;
  while ((m = re.exec(clean))) if (m[1].trim() === "") return m[2];
  return null;
}

// ── OLD (HEAD) vs NEW (disk), both EOL-normalized ──
const OLD = (f) => {
  const r = spawnSync("git", ["show", `HEAD:tests/baseline/${f}`], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`git show HEAD:tests/baseline/${f} failed: ${r.stderr}`);
  return normalizeEol(r.stdout);
};
const NEW = (f) => normalizeEol(fs.readFileSync(path.join(BASELINE, f), "utf8"));

// Neutralize ONLY the two allowed formatting diffs; everything else stays raw.
const neutralize = (h) => {
  let s = h.replace(
    new RegExp(JSONLD_RE.source, "g"),
    (_m, b) => `<script type="application/ld+json">${JSON.stringify(canonicalize(JSON.parse(b)))}</script>`,
  );
  s = s.replace(
    /(<div class="footer-copy">)([\s\S]*?)(<\/div>)/,
    (_m, a, b, c) => a + b.replace(/\s+/g, " ").trim() + c,
  );
  return s;
};
const rawJsonLd = (h) => (h.match(new RegExp(JSONLD_RE.source, "g")) || []).join("\n \n");
const rawFooter = (h) => {
  const m = h.match(/<div class="footer-copy">([\s\S]*?)<\/div>/);
  return m ? m[1] : "";
};

async function checkPage(file) {
  const oldH = OLD(file);
  const newH = NEW(file);
  const problems = [];

  // structure — Prettier-normalized markup (scripts + comments stripped)
  const prep = (h) => stripScriptBodies(removeComments(h));
  const so = collapse(await fmt(prep(oldH)));
  const sn = collapse(await fmt(prep(newH)));
  const structureOk = so === sn;
  if (!structureOk) problems.push("STRUCTURE differs (markup/attrs/text/order) — NOT formatting-only");

  // comments — identical ordered list
  const normC = (c) => c.replace(/\s+/g, " ").trim();
  const oc = (oldH.match(COMMENT_RE) || []).map(normC);
  const nc = (newH.match(COMMENT_RE) || []).map(normC);
  const commentsOk = oc.length === nc.length && oc.every((c, i) => c === nc[i]);
  if (!commentsOk) problems.push(`COMMENTS differ (old ${oc.length} / new ${nc.length})`);

  // json-ld — every block deep-equal (order-insensitive)
  let jsonldOk = true;
  if (JSONLD_PAGES.has(file)) {
    const ob = extractJsonLd(oldH).map(canonicalize);
    const nb = extractJsonLd(newH).map(canonicalize);
    jsonldOk =
      ob.length === nb.length && ob.every((b, i) => JSON.stringify(b) === JSON.stringify(nb[i]));
    if (!jsonldOk) problems.push("JSON-LD DATA differs (deep-equal failed) — NOT formatting-only");
  }

  // inline-script — attribute-less <script> body identical
  let inlineOk = true;
  if (INLINE_SCRIPT_PAGES.has(file)) {
    const o = inlineScriptBody(oldH);
    const n = inlineScriptBody(newH);
    inlineOk = o !== null && n !== null && collapse(o) === collapse(n);
    if (!inlineOk) problems.push("INLINE <script> body differs — NOT formatting-only");
  }

  // raw-cat — after neutralizing JSON-LD indent + footer-copy whitespace AND
  // collapsing blank lines / trailing whitespace (all formatting), the bytes
  // must be identical: any non-whitespace residual would be real content.
  const rawCatOk = collapse(neutralize(oldH)) === collapse(neutralize(newH));
  if (!rawCatOk)
    problems.push(
      "Non-whitespace bytes differ OUTSIDE the JSON-LD + footer-copy regions — investigate!",
    );

  // categorize the (allowed, formatting-only) raw differences
  const jsonldIndentChanged = rawJsonLd(oldH) !== rawJsonLd(newH);
  const footerReflowed = rawFooter(oldH) !== rawFooter(newH);
  const blankLineDelta =
    newH.split("\n").filter((l) => l.trim() === "").length -
    oldH.split("\n").filter((l) => l.trim() === "").length;
  const rawIdentical = oldH === newH;

  return {
    file,
    structureOk,
    commentsOk,
    jsonldOk,
    inlineOk,
    rawCatOk,
    jsonldIndentChanged,
    footerReflowed,
    blankLineDelta,
    rawIdentical,
    problems,
  };
}

async function main() {
  console.log(BOLD("\nRe-baseline GUARD — OLD (HEAD) vs NEW (working tree), 7 EN fixtures\n"));
  const rows = [];
  for (const f of PAGES) rows.push(await checkPage(f));

  const mark = (ok) => (ok ? GREEN("PASS") : RED("FAIL"));
  const yn = (b) => (b ? "yes" : "no");
  const pad = (s, n) => s + " ".repeat(Math.max(0, n - s.replace(/\x1b\[[0-9;]*m/g, "").length));
  const W = [22, 11, 10, 9, 9, 9, 13, 10, 8];
  console.log(
    "  " +
      ["page", "structure", "comments", "json-ld", "inline", "raw-cat", "jsonld-indent", "footer", "blank±"]
        .map((s, i) => pad(s, W[i]))
        .join(""),
  );
  console.log("  " + "─".repeat(100));
  for (const r of rows) {
    console.log(
      "  " +
        [
          pad(r.file, W[0]),
          pad(mark(r.structureOk), W[1]),
          pad(mark(r.commentsOk), W[2]),
          pad(JSONLD_PAGES.has(r.file) ? mark(r.jsonldOk) : "—", W[3]),
          pad(INLINE_SCRIPT_PAGES.has(r.file) ? mark(r.inlineOk) : "—", W[4]),
          pad(mark(r.rawCatOk), W[5]),
          pad(r.jsonldIndentChanged ? "changed" : "—", W[6]),
          pad(r.footerReflowed ? "reflowed" : "—", W[7]),
          pad(r.blankLineDelta === 0 ? "—" : (r.blankLineDelta > 0 ? "+" : "") + r.blankLineDelta, W[8]),
        ].join(""),
    );
  }

  const failures = rows.filter((r) => r.problems.length);
  if (failures.length) {
    console.log("\n" + BOLD("Failures"));
    for (const r of failures) {
      console.log(`\n• ${BOLD(r.file)}`);
      for (const p of r.problems) console.log("  " + RED(p));
    }
  }

  const allOk = failures.length === 0;
  console.log(
    "\n" +
      (allOk
        ? GREEN(BOLD("✓ GUARD PASSED — every page is SEMANTICALLY EQUAL old→new (formatting-only)"))
        : RED(BOLD("✗ GUARD FAILED — a non-formatting difference exists; do NOT ship"))),
  );
  // Summary of which pages changed what (all allowed):
  const indent = rows.filter((r) => r.jsonldIndentChanged).map((r) => r.file);
  const footer = rows.filter((r) => r.footerReflowed).map((r) => r.file);
  console.log(`\n  JSON-LD indent changed: ${indent.length ? indent.join(", ") : "(none)"}`);
  console.log(`  footer reflowed:        ${footer.length ? footer.join(", ") : "(none)"}`);
  process.exit(allOk ? 0 : 1);
}

main().catch((e) => {
  console.error(RED("Guard crashed: " + e.stack));
  process.exit(2);
});
