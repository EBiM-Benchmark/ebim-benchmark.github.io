// The locale registry. Adding a locale = a row here + its content tree + its
// publish map — never a new branch in a helper.
//   dir         — output dir prefix ("" = site root)
//   htmlLang    — BCP-47 tag for <html lang> and the toggle's lang= attribute
//   hreflang    — value advertised in <link rel="alternate" hreflang> and the toggle's hreflang=
//   dateLocale  — Intl locale for the humanDate filter
//   fallback    — next locale in the chrome-string resolution chain (null terminates)
//   chip        — language-toggle label
//   chipAlone   — optional label used instead of `chip` when no OTHER zh* locale is in
//                 the page's published cluster (zh reads 简 beside 繁, 中文 on its own)
//   publishedKey— site.json key holding this locale's per-page publish map (null = always published)
//
// Lives at the repo root, outside src/, so Eleventy never treats it as input.
// Read by src/_data/eleventyComputed.js and .eleventy.js.
export const LOCALES = {
  en:      { dir: "",       htmlLang: "en",         hreflang: "en",      dateLocale: "en-GB", fallback: null, chip: "EN",   publishedKey: null },
  zh:      { dir: "zh/",    htmlLang: "zh-Hans",    hreflang: "zh-Hans", dateLocale: "zh-CN", fallback: "en", chip: "简",   chipAlone: "中文", publishedKey: "zhPublished" },
  "zh-tw": { dir: "zh-tw/", htmlLang: "zh-Hant-TW", hreflang: "zh-Hant", dateLocale: "zh-TW", fallback: "zh", chip: "繁",   publishedKey: "zhTwPublished" },
};
export const DEFAULT_LOCALE = "en";
// hreflang cluster order (x-default → DEFAULT_LOCALE is appended last)
export const HREFLANG_ORDER = ["en", "zh", "zh-tw"];
// Language-toggle display order, ratified by Cecil: EN · 繁 · 简
export const TOGGLE_ORDER = ["en", "zh-tw", "zh"];
export const SITE_URL = "https://ebim-benchmark.github.io/";
// Every localized page pair: key = i18nKey; file = output filename; url = path after the locale dir.
// Key order is load-bearing: it is the key order of the `links` computed object.
export const PAIRS = {
  index:           { file: "index.html",             url: "" },
  competition:     { file: "competition.html",       url: "competition.html" },
  workshop:        { file: "workshop.html",          url: "workshop.html" },
  openDay:         { file: "open-day.html",          url: "open-day.html" },
  openDayHamburg:  { file: "open-day-hamburg.html",  url: "open-day-hamburg.html" },
  openDayShanghai: { file: "open-day-shanghai.html", url: "open-day-shanghai.html" },
  openDayMunich:   { file: "open-day-munich.html",   url: "open-day-munich.html" },
  faq:             { file: "faq.html",               url: "faq.html" },
  results:         { file: "results.html",           url: "results.html" },
  contact:         { file: "contact.html",           url: "contact.html" },
  register:        { file: "register.html",          url: "register.html" },
};

// Number of directory segments in a locale dir ("" → 0, "zh/" → 1).
export const depth = (dir) => dir.split("/").filter(Boolean).length;

// The locales a pair is published in, in HREFLANG_ORDER. The default locale is
// always published; any other needs its publishedKey map's flag for the key.
export const publishedLocales = (site, key) =>
  HREFLANG_ORDER.filter((loc) => {
    const map = LOCALES[loc].publishedKey;
    return map === null || ((site && site[map]) || {})[key] === true;
  });

// sitemap.xml rows, read by src/sitemap.njk. `pages` are the hand-written EN rows
// ({ pair, lastmod, changefreq, priority }), in sitemap order. Every published
// locale gets one row per pair, grouped by locale in HREFLANG_ORDER. A pair
// published in two or more locales carries the same alternates on every row as
// its pages' hreflangAlternates: each published locale, then x-default.
// lastmodByLocale overrides a whole locale's lastmod (e.g. a later-added locale).
export const sitemapRows = (pages, site, lastmodByLocale = {}) => {
  const href = (loc, key) => SITE_URL + LOCALES[loc].dir + PAIRS[key].url;
  return HREFLANG_ORDER.flatMap((loc) =>
    pages
      .filter((p) => publishedLocales(site, p.pair).includes(loc))
      .map((p) => {
        const cluster = publishedLocales(site, p.pair);
        const alternates =
          cluster.length >= 2
            ? [
                ...cluster.map((c) => ({ hreflang: LOCALES[c].hreflang, href: href(c, p.pair) })),
                { hreflang: "x-default", href: href(DEFAULT_LOCALE, p.pair) },
              ]
            : [];
        return {
          loc: href(loc, p.pair),
          lastmod: lastmodByLocale[loc] ?? p.lastmod,
          changefreq: p.changefreq,
          priority: p.priority,
          alternates,
          hasAlternates: alternates.length > 0,
        };
      }),
  );
};
