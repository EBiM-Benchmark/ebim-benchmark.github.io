// Locale-aware computed data, applied to every page.
//
//   t       — the resolved string table for the page's locale, with English
//             fallback for any missing key (deep merge: en base, current
//             locale overrides). 1a ships only `en`, so every lookup is en.
//             Templates read `t.nav.*`, `t.footer.*`, `t.jsonld.*`, etc.
//   pageMeta — the head-meta string set for pages that opt in via `i18nKey`
//             (index/competition only); undefined elsewhere so base.njk falls
//             back to the front-matter title/description.
//   jsonLd  — the assembled JSON-LD block list (comment + object) for the
//             index/competition pages, rendered by _includes/jsonld.njk.
//             Sourced from the language-neutral `event` data + translatable
//             `t.jsonld` strings; deep-equal to the hand-authored blocks.

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

  pageMeta: (data) => {
    if (!data.i18nKey) return undefined;
    const t = resolveLocale(data);
    return (t.meta || {})[data.i18nKey];
  },

  jsonLd: (data) => {
    const key = data.i18nKey;
    if (key !== "index" && key !== "competition") return undefined;
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

    // competition
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
  },
};
