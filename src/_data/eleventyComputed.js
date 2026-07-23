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
//             index/competition/workshop/contact/openDayHamburg pages, rendered
//             by _includes/jsonld.njk. Sourced from the language-neutral `event`
//             data + translatable `t.jsonld` strings; deep-equal to the
//             hand-authored blocks — EXCEPT the date-gated Events. index,
//             competition and workshop each gate their Event on a date key that
//             is currently ABSENT, so they emit only Organization (+
//             BreadcrumbList), while openDayHamburg's gate is OPEN (a real date
//             and venue exist) and does emit its Event. Each gate is
//             independent; see the per-key blocks below.

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

// Per-page publish gate. site.zhPublished is a map keyed by i18nKey (see
// src/_data/site.json); a localized page is PUBLISHED iff its own key's flag is
// true. Drives zhNoindex / hreflangAlternates / localeToggle so each page's SEO
// surface (noindex, hreflang, sitemap, toggle) lights up independently — the
// four content pages (index, competition, workshop, contact) are published as of
// Phase 2c and the registration + FAQ pages since, joined by the Hamburg Open Day
// page, so all seven localized pages are published (set a flag back to false to
// return that page to a draft).
const isPublished = (data) => {
  const map = (data.site && data.site.zhPublished) || {};
  return map[data.i18nKey] === true;
};

// The page's data key for the shared head-meta + JSON-LD bundles (meta.<key>
// and the jsonld.* strings). `i18nKey` (the four content pages as of Phase 2b,
// plus the registration, FAQ and Hamburg Open Day pages added later — each has a
// localized /zh/ counterpart) doubles as this key; `pageKey` is the
// EN-only equivalent for a page that draws from the shared data WITHOUT
// participating in localization (the Phase 2a state of workshop/contact, before
// their /zh/ counterparts shipped). localeToggle/hreflangAlternates stay keyed on
// i18nKey alone, so a pageKey-only page never lights those up. No page uses
// pageKey today, but the fallback is kept for any future EN-only-but-data-bound
// page; promote it to i18nKey (and add a /zh/ counterpart) to localize.
const pageDataKey = (data) => data.i18nKey || data.pageKey;

// Cross-locale counterpart URLs for the in-page language toggle (navbar.njk),
// keyed by i18nKey and RELATIVE to the page being rendered: `en` is the path to
// the EN page (used on a /zh/ page, linking back to English), `zh` is the path
// to the /zh/ page (used on the EN page, linking out to 中文). These are the
// SAME page pairs the reciprocal hreflang advertises — kept here as nav-relative
// links (hreflangAlternates emits the absolute forms). All seven localized pages
// have a row; the toggle only RENDERS where isPublished is true — all seven
// published (index/competition/workshop/contact since Phase 2c, register + faq since,
// openDayHamburg since) (a page returned to draft would silently drop its toggle,
// no template change).
const TOGGLE_HREFS = {
  index: { en: "../", zh: "zh/" },
  competition: { en: "../competition.html", zh: "zh/competition.html" },
  workshop: { en: "../workshop.html", zh: "zh/workshop.html" },
  faq: { en: "../faq.html", zh: "zh/faq.html" },
  contact: { en: "../contact.html", zh: "zh/contact.html" },
  register: { en: "../register.html", zh: "zh/register.html" },
  openDayHamburg: { en: "../open-day-hamburg.html", zh: "zh/open-day-hamburg.html" },
};

// Absolute en / zh URLs for each localized pair, the source of the reciprocal
// hreflang cluster (en + x-default → en; zh-Hans → zh). Same pairs as
// TOGGLE_HREFS, emitted absolute. Gated per page by isPublished.
const HREFLANG_PAIRS = {
  index: { en: "https://ebim-benchmark.github.io/", zh: "https://ebim-benchmark.github.io/zh/" },
  competition: {
    en: "https://ebim-benchmark.github.io/competition.html",
    zh: "https://ebim-benchmark.github.io/zh/competition.html",
  },
  workshop: {
    en: "https://ebim-benchmark.github.io/workshop.html",
    zh: "https://ebim-benchmark.github.io/zh/workshop.html",
  },
  faq: {
    en: "https://ebim-benchmark.github.io/faq.html",
    zh: "https://ebim-benchmark.github.io/zh/faq.html",
  },
  contact: {
    en: "https://ebim-benchmark.github.io/contact.html",
    zh: "https://ebim-benchmark.github.io/zh/contact.html",
  },
  register: {
    en: "https://ebim-benchmark.github.io/register.html",
    zh: "https://ebim-benchmark.github.io/zh/register.html",
  },
  openDayHamburg: {
    en: "https://ebim-benchmark.github.io/open-day-hamburg.html",
    zh: "https://ebim-benchmark.github.io/zh/open-day-hamburg.html",
  },
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

  // Path prefix for the root-level assets (fonts/js/img) relative to the current
  // page. EN pages live at the site root → "" (every asset link unchanged).
  // /zh/ pages live one directory down → "../" so fonts/inter-…woff2 resolves to
  // /fonts/…, img/favicon.svg to /img/favicon.svg, etc. (The global CSS is now
  // INLINED into <head>, so it no longer rides assetBase; the @font-face src uses
  // an absolute /fonts/ URL that is depth-independent on its own.)
  //   absoluteUrls — the 404 ONLY (set in its front-matter). GitHub Pages serves
  //   the single /404.html for a miss at ANY depth (e.g. /zh/bad-url), so a
  //   relative or "../" base would resolve its assets under the missed directory
  //   and break the page. "/" makes head.njk emit /fonts/inter-…woff2 (preload)
  //   and /img/favicon.svg (and base.njk /js/main.js) — correct from any depth.
  //   No other page sets the flag, so every other page's assetBase is
  //   byte-identical to before.
  assetBase: (data) => (data.absoluteUrls ? "/" : isZh(data) ? "../" : ""),

  // Locale-aware navigation targets for navbar.njk / footer.njk — CHROME only.
  // The page bodies hardcode their own links inside their translated raw blocks,
  // so these must MATCH the body links for each page (do NOT auto-flip on the
  // publish flag, or the navbar would diverge from the still-hardcoded body).
  // EN keeps the exact current relative filenames (byte-identical render). All
  // seven /zh/ pages are now PUBLISHED (Phase 2c: workshop + contact joined index
  // + competition; register + faq added since, then the Hamburg Open Day), so every
  // zh chrome link is localized — relative, resolving
  // under /zh/. The hardcoded zh bodies were repointed to match in the same
  // commit (../workshop.html → workshop.html, ../contact.html → contact.html,
  // preserving every #anchor and ?topic= suffix). The only cross-locale link left
  // on a zh page is the navbar language toggle's EN counterpart (localeToggle,
  // ../…). Publishing a future draft is a content edit, not just a flag flip:
  // repoint these AND the hardcoded body links to the /zh/ page, flip its
  // zhPublished flag, and re-baseline the EN fixture for its new hreflang cluster.
  //   absoluteUrls — the 404 ONLY: root-absolute chrome links (/index.html etc.)
  //   so the navbar/footer point at the real pages from a miss at ANY depth,
  //   matching its root-absolute assetBase. Gated on the flag, so no other page
  //   changes (the EN and zh branches below are byte-identical to before).
  links: (data) =>
    data.absoluteUrls
      ? {
          index: "/index.html",
          competition: "/competition.html",
          workshop: "/workshop.html",
          openDayHamburg: "/open-day-hamburg.html",
          faq: "/faq.html",
          contact: "/contact.html",
          register: "/register.html",
        }
      : isZh(data)
        ? {
            index: "index.html",
            competition: "competition.html",
            workshop: "workshop.html",
            openDayHamburg: "open-day-hamburg.html",
            faq: "faq.html",
            contact: "contact.html",
            register: "register.html",
          }
        : {
            index: "index.html",
            competition: "competition.html",
            workshop: "workshop.html",
            openDayHamburg: "open-day-hamburg.html",
            faq: "faq.html",
            contact: "contact.html",
            register: "register.html",
          },

  // noindex directive for a /zh/ page while ITS page is a draft. A draft (its
  // zhPublished[key] flag is false) must not be indexed; flipping that flag to
  // true drops the tag. EN pages never set this (their own `robots` front-matter,
  // e.g. on 404, is untouched).
  zhNoindex: (data) => isZh(data) && !isPublished(data),

  // hreflang alternates, emitted by base.njk ONLY for a PUBLISHED localized page.
  // Gated per page: a draft (or a page with no localized counterpart) returns []
  // → no hreflang on either side and the EN <head> stays byte-identical. A
  // published page (EN or /zh/) advertises the reciprocal en / zh-Hans /
  // x-default cluster for its pair.
  hreflangAlternates: (data) => {
    if (!isPublished(data)) return [];
    const pair = HREFLANG_PAIRS[data.i18nKey];
    if (!pair) return [];
    return [
      { hreflang: "en", href: pair.en },
      { hreflang: "zh-Hans", href: pair.zh },
      { hreflang: "x-default", href: pair.en },
    ];
  },

  // In-page language toggle, consumed by navbar.njk. Present ONLY on a PUBLISHED
  // localized page — its i18nKey is in TOGGLE_HREFS AND its own zhPublished[key]
  // flag is true, so the toggle is visible exactly where the reciprocal hreflang
  // is emitted (all seven localized pairs — the four content pages plus register,
  // faq and the Hamburg Open Day).
  // Returns null everywhere
  // else, so the navbar renders with NO toggle (byte-identical to the pre-toggle
  // output on the EN-only utility pages, and on any /zh/ page returned to draft).
  // Shape:
  //   active        — the current page's locale ("en" | "zh"); the template
  //                   marks it aria-current and renders the OTHER locale as the
  //                   cross-locale link.
  //   enHref/zhHref — the counterpart URL relative to the current page (the EN
  //                   page links out to zhHref, the /zh/ page back to enHref).
  localeToggle: (data) => {
    if (!isPublished(data)) return null;
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
    if (!["index", "competition", "workshop", "contact", "openDayHamburg"].includes(key))
      return undefined;
    const ev = data.event;
    const t = resolveLocale(data);
    const j = t.jsonld;
    // Eleventy probes computed fns against a dependency-tracking proxy where
    // nested data isn't concrete yet; bail until the real values are present.
    if (!j || !ev || typeof ev.startDate !== "string") return undefined;

    if (key === "index") {
      // Event withheld until a firm, non-past date is published: a past-dated
      // EventScheduled is flagged stale/invalid for rich results while the schedule
      // is being revised. Organization stays. To restore the Event, add
      // ev.eventPublishStartDate (the revised startDate) to _data/event.json and set
      // endDate/eventStatus there to match. Opened 2026-07-22 with the locked revised
      // schedule: real dates, EventScheduled. Mirrors the workshop gate. Refs #83.
      const blocks = [
        { comment: "Structured data: Organization schema", data: organizationSchema(ev, t) },
      ];
      if (typeof ev.eventPublishStartDate === "string") {
        blocks.unshift({
          comment: "Structured data: Event schema",
          data: {
            "@context": "https://schema.org",
            "@type": "Event",
            name: j.eventNameIndex,
            alternateName: j.eventAlternateName,
            description: j.eventDescriptionIndex,
            startDate: ev.eventPublishStartDate,
            endDate: ev.endDate,
            eventStatus: ev.eventStatus,
            eventAttendanceMode: ev.eventAttendanceMode,
            location: { "@type": "Place", name: j.locationNameIndex },
            organizer: ev.organizersIndex,
            url: data.canonical,
            image: ev.image,
            sponsor: ev.sponsors,
          },
        });
      }
      return blocks;
    }

    if (key === "competition") {
      // Event withheld until a firm date is published (see the index branch note and
      // the workshop gate). Organization + BreadcrumbList stay. Refs #83.
      const blocks = [
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
      if (typeof ev.eventPublishStartDate === "string") {
        blocks.unshift({
          comment: "Structured data: Competition Event",
          data: {
            "@context": "https://schema.org",
            "@type": "Event",
            name: j.eventNameCompetition,
            description: j.eventDescriptionCompetition,
            startDate: ev.eventPublishStartDate,
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
        });
      }
      return blocks;
    }

    if (key === "workshop") {
      // The workshop Event is emitted ONLY once a real date exists. Google
      // validates every node typed "Event" (including each subEvent) and requires
      // startDate for rich-result eligibility; an undated Event — and any subEvent
      // missing startDate + location — is reported invalid. While the workshop
      // date, venue, and talk line-up are TBD we publish only the Organization +
      // BreadcrumbList blocks. To restore the Event later, add ev.workshopStartDate
      // (and optionally ev.workshopEndDate) to _data/event.json, and re-introduce
      // real, dated subEvents at that point — do NOT re-add the "Talk title to be
      // announced" placeholders, which cannot be valid Events.
      const blocks = [
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
      if (typeof ev.workshopStartDate === "string") {
        blocks.unshift({
          comment: "Structured data: Workshop Event",
          data: {
            "@context": "https://schema.org",
            "@type": "Event",
            name: j.eventNameWorkshop,
            description: j.eventDescriptionWorkshop,
            startDate: ev.workshopStartDate,
            ...(typeof ev.workshopEndDate === "string" ? { endDate: ev.workshopEndDate } : {}),
            eventStatus: ev.workshopEventStatus,
            eventAttendanceMode: ev.workshopEventAttendanceMode,
            location: ev.workshopLocation,
            url: data.canonical,
            image: ev.image,
            organizer: ev.workshopOrganizers,
          },
        });
      }
      return blocks;
    }

    if (key === "openDayHamburg") {
      // The Hamburg Open Day Event is date-gated on ev.openDayHamburgStartDate, exactly
      // like the workshop above — but this gate is OPEN: the day has a real date
      // (2026-08-17) and a real venue (Google Germany GmbH, Hamburg), so a valid Event
      // IS emitted today. The gate is kept anyway so the Event can be withheld by
      // deleting one key if the day is ever postponed to an unknown date, and so the
      // page degrades to Organization + BreadcrumbList rather than emitting a stale,
      // past-dated EventScheduled (the failure the index/competition gate exists to
      // prevent — see those branches). This gate is INDEPENDENT of
      // ev.eventPublishStartDate: the index/competition Events stayed withheld while this
      // one published, and opened separately on 2026-07-22 when the revised schedule was
      // locked — so do NOT couple them. Talk-level subEvents are deliberately
      // omitted while the talk titles are TBA (an Event node without a real
      // name/startDate/location is an invalid rich result — the same reasoning that
      // dropped the workshop's placeholder subEvents). `offers` advertises the free
      // seats, flipping to SoldOut off the same site.openDayRegistration flag the page
      // body branches on, so the structured data can never claim seats the form no
      // longer takes.
      const blocks = [
        { comment: "Structured data: Organization schema", data: organizationSchema(ev, t) },
        {
          comment: "Structured data: Breadcrumbs",
          data: {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: j.breadcrumbHome, item: ev.siteUrl },
              { "@type": "ListItem", position: 2, name: j.breadcrumbOpenDayHamburg, item: data.canonical },
            ],
          },
        },
      ];
      if (typeof ev.openDayHamburgStartDate === "string") {
        blocks.unshift({
          comment: "Structured data: Open Day Event",
          data: {
            "@context": "https://schema.org",
            "@type": "Event",
            name: j.eventNameOpenDayHamburg,
            description: j.eventDescriptionOpenDayHamburg,
            startDate: ev.openDayHamburgStartDate,
            endDate: ev.openDayHamburgEndDate,
            eventStatus: ev.openDayHamburgEventStatus,
            eventAttendanceMode: ev.openDayHamburgEventAttendanceMode,
            location: ev.openDayHamburgLocation,
            organizer: ev.openDayHamburgOrganizers,
            url: data.canonical,
            image: ev.image,
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "EUR",
              url: ev.openDayHamburgUrl,
              availability:
                ((data.site && data.site.openDayRegistration) === "open")
                  ? "https://schema.org/InStock"
                  : "https://schema.org/SoldOut",
            },
          },
        });
      }
      return blocks;
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
