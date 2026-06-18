# EBiM Benchmark Website — EBiM-Benchmark

**Toward a Globally Coordinated Benchmark for Real-World Embodied Bimanual Manipulation**

A globally coordinated benchmark for real-world embodied bimanual manipulation — Competition + Workshop, 2026

🌐 **Live site:** [ebim-benchmark.github.io](https://ebim-benchmark.github.io)
📧 **Contact:** https://ebim-benchmark.github.io/contact.html

### Contact form: deep links & categories

`contact.html` posts to Web3Forms. **Deep links** — `contact.html?topic=SLUG` pre-selects a category. The accepted query slugs (below) are unchanged; each maps to the matching option's stable `data-slug`, and the visible dropdown label can differ:

- `register` → Competition — Register Interest
- `competition` → Competition Question
- `partner` → Partnership Inquiry *(label: "Partnership — Hardware, Funding & Compute")*
- `workshop` → Workshop / Poster Submission
- `media` → Media / Press
- `tech` → Technical (Platform / Website)
- `partnership` → Partnership / Testbed Hosting *(label: "Partnership — Testbed Hosting")*

Unknown/absent slug = no pre-selection.

**Adding a category** — everything keys off a stable per-option `data-slug` (so the human-readable `value`/label can change without touching routing). In `src/contact.njk`:

1. Add the `<option value="…" data-slug="SLUG">` to the category `<select>`.
2. Add a `SLUG → "[PREFIX] "` entry to the JS `prefixMap` (the email subject prefix).
3. *(optional)* add a query-slug → `data-slug` entry to the `?topic=` `topicMap`.
4. *(optional)* add the `data-slug` to the `DISCORD_TOPICS` array if the category should reveal the "faster path" Discord CTA (shown after the Category field).

The `data-slug` — not the option `value` — is the key shared across these places. The `value` string is the Web3Forms payload and is otherwise free to change.

**Destination email** is configured in the Web3Forms dashboard (tied to the access key in `src/contact.njk`), not in any committed file — so the address stays out of the public repo.

---

## Architecture overview

The site is a **multi-page** static site, built with [Eleventy](https://www.11ty.dev/) — Nunjucks templates in `src/` compile to static HTML in `_site/`. Three primary content pages, a contact form, and a 404:

| Page | URL | Purpose |
|---|---|---|
| **Home** | `index.html` | Landing page that funnels visitors to one of two tracks — minimal deep content, maximal navigation clarity |
| **Competition** | `competition.html` | The EBiM Competition — benchmark tasks, Mobile FR3 Duo platform, cross-continent testbeds, CFP |
| **Workshop** | `workshop.html` | The EBiM Benchmark workshop program — schedule, invited talks, panel, posters, dissemination |
| **Contact** | `contact.html` | Categorized Web3Forms contact form (+ `contact-success.html` no-JS fallback, `contact-test.html` internal health check) |
| **404** | `404.html` | Branded not-found page (`noindex`) with shared chrome and CTAs back to the primary pages |

### Why the split

The home page used to contain everything — schedule, benchmark spec, platform photos, task cards, organizers, partners. As the project grew, the page became too long and visitors couldn't quickly find what they needed. The current architecture:

- **Home** acts as a landing/funnel page (Two Ways to Engage cards, Key Themes, EBiM Maturity Roadmap, Important Dates summary, Organizers, Partners).
- **Competition** owns benchmark/platform/task/testbed deep content.
- **Workshop** owns schedule/talks/panel/posters/dissemination deep content.
- The Three-Phase Mechanism diagram appears on Home and Competition (Phase III = the Workshop is referenced as a link). It is **distinct** from the home page's EBiM Maturity Roadmap (Alpha/Beta/Gamma), which describes the multi-year initiative across editions, not this year's phases.
- Organizers and Partners live only on Home and are linked from sub-pages.

---

## Project structure

```
ebim-benchmark.github.io/
├── .eleventy.js                         # Eleventy config (input src/ → output _site/)
├── package.json / package-lock.json     # Eleventy dep (+ Prettier, dev) — `npm ci`
├── .github/workflows/
│   ├── deploy.yml                       # Build + deploy _site/ to Pages (GitHub Actions)
│   └── verify.yml                       # CI gate: EN parity + /zh/ locale (verify.mjs + verify-zh.mjs)
├── scripts/
│   ├── verify.mjs                       # Asserts the build matches the golden EN baseline
│   └── verify-zh.mjs                    # Asserts the /zh/ locale, per-page gated on zhPublished (hreflang/sitemap/noindex/CJK)
├── tests/baseline/                      # Golden EN HTML fixtures (the parity baseline)
├── src/
│   ├── _data/
│   │   ├── site.json                    # Site flags — zhPublished is a PER-PAGE map (i18nKey→bool) gating each /zh/ page
│   │   ├── event.json                   # Language-neutral structured-data facts (JSON-LD)
│   │   ├── i18n/en.json                 # English UI/meta/JSON-LD strings (the fallback locale)
│   │   ├── i18n/zh.json                 # Simplified-Chinese strings (machine draft; 1b index/competition + 2b workshop/contact)
│   │   └── eleventyComputed.js          # Locale lookup `t` + htmlLang/assetBase/links/localeToggle/jsonLd/pageMeta (per-page publish gate)
│   ├── _includes/
│   │   ├── layouts/base.njk             # <html> skeleton + per-page head fields/conditionals
│   │   ├── head.njk                     # Shared favicon/font/CSS head tail
│   │   ├── navbar.njk                   # Shared navbar (single source; labels via i18n)
│   │   ├── footer.njk                   # Shared footer (single source; labels via i18n)
│   │   ├── jsonld.njk                   # Renders the index/competition/workshop/contact JSON-LD from _data
│   │   └── contact-form-script.njk      # Single-sourced contact-form JS (shared by EN + zh contact)
│   ├── index.njk                        # Landing page (funnel to sub-pages)
│   ├── competition.njk                  # The EBiM Competition
│   ├── workshop.njk                     # Workshop Program
│   ├── contact.njk                      # Categorized Web3Forms contact form (JS via shared include)
│   ├── contact-success.njk              # No-JS POST fallback success page
│   ├── contact-test.njk                 # Internal contact-form health check (not linked)
│   ├── 404.njk                          # Branded 404 (noindex)
│   ├── zh/                              # Simplified-Chinese locale (1b; index/competition PUBLISHED 1d, workshop/contact DRAFTS 2b)
│   │   ├── zh.11tydata.json             #   sets lang: zh for the whole tree
│   │   ├── index.njk                    #   → /zh/ (self-canonical; hreflang ⇄ EN when published)
│   │   ├── competition.njk              #   → /zh/competition.html (published)
│   │   ├── workshop.njk                 #   → /zh/workshop.html (draft: noindex, no hreflang/sitemap/toggle)
│   │   └── contact.njk                  #   → /zh/contact.html (draft; form JS via shared include)
│   ├── css/style.css                    # All shared styles (passthrough-copied verbatim)
│   ├── js/main.js                       # Navbar/scroll/dropdown/fade-in behavior (passthrough)
│   ├── img/                             # favicon, OG cover, platform photos, sponsor logos
│   │                                    #   (sponsors/ folder name kept so asset paths stay stable)
│   ├── robots.txt                       # Allow-all + sitemap pointer (passthrough)
│   ├── sitemap.njk                      # Locale-aware sitemap (per-page gated on zhPublished; 4 EN + the published /zh/ URLs)
│   └── .nojekyll                        # Disable Jekyll on GitHub Pages
├── _site/                               # Build output (gitignored) — this is what gets deployed
└── README.md
```

Each `src/*.njk` page extends `_includes/layouts/base.njk` and supplies its own head meta
(OG/Twitter/JSON-LD), inline `<style>`, body, and (the contact pages) trailing `<script>`.
`permalink` front matter pins the exact `.html` URLs, so output paths are unchanged.

---

## Setup

Built with [Eleventy](https://www.11ty.dev/) (a `package.json` dependency). Prettier is a dev dependency used only by the parity harness — there are no runtime dependencies in the shipped site.

```bash
npm ci            # install Eleventy (+ Prettier)
npm run build     # compile src/ → _site/
npm run serve     # local dev server with live reload (eleventy --serve)
```

### Parity harness

`node scripts/verify.mjs` (alias `npm run verify`) builds the site and asserts the English output is byte/semantically identical to the golden fixtures committed in `tests/baseline/` — markup structure (Prettier-normalized), HTML comments, JSON-LD (deep-equal, order-insensitive), and the contact-form internals. It runs on every PR via `.github/workflows/verify.yml`.

**Changing English output on purpose** means the baseline must be regenerated in the same commit — otherwise the net correctly goes red. Run `npm run build`, then copy the 7 `_site/*.html` into `tests/baseline/`. The fixtures are kept byte-for-byte faithful to the build, so this straight copy is the whole procedure — never hand-edit a fixture.

`node scripts/verify-zh.mjs` (alias `npm run verify:zh`, or `npm run verify:all` to run both) checks the `/zh/` locale against the same build, with every gated assertion reading `site.zhPublished` so it is correct in either state. Always: each `/zh/` page is `<html lang="zh-Hans">`, has a self-referential `/zh/` canonical, links localized targets under `/zh/` (workshop/contact fall back to EN), and contains translated CJK text. Published (the current state): no `noindex`, the reciprocal `en` / `zh-Hans` / `x-default` hreflang cluster, `/zh/` present in `sitemap.xml` (6 URLs total) with `hreflang` appearing **only** on the index/competition pairs, and the navbar **language toggle** rendering with 中文 active + an "EN" link to the EN counterpart. Unpublished: `noindex`, no `hreflang` anywhere, `/zh/` absent from the sitemap, and no toggle. CI runs both harnesses on every PR.

### GitHub Pages deployment

`.github/workflows/deploy.yml` builds the site and deploys `_site/` to GitHub Pages on every push to `main`. This takes effect once the repo's Pages source is set to **GitHub Actions** (Settings → Pages → "Build and deployment" → Source).

---

## Internationalization (i18n)

English is the primary locale. A **Simplified-Chinese `/zh/` locale** was added in **Phase 1b**: the landing + competition pages were **published in Phase 1d** once their translation passed native review, and the workshop + contact pages followed in **Phase 2b** as **unpublished machine-draft previews** (noindex, no hreflang/sitemap/toggle) awaiting review. Publish state is **per page** (see the gate below). Structured-data and shared-chrome strings are factored out so a locale is added without touching the EN templates:

- **`src/_data/event.json`** — language-neutral structured-data facts (dates, canonical URLs, organizer/sponsor lists, testbed addresses, the workshop's attendance mode / placeholder venue / panelists) shared by the JSON-LD on the index, competition, workshop, and contact pages.
- **`src/_data/i18n/<lang>.json`** — translatable strings, namespaced `brand` / `nav` / `footer` / `meta` (per-page head-meta) / `jsonld`. `en` is the fallback locale; `zh` (Simplified Chinese, machine draft) mirrors every `en` key — any key left untranslated falls back to English.
- **`src/_data/eleventyComputed.js`** — `t` resolves the page's `lang` (default `en`) with **English fallback**; `pageMeta` / `jsonLd` build the per-locale head-meta and the index/competition/workshop/contact JSON-LD, keyed by `pageDataKey` = `i18nKey || pageKey`. `i18nKey` (all four content pages, as of Phase 2b) marks a page with a localized `/zh/` counterpart and drives hreflang/toggle/`/zh/`; `pageKey` is the EN-only equivalent that binds a page to the same shared data **without** localization (the Phase 2a state of workshop/contact, promoted to `i18nKey` in 2b — the helper still supports `pageKey` for any future EN-only-but-data-bound page). Locale-aware helpers keep the shared shell working under `/zh/` while leaving EN byte-identical: `htmlLang` (`en` → `zh-Hans`), `assetBase` (`""` → `"../"` since `/zh/` is one directory down), `links` (nav targets: index + competition relative under `/zh/`, workshop + contact resolve back up to EN so the published pages stay byte-identical and the drafts stay unlinked), the per-page `zhNoindex`, and the per-page-gated `hreflangAlternates` (which, where published, is the one intentional EN-head change — the hreflang cluster on index/competition). `localeToggle` drives the in-page navbar **language switcher**: it returns `null` unless the page is a *published* localized page — keyed off the same per-page `zhPublished[i18nKey]` gate as the hreflang (page-pairs live in the `TOGGLE_HREFS` map, which now has all four pages) — so the toggle appears exactly where the reciprocal hreflang does, and EN-only/draft pages render the navbar with no toggle (byte-identical). Localizing/publishing a page is one row in `TOGGLE_HREFS` + `HREFLANG_PAIRS` + an `i18nKey` + a `/zh/` counterpart + flipping its `zhPublished` flag, with no template change.
- **`src/_includes/`** — `base.njk` / `head.njk` / `navbar.njk` / `footer.njk` read locale via those helpers; the EN render path is unchanged and guarded by the parity harness.
- **`src/zh/`** — the localized pages (`lang: zh` via `zh.11tydata.json`), reusing the same includes; only the body prose, `<html lang>`, canonical, head-meta, and (where published) hreflang differ. The contact form's behavior JS is single-sourced in `_includes/contact-form-script.njk` and `{% include %}`d by both EN and zh contact, so there is one copy of the language-agnostic logic (it keys off each option's `data-slug`, never the visible label) and the EN render stays byte-identical.

**Publish gate — `src/_data/site.json` → `"zhPublished"`** is a **per-page map** keyed by `i18nKey`, e.g. `{ "index": true, "competition": true, "workshop": false, "contact": false }` (index/competition published in 1d; workshop/contact ship as 2b drafts). Each page reads **its own** flag. For a page whose flag is `false` (**draft**): its `/zh/` page emits `<meta name="robots" content="noindex">`, is kept out of the sitemap, carries **no `hreflang`** (either side), and renders **no language toggle**. For a page whose flag is `true` (**published**): the `/zh/` page drops `noindex`, the EN + `/zh/` pair carries the reciprocal `en` / `zh-Hans` / `x-default` hreflang cluster (EN-only pages emit none; canonicals stay self), the `/zh/` url is listed in `sitemap.xml` with per-pair `xhtml:link` alternates, and the navbar language toggle renders. The sitemap is rendered from `src/sitemap.njk` (per-page gated, locale-aware) — not a static passthrough. `scripts/verify-zh.mjs` reads the map and proves whichever mix of published pages and drafts is committed; flip a page's flag to `true` to publish it (re-baseline that page's EN fixture in the same commit, since publishing adds its hreflang cluster to the EN `<head>`).

---

## Page sections

### Home (`index.html`)

| Section | ID | Purpose |
|---|---|---|
| Hero | `#home` | Full-viewport hero with two CTAs (Enter Competition / View Workshop) |
| Overview | `#overview` | Abstract paragraph + Three-Phase Pipeline diagram |
| Two Ways to Engage | `#engage` | Paired feature cards funneling to Competition / Workshop |
| Key Themes | `#themes` | 4 research-question cards (sim-to-real, cross-site repro, foundation/VLA, contact-rich) |
| EBiM Maturity Roadmap | `#maturity` | Alpha (2026, current) → Beta (2027) → Gamma (future) multi-year initiative roadmap — styled distinctly from the Phase I/II/III pipeline |
| Important Dates | `#dates` | 2-column track summary (Competition vs Workshop dates) |
| Organizers | `#organizers` | Organizing Committee, Advisory Board, Competition Support Team |
| Partners | `#partners` (empty `#sponsors` span kept as alias) | ICRA-style tiers — Platinum · Gold · Silver · Bronze |
| Get Involved | `#contact` | Dual CTA + email contact (dark section) |

### Competition (`competition.html`)

| Section | ID | Purpose |
|---|---|---|
| Sub-hero | `#home` | 40vh hero with breadcrumb + Register Interest CTA |
| Why This Benchmark | `#why` | Motivation copy |
| Three-Phase Mechanism | `#overview` | Pipeline diagram with link to Workshop page for Phase III |
| Mobile FR3 Duo | `#platform` | Platform specs grid + 2 photos (WebP + PNG fallback) |
| The Benchmark | `#benchmark` | 6-pillar framework |
| Benchmark Tasks | `#tasks` | 3 task cards (cable routing, deformable, assisted living) |
| Cross-Continent Testbeds | `#testbeds` | 4 site cards (Hamburg, Munich, Pittsburgh, Shanghai) |
| Competition Architecture | `#architecture` | End-to-end pipeline (Sim → Cross-Site Validation → Real-World) + 5 pillars + Infrastructure & Simulation Stack |
| Call for Participation | `#call-for-participation` | Phase I / Phase II / Eligibility cards + key dates |
| Awards & Prizes | `#awards` | Per-task prizes in two tracks — Real-World Excellence (cash + purchase voucher) + Simulation Prize (AMD) — up to $5,250/task; + in-kind AMD hardware support |
| Partners | `#partners` (empty `#sponsors` span kept as alias) | Same ICRA-style tiers as Home, plus a Community Resources callout (Franka Community) |
| Workshop callout | (banner) | "Looking for the Workshop?" → workshop.html |

### Workshop (`workshop.html`)

| Section | ID | Purpose |
|---|---|---|
| Sub-hero | `#home` | 40vh hero with breadcrumb + View Schedule CTA |
| Workshop Overview | `#overview` | Half-day workshop intro with link to Competition page |
| Schedule | `#schedule` | Tentative timeline (08:30–13:30) with type-coded rows |
| Invited Talks | `#talks` | 4 speaker cards (speakers + titles "to be announced"; section hidden pending re-invites) |
| Panel Discussion | `#panel` | Host + panelists + 3 discussion themes |
| Poster Session & CFP | `#call-for-participation` | Extended Abstracts / Live Demos / Participation cards |
| Important Dates | `#contact` | Poster deadline / Notification / Camera-Ready / Workshop Day (dark section) |
| Dissemination | `#dissemination` | 4 cards (long-term site, slides, open protocols, perspective article) |
| Competition callout | (banner) | "Looking for the Competition?" → competition.html |

---

## Workshop program (tentative — speakers being re-invited)

**Format:** Half-day morning session — exact date and venue to be announced

| Time | Session |
|------|---------|
| 08:30–08:40 | Opening Remarks |
| 08:40–09:05 | Invited Talk 1 — Speaker TBA (title to be announced) |
| 09:05–09:30 | Invited Talk 2 — Speaker TBA (title to be announced) |
| 09:30–09:55 | Invited Talk 3 — Speaker TBA (title to be announced) |
| 09:55–10:30 | Competition Highlights — Winner Teams (Task 1, Task 2, Task 3 first-place teams) |
| 10:30–11:00 | Poster Session & Coffee Break |
| 11:00–11:25 | Invited Talk 4 — Speaker TBA (title to be announced) |
| 11:25–12:00 | Panel Discussion — Host TBA; panelists: Stefan Schaal (Intrinsic), Kenny Kimble (NIST), Sven Parusel (Franka Robotics), Shaowei Cui (SCUT) |
| 12:10–12:30 | Best Poster Award & Competition Award |
| 12:30–13:30 | Hosted Lunch & Networking |

*Times are intentionally non-contiguous — a 12:00–12:10 break sits between the panel and the awards.*

---

## Benchmark tasks (3 core tasks)

1. **Cable Routing & Plugging** — contact-rich, sequential
2. **Deformable Material Handling (Thermal Pad Placement)** — deformable, precision
3. **Assisted Living & Feeding** — human-centered, safety-critical

## Competition platform

**Mobile FR3 Duo by Franka Robotics** — deployed at all four testbed sites:
Hamburg · Munich · Pittsburgh · Shanghai

---

## Shared chrome (navbar + footer)

The navbar and footer are single Nunjucks includes — `src/_includes/navbar.njk` and `src/_includes/footer.njk` — pulled into every page by `src/_includes/layouts/base.njk`. There is one source of truth, so there is nothing to "keep in sync." `contact.njk` sets `navActive: contact` in its front matter, which adds `aria-current="page"` to the Contact nav link; no other page sets an active state.

> Earlier versions duplicated these blocks across all 7 HTML files and guarded them with `<!-- SHARED NAVBAR/FOOTER — keep in sync … -->` comments. The Eleventy migration replaced that with the includes above, and those scaffolding comments were dropped.

### Updating the shared chrome

Edit `src/_includes/navbar.njk` or `src/_includes/footer.njk` once — visible labels come from `src/_data/i18n/en.json` via the `t` lookup (zh from `zh.json`), and link targets from the locale-aware `links` helper, so the one include serves both EN and `/zh/`. `npm run build` regenerates every page, and `node scripts/verify.mjs` confirms nothing else changed.

### Navbar items

- **EBiM Benchmark** brand → `index.html`
- **Home** dropdown → 5 sub-items linking to home sections (incl. Maturity Roadmap)
- **Competition** dropdown → 8 sub-items linking to competition sections
- **Workshop** dropdown → 7 sub-items linking to workshop sections
- **Organizers** → `index.html#organizers`
- **Partners** → `index.html#partners`
- **Contact** → https://ebim-benchmark.github.io/contact.html
- **Language toggle** (EN ⇄ 中文) → shown **only** on pages with a published localized counterpart (currently index + competition, EN and `/zh/`). The current locale is a non-interactive chip (`aria-current`); the other is a link to its counterpart (`hreflang`/`lang` set). Driven by the `localeToggle` helper, it lives inside `.nav-links` so it rides into the mobile drawer, and auto-extends to any page localized in Phase 2.

### Footer columns

- **Pages**: Home / Competition / Workshop
- **People**: Organizers / Partners
- **Participate**: Compete / Submit Poster / Contact Us

---

## Active page indicator

Each page has a body class that drives the navbar's "you are here" highlight:

| Page | Body class |
|---|---|
| `index.html` | `<body class="page-home">` |
| `competition.html` | `<body class="page-competition">` |
| `workshop.html` | `<body class="page-workshop">` |
| `contact.html` | `<body class="page-contact">` |
| `404.html` | `<body class="page-404">` |

The CSS rule:

```css
.page-home          .nav-home > a,
.page-competition   .nav-competition > a,
.page-workshop      .nav-workshop > a {
  color: var(--accent);
  font-weight: 700;
}
```

For section-level highlighting (which dropdown sub-item or TOC item is currently in view), `js/main.js` adds an `.active` class on scroll, matching any link whose `href` ends with `#<section-id>`. This works for both bare anchors (`#why`) and cross-page hrefs (`competition.html#why`) used in the shared dropdowns.

---

## On-page TOC sidebar (sub-pages only)

`competition.html` and `workshop.html` include an `<aside class="toc-sidebar">` right after their sub-hero. CSS makes it fixed-position, right-side, 200px wide, and visible **only at viewports ≥ 1400px**. The home page and 404 page don't include the aside.

Behavior:
- Hidden by default (CSS `opacity: 0; visibility: hidden`).
- JS adds `.is-visible` once the user scrolls past the sub-hero (with a 100px buffer for a smoother handoff). Fade-in animates over 300ms.
- Default visible state is **55% opacity** so it doesn't compete with content; goes opaque on hover or keyboard focus-within.
- Active section gets a 2px cyan left rail + bold cyan text, driven by the same `markActive()` scroll handler that highlights navbar dropdown items.

---

## Mobile nav behavior

- **Breakpoint**: ≤ 768px shows hamburger; ≥ 769px shows the desktop horizontal navbar.
- **Drawer**: `position: fixed`, slides down from the top with `transform: translateY(calc(-100% - var(--nav-h) - 0.5rem))` in the closed state — this calc-based hide guarantees the drawer fully clears the navbar at any drawer height (a percentage-only translate broke when dropdowns collapsed and the drawer became shorter).
- **Scrollable**: `max-height: calc(100vh - var(--nav-h))` + `overflow-y: auto` so the drawer scrolls when content (especially with all dropdowns expanded) exceeds the viewport.
- **Collapsible dropdowns**: each parent dropdown `<li>` includes a separate `<button class="dropdown-toggle">` next to the link. The link still navigates when tapped; the button toggles a `.expanded` class on the `<li>` to show/hide the sub-menu. One open at a time. Closing the hamburger drawer collapses any expanded dropdown.

---

## Anchor-jump scroll offset

In-page navigation lands the user on a section two ways: the navbar dropdowns (Home / Competition / Workshop sub-items) and the TOC sidebar jump to `#section` anchors, and the contact deep-link (`contact.html?topic=…`) calls `scrollIntoView({ block: 'start' })` on `.contact-card`. Because the navbar is `position: fixed`, a raw jump aligns the target to the very top of the viewport, leaving it hidden under the navbar.

`html { scroll-padding-top: calc(var(--nav-h) + 1rem) }` lands those jumps just below the navbar instead. One rule covers both cases — `scroll-padding-top` is honored by native fragment navigation **and** by `scrollIntoView({ block: 'start' })` — and it tracks `--nav-h` automatically, clearing 68px desktop / 60px at the ≤ 380px breakpoint, plus a 1rem gap.

---

## SEO infrastructure

Each content page (`index`, `competition`, `workshop`) carries:

| Element | Purpose |
|---|---|
| Unique `<title>` (≤ 66 chars) | SERP truncation safe |
| Unique `<meta name="description">` (≤ 156 chars) | SERP truncation safe |
| Unique `<link rel="canonical">` | Avoid duplicate-content penalties |
| Unique OG (`og:url`, `og:title`, `og:description`) + Twitter Card tags | Per-page social previews |
| OG image (`og-cover.png`, 1200×630, ~87 KB) | Spec-compliant social card |
| `<meta name="keywords">` | Used by some academic indexers |
| `<meta name="google-site-verification">` | Search Console verification token |
| JSON-LD `Event` schema | Rich event card |
| JSON-LD `Organization` schema | Brand entity |
| JSON-LD `BreadcrumbList` (sub-pages) | Breadcrumb-style SERP enhancement |
| JSON-LD with `subEvent` array (workshop) | Each invited talk + the panel as discoverable sub-events |

`404.html` is intentionally `noindex` and has no OG tags.

`sitemap.xml` is rendered from `src/sitemap.njk` (per-page gated on `zhPublished`): the 4 EN URLs (home, competition, workshop, contact) plus a `/zh/` URL for each **published** page — currently the 2 published `/zh/` URLs (index, competition) with `xhtml:link` hreflang alternates on those pairs; the workshop/contact `/zh/` drafts are excluded until their flag flips. It is referenced from `robots.txt`.

### Heading hierarchy

Each page has exactly **one `<h1>`**. Section headings are `<h2 class="section-title">`. Sub-section headings are `<h3>` (the previous `<h2>` → `<h4>` skips in theme/talk/dissemination cards have been fixed by promoting them to `<h3>`).

### Image attributes

Every `<img>` has `alt`, `width`, `height` (CLS prevention), `loading="lazy"`, and `decoding="async"`. The hero/sub-hero brand is a pure CSS/text wordmark (no image), so there is no hero LCP image; remaining LCP-critical images carry `fetchpriority="high"` and `loading="eager"`.

---

## Image asset strategy

### Open Graph image
- `img/og-cover.png` — 1200×630 PNG, ~87 KB, EBiM-branded (rasterized from `img/og-cover.svg`). Matches the social-share spec. The pre-rebrand `og-cover.jpg` was removed.

### Platform photos (competition.html only)
- WebP versions are the primary asset for ~96% of browsers (~18 KB and ~31 KB respectively).
- PNG versions stay as fallback for the ~4% of browsers without WebP support, served via `<picture>` element:

  ```html
  <picture>
    <source srcset="img/platform/MFR3_Duo.webp" type="image/webp">
    <img src="img/platform/MFR3_Duo.png" alt="..." width="1600" height="900" loading="lazy">
  </picture>
  ```
- Net page-weight savings: ~10.7 MB → ~49 KB combined for the two photos when WebP is served.

### Partner logos
- Arranged in ICRA-style tiers (Platinum · Gold · Silver · Bronze) with descending logo prominence; per-tier sizing lives in `css/style.css` under `/* ---------- Partners (ICRA-style tiered) ---------- */`, with a few per-logo overrides (e.g. Google shrunk, AMD nudged up via `transform: scale`, VRB/RIG/HHRI enlarged, Galbot shrunk).
- SVGs render at native resolution; for raster logos `width`/`height` attrs match the source-file dimensions for CLS prevention.
- All partner logos use `loading="lazy"` and `decoding="async"`. (The folder stays `img/sponsors/` so asset paths remain stable.)

---

## Content status

### Done
- [x] Multi-page restructure: `index.html` (landing), `competition.html`, `workshop.html`, `404.html`
- [x] Shared navbar + footer (byte-identical, comment-tagged)
- [x] Schedule: final 4-talk + competition + panel program (08:30–13:30)
- [x] Benchmark tasks: 3 core tasks
- [x] Organizers: OC (10), Advisory (4), Support (11)
- [x] Invited talks: both speakers AND titles set to "to be announced" on workshop.html (speakers being re-invited; the dedicated `#talks` section stays hidden)
- [x] Mobile FR3 Duo platform section + photos
- [x] EBiM Benchmark wordmark (CSS/text) in hero/sub-hero, navbar, and footer on all pages
- [x] Partners (ICRA-style tiers): Platinum (Agile Robots, Franka Robotics, Google, AMD), Gold (Mech-Mind, vivo), Silver (Taipei Computer Association, RobotGym), Bronze (Virtual Research Building/AICO, Robotics Institute Germany, Hon Hai Research Institute, Galbot, Lightwheel, ManipulationNet); site-wide "Sponsors → Partners" rename with `#partners` anchor + backward-compatible `#sponsors` alias span
- [x] Franka Community: Community Resources callout on competition.html + footer link (the inline note under the Franka card was dropped in the tier redesign)
- [x] Discord integration: invite (`discord.gg/pGwRbMRjuH`) wired into the shared footer (all 7 pages), a category-conditional "faster path" CTA on `contact.html` (shown after the Category field for competition/register/workshop topics), and the competition Community pillar (Discord + GitHub linked; Docs + Cloud Access left bare pending public URLs)
- [x] 4-testbed coverage: Hamburg (top floor of the Google Hamburg office), Munich, Pittsburgh, Shanghai (Franka Robotics branch office)
- [x] Competition timeline: Simulation Release Jun 20 → Simulation End Aug 5 → Results Announced Aug 6 → Phase II two-window (team hands-on bench testing Aug 6–15; organizer-run testing & evaluation Aug 16–31, with code submission staying open — not a freeze); workshop date & Final Results TBD
- [x] Competition awards (per task): Real-World Excellence — 1st $1,500 / 2nd $1,000 / 3rd $500 cash, each + a Franka Robotics purchase voucher (US$3,750 / $2,500 / $1,250 value) + trophy/gift; Simulation Prize (AMD) $300 / $200 / $100; + in-kind AMD dev hardware (US/DE/Asia). PRIZE_HEADLINE "Up to $5,250 in prizes per task — cash + purchase voucher, trophy & gift" propagated to the home hero, Two-Ways badge, Competition hero + Awards intro, and SEO meta. The label always reads "cash + purchase voucher" (never implies $5,250 is pure cash).
- [x] Branding unified under EBiM Benchmark
- [x] OG cover image — EBiM-branded `og-cover.png` at 1200×630 spec (rasterized from `og-cover.svg`)
- [x] Panel: four confirmed panelists — Stefan Schaal (Intrinsic), Kenny Kimble (NIST), Sven Parusel (Franka Robotics), Shaowei Cui (SCUT); host TBA (mirrored across the schedule row, panel cards, and JSON-LD)
- [x] Google Search Console verified for `https://ebim-benchmark.github.io/`
- [x] SEO: per-page meta tags, JSON-LD (Event + Organization + BreadcrumbList), locale-aware sitemap (4 EN + 2 zh URLs when published), alt text + width/height on every img
- [x] Heading hierarchy fixed (no h2 → h4 skips)
- [x] Mobile nav: scrollable drawer + collapsible dropdowns
- [x] Sticky on-page TOC sidebar on sub-pages (≥1400px)
- [x] Image optimization: platform PNGs → WebP (~99.5% reduction); OG cover resized + reformatted
- [x] EBiM Maturity Roadmap (Alpha 2026 → Beta 2027 → Gamma, foreseeable future) strip on the home page, styled distinctly from the Phase I/II/III pipeline; links the PR2 Beta Program
- [x] Partner logos wired with links: vivo (Gold), Galbot, Lightwheel, ManipulationNet (Bronze) — files added under `img/sponsors/`

### Still needed
- [ ] Real headshots in `img/organizers/` (currently using initials avatars)
- [ ] Confirm workshop date & venue (decoupled from any fixed conference; currently TBD)
- [ ] Confirm Final Results date on index.html Important Dates (currently TBD)
- [ ] Confirm invited-talk speakers + titles and the panel host on workshop.html (currently TBA)
- [ ] Fill in workshop poster submission deadlines on workshop.html (currently TBD)
- [ ] Optional: convert remaining partner PNGs to WebP for marginal extra perf

---

## Image guidelines

| Folder | Format | Recommended size |
|---|---|---|
| `organizers/` | JPG or PNG | 300 × 300 px |
| `sponsors/` | SVG preferred (or PNG with transparent bg) | ~400 × 160 px |
| `platform/` | WebP primary + PNG fallback | 1600 × 900 px (WebP), keep originals as PNG |
| OG cover | PNG (or JPG) | 1200 × 630 px |

---

## License

Website code MIT licensed. Workshop content © 2026 the respective authors.
