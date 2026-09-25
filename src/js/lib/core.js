import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

export const qs = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
export const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
export const isMobile = () => window.innerWidth < 900;
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;

let lenis = null;

export function initSmoothScroll() {
  if (reduceMotion) return null;
  lenis = new Lenis({
    lerp: 0.1,
    wheelMultiplier: 1,
    smoothWheel: true,
    syncTouch: false
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  document.documentElement.classList.add('lenis');

  // Anchor links scroll smoothly through Lenis
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    scrollTo(target, { offset: -90 });
    history.replaceState(null, '', id);
  });
  return lenis;
}

export function scrollTo(target, opts = {}) {
  if (lenis) lenis.scrollTo(target, { duration: 1.4, easing: (t) => 1 - Math.pow(1 - t, 4), ...opts });
  else {
    const y = typeof target === 'number' ? target : target.getBoundingClientRect().top + window.scrollY + (opts.offset || 0);
    window.scrollTo({ top: y, behavior: 'smooth' });
  }
}

export function getLenis() { return lenis; }
export function stopScroll() { lenis ? lenis.stop() : (document.documentElement.style.overflow = 'hidden'); }
export function startScroll() { lenis ? lenis.start() : (document.documentElement.style.overflow = ''); }

export { gsap, ScrollTrigger };

/**
 * Split text elements into line-wrapped spans for masked reveals. Returns one array of line
 * spans per element. Done in three passes over ALL elements (write words / read positions /
 * write lines) so the whole batch costs a single forced layout instead of one per heading.
 */
export function splitLinesAll(els) {
  const todo = els.filter((el) => !el.dataset.splitDone);
  // Pass 1 (writes): wrap every word in an inline-block span, preserving inline accent spans.
  todo.forEach((el) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = el.innerHTML.trim();
    const words = [];
    const walk = (node, wrapClass) => {
      node.childNodes.forEach((n) => {
        if (n.nodeType === 3) {
          n.textContent.split(/\s+/).filter(Boolean).forEach((w) => words.push({ w, cls: wrapClass }));
        } else if (n.nodeType === 1) {
          if (n.tagName === 'BR') words.push({ br: true });
          else walk(n, (wrapClass ? wrapClass + ' ' : '') + (n.className || ''));
        }
      });
    };
    walk(tmp, '');
    el.innerHTML = words.map((t) => t.br ? '<br>' : `<span class="w${t.cls ? ' ' + t.cls : ''}" style="display:inline-block">${t.w}</span>`).join(' ');
  });
  // Pass 2 (reads): group words into visual lines.
  const grouped = todo.map((el) => {
    const lines = [];
    let cur = null, top = null;
    qsa('.w', el).forEach((s) => {
      const t = s.offsetTop;
      if (top === null || Math.abs(t - top) > 4) { top = t; cur = []; lines.push(cur); }
      cur.push(s);
    });
    return lines;
  });
  // Pass 3 (writes): rebuild each element as masked lines.
  todo.forEach((el, k) => {
    el.innerHTML = '';
    grouped[k].forEach((ln) => {
      const line = document.createElement('span'); line.className = 'line';
      const inner = document.createElement('span');
      ln.forEach((s, i) => { s.style.display = ''; inner.appendChild(s); if (i < ln.length - 1) inner.appendChild(document.createTextNode(' ')); });
      line.appendChild(inner); el.appendChild(line);
    });
    el.dataset.splitDone = '1';
  });
  return els.map((el) => qsa('.line > span', el));
}

export const splitLines = (el) => splitLinesAll([el])[0];

/**
 * Run `cb(elements)` once for each element the first time it scrolls into view (or is already
 * above the viewport). One IntersectionObserver per call instead of a ScrollTrigger per element:
 * no forced layouts on every ScrollTrigger.refresh(), and the browser does the tracking
 * off the main thread. Elements entering together arrive in the same batch, in DOM order.
 * `bottom` is how far above the viewport's bottom edge the element's top must cross (0.12 =>
 * the old ScrollTrigger 'top 88%').
 */
export function onFirstView(els, cb, bottom = 0.12) {
  if (!els.length) return;
  const io = new IntersectionObserver((entries) => {
    const hits = entries.filter((e) => e.isIntersecting || e.boundingClientRect.bottom < 0).map((e) => e.target);
    hits.forEach((t) => io.unobserve(t));
    if (hits.length) cb(hits);
  }, { rootMargin: `0px 0px -${Math.round(bottom * 100)}% 0px` });
  els.forEach((el) => io.observe(el));
}

/** Call `cb(true|false)` whenever `el` enters/leaves the viewport (plus `margin`). */
export function onVisibility(el, cb, margin = '0px') {
  if (!el) return;
  new IntersectionObserver((entries) => entries.forEach((e) => cb(e.isIntersecting)), { rootMargin: margin }).observe(el);
}

export function toast(message, type = '') {
  let t = qs('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.className = 'toast' + (type ? ` toast--${type}` : '');
  t.textContent = message;
  requestAnimationFrame(() => t.classList.add('is-visible'));
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('is-visible'), 4200);
}
