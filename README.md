# EBiM Benchmark Website — EBiM-Benchmark

**Toward a Globally Coordinated Benchmark for Real-World Embodied Bimanual Manipulation**

A globally coordinated benchmark for real-world embodied bimanual manipulation — Competition + Workshop, 2026

🌐 **Live site:** [ebim-benchmark.github.io](https://ebim-benchmark.github.io)
📧 **Contact:** https://ebim-benchmark.github.io/contact.html

### Contact form: deep links & categories

`contact.html` posts to Web3Forms. **Deep links** — `contact.html?topic=SLUG` pre-selects a category:

- `register` → Competition — Register Interest
- `competition` → Competition Question
- `partner` → Partnership Inquiry
- `workshop` → Workshop / Poster Submission
- `media` → Media / Press
- `tech` → Technical (Platform / Website)
- `partnership` → Partnership / Testbed Hosting

Unknown/absent slug = no pre-selection.

**Adding a category** — keep three places in sync, or the subject prefix / pre-selection silently breaks:

1. The `<option>` in the category `<select>` (`contact.html`)
2. The same option value → `"[PREFIX] "` entry in the JS prefix map
3. *(optional)* a slug → option-value entry in the `?topic=` map

The option value string must be **byte-identical** (including any em-dash `—`) across all three places.

**Destination email** is configured in the Web3Forms dashboard (tied to the access key in `contact.html`), not in any committed file — so the address stays out of the public repo.

---

## Architecture overview

The site is a **multi-page** static site (no build step). Three primary content pages, a contact form, and a 404:

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
├── index.html                           # Landing page (funnel to sub-pages)
├── competition.html                     # The EBiM Competition
├── workshop.html                        # Workshop Program
├── contact.html                         # Categorized Web3Forms contact form
├── contact-success.html                 # No-JS POST fallback success page
├── contact-test.html                    # Internal contact-form health check (not linked)
├── 404.html                             # Branded 404 (noindex)
├── css/
│   └── style.css                        # All shared styles, including dropdowns,
│                                        #   TOC sidebar, mobile drawer, dropdown toggles
├── js/
│   └── main.js                          # Navbar scroll FX, mobile hamburger,
│                                        #   collapsible mobile dropdowns, scroll-active
│                                        #   nav + TOC tracking, fade-in observer
├── img/
│   ├── favicon.svg                      # Site favicon (robot mark, accent color)
│   ├── og-cover.png                     # Open Graph card (1200×630, ~87 KB, EBiM-branded)
│   ├── og-cover.svg                     # EBiM-branded OG source (rasterize → og-cover.png)
│   ├── platform/
│   │   ├── MFR3_Duo.webp                # 1600×900 WebP (~18 KB) — primary
│   │   ├── MFR3_Duo.png                 # 4000×2250 PNG (~4 MB)  — fallback
│   │   ├── MFR3_Duo_with_workbench.webp # 1600×900 WebP (~31 KB) — primary
│   │   └── MFR3_Duo_with_workbench.png  # 4000×2250 PNG (~6.7 MB) — fallback
│   ├── organizers/                      # Organizer headshots — to be added
│   ├── sponsors/                        # Partner logos (folder name kept as
│   │   │                                #   sponsors/ so asset paths stay stable)
│   │   ├── agile_robots.svg             # Agile Robots — Platinum (white; brightness(0) filter)
│   │   ├── agile_robots_dark.jpg        # Agile Robots dark variant
│   │   ├── franka_robotics.svg          # Franka Robotics — Platinum
│   │   ├── franka_robotics_white.png
│   │   ├── google.svg                   # Google — Platinum
│   │   ├── amd.svg                      # AMD — Platinum (white, brightness(0) filter)
│   │   ├── mech_mind.png                # Mech-Mind — Gold (dark)
│   │   ├── mech_mind_white.png
│   │   ├── vivo.png                     # vivo — Gold
│   │   ├── tca.png                      # Taipei Computer Association — Silver
│   │   ├── robotgym.webp                # RobotGym — Silver (dark)
│   │   ├── robotgym_white.webp
│   │   ├── vrb.svg                      # Virtual Research Building (a.k.a. AICO) — Bronze
│   │   ├── rig.png                      # Robotics Institute Germany — Bronze
│   │   ├── hhri.png                     # Hon Hai Research Institute — Bronze
│   │   ├── galbot.png                   # Galbot — Bronze
│   │   ├── lightwheel.png               # Lightwheel — Bronze
│   │   ├── manipulationnet.webp         # ManipulationNet — Bronze
│   │   └── alibaba_cloud.svg            # Alibaba Cloud (unused — partner removed; asset retained)
│   ├── speakers/                        # (reserved — not used yet)
│   └── tasks/                           # (reserved — not used yet)
├── robots.txt                           # Allow-all + sitemap pointer
├── sitemap.xml                          # 4 URLs (home, competition, workshop, contact)
├── .nojekyll                            # Disable Jekyll on GitHub Pages
└── README.md
```

---

## Setup

Plain HTML/CSS/JS — no build step, no dependencies.

### Local preview

```bash
python -m http.server 8000
# then open http://localhost:8000
```

### GitHub Pages deployment

Push to `main` of `EBiM-Benchmark/ebim-benchmark.github.io`; GitHub Pages auto-deploys at `https://ebim-benchmark.github.io`.

---

## Page sections

### Home (`index.html`)

| Section | ID | Purpose |
|---|---|---|
| Hero | `#home` | Full-viewport hero with two CTAs (Enter Competition / View Workshop) |
| Workshop Overview | `#overview` | Abstract paragraph + Three-Phase Pipeline diagram |
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
| Awards & Prizes | `#awards` | Per-task prizes in two tracks — Real-World Excellence (cash + Franka voucher) + Simulation Prize (AMD) — up to $5,250/task; + in-kind AMD hardware support |
| Partners | `#partners` (empty `#sponsors` span kept as alias) | Same ICRA-style tiers as Home, plus a Community Resources callout (Franka Community) |
| Workshop callout | (banner) | "Looking for the Workshop?" → workshop.html |

### Workshop (`workshop.html`)

| Section | ID | Purpose |
|---|---|---|
| Sub-hero | `#home` | 40vh hero with breadcrumb + View Schedule CTA |
| Workshop Overview | `#overview` | Half-day workshop intro with link to Competition page |
| Schedule | `#schedule` | Tentative timeline (08:30–13:30) with type-coded rows |
| Invited Talks | `#talks` | 5 speaker cards (speakers + titles "to be announced"; section hidden pending re-invites) |
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
| 08:40–09:00 | Invited Talk 1 — Speaker TBA (title to be announced) |
| 09:00–09:20 | Invited Talk 2 — Speaker TBA (title to be announced) |
| 09:20–09:40 | Competition Highlights — Winner Teams (1st, 2nd, 3rd place) |
| 09:40–10:25 | Poster Session & Coffee Break |
| 10:25–10:45 | Invited Talk 3 — Speaker TBA (title to be announced) |
| 10:45–11:05 | Invited Talk 4 — Speaker TBA (title to be announced) |
| 11:05–11:25 | Invited Talk 5 — Speaker TBA (title to be announced) |
| 11:25–11:55 | Panel Discussion — Host TBA; panelists: Stefan Schaal (Intrinsic), Kenny Kimble (NIST), Sven Parusel (Franka Robotics), Shaowei Cui (SCUT) |
| 11:55–12:30 | Best Poster Award & Competition Award |
| 12:30–13:30 | Hosted Lunch & Networking |

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

The navbar and footer are **byte-identical** across the 4 primary pages (`index`, `competition`, `workshop`, `404`). The contact pages (`contact.html`, `contact-success.html`, `contact-test.html`) carry the same chrome too; `contact.html` additionally marks its own nav link with `aria-current="page"`. Each block is wrapped in a comment marker:

```html
<!-- SHARED NAVBAR — keep in sync across index.html, competition.html, workshop.html, 404.html -->
<nav id="navbar" ...>...</nav>

<!-- SHARED FOOTER — keep in sync across index.html, competition.html, workshop.html, 404.html -->
<footer id="footer">...</footer>
```

### Updating the shared chrome

When changing the navbar or footer:

1. Update the block in **one** file.
2. Copy/paste the same block into the other 3 files.
3. Verify byte-equality:

```bash
# Quick sanity check (run from repo root)
python -c "
import re, hashlib
from pathlib import Path
for which, pat in [('NAVBAR', r'<!-- SHARED NAVBAR.*?</nav>'),
                   ('FOOTER', r'<!-- SHARED FOOTER.*?</footer>')]:
    hashes = set()
    for p in ['index.html', 'competition.html', 'workshop.html', '404.html']:
        m = re.search(pat, Path(p).read_text(encoding='utf-8'), re.S)
        hashes.add(hashlib.sha256(m.group(0).encode()).hexdigest()[:12])
    print(f'{which}: {\"OK\" if len(hashes) == 1 else \"DRIFT\"} ({hashes})')
"
```

### Navbar items

- **EBiM Benchmark** brand → `index.html`
- **Home** dropdown → 5 sub-items linking to home sections (incl. Maturity Roadmap)
- **Competition** dropdown → 8 sub-items linking to competition sections
- **Workshop** dropdown → 7 sub-items linking to workshop sections
- **Organizers** → `index.html#organizers`
- **Partners** → `index.html#partners`
- **Contact** → https://ebim-benchmark.github.io/contact.html

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

`sitemap.xml` lists 4 URLs (home, competition, workshop, contact) and is referenced from `robots.txt`.

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
- [x] Schedule: final 5-talk + competition + panel program (08:30–13:30)
- [x] Benchmark tasks: 3 core tasks
- [x] Organizers: OC (11), Advisory (4), Support (11)
- [x] Invited talks: both speakers AND titles set to "to be announced" on workshop.html (speakers being re-invited; the dedicated `#talks` section stays hidden)
- [x] Mobile FR3 Duo platform section + photos
- [x] EBiM Benchmark wordmark (CSS/text) in hero/sub-hero, navbar, and footer on all pages
- [x] Partners (ICRA-style tiers): Platinum (Agile Robots, Franka Robotics, Google, AMD), Gold (Mech-Mind, vivo), Silver (Taipei Computer Association, RobotGym), Bronze (Virtual Research Building/AICO, Robotics Institute Germany, Hon Hai Research Institute, Galbot, Lightwheel, ManipulationNet); site-wide "Sponsors → Partners" rename with `#partners` anchor + backward-compatible `#sponsors` alias span
- [x] Franka Community: Community Resources callout on competition.html + footer link (the inline note under the Franka card was dropped in the tier redesign)
- [x] 4-testbed coverage: Hamburg (top floor of the Google Hamburg office), Munich, Pittsburgh, Shanghai (Franka Robotics branch office)
- [x] Competition timeline: Simulation Release Jun 20 → Simulation End Aug 5 → Results Announced Aug 6 → Phase II two-window (team hands-on bench testing Aug 6–15; organizer-run testing & evaluation Aug 16–31, with code submission staying open — not a freeze); workshop date & Final Results TBD
- [x] Competition awards (per task): Real-World Excellence — 1st $1,500 / 2nd $1,000 / 3rd $500 cash, each + a Franka Robotics voucher (US$3,750 / $2,500 / $1,250 value) + trophy/gift; Simulation Prize (AMD) $300 / $200 / $100; + in-kind AMD dev hardware (US/DE/Asia). PRIZE_HEADLINE "Up to $5,250 in prizes per task — cash + Franka voucher, trophy & gift" propagated to the home hero, Two-Ways badge, Competition hero + Awards intro, and SEO meta. The label always reads "cash + Franka voucher" (never implies $5,250 is pure cash).
- [x] Branding unified under EBiM Benchmark
- [x] OG cover image — EBiM-branded `og-cover.png` at 1200×630 spec (rasterized from `og-cover.svg`)
- [x] Panel: four confirmed panelists — Stefan Schaal (Intrinsic), Kenny Kimble (NIST), Sven Parusel (Franka Robotics), Shaowei Cui (SCUT); host TBA (mirrored across the schedule row, panel cards, and JSON-LD)
- [x] Google Search Console verified for `https://ebim-benchmark.github.io/`
- [x] SEO: per-page meta tags, JSON-LD (Event + Organization + BreadcrumbList), sitemap with 4 URLs, alt text + width/height on every img
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
