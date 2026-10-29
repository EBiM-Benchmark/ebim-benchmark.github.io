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
//             index/competition/workshop/contact/openDay/openDayHamburg/
//             openDayShanghai/openDayMunich pages, rendered
//             by _includes/jsonld.njk. Sourced from the language-neutral `event`
//             data + translatable `t.jsonld` strings; deep-equal to the
//             hand-authored blocks — EXCEPT the date-gated Events. index,
//             competition and workshop each gate their Event on a date key that
//             is currently ABSENT, so they emit only Organization (+
//             BreadcrumbList), while openDayHamburg's, openDayShanghai's and
//             openDayMunich's gates are OPEN (a real date and venue exist for each) and do emit their
//             Events. openDay is the Open Day HUB — a listing page, not an event —
//             so it never emits one. Each gate is
//             independent; see the per-key blocks below.
//
// Every locale fact (lang tags, dirs, publish maps, page pairs) comes from the
// registry in lib/locales.mjs; nothing below branches on a specific language.

import {
  LOCALES,
  DEFAULT_LOCALE,
  HREFLANG_ORDER,
  TOGGLE_ORDER,
  SITE_URL,
  PAIRS,
  depth,
} from "../../lib/locales.mjs";

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

// The page's locale: its `lang` data (src/zh/zh.11tydata.json sets "zh") if
// that is a registry key, else the default. Every locale-aware helper below
// reads the registry row for this code instead of branching on a language.
const localeOf = (data) => (Object.hasOwn(LOCALES, data.lang ?? "") ? data.lang : DEFAULT_LOCALE);

// String table for the page's locale: walk the `fallback` chain from the
// page's locale (zh-tw → zh → en), then deep-merge from the base outward so the
// nearest locale wins and any missing key falls back.
function resolveLocale(data) {
  const locales = data.i18n || {};
  const chain = [];
  for (let loc = localeOf(data); loc; loc = LOCALES[loc].fallback) chain.unshift(loc);
  return chain.reduce((acc, loc) => deepMerge(acc, locales[loc] || {}), {});
}

// Per-page publish gate. Each non-default locale's row names a site.json map
// (publishedKey, e.g. site.zhPublished) keyed by i18nKey; a localized page is
// PUBLISHED in that locale iff its own key's flag is true. A missing map or key
// means "not published". The default locale is always published. Drives
// localeNoindex / hreflangAlternates / localeToggle so each page's SEO surface
// (noindex, hreflang, sitemap, toggle) lights up independently (set a flag
// back to false to return that page to a draft).
const isPublished = (data, loc) => {
  const key = LOCALES[loc].publishedKey;
  if (key === null) return true;
  const map = (data.site && data.site[key]) || {};
  return map[data.i18nKey] === true;
};

// The locales a page's pair is published in, in `order` — or [] when the page
// has no cross-locale relationship to advertise: its i18nKey is not a PAIRS
// key, its OWN locale is a draft, or fewer than two locales are published for
// the key (a lone locale has no counterpart). So a zh draft drops hreflang and
// the toggle on BOTH sides of its pair.
const publishedCluster = (data, order) => {
  if (!Object.hasOwn(PAIRS, data.i18nKey ?? "")) return [];
  if (!isPublished(data, localeOf(data))) return [];
  const locs = order.filter((loc) => isPublished(data, loc));
  return locs.length >= 2 ? locs : [];
};

// The page's data key for the shared head-meta + JSON-LD bundles (meta.<key>
// and the jsonld.* strings). `i18nKey` (the four content pages as of Phase 2b,
// plus the registration, FAQ and the three dated Open Day pages added later — each has a
// localized /zh/ counterpart) doubles as this key; `pageKey` is the
// EN-only equivalent for a page that draws from the shared data WITHOUT
// participating in localization (the Phase 2a state of workshop/contact, before
// their /zh/ counterparts shipped). localeToggle/hreflangAlternates stay keyed on
// i18nKey alone, so a pageKey-only page never lights those up. No page uses
// pageKey today, but the fallback is kept for any future EN-only-but-data-bound
// page; promote it to i18nKey (and add a /zh/ counterpart) to localize.
const pageDataKey = (data) => data.i18nKey || data.pageKey;

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

  // BCP-47 language tag for <html lang>, from the registry row: EN pages "en";
  // /zh/ pages advertise Simplified Chinese as "zh-Hans".
  htmlLang: (data) => LOCALES[localeOf(data)].htmlLang,

  // Path prefix for the root-level assets (fonts/js/img) relative to the current
  // page: one "../" per segment of the locale's dir. EN pages live at the site
  // root → "" (every asset link unchanged).
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
  assetBase: (data) => (data.absoluteUrls ? "/" : "../".repeat(depth(LOCALES[localeOf(data)].dir))),

  // Locale-aware navigation targets for navbar.njk / footer.njk — CHROME only.
  // The page bodies hardcode their own links inside their translated raw blocks,
  // so these must MATCH the body links for each page (do NOT auto-flip on the
  // publish flag, or the navbar would diverge from the still-hardcoded body).
  // EN keeps the exact current relative filenames (byte-identical render). All
  // ten /zh/ pages are now PUBLISHED (Phase 2c: workshop + contact joined index
  // + competition; register + faq added since, then the Hamburg Open Day, then the
  // Open Day hub + the Shanghai Open Day, then the Munich Open Day), so every
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
  //   changes. Every locale gets the same relative filenames (each resolves
  //   within the page's own locale dir), one per PAIRS key, in PAIRS order.
  links: (data) =>
    Object.fromEntries(
      Object.entries(PAIRS).map(([key, { file }]) => [key, data.absoluteUrls ? "/" + file : file]),
    ),

  // noindex directive for a non-default-locale page while ITS page is a draft
  // in that locale. A draft (e.g. its zhPublished[key] flag is false, or the
  // page has no i18nKey) must not be indexed; flipping that flag to true drops
  // the tag. EN pages never set this (their own `robots` front-matter, e.g. on
  // 404, is untouched).
  localeNoindex: (data) => {
    const loc = localeOf(data);
    return loc !== DEFAULT_LOCALE && !isPublished(data, loc);
  },

  // hreflang alternates, emitted by base.njk ONLY for a PUBLISHED localized page
  // (see publishedCluster). A draft, a page with no localized counterpart, or a
  // pair with a single published locale returns [] → no hreflang on either side.
  // Otherwise every published locale of the pair, in HREFLANG_ORDER, followed by
  // x-default → the default locale (today: en / zh-Hans / x-default).
  hreflangAlternates: (data) => {
    const locs = publishedCluster(data, HREFLANG_ORDER);
    if (!locs.length) return [];
    const href = (loc) => SITE_URL + LOCALES[loc].dir + PAIRS[data.i18nKey].url;
    return [
      ...locs.map((loc) => ({ hreflang: LOCALES[loc].hreflang, href: href(loc) })),
      { hreflang: "x-default", href: href(DEFAULT_LOCALE) },
    ];
  },

  // In-page language toggle, consumed by navbar.njk. Present ONLY where the
  // reciprocal hreflang is emitted (same publishedCluster gate); null everywhere
  // else, so the navbar renders with NO toggle (the EN-only utility pages, and
  // both sides of a pair returned to draft).
  // Shape: { options } — one per published locale of the pair, in TOGGLE_ORDER:
  //   code     — registry key
  //   active   — true for the current page's locale (rendered aria-current)
  //   label    — the registry chip; a zh* locale with no OTHER zh* locale in
  //              the cluster uses its chipAlone instead (zh: 中文 alone, 简
  //              beside 繁), so the label only changes once zh-TW publishes
  //   lang / hreflang — the registry htmlLang / hreflang
  //   href     — the counterpart URL RELATIVE to the current page: up out of
  //              the current locale's dir, then into the target's ("../",
  //              "zh/competition.html", …)
  localeToggle: (data) => {
    const locs = publishedCluster(data, TOGGLE_ORDER);
    if (!locs.length) return null;
    const cur = localeOf(data);
    const up = "../".repeat(depth(LOCALES[cur].dir));
    const zhFamily = (loc) => LOCALES[loc].htmlLang.startsWith("zh");
    const label = (loc) =>
      zhFamily(loc) && LOCALES[loc].chipAlone && !locs.some((o) => o !== loc && zhFamily(o))
        ? LOCALES[loc].chipAlone
        : LOCALES[loc].chip;
    return {
      options: locs.map((loc) => ({
        code: loc,
        active: loc === cur,
        label: label(loc),
        lang: LOCALES[loc].htmlLang,
        hreflang: LOCALES[loc].hreflang,
        href: up + LOCALES[loc].dir + PAIRS[data.i18nKey].url,
      })),
    };
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
    if (
      !["index", "competition", "workshop", "contact", "openDay", "openDayHamburg", "openDayShanghai", "openDayMunich"]
        .includes(key)
    )
      return undefined;
    const ev = data.event;
    const t = resolveLocale(data);
    const j = t.jsonld;
    // Eleventy probes computed fns against a dependency-tracking proxy where
    // nested data isn't concrete yet; bail until the real values are present.
    if (!j || !ev || typeof ev.startDate !== "string") return undefined;

    if (key === "index") {
      // Event date-gated on ev.eventPublishStartDate: emitted only while that key
      // exists, so a SUPERSEDED schedule can never sit published as a live
      // EventScheduled (the PR #93 failure — 2026-06-29/2026-08-31 for a schedule
      // that had already been abandoned; Google flags stale dates as invalid rich
      // results). A past startDate with a future endDate is fine — that is an event
      // in progress, which is what ships today. Organization always stays. To
      // withhold the Event again, delete the key; to publish it, set it in
      // _data/event.json with endDate/eventStatus to match. Opened 2026-07-22 with
      // the locked revised schedule: real dates, EventScheduled. Mirrors the
      // workshop gate. Refs #83.
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
      // Event date-gated on ev.eventPublishStartDate — open since 2026-07-22 (see the
      // index branch note and the workshop gate). Organization + BreadcrumbList always
      // stay. Refs #83.
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

    if (key === "openDay") {
      // The Open Day HUB (open-day.html) — a listing page for every Open Day, not
      // an event in its own right. It has no date, no venue and no attendance mode,
      // because none of those are properties of a list; the dated Events live on the
      // individual Open Day pages (openDayHamburg / openDayShanghai below), each
      // behind its own gate. So there is deliberately NO Event node and no gate
      // here: an Event typed onto a hub would either duplicate the child Events
      // under a URL that is not theirs, or be an undated Event — an invalid rich
      // result either way. Organization + BreadcrumbList only, exactly like the
      // contact page's non-Event shape.
      return [
        { comment: "Structured data: Organization schema", data: organizationSchema(ev, t) },
        {
          comment: "Structured data: Breadcrumbs",
          data: {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: j.breadcrumbHome, item: ev.siteUrl },
              { "@type": "ListItem", position: 2, name: j.breadcrumbOpenDay, item: data.canonical },
            ],
          },
        },
      ];
    }

    if (key === "openDayHamburg") {
      // The Hamburg Open Day Event is date-gated on ev.openDayHamburgStartDate, exactly
      // like the workshop above — but this gate is OPEN: the day has a real date
      // (2026-08-17) and a real venue (Google Germany GmbH, Hamburg), so a valid Event
      // IS emitted today. The gate is kept anyway so the Event can be withheld by
      // deleting one key if the day is ever postponed to an unknown date, and so the
      // page degrades to Organization + BreadcrumbList rather than emitting a stale,
      // superseded EventScheduled (the failure the index/competition gate exists to
      // prevent — see those branches). This gate is INDEPENDENT of
      // ev.eventPublishStartDate: the index/competition Events stayed withheld while this
      // one published, and opened separately on 2026-07-22 when the revised schedule was
      // locked — so do NOT couple them. Talk-level subEvents are deliberately
      // omitted, but NOT for want of titles: every talk on both Open Day pages now
      // has a confirmed title and a named speaker, so this is a standing editorial
      // choice rather than a data gap (see event.json _commentOpenDayHamburg). Adding
      // them means a real name/startDate/endDate/location each — an Event node
      // without those is an invalid rich result, the same reasoning that dropped the
      // workshop's placeholder subEvents. `offers` advertises the free
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
              // Self-canonical: each locale's Offer points at its own page (the EN canonical equals the event.json URL).
              url: data.canonical,
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

    if (key === "openDayShanghai") {
      // The Shanghai Open Day Event, date-gated on ev.openDayShanghaiStartDate — the
      // same shape as the Hamburg branch above, and OPEN for the same reason: a real
      // date (2026-08-21) and a real venue (Franka Robotics' Shanghai office, where
      // the EBiM Shanghai testbed is installed) exist, so a valid Event IS emitted
      // today. The gate is kept so the Event can be withheld by deleting one key if
      // the day is ever postponed to an unknown date, degrading the page to
      // Organization + BreadcrumbList rather than a stale EventScheduled. This gate
      // is INDEPENDENT of both the Hamburg gate and ev.eventPublishStartDate — do
      // NOT couple them. Talk-level subEvents are omitted as a standing editorial
      // choice, NOT for want of data: every slot carries a confirmed name and each
      // of the four talks a named speaker, and there is no 16:30 slot at all since
      // the revised program — the rationale this comment used to give. Adding them
      // means a real name/startDate/endDate/location each, since an Event node
      // without those is an invalid rich result (the same constraint as Hamburg and
      // the workshop, though only the workshop still lacks the data).
      //   NO `offers` node, and that is the one deliberate difference from Hamburg:
      // Shanghai is INVITATION-ONLY. Hamburg's Offer advertises free public seats
      // off site.openDayRegistration; an Offer here — even price "0" / InStock —
      // would tell Google the day is openly admissible, which is exactly what the
      // page body says it is not. site.openDayRegistration gates the Hamburg form
      // only and is not consumed here.
      const blocks = [
        { comment: "Structured data: Organization schema", data: organizationSchema(ev, t) },
        {
          comment: "Structured data: Breadcrumbs",
          data: {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: j.breadcrumbHome, item: ev.siteUrl },
              { "@type": "ListItem", position: 2, name: j.breadcrumbOpenDayShanghai, item: data.canonical },
            ],
          },
        },
      ];
      if (typeof ev.openDayShanghaiStartDate === "string") {
        blocks.unshift({
          comment: "Structured data: Open Day Event",
          data: {
            "@context": "https://schema.org",
            "@type": "Event",
            name: j.eventNameOpenDayShanghai,
            description: j.eventDescriptionOpenDayShanghai,
            startDate: ev.openDayShanghaiStartDate,
            endDate: ev.openDayShanghaiEndDate,
            eventStatus: ev.openDayShanghaiEventStatus,
            eventAttendanceMode: ev.openDayShanghaiEventAttendanceMode,
            location: ev.openDayShanghaiLocation,
            organizer: ev.openDayShanghaiOrganizers,
            url: data.canonical,
            image: ev.image,
          },
        });
      }
      return blocks;
    }

    if (key === "openDayMunich") {
      // The Munich Open Day Event, date-gated on ev.openDayMunichStartDate — the same
      // shape as the Hamburg branch, and OPEN for the same reason: a real date
      // (2026-09-10) and a real venue (Agile Robots SE, Munich) exist, so a valid Event
      // IS emitted today. The gate is kept so the Event can be withheld by deleting one
      // key if the day is ever postponed to an unknown date, degrading the page to
      // Organization + BreadcrumbList rather than a stale EventScheduled. This gate is
      // INDEPENDENT of the Hamburg gate, the Shanghai gate and ev.eventPublishStartDate
      // — do NOT couple them.
      //   Unlike Shanghai, this day KEEPS an `offers` node: Munich is public and free,
      // exactly like Hamburg, so advertising a free Offer is accurate here. Its
      // availability reads site.openDayMunichRegistration — the MUNICH flag, never
      // site.openDayRegistration, which is Hamburg's and sat at "closed" while this day
      // was still open. That independence is the whole reason the second key exists.
      // Note the flag has three states but the Offer only two: "waitlist" maps to
      // SoldOut alongside "closed", because at that point the 60 shuttle seats are gone
      // and a structured InStock claim would overstate what the form can still take.
      //   Talk-level subEvents are deliberately omitted, the same standing editorial
      // choice as the other two Open Days — not a data gap, even though two of the four
      // talks are still unassigned. Adding them means a real name/startDate/endDate/
      // location each; an Event node without those is an invalid rich result.
      const blocks = [
        { comment: "Structured data: Organization schema", data: organizationSchema(ev, t) },
        {
          comment: "Structured data: Breadcrumbs",
          data: {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: j.breadcrumbHome, item: ev.siteUrl },
              { "@type": "ListItem", position: 2, name: j.breadcrumbOpenDayMunich, item: data.canonical },
            ],
          },
        },
      ];
      if (typeof ev.openDayMunichStartDate === "string") {
        blocks.unshift({
          comment: "Structured data: Open Day Event",
          data: {
            "@context": "https://schema.org",
            "@type": "Event",
            name: j.eventNameOpenDayMunich,
            description: j.eventDescriptionOpenDayMunich,
            startDate: ev.openDayMunichStartDate,
            endDate: ev.openDayMunichEndDate,
            eventStatus: ev.openDayMunichEventStatus,
            eventAttendanceMode: ev.openDayMunichEventAttendanceMode,
            location: ev.openDayMunichLocation,
            organizer: ev.openDayMunichOrganizers,
            url: data.canonical,
            image: ev.image,
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "EUR",
              // Self-canonical: each locale's Offer points at its own page (the EN canonical equals the event.json URL).
              url: data.canonical,
              availability:
                ((data.site && data.site.openDayMunichRegistration) === "open")
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
