// Locale-aware computed data, applied to every page.
//
//   t       — the resolved string table for the page's locale, with English
//             fallback for any missing key (deep merge: en base, current
//             locale overrides). 1a ships only `en`, so every lookup is en.
//             Templates read `t.nav.*`, `t.footer.*`, `t.jsonld.*`, etc.
//   pageMeta — the head-meta string set for pages that opt in via `i18nKey`
//             (index/competition) or `pageKey` (workshop/contact — EN-only,
//             see below); undefined elsewhere so base.njk falls back to the
//             front-matter title/description.
//   jsonLd  — the assembled JSON-LD block list (comment + object) for the
//             index/competition/workshop/contact pages, rendered by
//             _includes/jsonld.njk. Sourced from the language-neutral `event`
//             data + translatable `t.jsonld` strings; deep-equal to the
//             hand-authored blocks.

function deepMerge(base, over) {
  if (over === undefined) return base;
  if (Array.isArray(over) || typeof over !== "object" || over === null) return over;
  if (Array.isArray(base) || typeof base !== "object" || base === null) return over;
  const out = { ...base };
  for (const k of Object.keys(over)) {
    out[k] = k in base ? deepMerge(base[k], over[k]) : over[k];
  }
  return out;
}

function resolveLocale(data) {
  const locales = data.i18n || {};
  const lang = data.lang || "en";
  return deepMerge(locales.en || {}, locales[lang] || {});
}

// True only for the Simplified-Chinese /zh/ pages (lang === "zh"). Every
// locale-aware helper below branches on this; EN pages take the unchanged path.
const isZh = (data) => (data.lang || "en") === "zh";

// The page's data key for the shared head-meta + JSON-LD bundles (meta.<key>
// and the jsonld.* strings). `i18nKey` (index/competition — pages with a
// localized /zh/ counterpart) doubles as this key; `pageKey` is the EN-only
// equivalent for pages that draw from the shared data WITHOUT participating in
// localization (workshop/contact in Phase 2a — no hreflang, no toggle, no /zh/
// output). localeToggle/hreflangAlternates stay keyed on i18nKey alone, so a
// pageKey-only page never lights those up. Phase 2b promotes a page from
// pageKey → i18nKey when its /zh/ counterpart ships.
const pageDataKey = (data) => data.i18nKey || data.pageKey;

// Cross-locale counterpart URLs for the in-page language toggle (navbar.njk),
// keyed by i18nKey and RELATIVE to the page being rendered: `en` is the path to
// the EN page (used on a /zh/ page, linking back to English), `zh` is the path
// to the /zh/ page (used on the EN page, linking out to 中文). These are the
// SAME page pairs the reciprocal hreflang advertises — kept here as nav-relative
// links (hreflangAlternates emits the absolute forms). Localizing a new page in
// Phase 2 is one row here + an i18nKey + a /zh/ counterpart; the navbar toggle
// and hreflang then light up together, with no template special-casing.
const TOGGLE_HREFS = {
  index: { en: "../", zh: "zh/" },
  competition: { en: "../competition.html", zh: "zh/competition.html" },
};

function organizationSchema(ev, t) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: ev.brand,
    url: ev.siteUrl,
    logo: ev.logo,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: t.jsonld.contactType,
      url: ev.contactUrl,
    },
    sameAs: ev.sameAs,
  };
}

export default {
  t: (data) => resolveLocale(data),

  // BCP-47 language tag for <html lang>. EN pages stay "en" (output unchanged);
  // /zh/ pages advertise Simplified Chinese as "zh-Hans".
  htmlLang: (data) => (isZh(data) ? "zh-Hans" : "en"),

  // Path prefix for the root-level assets (css/js/img) relative to the current
  // page. EN pages live at the site root → "" (every asset link unchanged).
  // /zh/ pages live one directory down → "../" so css/style.css resolves to
  // /css/style.css, img/favicon.svg to /img/favicon.svg, etc.
  assetBase: (data) => (isZh(data) ? "../" : ""),

  // Locale-aware navigation targets for navbar.njk / footer.njk. EN keeps the
  // exact current relative filenames (byte-identical render). For /zh/ pages,
  // index + competition are localized (relative, staying under /zh/), while the
  // not-yet-localized workshop + contact point back up to their EN URLs — so
  // the zh preview is fully navigable with no 404s.
  links: (data) =>
    isZh(data)
      ? {
          index: "index.html",
          competition: "competition.html",
          workshop: "../workshop.html",
          contact: "../contact.html",
        }
      : {
          index: "index.html",
          competition: "competition.html",
          workshop: "workshop.html",
          contact: "contact.html",
        },

  // noindex directive for the /zh/ locale while it is unpublished. While
  // site.zhPublished is false the localized pages must not be indexed; flipping
  // the flag to true drops the tag. EN pages never set this (their own `robots`
  // front-matter, e.g. on 404, is untouched).
  zhNoindex: (data) => isZh(data) && !(data.site && data.site.zhPublished),

  // hreflang alternates, emitted by base.njk ONLY when site.zhPublished is true.
  // While false they are empty → no hreflang anywhere and the EN <head> is
  // byte-identical to the pre-i18n output; while true the localized pair (index
  // + competition) advertises the reciprocal en / zh-Hans / x-default cluster.
  hreflangAlternates: (data) => {
    if (!(data.site && data.site.zhPublished)) return [];
    const key = data.i18nKey;
    if (key !== "index" && key !== "competition") return [];
    const base = "https://ebim-benchmark.github.io/";
    const pair = {
      index: { en: base, zh: base + "zh/" },
      competition: { en: base + "competition.html", zh: base + "zh/competition.html" },
    }[key];
    return [
      { hreflang: "en", href: pair.en },
      { hreflang: "zh-Hans", href: pair.zh },
      { hreflang: "x-default", href: pair.en },
    ];
  },

  // In-page language toggle, consumed by navbar.njk. Present ONLY on a page that
  // has a PUBLISHED localized counterpart — i.e. an i18nKey listed in
  // TOGGLE_HREFS (index/competition today; auto-extends in Phase 2) and only
  // while site.zhPublished is true, so the toggle is visible exactly where the
  // reciprocal hreflang is emitted. Returns null everywhere else, so the navbar
  // renders with NO toggle (byte-identical to the pre-toggle output on the five
  // EN-only pages). Shape:
  //   active        — the current page's locale ("en" | "zh"); the template
  //                   marks it aria-current and renders the OTHER locale as the
  //                   cross-locale link.
  //   enHref/zhHref — the counterpart URL relative to the current page (the EN
  //                   page links out to zhHref, the /zh/ page back to enHref).
  localeToggle: (data) => {
    if (!(data.site && data.site.zhPublished)) return null;
    const hrefs = TOGGLE_HREFS[data.i18nKey];
    if (!hrefs) return null;
    return { active: isZh(data) ? "zh" : "en", enHref: hrefs.en, zhHref: hrefs.zh };
  },

  // Head-meta string set, keyed by pageDataKey (i18nKey or pageKey). Undefined
  // for pages with neither, so base.njk falls back to the front-matter
  // title/description.
  pageMeta: (data) => {
    const key = pageDataKey(data);
    if (!key) return undefined;
    const t = resolveLocale(data);
    return (t.meta || {})[key];
  },

  jsonLd: (data) => {
    const key = pageDataKey(data);
    if (!["index", "competition", "workshop", "contact"].includes(key)) return undefined;
    const ev = data.event;
    const t = resolveLocale(data);
    const j = t.jsonld;
    // Eleventy probes computed fns against a dependency-tracking proxy where
    // nested data isn't concrete yet; bail until the real values are present.
    if (!j || !ev || typeof ev.startDate !== "string") return undefined;

    if (key === "index") {
      return [
        {
          comment: "Structured data: Event schema",
          data: {
            "@context": "https://schema.org",
            "@type": "Event",
            name: j.eventNameIndex,
            alternateName: j.eventAlternateName,
            description: j.eventDescriptionIndex,
            startDate: ev.startDate,
            endDate: ev.endDate,
            eventStatus: ev.eventStatus,
            eventAttendanceMode: ev.eventAttendanceMode,
            location: { "@type": "Place", name: j.locationNameIndex },
            organizer: ev.organizersIndex,
            url: data.canonical,
            image: ev.image,
            sponsor: ev.sponsors,
          },
        },
        { comment: "Structured data: Organization schema", data: organizationSchema(ev, t) },
      ];
    }

    if (key === "competition") {
      return [
        {
          comment: "Structured data: Competition Event",
          data: {
            "@context": "https://schema.org",
            "@type": "Event",
            name: j.eventNameCompetition,
            description: j.eventDescriptionCompetition,
            startDate: ev.startDate,
            endDate: ev.endDate,
            eventStatus: ev.eventStatus,
            eventAttendanceMode: ev.eventAttendanceMode,
            location: ev.testbedAddresses.map((address, i) => ({
              "@type": "Place",
              name: j.testbedNames[i],
              address,
            })),
            organizer: ev.organizersCompetition,
            url: data.canonical,
            image: ev.image,
            sponsor: ev.sponsors,
          },
        },
        { comment: "Structured data: Organization schema", data: organizationSchema(ev, t) },
        {
          comment: "Structured data: Breadcrumbs",
          data: {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: j.breadcrumbHome, item: ev.siteUrl },
              { "@type": "ListItem", position: 2, name: j.breadcrumbCompetition, item: data.canonical },
            ],
          },
        },
      ];
    }

    if (key === "workshop") {
      // Rich workshop Event: NO start/end date (TBD), its own Offline attendance
      // mode, a placeholder Place, organizer Orgs, and nested subEvents — four
      // identical "talk" placeholders plus the panel (translatable subEvent
      // names; neutral panelist Persons + affiliations). Deep-equal to the
      // hand-authored block proves the lift is faithful.
      return [
        {
          comment: "Structured data: Workshop Event with sub-events for each talk + panel",
          data: {
            "@context": "https://schema.org",
            "@type": "Event",
            name: j.eventNameWorkshop,
            description: j.eventDescriptionWorkshop,
            eventStatus: ev.workshopEventStatus,
            eventAttendanceMode: ev.workshopEventAttendanceMode,
            location: ev.workshopLocation,
            url: data.canonical,
            image: ev.image,
            organizer: ev.workshopOrganizers,
            subEvent: [
              { "@type": "Event", name: j.talkTitleTba },
              { "@type": "Event", name: j.talkTitleTba },
              { "@type": "Event", name: j.talkTitleTba },
              { "@type": "Event", name: j.talkTitleTba },
              { "@type": "Event", name: j.panelName, performer: ev.panelPanelists },
            ],
          },
        },
        { comment: "Structured data: Organization schema", data: organizationSchema(ev, t) },
        {
          comment: "Structured data: Breadcrumbs",
          data: {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: j.breadcrumbHome, item: ev.siteUrl },
              { "@type": "ListItem", position: 2, name: j.breadcrumbWorkshop, item: data.canonical },
            ],
          },
        },
      ];
    }

    // contact
    return [
      {
        comment: "Structured data: ContactPage",
        data: {
          "@context": "https://schema.org",
          "@type": "ContactPage",
          name: j.contactPageName,
          url: data.canonical,
          description: j.contactPageDescription,
          isPartOf: {
            "@type": "WebSite",
            name: ev.brand,
            url: ev.siteUrl,
          },
        },
      },
      {
        comment: "Structured data: Breadcrumbs",
        data: {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: j.breadcrumbHome, item: ev.siteUrl },
            { "@type": "ListItem", position: 2, name: j.breadcrumbContact, item: data.canonical },
          ],
        },
      },
    ];
  },
};
