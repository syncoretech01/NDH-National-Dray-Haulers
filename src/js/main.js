import { initSmoothScroll, ScrollTrigger, qs } from './lib/core.js';
import { initPreloader, initTransitions, initHeader, initCursor, initFooter } from './lib/shell.js';
import { initReveals, initAccordions } from './lib/reveal.js';
import { initForms } from './lib/forms.js';

document.documentElement.classList.add('js');

const page = document.body.dataset.page || '';

async function boot() {
  initSmoothScroll();
  initHeader();
  initCursor();
  initFooter();
  initTransitions();
  initAccordions();
  initForms();

  // Page modules (code-split)
  const modules = {
    home: () => import('./pages/home.js'),
    'service-areas': () => import('./pages/service-areas.js'),
    contact: () => import('./pages/contact.js')
  };
  if (modules[page]) {
    try { const m = await modules[page](); m.default?.(); } catch (e) { console.error(`Page module "${page}" failed`, e); }
  }

  // A full ScrollTrigger.refresh() re-measures every existing trigger. Three independent
  // call sites (preloader done, fonts ready, window load) used to each fire their own,
  // tripling that cost on every page load. Debounce them into a single pass.
  let refreshTimer = null;
  const scheduleRefresh = () => {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 120);
  };

  initPreloader(() => {
    window.dispatchEvent(new Event('ndh:ready'));
    initReveals();
    scheduleRefresh();
  });

  // Fonts/late images can change layout -> recalc pinned/scroll positions once, debounced.
  document.fonts?.ready.then(scheduleRefresh);
  window.addEventListener('load', scheduleRefresh);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
