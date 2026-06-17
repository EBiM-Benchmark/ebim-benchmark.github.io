// /zh/ preview harness (Phase 1b).
//
// Sibling to verify.mjs (which is the PERMANENT EN parity net — never touched
// here). This asserts the Simplified-Chinese preview is correctly UNPUBLISHED
// and actually localized, for the two pages we localize: /zh/index.html and
// /zh/competition.html.
//
// Per page it checks:
//   build        — the file exists in _site/.
//   <html lang>  — is exactly "zh-Hans" (BCP-47 Simplified Chinese).
//   noindex      — <meta name="robots" content="noindex"> is present (the
//                  zhPublished:false gate).
//   canonical    — points at the page's OWN /zh/ URL.
//   no hreflang  — this file emits no rel="alternate" hreflang link.
//   chrome       — navbar (#navbar) and footer (#footer) both render.
//   links        — localized targets (index + competition, incl. #anchors)
//                  resolve UNDER /zh/ (relative), while not-yet-localized
//                  workshop + contact point to their EN URLs (../). No bare
//                  workshop.html / contact.html (which would 404 under /zh/).
//   assets       — css/js resolve up to the root (../css, ../js).
//   localized    — body contains CJK AND the English heading it replaced is
//                  gone (proof it's translated, not the EN copy).
//
// Site-wide it checks:
//   sitemap      — sitemap.xml contains no /zh/ entry.
//   hreflang     — NO file in _site/ emits hreflang (EN or zh).
//
// Usage:  node scripts/verify-zh.mjs            (builds, then verifies)
//         node scripts/verify-zh.mjs --no-build (verify an existing _site)
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const SITE = path.join(ROOT, "_site");

const GREEN = (s) => `\x1b[32m${s}\x1b[0m`;
const RED = (s) => `\x1b[31m${s}\x1b[0m`;
const BOLD = (s) => `\x1b[1m${s}\x1b[0m`;

const SITE_ORIGIN = "https://ebim-benchmark.github.io";

// The two localized pages, with the EN heading each zh body must NOT contain
// (and the zh heading it must) — proof the body is translated, not EN copy.
const PAGES = [
  {
    file: "zh/index.html",
    canonical: `${SITE_ORIGIN}/zh/`,
    enGone: "Two Ways to Engage",
    zhHas: "两种参与方式",
  },
  {
    file: "zh/competition.html",
    canonical: `${SITE_ORIGIN}/zh/competition.html`,
    enGone: "Why This Benchmark",
    zhHas: "为何需要此基准",
  },
];

const read = (rel) => fs.readFileSync(path.join(SITE, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(SITE, rel));

function buildSite() {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(ROOT, "node_modules/@11ty/eleventy/package.json"), "utf8"),
  );
  const bin = typeof pkg.bin === "string" ? pkg.bin : pkg.bin.eleventy;
  const entry = path.join(ROOT, "node_modules/@11ty/eleventy", bin);
  const res = spawnSync(process.execPath, [entry], { encoding: "utf8", stdio: "inherit" });
  if (res.status !== 0) throw new Error("Eleventy build failed");
}

// The <main>…</main> body, comments stripped (so commented-out EN can't fool us).
const bodyOf = (html) => {
  const m = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/);
  return (m ? m[1] : html).replace(/<!--[\s\S]*?-->/g, "");
};
const hasCJK = (s) => /[㐀-鿿]/.test(s);

// All built HTML files (for the site-wide hreflang sweep).
function allHtml(dir = SITE, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) allHtml(p, out);
    else if (e.name.endsWith(".html")) out.push(p);
  }
  return out;
}

// ── per-page checks: each returns { ok, msg } ──
function pageChecks(p) {
  const checks = [];
  const add = (name, ok, msg = "") => checks.push({ name, ok, msg });

  if (!exists(p.file)) {
    add("build", false, `_site/${p.file} missing`);
    return checks; // nothing else is meaningful
  }
  add("build", true);

  const html = read(p.file);
  const body = bodyOf(html);

  add("lang=zh-Hans", /<html lang="zh-Hans">/.test(html), 'expected <html lang="zh-Hans">');
  add(
    "noindex",
    /<meta name="robots" content="noindex"\s*\/?>/.test(html),
    "expected <meta name=robots content=noindex>",
  );
  add(
    "canonical=self",
    html.includes(`<link rel="canonical" href="${p.canonical}" />`),
    `expected canonical ${p.canonical}`,
  );
  add("no hreflang", !/hreflang/.test(html), "page must emit no hreflang");
  add("navbar", /<nav id="navbar"/.test(html), "navbar did not render");
  add("footer", /<footer id="footer"/.test(html), "footer did not render");

  // Localized targets resolve under /zh/ (relative, no ../); EN targets use ../.
  add(
    "links→zh (index/competition)",
    /href="index\.html(#[^"]*)?"/.test(html) && /href="competition\.html(#[^"]*)?"/.test(html),
    "expected relative index.html / competition.html links (resolve under /zh/)",
  );
  add(
    "links→EN (workshop/contact via ../)",
    html.includes('href="../workshop.html') && html.includes('href="../contact.html'),
    "expected ../workshop.html and ../contact.html (EN targets)",
  );
  add(
    "no bare workshop/contact (would 404 under /zh/)",
    !/href="workshop\.html/.test(html) && !/href="contact\.html/.test(html),
    "found a bare workshop.html/contact.html link that would 404 under /zh/",
  );

  // Assets resolve up to the site root.
  add(
    "assets→../",
    html.includes('href="../css/style.css"') && html.includes('src="../js/main.js"'),
    "expected ../css/style.css and ../js/main.js",
  );

  // Translated, not the EN copy.
  add("body has CJK", hasCJK(body), "body contains no CJK text");
  add(`zh heading present (“${p.zhHas}”)`, body.includes(p.zhHas), `missing zh heading ${p.zhHas}`);
  add(
    `EN heading gone (“${p.enGone}”)`,
    !body.includes(p.enGone),
    `EN heading "${p.enGone}" still present — body not translated`,
  );

  return checks;
}

function main() {
  if (!process.argv.includes("--no-build")) {
    console.log(BOLD("Building site (eleventy)…"));
    buildSite();
  }
  console.log(BOLD("\nVerifying /zh/ Simplified-Chinese preview (Phase 1b)\n"));

  let allOk = true;
  const fails = [];

  for (const p of PAGES) {
    console.log(BOLD(`• ${p.file}`));
    for (const c of pageChecks(p)) {
      console.log(`    ${c.ok ? GREEN("PASS") : RED("FAIL")}  ${c.name}`);
      if (!c.ok) {
        allOk = false;
        fails.push(`${p.file} — ${c.name}: ${c.msg}`);
      }
    }
    console.log("");
  }

  // ── site-wide ──
  console.log(BOLD("• site-wide"));
  const sitemap = exists("sitemap.xml") ? read("sitemap.xml") : "";
  const sitemapOk = !/\/zh\//.test(sitemap);
  console.log(`    ${sitemapOk ? GREEN("PASS") : RED("FAIL")}  sitemap.xml excludes /zh/`);
  if (!sitemapOk) {
    allOk = false;
    fails.push("sitemap.xml — contains a /zh/ entry");
  }

  const withHreflang = allHtml().filter((f) => /hreflang/.test(fs.readFileSync(f, "utf8")));
  const hreflangOk = withHreflang.length === 0;
  console.log(
    `    ${hreflangOk ? GREEN("PASS") : RED("FAIL")}  no hreflang anywhere in _site (EN or zh)`,
  );
  if (!hreflangOk) {
    allOk = false;
    fails.push(`hreflang found in: ${withHreflang.map((f) => path.relative(SITE, f)).join(", ")}`);
  }
  console.log("");

  if (fails.length) {
    console.log(BOLD("Failures"));
    for (const f of fails) console.log("  • " + f);
    console.log("");
  }
  console.log(allOk ? GREEN(BOLD("✓ ALL ZH CHECKS PASSED")) : RED(BOLD("✗ ZH CHECKS FAILED")));
  process.exit(allOk ? 0 : 1);
}

main();
