// /zh/ locale harness (Phase 1b → 1d published index/competition; Phase 2b added
// workshop + contact as drafts; Phase 2c published them — all four /zh/ pages
// are now live).
//
// Sibling to verify.mjs (which is the PERMANENT EN parity net — never touched
// here). This asserts the Simplified-Chinese locale is in the correct state and
// is actually localized, for the FOUR pages we now ship: /zh/index.html,
// /zh/competition.html, /zh/workshop.html, /zh/contact.html.
//
// Publish state is now PER PAGE: src/_data/site.json `zhPublished` is a map keyed
// by i18nKey, e.g. { "index": true, "competition": true, "workshop": false,
// "contact": false }. Each page's gated assertions read THAT page's flag, so the
// harness is GREEN in any mix of published pages and drafts:
//
//   DRAFT (flag false)             PUBLISHED (flag true)
//   ─────────────────────          ─────────────────────────────────────────
//   noindex present                NO noindex
//   no hreflang on EN or zh        reciprocal hreflang (en/zh-Hans/x-default)
//                                  on this page's EN + /zh/ pair
//   /zh/ url absent from sitemap   /zh/ url present in sitemap
//   no language toggle             navbar language toggle: 中文 active +
//                                  "EN" → the EN counterpart
//
// State-independent per-page checks (always asserted):
//   build        — the file exists in _site/.
//   <html lang>  — is exactly "zh-Hans" (BCP-47 Simplified Chinese).
//   canonical    — self: points at the page's OWN /zh/ URL (never changes).
//   chrome       — navbar (#navbar) and footer (#footer) both render.
//   links        — all four localized targets (index/competition/workshop/
//                  contact, incl. #anchors and ?topic= suffixes) resolve UNDER
//                  /zh/ (relative). No zh→EN ../workshop.html / ../contact.html
//                  content links remain; the lone deliberate cross-locale link
//                  (the navbar toggle's EN counterpart) is stripped first.
//   assets       — css/js resolve up to the root (../css, ../js).
//   localized    — body contains CJK AND the English heading it replaced is
//                  gone (proof it's translated, not the EN copy).
//   contact form — (contact page only) the Web3Forms option value=/data-slug,
//                  the hidden fields + honeypot, and the inline behavior script
//                  are IDENTICAL to the EN contact page (single-sourced JS,
//                  untranslated payload) — only visible labels are localized.
//
// Site-wide it checks (per-page gated):
//   sitemap      — each PUBLISHED page's /zh/ url is present; each DRAFT's is
//                  absent. Total = 4 EN + (number of published zh).
//   hreflang     — emitted ONLY on the published localized pairs (EN + /zh/);
//                  never on a draft pair, and never on the EN-only utility pages.
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

// The publish gate — the PER-PAGE map (keyed by i18nKey) every gated assertion
// reads, so this harness is correct against ANY committed mix of the flags.
const SITE_DATA = JSON.parse(fs.readFileSync(path.join(ROOT, "src/_data/site.json"), "utf8"));
const PUB = SITE_DATA.zhPublished || {};
const isPub = (key) => PUB[key] === true;

// The four localized pages. `key` is the i18nKey (the publish-flag key).
// `enUrl`/`zhUrl` are the canonical pair URLs the reciprocal hreflang must
// advertise (en + x-default → enUrl, zh-Hans → zhUrl) when published; `canonical`
// is the page's OWN (self) URL. `enGone`/`zhHas` prove translation.
// `enToggleHref` is the navbar language-toggle's EN-counterpart link, RELATIVE to
// this /zh/ page (only asserted when the page is published).
const PAGES = [
  {
    key: "index",
    file: "zh/index.html",
    canonical: `${SITE_ORIGIN}/zh/`,
    enUrl: `${SITE_ORIGIN}/`,
    zhUrl: `${SITE_ORIGIN}/zh/`,
    enToggleHref: "../",
    enGone: "Two Ways to Engage",
    zhHas: "两种参与方式",
  },
  {
    key: "competition",
    file: "zh/competition.html",
    canonical: `${SITE_ORIGIN}/zh/competition.html`,
    enUrl: `${SITE_ORIGIN}/competition.html`,
    zhUrl: `${SITE_ORIGIN}/zh/competition.html`,
    enToggleHref: "../competition.html",
    enGone: "Why This Benchmark",
    zhHas: "为何需要此基准",
  },
  {
    key: "workshop",
    file: "zh/workshop.html",
    canonical: `${SITE_ORIGIN}/zh/workshop.html`,
    enUrl: `${SITE_ORIGIN}/workshop.html`,
    zhUrl: `${SITE_ORIGIN}/zh/workshop.html`,
    enToggleHref: "../workshop.html",
    enGone: "Tentative Schedule",
    zhHas: "暂定日程",
  },
  {
    key: "contact",
    file: "zh/contact.html",
    canonical: `${SITE_ORIGIN}/zh/contact.html`,
    enUrl: `${SITE_ORIGIN}/contact.html`,
    zhUrl: `${SITE_ORIGIN}/zh/contact.html`,
    enToggleHref: "../contact.html",
    enGone: "Contact Us",
    zhHas: "联系我们",
  },
];

// The EN file each localized page mirrors (used for the hreflang sweep + the
// contact-form parity check).
const EN_FILE = {
  index: "index.html",
  competition: "competition.html",
  workshop: "workshop.html",
  contact: "contact.html",
};

// The full set of pages that ARE allowed hreflang: the EN + /zh/ pair of every
// PUBLISHED localized page. Every other built page (drafts + 404/contact-success/
// contact-test) must carry none.
const LOCALIZED_PAGES = new Set(
  PAGES.filter((p) => isPub(p.key)).flatMap((p) => [EN_FILE[p.key], p.file]),
);

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

// The attribute-less inline behavior <script> body (comment-safe), or null —
// used to prove the contact form's JS is single-sourced (identical EN ↔ zh).
const removeComments = (h) => h.replace(/<!--[\s\S]*?-->/g, "");
// Drop <style>/<script> bodies so the link checks only see real navigable hrefs
// — a CSS selector like `a[href="contact.html"]` is not a link and must not be
// mistaken for one (the contact page's active-nav CSS carries exactly that).
const stripStyleScript = (h) =>
  h
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
// Drop the navbar language-toggle <li> so its EN-counterpart link (href="../…",
// the one deliberate cross-locale link on a published zh page) isn't mistaken for
// a stray zh→EN content link by the "no ../ to EN" check below. The <li> has no
// nested <li>, so the lazy match to the first </li> is exact.
const stripLangToggle = (h) => h.replace(/<li class="nav-lang">[\s\S]*?<\/li>/g, "");
function inlineScriptBody(html) {
  const re = /<script\b([^>]*)>([^]*?)<\/script>/g;
  const clean = removeComments(html);
  let m;
  while ((m = re.exec(clean))) if (m[1].trim() === "") return m[2];
  return null;
}
const collapseWs = (s) =>
  s
    .split("\n")
    .map((l) => l.replace(/\s+$/, ""))
    .filter((l) => l !== "")
    .join("\n");

// Ordered [value, data-slug] pairs for every <option> (data-slug may be null).
function optionPairs(html) {
  const re = /<option value="([^"]*)"([^>]*)>/g;
  const out = [];
  let m;
  while ((m = re.exec(html))) {
    const slug = m[2].match(/data-slug="([^"]*)"/);
    out.push([m[1], slug ? slug[1] : null]);
  }
  return out;
}

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
  const published = isPub(p.key);
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

  // noindex / hreflang are gated on this page's publish flag.
  const hasNoindex = /<meta name="robots" content="noindex"\s*\/?>/.test(html);
  const hreflangCount = (html.match(/rel="alternate" hreflang=/g) || []).length;
  if (published) {
    add("no noindex (published)", !hasNoindex, "published zh page must NOT be noindex");
    add(
      "hreflang reciprocal (en/zh-Hans/x-default)",
      hreflangLines(p).every((l) => html.includes(l)),
      `expected reciprocal hreflang:\n      ${hreflangLines(p).join("\n      ")}`,
    );
    add("exactly 3 hreflang", hreflangCount === 3, `expected 3 hreflang links, found ${hreflangCount}`);
  } else {
    add("noindex (draft)", hasNoindex, "expected <meta name=robots content=noindex>");
    add("no hreflang (draft)", hreflangCount === 0, "draft page must emit no hreflang");
  }

  add(
    "canonical=self",
    html.includes(`<link rel="canonical" href="${p.canonical}" />`),
    `expected canonical ${p.canonical}`,
  );
  add("navbar", /<nav id="navbar"/.test(html), "navbar did not render");
  add("footer", /<footer id="footer"/.test(html), "footer did not render");

  // All four localized targets now resolve UNDER /zh/ (relative, no ../) on every
  // published zh page: index + competition since Phase 1d, workshop + contact
  // since Phase 2c (their bodies + the links() chrome were repointed when the
  // drafts published). The ONLY surviving cross-locale link is the navbar
  // language toggle's EN counterpart (href="../…", hreflang="en") — crossing
  // locales is its whole purpose — so it is stripped before the "no ../ to EN"
  // assertion. Style/script are also stripped so a CSS selector like
  // `a[href="contact.html"]` isn't mistaken for a link.
  const linkHtml = stripLangToggle(stripStyleScript(html));
  add(
    "links→zh (all four relative, under /zh/)",
    /href="index\.html(#[^"]*)?"/.test(linkHtml) &&
      /href="competition\.html(#[^"]*)?"/.test(linkHtml) &&
      /href="workshop\.html(#[^"]*)?"/.test(linkHtml) &&
      /href="contact\.html([#?][^"]*)?"/.test(linkHtml),
    "expected relative index/competition/workshop/contact links (resolve under /zh/)",
  );
  add(
    "no zh→EN workshop/contact links (../, outside the toggle)",
    !linkHtml.includes('href="../workshop.html') && !linkHtml.includes('href="../contact.html'),
    "found a ../workshop.html or ../contact.html link — published zh pages must link to the /zh/ page",
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

  // In-page language toggle (navbar) — gated on this page's publish flag,
  // mirroring the hreflang relationship. On a published /zh/ page "中文" is the
  // active option and "EN" links to the EN counterpart; a draft has no toggle.
  if (published) {
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
      "no lang toggle (draft)",
      !/class="lang-toggle"/.test(html),
      "draft /zh/ page must not render the language toggle",
    );
  }

  // ── Contact form: payload + JS identical to EN; only labels are localized. ──
  if (p.key === "contact" && exists(EN_FILE.contact)) {
    const en = read(EN_FILE.contact);

    // 1) option value= + data-slug= pairs byte-identical to EN (payload + routing).
    const enOpts = JSON.stringify(optionPairs(en));
    const zhOpts = JSON.stringify(optionPairs(html));
    add(
      "form options value=/data-slug identical to EN",
      enOpts === zhOpts,
      `zh option value/data-slug differ from EN:\n      EN: ${enOpts}\n      ZH: ${zhOpts}`,
    );

    // 2) hidden fields + honeypot + action unchanged (operational, English).
    for (const [needle, label] of [
      ['name="access_key" value="748f5c30-e7fd-49b0-9eb5-5c1c92f03f78"', "access_key hidden field"],
      ['name="from_name" value="EBiM Benchmark Website Contact"', "from_name hidden field"],
      ['name="subject" value="[CONTACT] New contact form submission"', "subject hidden field"],
      ['name="redirect" value="https://ebim-benchmark.github.io/contact-success.html"', "redirect → EN contact-success"],
      ['name="botcheck"', "honeypot field"],
      ['action="https://api.web3forms.com/submit"', "form action"],
    ]) {
      add(`contact ${label} present`, html.includes(needle), `missing/changed: ${label}`);
    }

    // 3) inline behavior script present AND byte-identical to EN (single-sourced).
    const enJs = inlineScriptBody(en);
    const zhJs = inlineScriptBody(html);
    add("contact inline JS present", zhJs !== null && /DISCORD_TOPICS/.test(zhJs || ""), "no inline contact script");
    add(
      "contact inline JS identical to EN",
      enJs !== null && zhJs !== null && collapseWs(enJs) === collapseWs(zhJs),
      "zh contact inline JS differs from EN (must be single-sourced)",
    );
  }

  return checks;
}

function main() {
  if (!process.argv.includes("--no-build")) {
    console.log(BOLD("Building site (eleventy)…"));
    buildSite();
  }
  const stateStr = PAGES.map((p) => `${p.key}:${isPub(p.key) ? "pub" : "draft"}`).join("  ");
  console.log(BOLD(`\nVerifying /zh/ Simplified-Chinese locale — per-page state: ${stateStr}\n`));

  let allOk = true;
  const fails = [];

  for (const p of PAGES) {
    console.log(BOLD(`• ${p.file}  (${isPub(p.key) ? "PUBLISHED" : "DRAFT"})`));
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

  // Each published page's /zh/ url present; each draft's absent.
  let expectedZhUrls = 0;
  for (const p of PAGES) {
    if (isPub(p.key)) {
      expectedZhUrls++;
      siteAdd(
        `sitemap lists ${p.zhUrl} (published)`,
        sitemap.includes(`<loc>${p.zhUrl}</loc>`),
        `sitemap.xml missing <loc>${p.zhUrl}</loc>`,
      );
    } else {
      siteAdd(
        `sitemap excludes ${p.zhUrl} (draft)`,
        !sitemap.includes(`<loc>${p.zhUrl}</loc>`),
        `draft ${p.zhUrl} must not appear in sitemap.xml`,
      );
    }
  }
  const expectedTotal = 4 + expectedZhUrls;
  siteAdd(
    `sitemap has ${expectedTotal} URLs (4 EN + ${expectedZhUrls} zh)`,
    locCount === expectedTotal,
    `expected ${expectedTotal} <loc>, found ${locCount}`,
  );

  // hreflang sweep: exactly the published localized pairs (EN + /zh/), nothing else.
  const withHreflang = allHtml()
    .filter((f) => /hreflang/.test(fs.readFileSync(f, "utf8")))
    .map(relSite)
    .sort();
  const expected = [...LOCALIZED_PAGES].sort();
  const ok =
    withHreflang.length === expected.length && withHreflang.every((f, i) => f === expected[i]);
  siteAdd(
    expected.length
      ? `hreflang ONLY on the ${expected.length} published localized pages`
      : "no hreflang anywhere in _site",
    ok,
    `expected [${expected.join(", ")}], got [${withHreflang.join(", ")}]`,
  );
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
