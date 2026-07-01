/* ============================================================
   EBiM Benchmark — Main JS
   ============================================================ */

(function () {
  'use strict';

  /* ── Navbar scroll effect ── */
  const navbar = document.getElementById('navbar');
  const onScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ── Mobile hamburger toggle ── */
  const toggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');

  const closeAllDropdowns = () => {
    document.querySelectorAll('.has-dropdown.expanded').forEach(li => li.classList.remove('expanded'));
    document.querySelectorAll('.dropdown-toggle[aria-expanded="true"]')
      .forEach(b => b.setAttribute('aria-expanded', 'false'));
  };

  if (toggle && navLinks) {
    toggle.addEventListener('click', () => {
      const open = navLinks.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open);
      if (!open) closeAllDropdowns();
    });

    // Close drawer (and any expanded sub-menu) when a link is tapped
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        closeAllDropdowns();
      });
    });
  }

  /* ── Mobile dropdown toggles ──
     Each .dropdown-toggle button toggles the .expanded class on its parent
     <li class="has-dropdown">. The button is hidden on desktop via CSS;
     desktop hover/focus-within still opens dropdowns independently. */
  document.querySelectorAll('.has-dropdown .dropdown-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const li = btn.closest('.has-dropdown');
      if (!li) return;
      const wasExpanded = li.classList.contains('expanded');
      // Collapse sibling dropdowns first (one open at a time)
      closeAllDropdowns();
      if (!wasExpanded) {
        li.classList.add('expanded');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* ── Active link on scroll (navbar dropdowns + TOC sidebar) ──
     Matches any link whose href ENDS with `#<sectionId>`, so this works for
     bare anchors (`#why`), cross-page hrefs (`competition.html#why`) used in
     the shared dropdowns, and the on-page TOC sidebar's `#why` links. */
  const sections = document.querySelectorAll('section[id]');
  const trackedAnchors = document.querySelectorAll(
    '.nav-links a[href*="#"], .toc-sidebar a[href^="#"]'
  );

  const markActive = () => {
    const y = window.scrollY + 100;
    sections.forEach(sec => {
      const top = sec.offsetTop;
      const bot = top + sec.offsetHeight;
      if (y >= top && y < bot) {
        trackedAnchors.forEach(a => a.classList.remove('active'));
        document
          .querySelectorAll(
            `.nav-links a[href$="#${sec.id}"], .toc-sidebar a[href="#${sec.id}"]`
          )
          .forEach(a => a.classList.add('active'));
      }
    });
  };
  window.addEventListener('scroll', markActive, { passive: true });
  markActive();  // Set initial state on page load

  /* ── On-page TOC sidebar — only visible after the sub-hero is scrolled past ──
     The sidebar is fixed-position and hidden by default via CSS. When the user
     scrolls past the bottom of the .subhero section (with a small buffer for
     a smoother handoff), we add `.is-visible` to fade it in. */
  const subhero = document.querySelector('section.subhero');
  const tocSidebar = document.querySelector('.toc-sidebar');
  if (subhero && tocSidebar) {
    const updateTocVisibility = () => {
      const subheroBottom = subhero.offsetTop + subhero.offsetHeight;
      tocSidebar.classList.toggle('is-visible', window.scrollY >= subheroBottom - 100);
    };
    window.addEventListener('scroll', updateTocVisibility, { passive: true });
    updateTocVisibility();
  }

  /* ── Back to top ── */
  const btt = document.getElementById('back-to-top');
  if (btt) {
    const toggleBtt = () => btt.classList.toggle('visible', window.scrollY > 500);
    window.addEventListener('scroll', toggleBtt, { passive: true });
    btt.addEventListener('click', () => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }));
  }

  /* ── Intersection Observer fade-in ── */
  const fadeEls = document.querySelectorAll('.fade-in');
  if ('IntersectionObserver' in window && fadeEls.length) {
    const io = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          io.unobserve(e.target);
        }
      }),
      { threshold: 0.12 }
    );
    fadeEls.forEach(el => io.observe(el));
  } else {
    fadeEls.forEach(el => el.classList.add('visible'));
  }
})();
