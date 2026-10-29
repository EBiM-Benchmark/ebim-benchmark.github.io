# EBiM Benchmark Website — EBiM-Benchmark

**Toward a Globally Coordinated Benchmark for Real-World Embodied Bimanual Manipulation**

A globally coordinated benchmark for real-world embodied bimanual manipulation — Competition + Workshop, 2026

🌐 **Live site:** [ebim-benchmark.github.io](https://ebim-benchmark.github.io)
📧 **Contact:** https://ebim-benchmark.github.io/contact.html

### Contact form: deep links & categories

`contact.html` posts to Web3Forms. **Deep links** — `contact.html?topic=SLUG` pre-selects a category. Each accepted query slug (below) maps to the matching option's stable `data-slug`, and the visible dropdown label can differ:

- `competition` → Competition Question
- `partner` → Partnership Inquiry *(label: "Partnership — Hardware, Funding & Compute")*
- `workshop` → Workshop / Poster Submission
- `media` → Media / Press
- `tech` → Technical (Platform / Website)
- `partnership` → Partnership / Testbed Hosting *(label: "Partnership — Testbed Hosting")*

Unknown/absent slug = no pre-selection. The former `register` slug was retired when team registration moved to its own `register.html` page, so a stale `contact.html?topic=register` now simply loads the form with no category pre-selected.

**Adding a category** — everything keys off a stable per-option `data-slug` (so the human-readable `value`/label can change without touching routing). In `src/contact.njk`:

1. Add the `<option value="…" data-slug="SLUG">` to the category `<select>`.
2. Add a `SLUG → "[PREFIX] "` entry to the JS `prefixMap` (the email subject prefix).
3. *(optional)* add a query-slug → `data-slug` entry to the `?topic=` `topicMap`.
4. *(optional)* add the `data-slug` to the `DISCORD_TOPICS` array if the category should reveal the "faster path" Discord CTA (shown after the Category field).

The `data-slug` — not the option `value` — is the key shared across these places. The `value` string is the Web3Forms payload and is otherwise free to change.

**Destination email** is configured in the Web3Forms dashboard (tied to the access key in `src/contact.njk`), not in any committed file — so the address stays out of the public repo.

---

## Architecture overview

The site is a **multi-page** static site, built with [Eleventy](https://www.11ty.dev/) — Nunjucks templates in `src/` compile to static HTML in `_site/`. Three primary content pages, a registration form, a contact form, an FAQ page, and a 404:

| Page | URL | Purpose |
|---|---|---|
| **Home** | `index.html` | Landing page that funnels visitors to one of two tracks — minimal deep content, maximal navigation clarity |
| **Competition** | `competition.html` | The EBiM Competition — benchmark tasks, Mobile FR3 Duo platform, cross-continent testbeds, CFP |
| **Workshop** | `workshop.html` | The EBiM Benchmark workshop program — schedule, invited talks, panel, posters, dissemination |
| **Register** | `register.html` | Team registration — native Web3Forms form (team of 1–6, task selection, testbed ranking, consent; + `register-success.html` no-JS fallback). Own access key, separate from Contact. **The testbed-ranking fieldset lists Pittsburgh and ranks four sites, deliberately.** Pittsburgh was withdrawn as a **Phase II 2026** site in PR #120 and reinstated as a **future** testbed in PR #124 — an additional competition at the end of 2026, not a Phase II 2026 evaluation site. A clarifier above the fieldset says so. Dropping the select would still change the Web3Forms export shape: the `Testbed Rank Pittsburgh` column would vanish for new rows while existing rows keep it, and the registration analysis reads that column. Decide it deliberately (probably keep the column and default it), not as a rider on a content PR. A team that ranks Pittsburgh has it removed and their remaining preferences move up |
| **Open Day** *(hub)* | `open-day.html` | Lists every dated Open Day, one card each, in date order. The navbar's "Open Day" item points **here** (not at a dated page), so adding an Open Day is a card on this page and never a navbar change — see the width budget under *Navbar items*. A hub is not an event: it emits **Organization + BreadcrumbList only, never an `Event`**. Mirrored under `/zh/` |
| **Open Day · Hamburg** | `open-day-hamburg.html` | The EBiM Open Day, Mon 17 Aug 2026 at Google Hamburg — co-location event of IJCAI-ECAI 2026, so this URL is the permanent link the IJCAI organizers publish and must stay stable. Program, speakers, venue, and a native Web3Forms RSVP (own access key; + `open-day-success.html` no-JS fallback). Form state is gated on `site.openDayRegistration` (`open`/`waitlist`/`closed`) — see *Open Day registration gate* for everything that flag moves. Carries an emitted `Event` JSON-LD (its date gate is open, independently of the index/competition gate). Mirrored under `/zh/` |
| **Open Day · Shanghai** | `open-day-shanghai.html` | The EBiM Open Day, Fri 21 Aug 2026 at Franka Robotics' Shanghai office, where the EBiM Shanghai testbed is installed — talks plus a live visit to the Mobile FR3 Duo competition floor, all in one building (no transfer rows, unlike Hamburg). **Invitation-only: there is no registration form, no access key, no success page**, and its `Event` JSON-LD carries **no `offers` node** (an Offer, even free, would signal open public admission). Its date gate `openDayShanghaiStartDate` is open and independent of every other gate. `site.openDayRegistration` is Hamburg-only and is **not** consumed here. Mirrored under `/zh/` |
| **Open Day · Munich** | `open-day-munich.html` | The EBiM Open Day, Thu 10 Sep 2026 at Agile Robots SE, Munich — an optional morning shuttle to the EBiM Munich testbed in **Augsburg** for a site visit, an afternoon of talks back in Munich, and an optional dinner. Public and free like Hamburg, so it has its **own** Web3Forms access key, its own `open-day-munich-success.html` no-JS fallback, and an `Event` with an `offers` node. Form state is gated on `site.openDayMunichRegistration` — a **separate** key from Hamburg's, because the two days overlap in state (Hamburg sat `closed` while Munich opened). Mirrored under `/zh/` |
| **Contact** | `contact.html` | Categorized Web3Forms contact form (+ `contact-success.html` no-JS fallback, `contact-test.html` internal health check) |
| **FAQ** | `faq.html` | Bilingual FAQ — 5 groups / 16 Q&As (getting started, competition, compute, AMD Solution Award, staying connected). Published & indexed, nav-linked (before Contact), in the sitemap + hreflang-paired. Mirrored under `/zh/` |
| **Compute** *(unlisted)* | `compute-apply.html` | Registered-team compute-resource application — own Web3Forms key, honeypot-only (no hCaptcha). URL emailed privately to each team's PoC, so it is kept out of nav/footer/sitemap (`noindex`; + `compute-success.html` no-JS fallback). Both mirrored under `/zh/` |
| **Feedback** *(unlisted)* | `feedback-registered.html` | Questionnaire A for teams that registered but did not file a Phase I submission — own Web3Forms key + hCaptcha. Every question, option code, condition and both languages live in `src/_data/questionnaireA.json`; the EN and `/zh/` pages render from it through shared includes, and `verify-questionnaire.mjs` fails CI (`npm run verify:all`) if the two built pages would submit anything different. Each checkbox group is sent as one `;`-joined field. The email field is required exactly while it is shown (either contact box ticked): a blocked submit shows Questionnaire B's required-field message beside it. The page closes itself at `closesAt` (end of 22 Oct 2026 AoE). URL is emailed only, so it is kept out of nav/footer/sitemap (`noindex`) and no other page links to it; the two pages' only cross-link is their page-local EN/中文 switch |
| **Feedback, Phase II** *(unlisted)* | `feedback-phase2.html` | Questionnaire B for every member of the Phase II teams — own Web3Forms key + hCaptcha. Built exactly like Questionnaire A from its own data file, `src/_data/questionnaireB.json`, through its own includes (A's files are untouched), with `verify-questionnaire.mjs` holding the two built pages to the same fields, codes, conditions and required conditions. Beyond A: `b01_team`, `b10_name` and `b10_email` become required only when a Section 10 choice needs them (`requiredIf`), and answers are saved as a draft in `localStorage` under `ebim-questionnaire-B-2026-v2` (one key for both languages, cleared after a successful submit; the form works without saving if storage is unavailable). Closes itself at `closesAt` (end of 5 Nov 2026 AoE). Emailed only: out of nav/footer/sitemap (`noindex`), and the two pages' only cross-link is their page-local EN/中文 switch |
| **404** | `404.html` | Branded not-found page (`noindex`). Emits **root-absolute** asset/nav/CTA URLs so it renders correctly when GitHub Pages serves the single `/404.html` for a miss at any depth; a tiny client-side script localizes its copy + CTAs when the missed path is under `/zh/` |

### Why the split

The home page used to contain everything — schedule, benchmark spec, platform photos, task cards, organizers, partners. As the project grew, the page became too long and visitors couldn't quickly find what they needed. The current architecture:

- **Home** acts as a landing/funnel page (Two Ways to Engage cards, Key Themes, EBiM Maturity Roadmap, Important Dates summary, Organizers, Partners).
- **Competition** owns benchmark/platform/task/testbed deep content.
- **Workshop** owns schedule/talks/panel/posters/dissemination deep content.
- The Three-Phase Mechanism diagram appears on Home and Competition (Phase III = the Workshop is referenced as a link). It is **distinct** from the home page's EBiM Maturity Roadmap (Alpha/Beta/Gamma), which describes the multi-year initiative across editions, not this year's phases.
- Organizers live only on Home (linked from sub-pages). Partners appear on both Home and Competition with identical Silver/Bronze tiers (the other sub-pages link to `#partners`).

---

## Project structure

```
ebim-benchmark.github.io/
├── .eleventy.js                         # Eleventy config (input src/ → output _site/)
├── package.json / package-lock.json     # Eleventy + clean-css deps (+ Prettier, @fontsource/inter, dev) — `npm ci`
├── .gitattributes                       # Line endings pinned to LF (`* text=auto eol=lf`) — a Windows checkout then matches the LF blobs CI builds from
├── .gitignore                           # node_modules/, _site/, .playwright-mcp/, __pycache__/, .claude/settings.local.json (per-machine Claude Code settings; .claude/settings.json stays committable)
├── .github/workflows/
│   ├── deploy.yml                       # Build + deploy _site/ to Pages (GitHub Actions)
│   └── verify.yml                       # CI gate: EN parity + /zh/ locale + questionnaire EN/zh parity + /zh-tw/ locale + local-reference existence (npm run verify:all), then the zh → zh-TW co-change check on PRs
├── lib/locales.mjs                      # The locale registry (en / zh / zh-tw rows, hreflang + toggle order, page PAIRS, sitemap rows) — read by eleventyComputed.js and .eleventy.js
├── docs/i18n/zh-TW-termbase.md          # zh-TW terminology + style standard (Part A terms, Part B standard renderings, Part C style)
├── scripts/
│   ├── verify.mjs                       # Asserts the build matches the golden EN baseline
│   ├── verify-zh.mjs                    # Asserts the /zh/ locale, per-page gated on zhPublished (+ zhTwPublished's additions: zh-Hant, 繁, 简)
│   ├── verify-zhtw.mjs                  # Asserts the /zh-tw/ locale against /zh/: gates A markup, B fact tokens, C lexicon lint, D chrome keys, P publish state (+ --self-test)
│   ├── zhtw-lexicon.json                # Gate C deny + allow lists (allow entries need Cecil's ratification)
│   ├── zhtw-fact-exceptions.json        # Gate B exceptions (empty; additions need Cecil's sign-off)
│   ├── check-zhtw-cochange.mjs          # PR-only: a zh page edit must touch its zh-TW counterpart, or carry a zh-tw-no-change trailer (+ --self-test)
│   ├── verify-questionnaire.mjs         # Asserts the built EN and zh questionnaire pages submit the same fields/codes/conditions (and match _data)
│   ├── check-links.mjs                  # Asserts every local reference in _site/ resolves to a file that exists (+ --self-test)
│   ├── orphan-assets.mjs                # Manual: the complement — shipped files that nothing references (allowlisted, never gates CI)
│   ├── icc-audit.py                     # Manual: wide-gamut ICC + EXIF-orientation audit of src/img (needs Pillow)
│   ├── affil-consistency.py             # Manual: same-page agenda-row ↔ speaker-card affiliation check
│   └── check-rebaseline.mjs             # Manual: PR #49 formatting-only guard — FAILS BY DESIGN on any content change
├── tests/baseline/                      # Golden EN HTML fixtures (the parity baseline)
├── src/
│   ├── _data/
│   │   ├── site.json                    # Site config — zhPublished + zhTwPublished (PER-PAGE i18nKey→bool maps gating each /zh/ and /zh-tw/ page) + googleSiteVerification (additive GSC token list)
│   │   ├── event.json                   # Language-neutral structured-data facts (JSON-LD)
│   │   ├── i18n/en.json                 # English UI/meta/JSON-LD strings (the fallback locale)
│   │   ├── i18n/zh.json                 # Simplified-Chinese strings (machine-drafted + native-reviewed; 1b index/competition + 2b workshop/contact)
│   │   ├── i18n/zh-tw.json              # Traditional-Chinese (Taiwan) strings — every key of zh.json, hand-translated from en.json (Gate D)
│   │   ├── inlineCss.js                 # Minifies style.css (clean-css) → inlined into every <head>, removing the render-blocking CSS request
│   │   └── eleventyComputed.js          # Locale lookup `t` + htmlLang/assetBase/links/localeNoindex/hreflangAlternates/localeToggle/jsonLd/pageMeta (per-page publish gate, from lib/locales.mjs)
│   ├── _includes/
│   │   ├── layouts/base.njk             # <html> skeleton + per-page head fields/conditionals
│   │   ├── head.njk                     # Shared head tail: favicon, self-hosted Inter preload, inlined CSS
│   │   ├── navbar.njk                   # Shared navbar (single source; labels via i18n)
│   │   ├── footer.njk                   # Shared footer (single source; labels via i18n)
│   │   ├── jsonld.njk                   # Renders the index/competition/workshop/contact/open-day/open-day-hamburg/open-day-shanghai/open-day-munich JSON-LD from _data
│   │   ├── contact-form-script.njk      # Single-sourced contact-form JS (shared by EN + zh contact)
│   │   ├── register-form-script.njk     # Single-sourced registration-form JS — validation + AJAX submit (shared by EN + zh register)
│   │   ├── open-day-form-script.njk     # Single-sourced Open Day RSVP JS — validation + AJAX submit (shared by EN + zh open-day-hamburg AND open-day-munich)
│   │   ├── compute-apply-form-script.njk # Single-sourced compute-application JS — AJAX submit (honeypot only; shared by EN + zh compute-apply)
│   │   ├── questionnaire-a-form.njk     # Questionnaire A page body, rendered from _data/questionnaireA.json (shared by EN + zh feedback-registered)
│   │   ├── questionnaire-a-style.njk    # Questionnaire A page-local <style> (shared by EN + zh)
│   │   ├── questionnaire-a-script.njk   # Questionnaire A JS — conditions, one-field-per-group encoding, date close, AJAX submit (shared by EN + zh)
│   │   ├── questionnaire-b-form.njk     # Questionnaire B page body, rendered from _data/questionnaireB.json (shared by EN + zh feedback-phase2)
│   │   ├── questionnaire-b-style.njk    # Questionnaire B page-local <style> (A's rules copied + B's additions; shared by EN + zh)
│   │   └── questionnaire-b-script.njk   # Questionnaire B JS — A's behaviour plus required fields and draft saving (shared by EN + zh)
│   ├── index.njk                        # Landing page (funnel to sub-pages)
│   ├── competition.njk                  # The EBiM Competition
│   ├── workshop.njk                     # Workshop Program
│   ├── faq.njk                          # Bilingual FAQ (published/indexed; nav + sitemap + hreflang) — localized sibling at zh/faq.njk
│   ├── contact.njk                      # Categorized Web3Forms contact form (JS via shared include)
│   ├── contact-success.njk              # No-JS POST fallback success page (EN; localized sibling at zh/contact-success.njk)
│   ├── contact-test.njk                 # Internal contact-form health check (not linked)
│   ├── register.njk                     # Team registration (native Web3Forms form; JS via shared include)
│   ├── register-success.njk             # No-JS POST fallback success page (EN; localized sibling at zh/register-success.njk)
│   ├── open-day.njk                     # Open Day hub — lists every dated Open Day; the navbar item points here. Organization + BreadcrumbList only, no Event — localized sibling at zh/open-day.njk
│   ├── open-day-hamburg.njk             # Open Day · Hamburg (IJCAI-ECAI 2026 co-location; RSVP form gated on site.openDayRegistration; JS via shared include) — localized sibling at zh/open-day-hamburg.njk
│   ├── open-day-shanghai.njk            # Open Day · Shanghai (invitation-only: no form, no success page, no offers node in its Event) — localized sibling at zh/open-day-shanghai.njk
│   ├── open-day-munich.njk              # Open Day · Munich (Agile Robots SE + Augsburg testbed visit; own access key; form gated on site.openDayMunichRegistration) — localized sibling at zh/open-day-munich.njk
│   ├── open-day-success.njk             # No-JS POST fallback success page for HAMBURG (EN; localized sibling at zh/open-day-success.njk)
│   ├── open-day-munich-success.njk      # No-JS POST fallback success page for MUNICH (EN; localized sibling at zh/open-day-munich-success.njk)
│   ├── compute-apply.njk                # UNLISTED compute-resource application (own Web3Forms key; JS via shared include) — noindex, not in nav/footer/sitemap
│   ├── compute-success.njk              # No-JS POST fallback success page (EN; localized sibling at zh/compute-success.njk)
│   ├── feedback-registered.njk          # UNLISTED Questionnaire A (own Web3Forms key + hCaptcha; body/JS via shared includes) — noindex, not in nav/footer/sitemap
│   ├── feedback-phase2.njk              # UNLISTED Questionnaire B (own Web3Forms key + hCaptcha; body/JS via its own includes) — noindex, not in nav/footer/sitemap
│   ├── 404.njk                          # Branded 404 (noindex; absoluteUrls → root-absolute URLs so it works at any depth; client-side zh-TW and zh variants)
│   ├── zh/                              # Simplified-Chinese locale (1b; index/competition PUBLISHED 1d, workshop/contact PUBLISHED 2c, register + faq + open-day-hamburg + open-day + open-day-shanghai + open-day-munich PUBLISHED since)
│   │   ├── zh.11tydata.json             #   sets lang: zh for the whole tree
│   │   ├── index.njk                    #   → /zh/ (self-canonical; hreflang ⇄ EN when published)
│   │   ├── competition.njk              #   → /zh/competition.html (published)
│   │   ├── workshop.njk                 #   → /zh/workshop.html (published: hreflang/sitemap/toggle)
│   │   ├── faq.njk                      #   → /zh/faq.html (published: hreflang/sitemap/toggle)
│   │   ├── contact.njk                  #   → /zh/contact.html (published; form JS via shared include)
│   │   ├── contact-success.njk          #   → /zh/contact-success.html (hidden noindex utility; no i18nKey ⇒ no hreflang/toggle/sitemap; the zh contact form's no-JS redirect target)
│   │   ├── register.njk                 #   → /zh/register.html (published: hreflang/sitemap/toggle)
│   │   ├── register-success.njk         #   → /zh/register-success.html (hidden noindex utility; no i18nKey ⇒ no hreflang/toggle/sitemap; the zh registration form's no-JS redirect target)
│   │   ├── open-day.njk                 #   → /zh/open-day.html (published: hreflang/sitemap/toggle)
│   │   ├── open-day-hamburg.njk         #   → /zh/open-day-hamburg.html (published: hreflang/sitemap/toggle)
│   │   ├── open-day-shanghai.njk        #   → /zh/open-day-shanghai.html (published: hreflang/sitemap/toggle)
│   │   ├── open-day-munich.njk          #   → /zh/open-day-munich.html (published: hreflang/sitemap/toggle)
│   │   ├── open-day-success.njk         #   → /zh/open-day-success.html (hidden noindex utility; no i18nKey ⇒ no hreflang/toggle/sitemap; the zh Hamburg RSVP form's no-JS redirect target)
│   │   ├── open-day-munich-success.njk  #   → /zh/open-day-munich-success.html (hidden noindex utility; the zh Munich RSVP form's no-JS redirect target)
│   │   ├── compute-apply.njk            #   → /zh/compute-apply.html (hidden noindex UNLISTED page; no i18nKey ⇒ no hreflang/toggle/sitemap; the compute application emailed to registered teams)
│   │   ├── compute-success.njk          #   → /zh/compute-success.html (hidden noindex utility; no i18nKey ⇒ no hreflang/toggle/sitemap; the zh compute form's no-JS redirect target)
│   │   ├── feedback-registered.njk      #   → /zh/feedback-registered.html (hidden noindex UNLISTED questionnaire; no i18nKey ⇒ no hreflang/toggle/sitemap; page-local EN link only)
│   │   └── feedback-phase2.njk          #   → /zh/feedback-phase2.html (hidden noindex UNLISTED questionnaire; no i18nKey ⇒ no hreflang/toggle/sitemap; page-local EN link only)
│   ├── zh-tw/                           # Traditional-Chinese (Taiwan) locale — 17 noindex DRAFTS (zhTwPublished all false), hand-translated from EN on the zh markup
│   │   ├── zh-tw.11tydata.json          #   sets lang: zh-tw for the whole tree (htmlLang zh-Hant-TW, hreflang zh-Hant)
│   │   ├── index / competition / workshop / faq / contact / register / results .njk  #   the 11 localized pages (i18nKey; published = hreflang/sitemap/toggle)
│   │   ├── open-day / open-day-hamburg / open-day-shanghai / open-day-munich .njk     #   (same; the Open Day family)
│   │   └── *-success / compute-apply .njk  #   6 hidden noindex utility pages (no i18nKey ⇒ never hreflang/toggle/sitemap)
│   ├── css/style.css                    # All shared styles + @font-face — BUILD INPUT ONLY: minified by _data/inlineCss.js & inlined into every <head>; deliberately NOT copied to _site/, so there is no /css/ in the output
│   ├── js/main.js                       # Navbar/scroll/dropdown/fade-in behavior (passthrough)
│   ├── fonts/                           # Self-hosted Inter woff2 (latin + latin-ext, 5 weights) → passthrough to /fonts/
│   ├── img/                             # favicon, OG cover, platform photos, sponsor logos, people photos
│   │                                    #   (sponsors/ folder name kept so asset paths stay stable)
│   │                                    #   organizers/ = people holding an EBiM role (committee, advisory, support team)
│   │                                    #   speakers/   = external Open Day / Workshop speakers with no EBiM role
│   ├── docs/                            # Served documents → passthrough to /docs/ — the frozen, citable
│   │                                    #   Rulebook PDF; version lives in the FILENAME, never replaced in place
│   ├── robots.txt                       # Allow-all + sitemap pointer (passthrough)
│   ├── sitemap.njk                      # Locale-aware sitemap (11 hand-written EN rows; the sitemapRows filter adds each published /zh/ and /zh-tw/ URL + alternates)
│   └── .nojekyll                        # Disable Jekyll on GitHub Pages
├── _site/                               # Build output (gitignored) — this is what gets deployed
└── README.md
```

Each `src/*.njk` page extends `_includes/layouts/base.njk` and supplies its own head meta
(OG/Twitter/JSON-LD), inline `<style>`, body, and (the contact pages) trailing `<script>`.
`permalink` front matter pins the exact `.html` URLs, so output paths are unchanged.

---

## Setup

Built with [Eleventy](https://www.11ty.dev/) and [clean-css](https://github.com/clean-css/clean-css) (`package.json` dependencies — clean-css minifies the global stylesheet that gets inlined into every `<head>` at build). Prettier (parity harness) and `@fontsource/inter` (the source of the committed woff2 files) are dev dependencies. The shipped site self-hosts its fonts and ships no browser-runtime dependencies or third-party requests.

```bash
npm ci            # install Eleventy + clean-css (+ Prettier, @fontsource/inter)
npm run build     # compile src/ → _site/
npm run serve     # local dev server with live reload (eleventy --serve)
```

**CSS is the one exception to live reload.** The dev server picks up edits to templates, includes and data files, but **not** to `src/css/style.css`: `_data/inlineCss.js` reads it once with `readFileSync`, and Eleventy's dependency graph cannot see a runtime file read. **Restart the server after a CSS edit.** This is long-standing, not a consequence of dropping the `src/css` passthrough — that passthrough only ever refreshed an unreferenced copy at `_site/css/style.css`, never the inlined `<style>` the pages actually render.

### Parity harness

`node scripts/verify.mjs` (alias `npm run verify`) builds the site and asserts the English output is byte/semantically identical to the golden fixtures committed in `tests/baseline/` — markup structure (Prettier-normalized), HTML comments, JSON-LD (deep-equal, order-insensitive), and the contact-form internals. The FAQ's build-variable git-derived "Last updated" date is masked on both sides before the structure diff, so a rebuild on a newer commit never trips parity. It runs on every PR via `.github/workflows/verify.yml`.

**Changing English output on purpose** means the baseline must be regenerated in the same commit — otherwise the net correctly goes red. Run `npm run build`, then copy the 21 `_site/*.html` into `tests/baseline/` (the pages listed in `PAGES` in `scripts/verify.mjs`). The fixtures are kept byte-for-byte faithful to the build, so this straight copy is the whole procedure — never hand-edit a fixture.

Because `.gitattributes` pins every text file to LF, a checkout made after it landed builds LF output over LF fixtures, so the copy is byte-clean and `git status` lists only the goldens whose content genuinely changed. A clone made **before** it still holds CRLF working copies, which build mixed-ending output and make that same copy report spurious modifications on goldens you never touched — the trap behind the old "re-baseline dirties unrelated fixtures" advice. Normalize such a clone once with `git rm --cached -r . && git reset --hard` (commit or stash first — `reset --hard` discards uncommitted work; it rewrites working-tree line endings only, never committed content).

`node scripts/verify-zh.mjs` (alias `npm run verify:zh`, or `npm run verify:all` to run every stage) checks the `/zh/` locale against the same build, with every gated assertion reading `site.zhPublished` so it is correct in either state. Always: each `/zh/` page is `<html lang="zh-Hans">`, has a self-referential `/zh/` canonical, links all four localized targets relative under `/zh/`, and contains translated CJK text. Published (the current state for all eleven pages): no `noindex`, the reciprocal `en` / `zh-Hans` / `x-default` hreflang cluster, `/zh/` present in `sitemap.xml` (22 URLs total) with `hreflang` on all eleven EN + `/zh/` pairs, and the navbar **language toggle** rendering with 中文 active + an "EN" link to the EN counterpart. It also reads `site.zhTwPublished`, which only **extends** a published pair's expectations: the cluster gains `zh-Hant` (checked in order: en, zh-Hans, zh-Hant, x-default), the toggle gains a 繁 link and the zh chip reads 简 (EN · 繁 · 简), and the sitemap total counts the `/zh-tw/` rows; while a pair is a zh-TW draft it asserts 中文 and no 繁 link. Unpublished: `noindex`, no `hreflang` anywhere, `/zh/` absent from the sitemap, and no toggle. It also covers the hidden `/zh/contact-success.html`, `/zh/register-success.html`, `/zh/open-day-success.html` and `/zh/open-day-munich-success.html` utility pages, plus the unlisted `/zh/compute-apply.html` + `/zh/compute-success.html` and the `/zh/feedback-registered.html` + `/zh/feedback-phase2.html` questionnaires — `<html lang="zh-Hans">`, a single `noindex`, no `hreflang`/toggle, out of the sitemap, CJK body, `../` assets (each questionnaire additionally: its page-local EN link and `lang=zh`). Each Open Day check additionally pins that day's zh RSVP redirect at its OWN `/zh/` success page — Hamburg at `/zh/open-day-success.html`, Munich at `/zh/open-day-munich-success.html`. Within a day the EN and zh forms share one access key, so a copy-pasted EN redirect would silently land zh registrants on the English confirmation; across days the keys differ, so a copy-pasted Hamburg redirect on the Munich form would land Munich registrants on the Hamburg page. Both blocks are state-aware and read their own flag. CI runs every harness on every PR.

`node scripts/verify-zhtw.mjs` (folded into `npm run verify:all` as `--self-test` then `--no-build`) checks every built `/zh-tw/` page against its `/zh/` twin, which is its markup template. **A** markup parity: the same document once all prose is masked (hreflang, robots and the toggle are removed first, so publish state never moves it). **B** fact tokens: the same numbers, emails and URLs (`scripts/zhtw-fact-exceptions.json` is empty). **C** lexicon lint, over every page and `zh-tw.json`: the termbase's denylist (`scripts/zhtw-lexicon.json`) and an OpenCC `cn → tw` fixed point (Simplified-character leakage) are blocking; `cn → twp` vocabulary suggestions are printed as advisory only. Allow entries are word-scoped and each needs Cecil's ratification. Content inside a page tagged `lang="zh-Hans"` (the toggle's 简 link) is skipped; `<html lang>` never exempts a page. **D** `zh-tw.json` has exactly `zh.json`'s key paths. **P** publish state, per page from `site.zhTwPublished`: a draft is `noindex` with no hreflang, no toggle and no sitemap row; a published page has the `en` / `zh-Hans` / `zh-Hant` / `x-default` cluster in order, the EN · 繁 · 简 toggle with 繁 active, and a sitemap row with the same alternates. The 6 hidden utility pages are always drafts. `--self-test` seeds a defect for every gate and proves it fails.

**zh → zh-TW co-change.** `scripts/check-zhtw-cochange.mjs` runs on pull requests only, as the CI step after Verify (`node scripts/check-zhtw-cochange.mjs origin/<base>`). A change to `src/zh/X.njk` whose counterpart `src/zh-tw/X.njk` exists (or to `zh.json`, paired with `zh-tw.json`) must also touch that counterpart in the same PR, unless a commit in the PR carries a trailer naming the file and a reason: `zh-tw-no-change: src/zh/<file> — <reason>` (one line per file; the separator is an em dash). A trailer naming a different file, or with no reason, does not waive; a zh file with no zh-TW counterpart is always fine. Comment-only edits under `src/zh/` take the trailer with reason `comment-only`. The checkout uses `fetch-depth: 0` so the base is reachable.

`node scripts/check-links.mjs` (aliases `npm run check:links` and `npm run check:links:self`; both stages are folded into `npm run verify:all`) is an **existence** check, not a parity check — and that is precisely the gap it fills. The two harnesses above compare built HTML against the goldens and the `/zh/` invariants, so neither can see whether a referenced *file* is still on disk: delete an asset that a page points at and every golden stays byte-identical, parity goes green, and the reference 404s in production (PR #97, the orphan-sponsor prune, was exactly that shape). It walks every `.html` in `_site/`, extracts local references from `src`, `href`, `srcset`, `url()`, the `og:image`/`twitter:image` metas and JSON-LD `image`/`logo`/`url`, strips `#fragments` and `?queries`, resolves root-absolute paths from the site root and relative ones from the referring page, treats a directory as satisfied by its `index.html`, and skips external schemes. `--self-test` copies `_site/`, seeds one broken reference per resolution mode, and asserts exactly those are caught — CI runs it **before** the real check so a harness that quietly parses nothing cannot masquerade as a clean site. The `MIN_PAGES` / `MIN_REFS` floors exist for the same reason: a checker that finds zero references also reports zero broken ones. Raise them as the site grows; **never lower them to make a run pass.**

`node scripts/verify-questionnaire.mjs` (alias `npm run verify:questionnaire`) is the questionnaires' EN/zh parity gate, run once for Questionnaire A and once for Questionnaire B. Each questionnaire's two pages render from one data file, but a template edit could still make them diverge, so it reads the **built** pages and fails if they differ in any form control or question-wrapper tag (only the hidden `lang` value may differ), in the submitted field names, in any choice field's option codes or order, in `data-group` (what makes a checkbox group go out as one `;`-joined field), in any condition, in the hidden values or the close date, or in any inline script. It also checks both against that questionnaire's data file, `src/_data/questionnaireA.json` or `src/_data/questionnaireB.json` (field list, codes, conditions, and each field's control type), checks that every condition names a real field and code and that conditional questions ship hidden + disabled, and fails if any control ships pre-answered or if the page carries a control the script would send but the check does not model. For Questionnaire B it also checks the required conditions (EN == zh == data file, real fields and codes, each required field carrying its own hidden message in the page's language) and the draft key `ebim-questionnaire-B-2026`. Because a single-source script edit changes both pages alike, `verify.mjs` also pins each EN page's inline script to its golden.

**CI-gating versus manual.** Only four of the scripts gate anything: `verify.mjs`, `verify-zh.mjs`, `verify-questionnaire.mjs` and `check-links.mjs` (self-test, then the real check) are the five stages of `npm run verify:all`, and `.github/workflows/verify.yml` runs them on every PR and every push to `main`. Everything else in `scripts/` is a **manual** tool, run by hand and deliberately not wired to CI:

- **`check-rebaseline.mjs`** — a formatting-only guard left from the PR #49 CSS-inline migration: it asserts that the old and re-baselined goldens differ *only* in whitelisted formatting ways. It **fails by design on any deliberate content or markup change**, so running it during ordinary content work produces a confusing red with nothing wrong. Reach for it only when auditing a formatting migration.
- **`orphan-assets.mjs`** — the complement to `check-links.mjs`: the gate proves every reference resolves to a file, this proves every shipped file has a reference (the PR #97 shape — an asset nothing points at, still served). It cannot gate, because orphan detection has legitimate false positives by nature: `img/og-cover.svg` is an intentional vector master and `fonts/OFL.txt` ships because the licence requires it. Both sit in a documented allowlist, and every future intentionally-unreferenced file would otherwise become a spurious red that someone "fixes" by deleting a file that should stay.
- **`icc-audit.py`** — run after adding or re-encoding photos; it pairs with the colour-profile rule above the Image guidelines table by naming the files that carry a wide-gamut profile. Needs `pip install Pillow`, which is the other reason it stays out of CI.
- **`affil-consistency.py`** — run on any PR that adds, removes or edits a person on the site. It compares each speaker's agenda row against their own speaker card, same page and locale; it cannot detect a wrong-but-consistent affiliation, and makes no cross-page assertion by design (see the `/zh/` mixing rule above). **It is also blind to a half-done rename:** both sides are keyed *by name*, and a speaker whose card and agenda row disagree on the name simply drops out of the comparison instead of being reported, so a rename applied to one of the two sites passes with zero mismatches (verified by seeding exactly that break). A rename is "edits a person", so the tool is prescribed for it — but it can only confirm the affiliation, never the name. Check a rename with a direct `grep` for the *old* name returning zero, not with this script. **The same name-keying makes it blind to a one-sided person:** it iterates *cards* and skips any name with no agenda row, so a card with no row — or a row with no card — likewise returns zero mismatches (verified by deleting one speaker card while leaving its agenda row in place: `0 mismatch(es)`, exit 0, on a visibly broken page). That is precisely what **adding or removing** a speaker looks like when only one of the two sites has been edited, so for an add/remove its green is not evidence. Check those by comparing the **set** of agenda-row names against the **set** of speaker-card names, per page and per locale, and asserting the two sets are **equal** — set equality, not equal counts, since one person added plus another dropped leaves the count unchanged. One caveat before you trust that comparison on `workshop.html`: an agenda row may name an **unfilled role** rather than a person — the panel host renders `<span class="speaker-name">To be announced</span>` (`待公布` on `/zh/`) — and a placeholder correctly has no speaker card. Exclude those placeholders from the agenda set, or the check fires on documented-intentional state. Only a placeholder in a `speaker-name` span matters here: the four Open Day pages carry none, so their raw sets compare equal — the "to be announced" wording still on those pages (`待公布` on `/zh/`) is the prose disclaiming the separate Phase III workshop's date and venue, never a name span. Their talk titles used to be a second such site, but every Open Day slot now carries a confirmed title, so no Open Day page has a `sched-tbd` row left.

### GitHub Pages deployment

`.github/workflows/deploy.yml` builds the site and deploys `_site/` to GitHub Pages on every push to `main`. This takes effect once the repo's Pages source is set to **GitHub Actions** (Settings → Pages → "Build and deployment" → Source). Its checkout uses **`fetch-depth: 0`** (full history) so the FAQ page's git-derived "Last updated" stamp — the `gitDateISO` filter in `.eleventy.js`, which reads each page's last content-change commit from `page.inputPath` — resolves to the real date rather than silently degrading to the deploy commit under a shallow clone.

---

## Internationalization (i18n)

English is the primary locale. A **Simplified-Chinese `/zh/` locale** was added in **Phase 1b**: the landing + competition pages were **published in Phase 1d** once their translation passed native review; the workshop + contact pages shipped as unpublished machine-draft previews (noindex, no hreflang/sitemap/toggle) in **Phase 2b** and were **published in Phase 2c** after native review — so all four content `/zh/` pages are now live; the later **registration page** (`/zh/register.html`) shipped published in both locales, the **FAQ page** (`/zh/faq.html`) was added and published later, and the **Open Day · Hamburg page** (`/zh/open-day-hamburg.html`) shipped published in both locales, joined later by the **Open Day hub** (`/zh/open-day.html`), the **Open Day · Shanghai page** (`/zh/open-day-shanghai.html`) and the **Open Day · Munich page** (`/zh/open-day-munich.html`), then the **Final Results page** (`/zh/results.html`), for **eleven** published `/zh/` pages total. A **Traditional-Chinese (Taiwan) `/zh-tw/` locale** followed (PR #143): all 17 of its pages are hand-translated `noindex` drafts until a publish PR flips their flags (see the gate below). Publish state is **per page, per locale**. Structured-data and shared-chrome strings are factored out so a locale is added without touching the EN templates:

- **`src/_data/event.json`** — language-neutral structured-data facts (dates, canonical URLs, organizer/sponsor lists, testbed addresses, and the workshop's attendance mode / placeholder venue / panelists — retained as reference data for the **date-gated** Events — the index/competition Event emits only once `eventPublishStartDate` is set, and the workshop Event only once `workshopStartDate` is set; the index/competition gate **opened on 2026-07-22** with the locked revised schedule (`2026-07-06` → `2026-09-12`, `EventScheduled`) while the workshop gate stays closed, Refs #83) shared by the JSON-LD on the index, competition, workshop, contact, open-day (hub), open-day-hamburg, open-day-shanghai, and open-day-munich pages. Each Event has its **own independent** gate — do not couple them: the three Open Day gates (`openDayHamburgStartDate`, `openDayShanghaiStartDate`, `openDayMunichStartDate`) and the index/competition `eventPublishStartDate` gate are all **open**, so the three dated Open Day pages plus index and competition each emit an `Event`; only the workshop Event stays withheld, pending a real `workshopStartDate`. The Open Day **hub** has no gate at all — a listing page is not an event, so it emits Organization + BreadcrumbList and nothing else.
- **`lib/locales.mjs`** — the **locale registry**: one row per locale (`en`, `zh`, `zh-tw`) with its output `dir`, `htmlLang`, `hreflang`, `dateLocale`, chrome-string `fallback`, toggle `chip` (+ optional `chipAlone`) and `publishedKey` (the `site.json` map that gates it); `HREFLANG_ORDER` (en, zh, zh-tw), `TOGGLE_ORDER` (EN · 繁 · 简), the page `PAIRS` (i18nKey → file/url), and the `publishedLocales` / `sitemapRows` helpers. Adding a locale is a row here plus its content tree and publish map — never a new branch in a helper. It lives outside `src/`, so Eleventy never treats it as input.
- **`src/_data/i18n/<lang>.json`** — translatable strings, namespaced `brand` / `nav` / `footer` / `meta` (per-page head-meta) / `jsonld`. `en` is the fallback locale; `zh` (Simplified Chinese, machine-drafted + native-reviewed) mirrors every `en` key — any key left untranslated falls back to English. `zh-tw` falls back to `zh`, then `en`, and has exactly `zh`'s key paths (Gate D), each hand-translated from `en`.
- **`src/_data/eleventyComputed.js`** — `t` resolves the page's `lang` (default `en`) with **English fallback**; `pageMeta` / `jsonLd` build the per-locale head-meta and the index/competition/workshop/contact/open-day/open-day-hamburg/open-day-shanghai/open-day-munich JSON-LD, keyed by `pageDataKey` = `i18nKey || pageKey`. `i18nKey` (the four content pages as of Phase 2b, plus the registration, FAQ and the three Open Day pages added later) marks a page with a localized `/zh/` counterpart and drives hreflang/toggle/`/zh/`; `pageKey` is the EN-only equivalent that binds a page to the same shared data **without** localization (the Phase 2a state of workshop/contact, promoted to `i18nKey` in 2b — the helper still supports `pageKey` for any future EN-only-but-data-bound page). Locale-aware helpers, all driven by the registry in `lib/locales.mjs`, keep the shared shell working under `/zh/` and `/zh-tw/` while leaving EN byte-identical: `htmlLang` (`en` / `zh-Hans` / `zh-Hant-TW`), `assetBase` (one `"../"` per directory level of the locale's `dir`), `links` (nav targets — the same relative filenames in every locale, so each resolves inside the page's own locale dir), the per-page `localeNoindex` (true for a non-default-locale page whose own flag is false), and the per-page-gated `hreflangAlternates`. A page's **published cluster** is every locale its pair is published in, in `HREFLANG_ORDER` — empty unless the page's own locale is published and at least two locales are — and `hreflangAlternates` emits that cluster plus `x-default` (on a published page this is the one intentional EN-head change). `localeToggle` drives the navbar **language switcher** from the same cluster, in `TOGGLE_ORDER` (EN · 繁 · 简): it is `null` wherever there is no cluster, so the toggle appears exactly where the reciprocal hreflang does, and EN-only utility pages and drafts render the navbar with no toggle. **Chip label rule:** a `zh*` locale shows its `chipAlone` when no *other* `zh*` locale is in the cluster — so the zh chip reads **中文** beside EN alone and **简** once zh-TW joins the pair (EN · 繁 · 简). The SEO surface (`localeNoindex` / `hreflangAlternates` / `localeToggle` / sitemap) reacts to the flags automatically.
- **`src/_includes/`** — `base.njk` / `head.njk` / `navbar.njk` / `footer.njk` read locale via those helpers; the EN render path is unchanged and guarded by the parity harness.
- **`src/zh/`** — the localized pages (`lang: zh` via `zh.11tydata.json`), reusing the same includes; only the body prose, `<html lang>`, canonical, head-meta, and (where published) hreflang differ. The contact form's behavior JS is single-sourced in `_includes/contact-form-script.njk` and `{% include %}`d by both EN and zh contact, so there is one copy of the language-agnostic logic (it keys off each option's `data-slug`, never the visible label) and the EN render stays byte-identical.
- **`src/zh-tw/`** — the Traditional-Chinese (Taiwan) pages (`lang: zh-tw` via `zh-tw.11tydata.json`): the 11 localized pages plus 6 hidden utility pages. Each copies its `/zh/` page's **markup** and replaces the prose with a hand translation **from EN** (never an OpenCC conversion of the zh copy), following **`docs/i18n/zh-TW-termbase.md`** — Part A fixes the project terms (e.g. 測試平台, 評估, 繳交, 任務), Part B the standard Taiwanese renderings of mainland vocabulary, Part C the style rules (「」 quotes, unspaced ——, 您). Forms post exactly the zh payload except `redirect`, which targets the `/zh-tw/` success page. `scripts/verify-zhtw.mjs` holds the tree to the zh markup and the termbase (see the parity harness above).

**zh terminology — the published mirror wins.** The `/zh/` bodies are hand-written in `{% raw %}` blocks, so a spec, an email draft or a translation memory can silently introduce a synonym for a term the site already publishes. **Rule: when an edit is about dates, windows or status, change only those — preserve whatever term each location already uses, and do not normalize across locations.** The mirror is deliberately internally mixed (the timeline labels say `组织方`, the FAQ Phase II answer says `组委会`); that mix is pre-existing and is *not* a bug to fix in passing. Two rounds of PR #95 review caught exactly this: `仿真赛结果` and `实机测试` had each been introduced as one-off synonyms for the published `仿真结果` and `台架测试`. Before shipping zh copy, grep the candidate term — if it appears **once**, it is almost certainly a paraphrase of something the site already says. Current published vocabulary: `仿真结果公布` (results announced), `仿真结束` (simulation end), `台架测试` (bench testing), `实操台架测试` (hands-on bench testing), `真实机器人` (real robot), `晋级` (advance/qualify), `提交截止` (submission deadline). Labels must match across site / email / Discord / WeChat — inconsistent labels are what generate support questions.

**Publish gate — `src/_data/site.json` → `"zhPublished"`** is a **per-page map** keyed by `i18nKey`, e.g. `{ "index": true, "competition": true, "workshop": true, "contact": true, "register": true, "faq": true, "openDay": true, "openDayHamburg": true, "openDayShanghai": true, "openDayMunich": true }` (index/competition published in 1d; workshop/contact published in 2c; register shipped published; faq added and published later; openDayHamburg shipped published, then openDay + openDayShanghai, then openDayMunich, then results — all eleven now live). **`"zhTwPublished"`** is the same kind of map for `/zh-tw/` (all eleven `false` today). Each locale row in `lib/locales.mjs` names its map (`publishedKey`), so a third Chinese locale would be one more map, not new template logic. Keys are the camelCase `i18nKey`s. Each page reads **its own** flag. For a page whose flag is `false` (**draft**): it emits `<meta name="robots" content="noindex">`, is kept out of the sitemap, carries **no `hreflang`**, and renders **no language toggle**; a pair with only one published locale emits no hreflang on either side. For a page whose flag is `true` (**published**): it drops `noindex`, every published page of the pair carries the reciprocal cluster (`en` / `zh-Hans` / `zh-Hant` for whichever locales are published, then `x-default`; EN-only pages emit none; canonicals stay self), its url is listed in `sitemap.xml` with the same `xhtml:link` alternates on every row of the pair, and the navbar language toggle renders. The sitemap is rendered from `src/sitemap.njk` through the `sitemapRows` filter — not a static passthrough. `scripts/verify-zh.mjs` and `scripts/verify-zhtw.mjs` read both maps and prove whichever mix of published pages and drafts is committed.

**Publishing zh-TW (the one-step PR).** The zh-TW bodies already link inside `/zh-tw/`, and `links`, the sitemap, the 404 and both harnesses are already locale-generic, so publishing is a **flag flip plus re-baselines**, nothing else:
1. In `src/_data/site.json`, set the pages' `zhTwPublished` flags to `true` (all eleven, or any subset — every state is supported).
2. Optionally set `sitemap.localeLastmod["zh-tw"]` in `src/sitemap.njk` to the publish date.
3. `npm run build`, then copy the 21 `PAGES` files into `tests/baseline/` (each published pair's EN page gains `zh-Hant` in its hreflang cluster and 繁 / 简 in its toggle; nothing else moves).
4. `npm run verify:all` must be fully green; Gate P then checks each published zh-TW page's cluster, toggle and sitemap row.

Publishing a `/zh/` draft is the same flip on `zhPublished` plus the same re-baseline.

**Open Day registration gate — `src/_data/site.json` → `"openDayRegistration"`** is a single string, `"open"` | `"waitlist"` | `"closed"`, consumed by `src/open-day-hamburg.njk` **and** its `/zh/` mirror (both branch on it, so the two locales can never drift apart). `"open"` renders the live RSVP form; `"waitlist"` renders the same form plus a banner and a hidden `list=waitlist` field, for once the 80 seats are gone; `"closed"` renders a closed panel with **no form at all** — and, since PR #120, also drops the hero's "Register — 80 seats" button (leaving "View the program" as the single primary), the travel card's "register before you travel" clause, the inlined RSVP handler and the external `web3forms.com/client/script.js`, and flips the `Event` JSON-LD `offers.availability` to `SoldOut`. Two consequences to know before touching it: the hero and travel-card gates sit **inside the page body's `{% raw %}` block**, so each closes raw and reopens it (a plain `{% if %}` there is emitted literally into the HTML with no build error); and at `"closed"` the `open-day-success.html` pair loses its only inbound reference and becomes unreachable — **retain both, they are the redirect targets for when registration reopens**, and they stay `noindex` and out of `sitemap.xml` either way. There is **no advance date cutoff**: registration stays open until the program begins (**17 Aug 10:30 CEST**), so `"closed"` is for use only from that moment on. Capacity is a **separate axis** from the calendar — a full house is what `"waitlist"` is for, and never a reason to flip `"closed"` early. An earlier 72-hour date cutoff (10:30 CEST on 14 Aug 2026) was advertised on the page and then dropped as wrong — do not reinstate it from old copy. All three branches are built now, so closing the day is a **flag flip, not a content scramble**. The Event JSON-LD's `offers.availability` reads the same flag (`InStock` when `"open"`, else `SoldOut`), so the structured data cannot advertise seats the form no longer takes. Web3Forms cannot count submissions, so this is a **manual** flip: change the value, rebuild, re-baseline `open-day-hamburg.html` **only**, merge. This flag is **Hamburg-only** — the Shanghai Open Day is invitation-only, has no form and no `offers` node, and does not read it. Do not generalize the key to the other Open Days. **Munich has its own `"openDayMunichRegistration"`**, added rather than generalized for exactly this reason: the two days overlap in state (Hamburg sat `"closed"` from 17 Aug while Munich opened), so one shared key could not express both. It takes the same three values and moves the same machinery on `open-day-munich.html`, with one difference in meaning — `"waitlist"` there signals that the **60 shuttle seats** are gone, not that the day is full, since the Munich talk room has no stated capacity.

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
| Organizers | `#organizers` | Organizing Committee (2027, 2026), Advisory Board, Competition Support Team |
| Partners | `#partners` (empty `#sponsors` span kept as alias) | ICRA-style tiers — Platinum · Gold · Silver · Bronze |
| Get Involved | `#contact` | Dual CTA + email contact (dark section) |

### Competition (`competition.html`)

| Section | ID | Purpose |
|---|---|---|
| Sub-hero | `#home` | 40vh hero with breadcrumb + Register CTA (→ `register.html`) + Get the Code CTA (→ `#get-benchmark`) |
| Why This Benchmark | `#why` | Motivation copy |
| Three-Phase Mechanism | `#overview` | Pipeline diagram with link to Workshop page for Phase III |
| Mobile FR3 Duo | `#platform` | Platform specs grid + 2 photos (WebP + PNG fallback) |
| The Benchmark | `#benchmark` | 6-pillar framework |
| Benchmark Tasks | `#tasks` | 3 task cards (cable routing, deformable, assisted living) |
| Cross-Continent Testbeds | `#testbeds` | 3 site cards (Hamburg, Munich, Shanghai) |
| Competition Architecture | `#architecture` | End-to-end pipeline (Sim → Cross-Site Validation → Real-World) + 5 pillars + Infrastructure & Simulation Stack |
| Call for Participation | `#call-for-participation` | Phase I / Phase II / Eligibility cards + key dates |
| Get the Code | `#get-benchmark` | Developer-preview CTA (→ benchmark repo) + STATUS.md check-before-build note + roadmap of what's still coming |
| Submission | `#submission` | GitHub issue-form submission CTA + requirements card (Dockerfile + README) + verify-against-registration note |
| Awards & Prizes | `#awards` | Two per-task cash tracks — Real-World Excellence (cash + purchase voucher) + Simulation Prize (AMD) — up to $5,250/task; + in-kind AMD hardware support; + the InnoHub Special Award (Task 3 only, one set overall, **not** per task) |
| Partners | `#partners` (empty `#sponsors` span kept as alias) | Same ICRA-style tiers as Home, plus a Community Resources callout (Franka Community) |
| Workshop callout | (banner) | "Looking for the Workshop?" → workshop.html |

### Workshop (`workshop.html`)

| Section | ID | Purpose |
|---|---|---|
| Sub-hero | `#home` | 40vh hero with breadcrumb + View Schedule CTA |
| Workshop Overview | `#overview` | Half-day workshop intro with link to Competition page |
| Schedule | `#schedule` | Tentative timeline (08:30–13:30) with type-coded rows |
| Invited Talks | `#talks` | 4 confirmed speaker cards (talk titles still "to be announced"); section now visible |
| Panel Discussion | `#panel` | Host + panelists + 3 discussion themes |
| Poster Session & CFP | `#call-for-participation` | Extended Abstracts / Live Demos / Participation cards |
| Important Dates | `#contact` | Poster deadline / Notification / Camera-Ready / Workshop Day (dark section) |
| Dissemination | `#dissemination` | 4 cards (long-term site, slides, open protocols, perspective article) |
| Competition callout | (banner) | "Looking for the Competition?" → competition.html |

---

## Workshop program (tentative)

**Format:** Half-day morning session — exact date and venue to be announced

| Time | Session |
|------|---------|
| 08:30–08:40 | Opening Remarks |
| 08:40–09:05 | Invited Talk 1 — Prof. Abhinav Valada (University of Freiburg) (title to be announced) |
| 09:05–09:30 | Invited Talk 2 — Prof. Roberto Martín-Martín (UT Austin) (title to be announced) |
| 09:30–09:55 | Invited Talk 3 — Prof. He Wang (Peking University) (title to be announced) |
| 09:55–10:30 | Competition Highlights — Winner Teams (Task 1, Task 2, Task 3 first-place teams) |
| 10:30–11:00 | Poster Session & Coffee Break |
| 11:00–11:25 | Invited Talk 4 — Prof. Chuchu Fan (MIT) (title to be announced) |
| 11:25–12:00 | Panel Discussion — Host TBA; panelists: Stefan Schaal (Intrinsic), Sven Parusel (Franka Robotics), Shaowei Cui (SCUT) |
| 12:10–12:30 | Best Poster Award & Competition Award |
| 12:30–13:30 | Hosted Lunch & Networking |

*Times are intentionally non-contiguous — a 12:00–12:10 break sits between the panel and the awards.*

---

## Benchmark tasks (3 core tasks)

1. **Cable Routing & Plugging** — contact-rich, sequential
2. **Deformable Material Handling (Thermal Pad Placement)** — deformable, precision
3. **Assisted Living & Feeding** — human-centered, safety-critical

The scoring rubric is served from this site as a frozen, citable PDF —
[`/docs/Autonomous_Robot_Benchmark_Rulebook_1.0.pdf`](https://ebim-benchmark.github.io/docs/Autonomous_Robot_Benchmark_Rulebook_1.0.pdf).
It is mirrored because Google Docs is unreachable from mainland China, where most participants are, and because a
live Doc is mutable while a rubric must be quotable at a fixed revision. **The version stays in the filename and the
file is never replaced in place** — a revision ships as a new `_1.1.pdf` beside it, or every citation of 1.0 silently
starts pointing at different rules.

⚠️ **The rubric's labels differ from this site's.** It calls the three tasks **Track 1/2/3** — "Cable Routing",
"Thermal Pad Pick-and-Place", "Service Robot Challenge" — where the site says **Task 1/2/3** with the names above,
and where "track" already means one of the two *prize* tracks. **No other surface in the organization uses "Track"** —
the site, the `benchmark` repo (whose task directories are `task1_*`/`task2_*`/`task3_*`), and the `submissions`
issue template all say `Task N`; the rubric is the sole outlier. The gap is widest where it costs most: a
team scores itself under "Track 3 — Service Robot Challenge" and then files under the submission dropdown's "Task 3 —
Assisted Living & Feeding", two names sharing no words. The substance agrees (metrics, formulas, the 30-minute Task 1
limit, 4×4=16 staging, ranking order, "no overall aggregate"); only the labels diverge. Any page that links the PDF has
to bridge that gap in its surrounding copy, or a reader will think it describes a different competition.

## Competition platform

**Mobile FR3 Duo by Franka Robotics** — deployed at all three testbed sites:
Hamburg · Munich · Shanghai

---

## Shared chrome (navbar + footer)

The navbar and footer are single Nunjucks includes — `src/_includes/navbar.njk` and `src/_includes/footer.njk` — pulled into every page by `src/_includes/layouts/base.njk`. There is one source of truth, so there is nothing to "keep in sync." `contact.njk` sets `navActive: contact` in its front matter, which adds `aria-current="page"` to the Contact nav link; no other page sets an active state.

> Earlier versions duplicated these blocks across all 7 HTML files and guarded them with `<!-- SHARED NAVBAR/FOOTER — keep in sync … -->` comments. The Eleventy migration replaced that with the includes above, and those scaffolding comments were dropped.

### Updating the shared chrome

Edit `src/_includes/navbar.njk` or `src/_includes/footer.njk` once — visible labels come from `src/_data/i18n/en.json` via the `t` lookup (zh from `zh.json`), and link targets from the locale-aware `links` helper, so the one include serves both EN and `/zh/`. `npm run build` regenerates every page, and `node scripts/verify.mjs` confirms nothing else changed.

### Navbar items

- **EBiM Benchmark** brand → `index.html`
- **Home** dropdown → 6 sub-items linking to home sections: Overview, Two Ways to Engage, Key Themes, Maturity Roadmap, Important Dates, **Organizers**
- **Competition** dropdown → 10 sub-items linking to competition sections
- **Workshop** dropdown → 7 sub-items linking to workshop sections
- **Open Day** → `open-day.html` (the **hub**, which lists every dated Open Day)
- **Register** → `register.html`
- **Partners** → `index.html#partners`
- **FAQ** → `faq.html`
- **Contact** → https://ebim-benchmark.github.io/contact.html
- **Language toggle** (EN · 繁 · 简) → shown **only** on pages with a published localized counterpart (today all eleven — index, competition, workshop, faq, contact, register, open-day, open-day-hamburg, open-day-shanghai, open-day-munich, results — as EN ⇄ 中文, since no zh-TW page is published yet). Options run EN · 繁 · 简 and include only the pair's published locales; the zh chip reads 中文 when it is the only Chinese option and 简 beside 繁. The current locale is a non-interactive chip (`aria-current`); the others are links to their counterparts (`hreflang`/`lang` set). Driven by the `localeToggle` helper, it lives inside `.nav-links` so it rides into the mobile drawer, and extends automatically to any newly-localized page.

**Open Day is a hub, not a dropdown.** There are three dated Open Days (Hamburg 17 Aug 2026, Shanghai 21 Aug 2026, Munich 10 Sep 2026), so the obvious move would be an "Open Day ▾" caret listing them. **Don't** — a fourth caret spends width the row does not have (see the budget rule below), and the Open Day item is already the row's only two-word label. `open-day.html` lists the days instead, so the top-level item keeps its exact label and the row's rendered width is **unchanged** (verified: the navbar block of every golden differs from the previous revision by one `href` and nothing else). The item carries `aria-current="page"` on the hub *and* on each dated child page, so it reads as the current section anywhere in the family. Adding an Open Day is a card on the hub — it never touches the navbar. Munich proved it: the only navbar edit was appending `"openDayMunich"` to the `navActive in [...]` array, which is output-neutral for every existing golden (no other page's `navActive` changes membership), and the rendered row is unchanged.

**Organizers is not top-level** — it was demoted into Home ▾ when the Open Day item landed. `#organizers` is an index-page anchor and Home ▾ *is* the index-anchor menu, so a top-level entry duplicated that dropdown's job; it sits last in the dropdown because `#organizers` is section 6 of 7 in `src/index.njk` document order (right after `#dates`). Its label key moved `nav.organizers` → **`nav.homeOrganizers`**, matching the `nav.home*` prefix the other five sub-items use — that prefix documents which dropdown a label belongs to. (The footer's `footer.peopleOrganizers` is a different key and is unaffected.)

#### The top-level row is a width budget — read this before adding an item

**The geometry.** `.nav-inner` is capped at `max-width: 1100px` and spends 48px on padding, so the row gets a **1052px content box** at any viewport ≥1100. `.nav-links` is a flex item with the default `flex-shrink: 1`, and a flex item cannot shrink below its **min-content** width (`min-width: auto`) — so once the row's min-content exceeds the box, the excess has to go *somewhere*.

**What went wrong (and why the rule exists).** Adding **Open Day** — the first *two-word* top-level label the nav had ever carried; every other label is one word — pushed the row to **~1100px**, ~48px past the box. Because `.nav-links a` was the only nav text without `white-space: nowrap` (`.nav-logo` and `.nav-dropdown a` have always had it), the shortfall landed entirely on the one item that *could* fold: "Open Day" rendered on two lines at **every** desktop width, taking the 中文 toggle with it and pushing the dropdown carets below their labels.

**The fix, three parts.** *Organizers demoted* into Home ▾ reclaims its ~106px. *`white-space: nowrap` on `.nav-links a`* removes the folding failure mode itself — without it the demotion alone still folds "Open Day" the moment the box is even 1px short (verified: it still folds at 900px). *Link padding trimmed `.85rem` → `.7rem`* buys **38.4px** of margin — **not** to make it fit (it already fitted) but because at `.85rem` a real 1024px window (clientWidth 1009) landed **within ±10px of the clipping boundary**, so the outcome depended on which system font supplied the ▾ caret: measured **−9.0px (toggle clipped) on this machine** and **+1.3px (clear) on the reviewer's**. The trim moves that to **+29.4px here / ~+39.8px there** — ~3–4× the variance, so it no longer depends on the visitor's fonts. The trim's *delta* is machine-independent (38.4 here vs 38.5 there — padding is deterministic); only the absolute row is soft.

**The one formula.** Every layout threshold here derives from: **`box = min(clientWidth, 1100) − 48`**, and the row must fit the box. Widths below are `documentElement.clientWidth` unless marked otherwise.

**Two units live in this navbar — do not mix them** (mixing them produced a wrong "1024px" claim in three earlier revisions of this file):
- **`clientWidth`** *excludes* the scrollbar. Layout — the row, the box, every threshold below — is in this unit.
- **`innerWidth`** *includes* it, and **`@media` matches on `innerWidth`** (verified in Chrome 156 with a 15px scrollbar: at innerWidth 1050 / clientWidth 1035 the drawer engages; at 1051 / 1036 it does not, and the EN row keeps 988 − 976.7 = 11.3px). So the drawer's **`max-width: 1050px`** is an **innerWidth** number.

With a classic ~15px scrollbar, `clientWidth = innerWidth − 15`. Practical conversions: the **drawer engages at clientWidth ≤1035**; a **1024px laptop window is clientWidth ≈1009**, so it gets the drawer.

**The numbers are soft by ~±10px, and that is not sloppiness.** The `▾` caret is **U+25BE, which is outside every Inter `unicode-range` above** (the latin subset stops at `U+2193`), so a *system* font supplies it — a different physical font per machine. The three carets contribute ~52px to the row here, and measuring the same commit on two machines gave rows 10.3px apart. **Treat any row width below as ±10px, and never design to a margin smaller than that.** Retiring the glyph (CSS triangle or inline SVG) would make the row deterministic — a worthwhile follow-up, not done here.

**Measured now — the three-way switcher** (headless Chromium via Playwright 1.48, self-hosted Inter, `.7rem` padding; the ▾ came from **Cambria Math** on the measuring machine; all 11 `zhTwPublished` flags on, so every toggle reads EN · 繁 · 简):

| Page | Row (max-content = min-content) | Headroom in the 1052 box | Fits down to clientWidth |
|---|---|---|---|
| EN | **976.7** (logo 152.7 + items 824.0) | +75.3 | **1025** |
| `/zh/` | **850.5** | +201.5 | **899** |
| `/zh-tw/` | **850.5** | +201.5 | **899** |

The switcher costs EN **+21.2px** over the two-way EN · 中文 row (955.6). With 简 instead of 中文 the active zh chip is one character, so it can no longer fold: zh's min-content rises from 816.8 to 850.5. Nothing folds at any width on any locale.

**The drawer rule: the drawer covers innerWidth ≤ 1050; the desktop row needs ≥10px margin at 1051.** The breakpoint is derived, not chosen: worst-case fit threshold (EN, clientWidth **1025**) + **15** (scrollbar) + **10** (caret variance) = **1050**, rounded up to a multiple of 10. At innerWidth 1051 (clientWidth 1036) the box is 1036 − 48 = 988, so EN keeps **11.3px**. Only the drawer rules moved: the `section` / `.people-grid` / `.hero-content` rules that used to share the 768px block stay at 768px in their own block.

**How to measure this without fooling yourself** — two traps, both of which produced wrong numbers during the Open Day work:
- **Never `scrollWidth` on the live `.nav-links`.** It is a shrunk flex item, so you get the *post*-shrink width. Tell-tale: deleting a 98px item moves it by 2px. Use a detached clone with the dropdowns removed and an explicit `width`.
- **`max-content` and `min-content` answer different questions.** `max-content` (EN: 976.7) is what the row *wants* — use it for "does it fit the 1052px box". `min-content` is the floor a flex item cannot shrink past (`min-width: auto`) — use it for "at what clientWidth does it start overflowing". With `white-space: nowrap` the two are **identical on EN**, which is precisely why the row overflows rather than folds; without nowrap min-content drops ~57px because the labels can break. The *active* locale chip is a `<span class="lang-opt">`, which `.nav-links a` does not cover; with the two-way toggle a 中文 chip could still fold (zh 829.7 vs 816.8), but 简 is one character, so the three-way rows are identical too.
- **Measure clientWidth and innerWidth separately, and load the self-hosted Inter first** (`document.fonts.ready`). Headless Chromium draws no scrollbar (clientWidth = innerWidth there), so add the 15px yourself when converting a threshold to a breakpoint. Record which font supplied ▾ (`CSS.getPlatformFontsForNode` over CDP) — it is the soft part of every number.
- **Test the breakpoint in a real Chrome, not Playwright's bundled headless shell.** With scrollbars enabled (`ignoreDefaultArgs: ["--hide-scrollbars"]`), the bundled Chromium 130 shell reports a **34px** scrollbar on Windows, which makes innerWidth 1051 look like an overflow (clientWidth 1017). The installed Chrome (`channel: "chrome"`) reports the real 15px. Row widths are the same in both; only the scrollbar differs.

> **✅ Resolved by the 1050px drawer breakpoint (PR C).** The drawer now engages at every width where the row would not fit, so the band described below no longer exists. Kept for the record:
>
> **Residual, pre-existing (before PR C): the row had no responsive strategy across clientWidth 754–1003** (equivalently, an innerWidth window of 769–1018). The drawer only engages at clientWidth ≤753, so across that gap the row does not fit and the rightmost items (the language toggle first) run past the viewport with **no horizontal scroll to reach them**. Measured thresholds, EN, post-trim, all clientWidth: **≥1004** fully clean; **980–1003** the row eats into `.nav-inner`'s 24px right padding but everything stays visible; **<980** the toggle goes **off-screen**. A real 1024px window is clientWidth ≈1009 → **clear, by ~29px** — the trim moved it out of the boundary zone it sat in at `.85rem`. `/zh/` has the same failure mode far narrower: off-screen only below clientWidth ~841.
>
> This predates the Open Day work (`main` goes off-screen below ~961), and `nowrap` changes the *symptom*: `main` degraded by *folding* 中文 to 中/文 (ugly, still clickable); the row now stays rigid and simply runs off. So versus `main` this branch is **better at ~980–1045** (no fold) and **worse at 962–979** — a 19px band, down from 56px before the trim. Fixing the band properly means giving the row an intermediate breakpoint — raise the drawer to ~1004px, or demote another item — and is a **separate decision**, not part of the Open Day work. (Exempting `.lang-opt` from the nowrap so 中文 can fold again is *not* a fix: measured, it buys 12px. Note the *active* locale chip is a `<span class="lang-opt">`, which `.nav-links a` never covers — so on `/zh/` the 中文 chip can still fold inside the already-broken band.)

**The budget rule.** ~75px of headroom at the cap sounds like room for one more item — **it is not**. The binding constraint is not the 1052px cap, it is the **≥10px margin at innerWidth 1051** (box 988): the EN row may be at most **978px**, and it is 976.7 — **1.3px of budget left**. Anything that widens the row (a new item, a longer label, a fourth locale chip) must either raise the breakpoint again by the same formula — re-measure, then `threshold + 15 + 10`, rounded up — or use one of the levers below first. Raising the breakpoint hands the drawer to more desktop windows, so prefer a lever.

| Lever | Buys | Cost |
|---|---|---|
| Demote **Partners** into Home ▾ | **~+83px** (measured ~+87.8px at `.85rem`; ~4.8px less at `.7rem`) | **No CSS** — `navbar.njk` + i18n only. But Partners is sponsor-facing surface (TÜV Rheinland, DroidUp, compute providers), so it is Cecil's call, not a refactor |
| Trim padding further `.7rem` → `.6rem` | **+25.7px** (measured on the two-way row: 955.6 → 929.9) | Edits `style.css` → re-baselines every EN golden. `.7rem` already took the big win (+38.4px) |
| Retire the `▾` glyph (CSS triangle / inline SVG) | Removes the **±10px variance**, not width | Makes the budget deterministic. Recommended follow-up |
| ~~Raise the `.nav-inner` cap~~ | — | **Don't, in isolation.** 1100px is shared with `.container`, `.footer-inner` and `.arch-pillars` (style.css ~85/114/2131/2262); raising only the nav desyncs it from the content column on every page |

Demotion is the cheapest lever and needs no CSS — do not reach for the cap.

### Footer columns

- **Pages**: Home / Competition / Workshop / Open Day
- **People**: Organizers / Partners
- **Participate**: Register / Compete / Submit Poster / FAQ / Contact Us

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

- **Breakpoint**: innerWidth ≤ 1050px shows the hamburger; ≥ 1051px shows the desktop horizontal navbar (derived in the navbar width budget above). The page-layout rules in the old shared block (`section` padding, `.people-grid`, `.hero-content`) still switch at 768px.
- **Drawer**: `position: fixed`, slides down from the top with `transform: translateY(calc(-100% - var(--nav-h) - 0.5rem))` in the closed state — this calc-based hide guarantees the drawer fully clears the navbar at any drawer height (a percentage-only translate broke when dropdowns collapsed and the drawer became shorter).
- **Scrollable**: `max-height: calc(100vh - var(--nav-h))` + `overflow-y: auto` so the drawer scrolls when content (especially with all dropdowns expanded) exceeds the viewport.
- **Collapsible dropdowns**: each parent dropdown `<li>` includes a separate `<button class="dropdown-toggle">` next to the link. The link still navigates when tapped; the button toggles a `.expanded` class on the `<li>` to show/hide the sub-menu. One open at a time. Closing the hamburger drawer collapses any expanded dropdown.

---

## Anchor-jump scroll offset

In-page navigation lands the user on a section two ways: the navbar dropdowns (Home / Competition / Workshop sub-items) and the TOC sidebar jump to `#section` anchors, and the contact deep-link (`contact.html?topic=…`) calls `scrollIntoView({ block: 'start' })` on `.contact-card`. Because the navbar is `position: fixed`, a raw jump aligns the target to the very top of the viewport, leaving it hidden under the navbar.

`html { scroll-padding-top: calc(var(--nav-h) + 1rem) }` lands those jumps just below the navbar instead. One rule covers both cases — `scroll-padding-top` is honored by native fragment navigation **and** by `scrollIntoView({ block: 'start' })` — and it tracks `--nav-h` automatically, clearing 68px desktop / 60px at the ≤ 380px breakpoint, plus a 1rem gap.

---

## Reduced-motion

All smooth scrolling honors `prefers-reduced-motion: reduce`. The global `html { scroll-behavior: smooth }` rule — which drives anchor jumps, `scroll-padding` navigation, and any `scrollIntoView` that omits `behavior` — is gated by one media query, `@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto } }`, so those scrolls become instant when the user requests reduced motion.

An explicit `behavior: 'smooth'` on a scroll call **overrides** CSS `scroll-behavior`, so the form-error scrolls (contact / register / open-day / compute-apply, in `_includes/*-form-script.njk`) deliberately **omit** `behavior` and inherit the gate above — don't re-add it. The two scrolls that do pass an explicit `behavior` — back-to-top (`js/main.js`) and the FAQ category rail (`faq.njk` / `zh/faq.njk`) — self-gate in JS instead, checking `window.matchMedia('(prefers-reduced-motion: reduce)')` and passing `behavior: 'auto'` when it matches.

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
| `<meta name="google-site-verification">` | Search Console verification token(s) — data-driven list in `site.json` (one `<meta>` per verifying owner) |
| JSON-LD `Event` schema (index/competition, date-gated, **gate open**) | Rich event card; emitted only once `event.json` sets `eventPublishStartDate` — **set since 2026-07-22** (`2026-07-06` → `2026-09-12`, `EventScheduled`), so index/competition emit the Event alongside Organization (+ Breadcrumb on competition). `startDate` and `eventPublishStartDate` must be kept identical; deleting the key withholds the Event again. Refs #83 |
| JSON-LD Open Day `Event` (date-gated, **gate open**) | Rich event card; gated on `event.json` `openDayHamburgStartDate` — which is set (a real date + venue), so this Event emits independently of the index/competition gate. `offers.availability` tracks `site.openDayRegistration` (`InStock` when `open`, else `SoldOut`), so the structured data can never advertise seats the form no longer takes. Talk-level `subEvent`s are omitted as a standing editorial choice, not for want of titles — every talk now has a confirmed title and a named speaker |
| JSON-LD `Organization` schema | Brand entity |
| JSON-LD `BreadcrumbList` (sub-pages) | Breadcrumb-style SERP enhancement |
| JSON-LD workshop `Event` (date-gated) | Rich event card; emitted only once `event.json` sets `workshopStartDate` — today the workshop page carries only Organization + Breadcrumb |

`404.html` is intentionally `noindex` and has no OG tags.

`sitemap.xml` is rendered from `src/sitemap.njk` through the `sitemapRows` filter (`lib/locales.mjs`), per-page gated on `zhPublished` and `zhTwPublished`: the 11 EN URLs (home, competition, workshop, contact, register, faq, open-day-hamburg, open-day, open-day-shanghai, open-day-munich, results) plus a `/zh/` and a `/zh-tw/` URL for each page **published** in that locale — today all eleven `/zh/` and no `/zh-tw/`, so **22 URLs** (11 EN + 11 `/zh/`); with every zh-TW page published, 33. Every row of a pair carries the same `xhtml:link` alternates as the pair's pages' hreflang (en, zh-Hans, zh-Hant, x-default — only the published ones). (The success/utility + unlisted pages — `contact-success`, `register-success`, `open-day-success`, `open-day-munich-success`, `contact-test`, `404`, `compute-apply`, `compute-success`, `feedback-registered`, `feedback-phase2` — are intentionally excluded.) It is referenced from `robots.txt`.

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
- Arranged in ICRA-style tiers (Platinum · Gold · Silver · Bronze) with descending logo prominence; per-tier sizing lives in `css/style.css` under `/* ---------- Partners (ICRA-style tiered) ---------- */`, with a few per-logo overrides (e.g. Google shrunk, AMD nudged up via `transform: scale`, VRB/RIG/HHRI/Computational Freedom/DroidUp enlarged, Galbot shrunk).
- SVGs render at native resolution; for raster logos `width`/`height` attrs match the source-file dimensions for CLS prevention.
- All partner logos use `loading="lazy"` and `decoding="async"`. (The folder stays `img/sponsors/` so asset paths remain stable.)
- A partner with no link is rendered as a `<div class="partner-card">` (no `href`) instead of an `<a>`; the hover/lift affordance is scoped to `a.partner-card` in CSS, so a non-anchor card is styled identically but stays inert (e.g. Synrise).
- The Gold/Silver/Bronze tiers are kept identical on Home and Competition (`index.njk` ↔ `competition.njk`, plus the `zh/` mirrors) — any logo added to one must be added to all four.

---

## Content status

### Done
- [x] Multi-page restructure: `index.html` (landing), `competition.html`, `workshop.html`, `404.html`
- [x] Shared navbar + footer (byte-identical, comment-tagged)
- [x] Schedule: final 4-talk + competition + panel program (08:30–13:30)
- [x] Benchmark tasks: 3 core tasks
- [x] Organizers: OC 2027 (10) + OC 2026 (10), Advisory (4), Support (20); headshot photos wired for all 44 cards (no organizer card remains an initials avatar)
- [x] Invited talks: four confirmed speakers — Prof. Abhinav Valada (University of Freiburg), Prof. Roberto Martín-Martín (UT Austin), Prof. He Wang (Peking University), Prof. Chuchu Fan (MIT) — wired into the `#talks` cards + schedule rows; the dedicated `#talks` section is now revealed; talk titles still "to be announced"
- [x] Mobile FR3 Duo platform section + photos
- [x] EBiM Benchmark wordmark (CSS/text) in hero/sub-hero, navbar, and footer on all pages
- [x] Partners (ICRA-style tiers): Platinum (Agile Robots, Franka Robotics, Google, AMD, Ingrasys), Gold (Mech-Mind, vivo, TÜV Rheinland), Silver (Taipei Computer Association, RobotGym, Synrise), Bronze (Virtual Research Building/AICO, Robotics Institute Germany, Hon Hai Research Institute, Galbot, Lightwheel, ManipulationNet, Computational Freedom, General Intelligence, DroidUp); site-wide "Sponsors → Partners" rename with `#partners` anchor + backward-compatible `#sponsors` alias span
- [x] Franka Community: Community Resources callout on competition.html + footer link (the inline note under the Franka card was dropped in the tier redesign)
- [x] Discord integration: invite (`discord.gg/pGwRbMRjuH`) wired into the shared footer (every page), a category-conditional "faster path" CTA on `contact.html` (shown after the Category field for competition/workshop topics), and the competition Community pillar (Discord + GitHub linked; Docs + Cloud Access left bare pending public URLs)
- [x] 3-testbed coverage: Hamburg (University of Hamburg robotics lab, venue TBA), Munich, Shanghai (Franka Robotics branch office; card links to the testbed WeChat group)
- [x] Competition timeline (**final schedule, PR #120** — supersedes the revision locked 2026-07-22, which superseded the slipped Jun 29 release. A **developer preview is now live**, so the Simulation Release row reads "Preview live" rather than a date. `event.json` now holds `startDate`/`eventPublishStartDate` `2026-07-06` and `endDate` `2026-10-01` under `EventScheduled`, so the PR #93 date gate is **open** and index/competition emit the `Event` again): Simulation Release **(preview live)** → Simulation End **Aug 22, 2026 (AoE)** → Results Announced **Aug 24** → Phase II two-window (team hands-on bench testing **Aug 25 – Sep 3**, local venue time; organizer-run bench testing & evaluation **Sep 4 – Sep 12**) → Phase II submission deadline / competition end **Sep 12, 2026 (AoE)** → Final Result Announcement **Oct 1, 2026**. Submission deadlines are **AoE**; bench-testing windows run on **local venue time**. Repository submissions have been open since the developer preview; workshop date TBD
- [x] Competition awards — **the two cash tracks are per task**: Real-World Excellence — 1st $1,500 / 2nd $1,000 / 3rd $500 cash, each + a Franka Robotics purchase voucher (US$3,750 / $2,500 / $1,250 value) + trophy/gift; Simulation Prize (AMD) $300 / $200 / $100; + in-kind AMD dev hardware (US/DE/Asia). **InnoHub Special Award** (InnoHub by TÜV Rheinland, PR #125) — **Task 3 only**, awarded as **one set overall, not per task**, $300 / $200 / $100. Scored in simulation by the organizers on each team's already-submitted Phase II policy, so **no team action is required**; 10 points = 4 illumination robustness (four lighting profiles) + 6 collision avoidance (three obstacles). Independent of the main leaderboards and of main-task ranking. No tie-break: tied teams share a rank and each receives that rank's prize, a rank left vacant by a tie is not awarded, and teams scoring zero are not ranked. Results 1 Oct 2026, with the main results. Its lighting evaluation is designed with reference to **IEC 62849** but assesses a simulated environment only and is **not** equivalent to passing that standard's lighting assessment. It carries the same amounts as the Simulation Prize on different criteria — a team may win both. PRIZE_HEADLINE "Up to $5,250 in prizes per task — cash + purchase voucher, trophy & gift" propagated to the home hero, Two-Ways badge, Competition hero + Awards intro, and SEO meta — unchanged by the InnoHub award, which is not per task and so does not move the per-task ceiling. The label always reads "cash + purchase voucher" (never implies $5,250 is pure cash).
- [x] Branding unified under EBiM Benchmark
- [x] OG cover image — EBiM-branded `og-cover.png` at 1200×630 spec (rasterized from `og-cover.svg`)
- [x] Panel: three confirmed panelists — Stefan Schaal (Intrinsic), Sven Parusel (Franka Robotics), Shaowei Cui (SCUT); host TBA (mirrored across the schedule row + panel cards; kept in `event.json` as reference data for the date-gated workshop Event, not in current JSON-LD). Kenny Kimble (NIST) withdrew and was removed from the page and the `event.json` reference data.
- [x] Google Search Console verified for `https://ebim-benchmark.github.io/`
- [x] SEO: per-page meta tags, JSON-LD (Event [index/competition date-gated & **emitting**; workshop date-gated & withheld; all three dated Open Days date-gated & **emitting**; the Open Day hub carries no Event by design] + Organization + BreadcrumbList), locale-aware sitemap (10 EN + 10 zh URLs published), alt text + width/height on every img
- [x] Heading hierarchy fixed (no h2 → h4 skips)
- [x] Mobile nav: scrollable drawer + collapsible dropdowns
- [x] Sticky on-page TOC sidebar on sub-pages (≥1400px)
- [x] Image optimization: platform PNGs → WebP (~99.5% reduction); OG cover resized + reformatted
- [x] EBiM Maturity Roadmap (Alpha 2026 → Beta 2027 → Gamma, foreseeable future) strip on the home page, styled distinctly from the Phase I/II/III pipeline; links the PR2 Beta Program
- [x] Partner logos wired with links: vivo (Gold), Galbot, Lightwheel, ManipulationNet (Bronze), Computational Freedom (Bronze → gpufree.cn), General Intelligence (Bronze → gilabs.xyz, egocentric cameras), TÜV Rheinland (Gold → tuv.com), DroidUp (Bronze → droidup.com, bionic mannequin heads), Foxconn Industrial Internet (Platinum → fii-foxconn.com, deliberately caption-less — the only Platinum card without one) — files added under `img/sponsors/`. Synrise (Silver) added as a deliberately non-linked card (`<div class="partner-card">`). Both on Home + Competition (EN + zh).

- [x] Autonomous Robot Benchmark Rulebook 1.0 mirrored as a served PDF at `/docs/Autonomous_Robot_Benchmark_Rulebook_1.0.pdf` (`src/docs/` passthrough; `*.pdf` marked `binary` in `.gitattributes` so it can never be eol-normalized). Deliberately **not linked from any page yet** — that is a content change and ships in its own PR, which is what let the mirror PR prove it moved no HTML goldens.
- [x] Platinum partner swap: the fifth Platinum slot (alone on the third row) is now Ingrasys Technology Inc. (→ ingrasys.com), still caption-less; its logo is the vector `img/sponsors/ingrasys.svg`, converted from the vendor `.ai` master and cropped to its ArtBox, replacing the previous partner's PNG. Home + Competition (EN + zh) and the `event.json` sponsor JSON-LD.

### Still needed
- [ ] Confirm workshop date & venue (decoupled from any fixed conference; currently TBD)
- [ ] Confirm Final Results date on index.html Important Dates (currently TBD)
- [ ] Confirm invited-talk titles and the panel host on workshop.html (speakers confirmed; talk titles + host still TBA)
- [ ] Fill in workshop poster submission deadlines on workshop.html (currently TBD)
- [ ] Optional: convert remaining partner PNGs to WebP for marginal extra perf

---

## Image guidelines

| Folder | Format | Recommended size |
|---|---|---|
| `organizers/` | JPG or PNG | **600 × 600 px, square.** Square matters: `.org-photo` uses `object-fit: cover`, so a non-square file is centre-cropped and can clip the subject |
| `speakers/` | JPG or PNG | Same as `organizers/` — external Open Day / Workshop speakers who hold no EBiM role |
| `sponsors/` | SVG preferred (or PNG with transparent bg) | No fixed pixel size — logo aspect ratios vary widely. Keep `width`/`height` attrs matching the source dimensions (see the partner-logo rule above) |
| `platform/` | WebP primary + PNG fallback | 1600 × 900 px (WebP), keep originals as PNG |
| OG cover | PNG (or JPG) | 1200 × 630 px |

**When the source is smaller than the recommended size.** 600 × 600 is a target, not a floor to pad up to. If the organizer supplies a headshot whose native size is below it, **ship it at native size — do not upscale**: resampling up fabricates detail the source never had and adds bytes for no visible gain. These files are never rendered large — `.org-photo` is 100 CSS px at its biggest (the Advisory Board cards on `index.html`), 88 px for the Organizing Committee cards and the Open Day talk cards, and 44 px in the Competition Support Team grid — so even a 400 px source still covers a 4× display at the largest of those. The part that is not negotiable is **square**, because `object-fit: cover` centre-crops a non-square file. `speakers/yunlei-shi.jpg` is the worked example: 400 × 400 native, deliberately left alone (PR #112).

**The workshop talk cards are deliberately absent from that list — and converting one costs an extra edit.** They still render initials, not photos: `src/workshop.njk` and `src/zh/workshop.njk` carry eight `class="org-avatar"` each and zero `class="org-photo"`. The catch is that their page-local rule (`.talk-card .org-avatar`, in the `<style>` block around line 189 of `src/workshop.njk` and line 188 of the `/zh/` copy) names **`.org-avatar` alone**, whereas all four Open Day pages name `.talk-card .org-avatar, .talk-card .org-photo` together. `margin-bottom` is set nowhere else — neither `.org-photo` nor `.talk-card` has a rule in `src/css/style.css` — so swapping a workshop avatar for a real photo must widen that selector in the same commit, or the `.9rem` gap under the image vanishes and the portrait butts up against the speaker name. Nothing catches this: the goldens will simply re-baseline to the wrong spacing.

**Colour profiles.** Before stripping an ICC profile from an image, check what it is. A plain `sRGB IEC61966-2.1` profile is safe to drop — an absent profile means "assume sRGB", which is what the pixels already are. A **wide-gamut profile (Display P3 and similar) must be *converted* to sRGB, never dropped**: dropping it leaves P3 pixel values to be reinterpreted as sRGB, which desaturates the image. This is not hypothetical — it happened to `jeff-ichnowski.jpg` in PR #100 and had to be corrected before merge.

Five images in `src/img/organizers/` currently carry Display P3 profiles (all with the same `rXYZ` signature, `0.5151`):

```
yu-hsiang-huang.jpeg   ~190 KB
wen-yu-chien.jpg       ~144 KB
yuyang-tu.jpg          ~122 KB
fatma-dhaoui.jpeg       ~81 KB
shiqun-qiguan.jpg       ~42 KB
```

They render **correctly today** — `src/img` is passthrough-copied byte-verbatim with no image-processing plugin, so the embedded profiles survive to production — which means the risk is **manual only**, i.e. someone re-encoding one of these files. The first three are among the largest headshots on the site and are therefore exactly what a weight-optimisation pass would target; that is precisely how the PR #100 error occurred.

---

## License

Website code: Apache-2.0 (see [LICENSE](LICENSE)). Site content (text, images, workshop materials): CC-BY-4.0.

Flag SVGs from flag-icons (https://github.com/lipis/flag-icons), MIT.
Inter typeface by Rasmus Andersson (https://rsms.me/inter/), self-hosted, SIL OFL 1.1 (see src/fonts/OFL.txt).
