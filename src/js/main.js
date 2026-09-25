import { initSmoothScroll, ScrollTrigger } from './lib/core.js';
import { initHeader, initCursor, initFooter } from './lib/shell.js';
import { initReveals, initAccordions } from './lib/reveal.js';
import { initForms } from './lib/forms.js';

document.documentElement.classList.add('js');

const page = document.body.dataset.page || '';

function boot() {
  initSmoothScroll();
  initHeader();
  initCursor();
  initFooter();
  initAccordions();
  initForms();
  // [data-reveal] content is CSS-hidden as soon as the .js class lands, and initReveals() is
  // what brings it back - so it runs immediately, never behind a loading screen or the page
  // module below. Hero content isn't part of this at all: it animates in with pure CSS from
  // first paint (see .hero / .page-hero in layout.css), so it never waits on JavaScript.
  initReveals();

  // A full ScrollTrigger.refresh() re-measures every trigger (forced layouts on each). Late
  // fonts/images and the page module can each shift layout, so coalesce them into one pass.
  let refreshTimer = null;
  const scheduleRefresh = () => {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 200);
  };

  // Page modules (code-split)
  const modules = {
    home: () => import('./pages/home.js'),
    'service-areas': () => import('./pages/service-areas.js'),
    contact: () => import('./pages/contact.js')
  };
  modules[page]?.()
    .then((m) => { m.default?.(); scheduleRefresh(); })
    .catch((e) => console.error(`Page module "${page}" failed`, e));

  document.fonts?.ready.then(scheduleRefresh);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
