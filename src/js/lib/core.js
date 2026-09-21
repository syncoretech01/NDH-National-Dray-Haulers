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

/** Split a text element into line-wrapped spans for masked reveals */
export function splitLines(el) {
  if (el.dataset.splitDone) return qsa('.line > span', el);
  const html = el.innerHTML.trim();
  // Preserve inline accent spans by tokenizing HTML into words
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
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
  const spans = qsa('.w', el);
  const lines = [];
  let cur = null, top = null;
  spans.forEach((s) => {
    const t = s.offsetTop;
    if (top === null || Math.abs(t - top) > 4) { top = t; cur = []; lines.push(cur); }
    cur.push(s);
  });
  el.innerHTML = '';
  lines.forEach((ln) => {
    const line = document.createElement('span'); line.className = 'line';
    const inner = document.createElement('span');
    ln.forEach((s, i) => { s.style.display = ''; inner.appendChild(s); if (i < ln.length - 1) inner.appendChild(document.createTextNode(' ')); });
    line.appendChild(inner); el.appendChild(line);
  });
  el.dataset.splitDone = '1';
  return qsa('.line > span', el);
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
