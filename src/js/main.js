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

  initPreloader(() => {
    window.dispatchEvent(new Event('ndh:ready'));
    initReveals();
    ScrollTrigger.refresh();
  });

  // Fonts loaded -> recalc pinned/scroll positions
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener('load', () => setTimeout(() => ScrollTrigger.refresh(), 200));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
