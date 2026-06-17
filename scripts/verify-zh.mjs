// /zh/ locale harness (Phase 1b → published).
//
// Sibling to verify.mjs (which is the PERMANENT EN parity net — never touched
// here). This asserts the Simplified-Chinese locale is in the correct state for
// the current site.zhPublished flag (src/_data/site.json) and is actually
// localized, for the two pages we localize: /zh/index.html and
// /zh/competition.html.
//
// The flag drives every gated assertion, so the harness is GREEN whether the
// locale is an unpublished preview (zhPublished:false) or live (true):
//
//   UNPUBLISHED (false)            PUBLISHED (true)
//   ─────────────────────          ─────────────────────────────────────────
//   noindex present                NO noindex
//   no hreflang anywhere           reciprocal hreflang (en/zh-Hans/x-default)
//                                  on the index/competition pairs ONLY
//   /zh/ absent from sitemap       /zh/ URLs present in sitemap (6 URLs total)
//   no language toggle             navbar language toggle renders: 中文 active +
//                                  "EN" → the EN counterpart (../ , ../competition.html)
//
// State-independent per-page checks (always asserted):
//   build        — the file exists in _site/.
//   <html lang>  — is exactly "zh-Hans" (BCP-47 Simplified Chinese).
//   canonical    — self: points at the page's OWN /zh/ URL (never changes).
//   chrome       — navbar (#navbar) and footer (#footer) both render.
//   links        — localized targets (index + competition, incl. #anchors)
//                  resolve UNDER /zh/ (relative), while not-yet-localized
//                  workshop + contact point to their EN URLs (../). No bare
//                  workshop.html / contact.html (which would 404 under /zh/).
//   assets       — css/js resolve up to the root (../css, ../js).
//   localized    — body contains CJK AND the English heading it replaced is
//                  gone (proof it's translated, not the EN copy).
//
// Site-wide it checks (gated on the flag):
//   sitemap      — /zh/ URLs present (published) or absent (unpublished).
//   hreflang     — emitted ONLY on the 4 localized pages index/competition +
//                  their /zh/ counterparts (published), or nowhere at all
//                  (unpublished). EN-only pages must NEVER carry hreflang.
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

// The publish gate — the single source of truth every gated assertion reads, so
// this harness is correct against EITHER committed state of the flag.
const SITE_DATA = JSON.parse(fs.readFileSync(path.join(ROOT, "src/_data/site.json"), "utf8"));
const PUBLISHED = SITE_DATA.zhPublished === true;

// The two localized pages. `enUrl`/`zhUrl` are the canonical pair URLs the
// reciprocal hreflang must advertise (en + x-default → enUrl, zh-Hans → zhUrl);
// `canonical` is the page's OWN (self) URL. `enGone`/`zhHas` prove translation.
// `enToggleHref` is the navbar language-toggle's EN-counterpart link, RELATIVE
// to this /zh/ page (the reciprocal of the EN page's "zh/…" link).
const PAGES = [
  {
    file: "zh/index.html",
    canonical: `${SITE_ORIGIN}/zh/`,
    enUrl: `${SITE_ORIGIN}/`,
    zhUrl: `${SITE_ORIGIN}/zh/`,
    enToggleHref: "../",
    enGone: "Two Ways to Engage",
    zhHas: "两种参与方式",
  },
  {
    file: "zh/competition.html",
    canonical: `${SITE_ORIGIN}/zh/competition.html`,
    enUrl: `${SITE_ORIGIN}/competition.html`,
    zhUrl: `${SITE_ORIGIN}/zh/competition.html`,
    enToggleHref: "../competition.html",
    enGone: "Why This Benchmark",
    zhHas: "为何需要此基准",
  },
];

// The full set of pages that ARE allowed hreflang when published; every other
// built page (workshop/contact/404/contact-success/contact-test) must have none.
const LOCALIZED_PAGES = new Set([
  "index.html",
  "competition.html",
  "zh/index.html",
  "zh/competition.html",
]);

// The three reciprocal hreflang <link>s a localized page must emit when published.
const hreflangLines = (p) => [
  `<link rel="alternate" hreflang="en" href="${p.enUrl}" />`,
  `<link rel="alternate" hreflang="zh-Hans" href="${p.zhUrl}" />`,
  `<link rel="alternate" hreflang="x-default" href="${p.enUrl}" />`,
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

// All built HTML files, as forward-slash paths relative to _site/.
function allHtml(dir = SITE, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) allHtml(p, out);
    else if (e.name.endsWith(".html")) out.push(p);
  }
  return out;
}
const relSite = (f) => path.relative(SITE, f).split(path.sep).join("/");

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

  // noindex / hreflang are gated on the publish flag.
  const hasNoindex = /<meta name="robots" content="noindex"\s*\/?>/.test(html);
  const hreflangCount = (html.match(/rel="alternate" hreflang=/g) || []).length;
  if (PUBLISHED) {
    add("no noindex (published)", !hasNoindex, "published zh page must NOT be noindex");
    add(
      "hreflang reciprocal (en/zh-Hans/x-default)",
      hreflangLines(p).every((l) => html.includes(l)),
      `expected reciprocal hreflang:\n      ${hreflangLines(p).join("\n      ")}`,
    );
    add("exactly 3 hreflang", hreflangCount === 3, `expected 3 hreflang links, found ${hreflangCount}`);
  } else {
    add("noindex (unpublished)", hasNoindex, "expected <meta name=robots content=noindex>");
    add("no hreflang (unpublished)", hreflangCount === 0, "unpublished page must emit no hreflang");
  }

  add(
    "canonical=self",
    html.includes(`<link rel="canonical" href="${p.canonical}" />`),
    `expected canonical ${p.canonical}`,
  );
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

  // In-page language toggle (navbar) — gated on the publish flag, mirroring the
  // hreflang relationship. On a published /zh/ page "中文" is the active option
  // and "EN" links to the EN counterpart; while unpublished the toggle is absent.
  if (PUBLISHED) {
    add(
      "lang toggle group",
      /<span class="lang-toggle" role="group" aria-label="[^"]+">/.test(html),
      "language toggle group did not render",
    );
    add(
      "lang toggle: 中文 active",
      html.includes(
        '<span class="lang-opt is-active" lang="zh-Hans" aria-current="true">中文</span>',
      ),
      "expected 中文 marked active (aria-current, lang=zh-Hans)",
    );
    add(
      `lang toggle: EN → ${p.enToggleHref}`,
      html.includes(`<a class="lang-opt" lang="en" hreflang="en" href="${p.enToggleHref}">EN</a>`),
      `expected EN counterpart link href="${p.enToggleHref}" with hreflang="en"`,
    );
  } else {
    add(
      "no lang toggle (unpublished)",
      !/class="lang-toggle"/.test(html),
      "unpublished /zh/ page must not render the language toggle",
    );
  }

  return checks;
}

function main() {
  if (!process.argv.includes("--no-build")) {
    console.log(BOLD("Building site (eleventy)…"));
    buildSite();
  }
  console.log(
    BOLD(`\nVerifying /zh/ Simplified-Chinese locale — state: ${PUBLISHED ? "PUBLISHED" : "UNPUBLISHED"}\n`),
  );

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
  const locCount = (sitemap.match(/<loc>/g) || []).length;
  const siteAdd = (name, ok, msg = "") => {
    console.log(`    ${ok ? GREEN("PASS") : RED("FAIL")}  ${name}`);
    if (!ok) {
      allOk = false;
      fails.push(`site-wide — ${name}: ${msg}`);
    }
  };

  if (PUBLISHED) {
    for (const p of PAGES) {
      siteAdd(
        `sitemap lists ${p.zhUrl}`,
        sitemap.includes(`<loc>${p.zhUrl}</loc>`),
        `sitemap.xml missing <loc>${p.zhUrl}</loc>`,
      );
    }
    siteAdd("sitemap has 6 URLs (4 EN + 2 zh)", locCount === 6, `expected 6 <loc>, found ${locCount}`);
  } else {
    siteAdd("sitemap excludes /zh/", !/\/zh\//.test(sitemap), "sitemap.xml contains a /zh/ entry");
    siteAdd("sitemap has 4 URLs (EN only)", locCount === 4, `expected 4 <loc>, found ${locCount}`);
  }

  // hreflang sweep: published → exactly the 4 localized pages; else → nowhere.
  const withHreflang = allHtml()
    .filter((f) => /hreflang/.test(fs.readFileSync(f, "utf8")))
    .map(relSite)
    .sort();
  if (PUBLISHED) {
    const expected = [...LOCALIZED_PAGES].sort();
    const ok =
      withHreflang.length === expected.length && withHreflang.every((f, i) => f === expected[i]);
    siteAdd(
      "hreflang ONLY on the 4 localized pages",
      ok,
      `expected [${expected.join(", ")}], got [${withHreflang.join(", ")}]`,
    );
  } else {
    siteAdd(
      "no hreflang anywhere in _site (EN or zh)",
      withHreflang.length === 0,
      `hreflang found in: ${withHreflang.join(", ")}`,
    );
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
