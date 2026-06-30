// /zh/ locale harness (Phase 1b → 1d published index/competition; Phase 2b added
// workshop + contact as drafts; Phase 2c published them; register shipped
// published later — all five /zh/ pages are now live).
//
// Sibling to verify.mjs (which is the PERMANENT EN parity net — never touched
// here). This asserts the Simplified-Chinese locale is in the correct state and
// is actually localized, for the SIX pages we now ship: /zh/index.html,
// /zh/competition.html, /zh/workshop.html, /zh/faq.html, /zh/contact.html, /zh/register.html.
// It also covers the hidden /zh/contact-success.html and /zh/register-success.html
// utility pages (the no-JS targets of the zh contact/register form redirects) and
// the UNLISTED /zh/compute-apply.html + its /zh/compute-success.html target (the
// compute-resource application emailed privately to registered teams) — all plain
// noindex zh pages with no hreflang/toggle and out of the sitemap (see
// contactSuccessChecks / registerSuccessChecks / computeApplyChecks /
// computeSuccessChecks below).
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
//   assets       — js + the font preload resolve up to the root (../fonts, ../js).
//   localized    — body contains CJK AND the English heading it replaced is
//                  gone (proof it's translated, not the EN copy).
//   contact form — (contact page only) the Web3Forms option value=/data-slug,
//                  the hidden fields + honeypot, and the inline behavior script
//                  are IDENTICAL to the EN contact page (single-sourced JS,
//                  untranslated payload) — only visible labels are localized.
//
// Site-wide it checks (per-page gated):
//   sitemap      — each PUBLISHED page's /zh/ url is present; each DRAFT's is
//                  absent. Total = 5 EN + (number of published zh).
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

// The six localized pages. `key` is the i18nKey (the publish-flag key).
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
    key: "faq",
    file: "zh/faq.html",
    canonical: `${SITE_ORIGIN}/zh/faq.html`,
    enUrl: `${SITE_ORIGIN}/faq.html`,
    zhUrl: `${SITE_ORIGIN}/zh/faq.html`,
    enToggleHref: "../faq.html",
    enGone: "Frequently Asked Questions",
    zhHas: "常见问题",
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
  {
    key: "register",
    file: "zh/register.html",
    canonical: `${SITE_ORIGIN}/zh/register.html`,
    enUrl: `${SITE_ORIGIN}/register.html`,
    zhUrl: `${SITE_ORIGIN}/zh/register.html`,
    enToggleHref: "../register.html",
    enGone: "Register Your Team",
    zhHas: "团队报名",
  },
];

// The EN file each localized page mirrors (used for the hreflang sweep + the
// contact-form parity check).
const EN_FILE = {
  index: "index.html",
  competition: "competition.html",
  workshop: "workshop.html",
  faq: "faq.html",
  contact: "contact.html",
  register: "register.html",
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
    html.includes('href="../fonts/inter-latin-800-normal.woff2"') && html.includes('src="../js/main.js"'),
    "expected ../fonts/inter-latin-800-normal.woff2 (preload) and ../js/main.js",
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
      ['name="redirect" value="https://ebim-benchmark.github.io/zh/contact-success.html"', "redirect → zh contact-success"],
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

// The hidden /zh/ utility page: the no-JS target of the zh contact form's
// redirect (src/zh/contact-success.njk). It is NOT one of the five localized
// PAGES — it has no i18nKey, so it must carry NO hreflang, NO language toggle,
// and stay OUT of the sitemap. It is a plain noindex zh page (noindex emitted by
// the zhNoindex computed, since it's an unpublished zh page) that mirrors the EN
// contact-success.html, localized. Living under src/zh/ gives it lang="zh-Hans",
// ../ assets, and the zh navbar/footer.
function contactSuccessChecks() {
  const file = "zh/contact-success.html";
  const checks = [];
  const add = (name, ok, msg = "") => checks.push({ name, ok, msg });

  if (!exists(file)) {
    add("build", false, `_site/${file} missing`);
    return checks;
  }
  add("build", true);

  const html = read(file);
  const body = bodyOf(html);

  add("lang=zh-Hans", /<html lang="zh-Hans">/.test(html), 'expected <html lang="zh-Hans">');

  const noindexCount = (html.match(/<meta name="robots" content="noindex"\s*\/?>/g) || []).length;
  add("noindex (exactly one)", noindexCount === 1, `expected exactly 1 noindex meta, found ${noindexCount}`);

  add(
    "canonical=self",
    html.includes(
      '<link rel="canonical" href="https://ebim-benchmark.github.io/zh/contact-success.html" />',
    ),
    "expected self canonical to /zh/contact-success.html",
  );

  add("no hreflang", !/hreflang/.test(html), "hidden utility page must emit no hreflang");
  add(
    "no language toggle",
    !/class="lang-toggle"/.test(html) && !/class="nav-lang"/.test(html),
    "hidden utility page must not render the language toggle",
  );

  add("navbar", /<nav id="navbar"/.test(html), "navbar did not render");
  add("footer", /<footer id="footer"/.test(html), "footer did not render");

  add(
    "assets→../",
    html.includes('href="../fonts/inter-latin-800-normal.woff2"') && html.includes('src="../js/main.js"'),
    "expected ../fonts/inter-latin-800-normal.woff2 (preload) and ../js/main.js",
  );

  add("body has CJK", hasCJK(body), "body contains no CJK text");

  return checks;
}

// The hidden /zh/ utility page for registration: the no-JS target of the zh
// registration form's redirect (src/zh/register-success.njk). Same shape as
// contactSuccessChecks — NO i18nKey, so it carries NO hreflang, NO language
// toggle, and stays OUT of the sitemap; a plain noindex zh page (noindex from
// the zhNoindex computed) mirroring the EN register-success.html, localized.
function registerSuccessChecks() {
  const file = "zh/register-success.html";
  const checks = [];
  const add = (name, ok, msg = "") => checks.push({ name, ok, msg });

  if (!exists(file)) {
    add("build", false, `_site/${file} missing`);
    return checks;
  }
  add("build", true);

  const html = read(file);
  const body = bodyOf(html);

  add("lang=zh-Hans", /<html lang="zh-Hans">/.test(html), 'expected <html lang="zh-Hans">');

  const noindexCount = (html.match(/<meta name="robots" content="noindex"\s*\/?>/g) || []).length;
  add("noindex (exactly one)", noindexCount === 1, `expected exactly 1 noindex meta, found ${noindexCount}`);

  add(
    "canonical=self",
    html.includes(
      '<link rel="canonical" href="https://ebim-benchmark.github.io/zh/register-success.html" />',
    ),
    "expected self canonical to /zh/register-success.html",
  );

  add("no hreflang", !/hreflang/.test(html), "hidden utility page must emit no hreflang");
  add(
    "no language toggle",
    !/class="lang-toggle"/.test(html) && !/class="nav-lang"/.test(html),
    "hidden utility page must not render the language toggle",
  );

  add("navbar", /<nav id="navbar"/.test(html), "navbar did not render");
  add("footer", /<footer id="footer"/.test(html), "footer did not render");

  add(
    "assets→../",
    html.includes('href="../fonts/inter-latin-800-normal.woff2"') && html.includes('src="../js/main.js"'),
    "expected ../fonts/inter-latin-800-normal.woff2 (preload) and ../js/main.js",
  );

  add("body has CJK", hasCJK(body), "body contains no CJK text");

  return checks;
}

// The hidden /zh/ UNLISTED compute-resource application page
// (src/zh/compute-apply.njk). Same shape as the success-page checks — NO
// i18nKey, so it carries NO hreflang, NO language toggle, and stays OUT of the
// sitemap; a plain noindex zh page (noindex from the zhNoindex computed). Its URL
// is emailed privately to each registered team's PoC, never linked in the site
// chrome. Living under src/zh/ gives it lang="zh-Hans", ../ assets, and the zh
// navbar/footer.
function computeApplyChecks() {
  const file = "zh/compute-apply.html";
  const checks = [];
  const add = (name, ok, msg = "") => checks.push({ name, ok, msg });

  if (!exists(file)) {
    add("build", false, `_site/${file} missing`);
    return checks;
  }
  add("build", true);

  const html = read(file);
  const body = bodyOf(html);

  add("lang=zh-Hans", /<html lang="zh-Hans">/.test(html), 'expected <html lang="zh-Hans">');

  const noindexCount = (html.match(/<meta name="robots" content="noindex"\s*\/?>/g) || []).length;
  add("noindex (exactly one)", noindexCount === 1, `expected exactly 1 noindex meta, found ${noindexCount}`);

  add(
    "canonical=self",
    html.includes(
      '<link rel="canonical" href="https://ebim-benchmark.github.io/zh/compute-apply.html" />',
    ),
    "expected self canonical to /zh/compute-apply.html",
  );

  add("no hreflang", !/hreflang/.test(html), "hidden unlisted page must emit no hreflang");
  add(
    "no language toggle",
    !/class="lang-toggle"/.test(html) && !/class="nav-lang"/.test(html),
    "hidden unlisted page must not render the language toggle",
  );

  add("navbar", /<nav id="navbar"/.test(html), "navbar did not render");
  add("footer", /<footer id="footer"/.test(html), "footer did not render");

  add(
    "assets→../",
    html.includes('href="../fonts/inter-latin-800-normal.woff2"') && html.includes('src="../js/main.js"'),
    "expected ../fonts/inter-latin-800-normal.woff2 (preload) and ../js/main.js",
  );

  add("body has CJK", hasCJK(body), "body contains no CJK text");

  return checks;
}

// The hidden /zh/ UNLISTED utility page for the compute application: the no-JS
// target of the zh compute form's redirect (src/zh/compute-success.njk). Same
// shape as registerSuccessChecks — NO i18nKey, so NO hreflang, NO language
// toggle, OUT of the sitemap; a plain noindex zh page (noindex from the zhNoindex
// computed) mirroring the EN compute-success.html, localized.
function computeSuccessChecks() {
  const file = "zh/compute-success.html";
  const checks = [];
  const add = (name, ok, msg = "") => checks.push({ name, ok, msg });

  if (!exists(file)) {
    add("build", false, `_site/${file} missing`);
    return checks;
  }
  add("build", true);

  const html = read(file);
  const body = bodyOf(html);

  add("lang=zh-Hans", /<html lang="zh-Hans">/.test(html), 'expected <html lang="zh-Hans">');

  const noindexCount = (html.match(/<meta name="robots" content="noindex"\s*\/?>/g) || []).length;
  add("noindex (exactly one)", noindexCount === 1, `expected exactly 1 noindex meta, found ${noindexCount}`);

  add(
    "canonical=self",
    html.includes(
      '<link rel="canonical" href="https://ebim-benchmark.github.io/zh/compute-success.html" />',
    ),
    "expected self canonical to /zh/compute-success.html",
  );

  add("no hreflang", !/hreflang/.test(html), "hidden utility page must emit no hreflang");
  add(
    "no language toggle",
    !/class="lang-toggle"/.test(html) && !/class="nav-lang"/.test(html),
    "hidden utility page must not render the language toggle",
  );

  add("navbar", /<nav id="navbar"/.test(html), "navbar did not render");
  add("footer", /<footer id="footer"/.test(html), "footer did not render");

  add(
    "assets→../",
    html.includes('href="../fonts/inter-latin-800-normal.woff2"') && html.includes('src="../js/main.js"'),
    "expected ../fonts/inter-latin-800-normal.woff2 (preload) and ../js/main.js",
  );

  add("body has CJK", hasCJK(body), "body contains no CJK text");

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

  // ── hidden /zh/ utility page (contact-success) ──
  console.log(BOLD("• zh/contact-success.html  (HIDDEN UTILITY)"));
  for (const c of contactSuccessChecks()) {
    console.log(`    ${c.ok ? GREEN("PASS") : RED("FAIL")}  ${c.name}`);
    if (!c.ok) {
      allOk = false;
      fails.push(`zh/contact-success.html — ${c.name}: ${c.msg}`);
    }
  }
  console.log("");

  // ── hidden /zh/ utility page (register-success) ──
  console.log(BOLD("• zh/register-success.html  (HIDDEN UTILITY)"));
  for (const c of registerSuccessChecks()) {
    console.log(`    ${c.ok ? GREEN("PASS") : RED("FAIL")}  ${c.name}`);
    if (!c.ok) {
      allOk = false;
      fails.push(`zh/register-success.html — ${c.name}: ${c.msg}`);
    }
  }
  console.log("");

  // ── hidden /zh/ UNLISTED compute application page ──
  console.log(BOLD("• zh/compute-apply.html  (HIDDEN UNLISTED)"));
  for (const c of computeApplyChecks()) {
    console.log(`    ${c.ok ? GREEN("PASS") : RED("FAIL")}  ${c.name}`);
    if (!c.ok) {
      allOk = false;
      fails.push(`zh/compute-apply.html — ${c.name}: ${c.msg}`);
    }
  }
  console.log("");

  // ── hidden /zh/ utility page (compute-success) ──
  console.log(BOLD("• zh/compute-success.html  (HIDDEN UTILITY)"));
  for (const c of computeSuccessChecks()) {
    console.log(`    ${c.ok ? GREEN("PASS") : RED("FAIL")}  ${c.name}`);
    if (!c.ok) {
      allOk = false;
      fails.push(`zh/compute-success.html — ${c.name}: ${c.msg}`);
    }
  }
  console.log("");

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
  const expectedTotal = PAGES.length + expectedZhUrls;
  siteAdd(
    `sitemap has ${expectedTotal} URLs (${PAGES.length} EN + ${expectedZhUrls} zh)`,
    locCount === expectedTotal,
    `expected ${expectedTotal} <loc>, found ${locCount}`,
  );

  // The hidden zh utility pages must never be listed in the sitemap.
  siteAdd(
    "sitemap excludes /zh/contact-success.html (hidden utility)",
    !sitemap.includes("/zh/contact-success.html"),
    "/zh/contact-success.html must not appear in sitemap.xml",
  );
  siteAdd(
    "sitemap excludes /zh/register-success.html (hidden utility)",
    !sitemap.includes("/zh/register-success.html"),
    "/zh/register-success.html must not appear in sitemap.xml",
  );
  siteAdd(
    "sitemap excludes /zh/compute-apply.html (hidden unlisted)",
    !sitemap.includes("/zh/compute-apply.html"),
    "/zh/compute-apply.html must not appear in sitemap.xml",
  );
  siteAdd(
    "sitemap excludes /zh/compute-success.html (hidden utility)",
    !sitemap.includes("/zh/compute-success.html"),
    "/zh/compute-success.html must not appear in sitemap.xml",
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
