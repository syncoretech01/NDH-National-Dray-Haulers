import { gsap, qs, qsa, reduceMotion, isTouch, stopScroll, startScroll, scrollTo, getLenis } from './core.js';

/* ---------------- Preloader ---------------- */
export function initPreloader(onDone) {
  const el = qs('#preloader');
  const html = document.documentElement;
  if (!el) { onDone?.(); return; }
  const seen = sessionStorage.getItem('ndh-loaded');
  const quick = !!seen || reduceMotion;
  html.classList.add('is-loading');
  stopScroll();

  const finish = () => {
    html.classList.remove('is-loading');
    el.classList.add('is-done');
    startScroll();
    sessionStorage.setItem('ndh-loaded', '1');
    onDone?.();
  };

  const panels = qsa('.preloader__panel', el);
  const logo = qs('.preloader__logo img', el);
  const line = qs('.preloader__line span', el);
  const row = qs('.preloader__row', el);
  const count = qs('#preloader-count', el);

  if (quick) {
    gsap.set([logo, row], { opacity: 0 });
    gsap.timeline({ onComplete: () => { el.remove(); finish(); } })
      .to(panels, { yPercent: -100, duration: .8, ease: 'expo.inOut', stagger: .06 }, .1);
    return;
  }

  const progress = { v: 0 };
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.to(logo, { opacity: 1, y: 0, duration: 1 }, 0)
    .to(row, { opacity: 1, duration: .6 }, .3)
    .to(progress, {
      v: 100, duration: 1.7, ease: 'power2.inOut',
      onUpdate: () => { count.textContent = String(Math.round(progress.v)).padStart(2, '0'); }
    }, .3)
    .to(line, { scaleX: 1, duration: 1.7, ease: 'power2.inOut' }, .3)
    .to([logo, row, qs('.preloader__line', el)], { opacity: 0, y: -16, duration: .5, ease: 'power2.in' }, '+=.15')
    .add(() => finish())
    .to(panels, { yPercent: -100, duration: 1.1, ease: 'expo.inOut', stagger: .08 }, '-=.1')
    .add(() => el.remove());
}

/* ---------------- Page transitions ---------------- */
export function initTransitions() {
  const overlay = qs('#page-transition');
  if (!overlay || reduceMotion) return;
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || a.target === '_blank' || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.hash) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    gsap.timeline({ onComplete: () => { location.href = url.href; } })
      .set(overlay, { transformOrigin: 'bottom' })
      .to(overlay, { scaleY: 1, duration: .6, ease: 'expo.inOut' });
  });
  window.addEventListener('pageshow', (e) => { if (e.persisted) gsap.set(overlay, { scaleY: 0 }); });
}

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
  window.addEventListener('mousemove', (e) => { pos.x = e.clientX; pos.y = e.clientY; cursor.classList.remove('is-hidden'); }, { passive: true });
  document.addEventListener('mouseleave', () => cursor.classList.add('is-hidden'));
  gsap.ticker.add(() => {
    ringPos.x += (pos.x - ringPos.x) * .18; ringPos.y += (pos.y - ringPos.y) * .18;
    xDot(pos.x); yDot(pos.y); xRing(ringPos.x); yRing(ringPos.y);
  });
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
