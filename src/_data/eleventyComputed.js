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
