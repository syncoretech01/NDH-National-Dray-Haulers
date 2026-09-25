import { gsap, qs, qsa, reduceMotion, isTouch, stopScroll, startScroll, scrollTo } from './core.js';

// There used to be a branded preloader here (a fixed ~3.7s logo/counter/panel sequence on the
// first visit, ~0.9s on every page after) and a page-transition wipe that held every internal
// link click for 0.6s before navigating. Both were pure added latency on top of the real load,
// so they're gone: the page paints as soon as it arrives and hero content animates in with CSS.

/* ---------------- Header ---------------- */
export function initHeader() {
  const header = qs('#site-header');
  const toggle = qs('#menu-toggle');
  const menu = qs('#mobile-menu');
  if (!header) return;
  let lastY = 0, ticking = false;
  const update = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 24);
    if (!header.classList.contains('menu-open')) {
      header.classList.toggle('is-hidden', y > lastY && y > 320);
    }
    lastY = y; ticking = false;
  };
  window.addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(update); ticking = true; } }, { passive: true });
  update();

  // Active nav
  const seg = location.pathname.split('/').filter(Boolean)[0] || '';
  qsa('[data-nav]', header).forEach((a) => { if (a.dataset.nav === seg) { a.classList.add('is-active'); a.setAttribute('aria-current', 'page'); } });

  if (toggle && menu) {
    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      menu.classList.toggle('is-open', open);
      menu.setAttribute('aria-hidden', String(!open));
      header.classList.toggle('menu-open', open);
      open ? stopScroll() : startScroll();
    };
    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.classList.contains('is-open')) setOpen(false); });
    window.addEventListener('resize', () => { if (window.innerWidth > 1000 && menu.classList.contains('is-open')) setOpen(false); });
  }
}

/* ---------------- Cursor + magnetic ---------------- */
export function initCursor() {
  const cursor = qs('#cursor');
  if (!cursor || isTouch || reduceMotion) return;
  document.body.classList.add('has-cursor');
  const dot = qs('.cursor__dot', cursor);
  const ring = qs('.cursor__ring', cursor);
  const label = qs('.cursor__label', cursor);
  const pos = { x: innerWidth / 2, y: innerHeight / 2 };
  const ringPos = { x: pos.x, y: pos.y };
  const xDot = gsap.quickSetter(dot, 'x', 'px'), yDot = gsap.quickSetter(dot, 'y', 'px');
  const xRing = gsap.quickSetter(ring, 'x', 'px'), yRing = gsap.quickSetter(ring, 'y', 'px');
  // Only run the follow loop while the ring is still catching up to the pointer. It used to
  // write four transforms on every frame for the page's whole lifetime, even with the mouse
  // perfectly still, which kept style recalc + compositing busy on an otherwise idle page.
  let running = false;
  const follow = () => {
    ringPos.x += (pos.x - ringPos.x) * .18; ringPos.y += (pos.y - ringPos.y) * .18;
    xDot(pos.x); yDot(pos.y); xRing(ringPos.x); yRing(ringPos.y);
    if (Math.abs(pos.x - ringPos.x) < .1 && Math.abs(pos.y - ringPos.y) < .1) { gsap.ticker.remove(follow); running = false; }
  };
  window.addEventListener('mousemove', (e) => {
    pos.x = e.clientX; pos.y = e.clientY; cursor.classList.remove('is-hidden');
    if (!running) { running = true; gsap.ticker.add(follow); }
  }, { passive: true });
  document.addEventListener('mouseleave', () => cursor.classList.add('is-hidden'));
  const hoverSel = 'a, button, [data-cursor], input[type="checkbox"], input[type="radio"], label.choice, .tcard';
  document.addEventListener('mouseover', (e) => {
    const t = e.target.closest(hoverSel);
    const dark = e.target.closest('.section--dark, .section--navy, .hero, .page-hero, .site-footer, .process, .driver-cta, .mobile-menu, .cta-strip, .pay-card--featured, .form-side__card--dark, .trust-band, .not-found');
    cursor.classList.toggle('is-dark', !!dark);
    if (!t) { cursor.classList.remove('is-hover', 'is-label'); return; }
    const lbl = t.dataset.cursor;
    if (lbl) { label.textContent = lbl; cursor.classList.add('is-label'); cursor.classList.remove('is-hover'); }
    else { cursor.classList.add('is-hover'); cursor.classList.remove('is-label'); }
  });
  document.addEventListener('mouseout', (e) => { if (e.target.closest(hoverSel) && !e.relatedTarget?.closest(hoverSel)) cursor.classList.remove('is-hover', 'is-label'); });

  // Magnetic buttons
  qsa('[data-magnetic]').forEach((el) => {
    const strength = 0.35;
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * strength;
      const y = (e.clientY - r.top - r.height / 2) * strength;
      gsap.to(el, { x, y, duration: .5, ease: 'power3.out' });
    });
    el.addEventListener('mouseleave', () => gsap.to(el, { x: 0, y: 0, duration: .8, ease: 'elastic.out(1, .4)' }));
  });
}

/* ---------------- Footer ---------------- */
export function initFooter() {
  const y = qs('#footer-year'); if (y) y.textContent = new Date().getFullYear();
  qs('#to-top')?.addEventListener('click', () => scrollTo(0));
}
