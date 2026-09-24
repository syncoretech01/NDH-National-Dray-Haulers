import { gsap, ScrollTrigger, qs, qsa, reduceMotion, isTouch } from '../lib/core.js';
import { initServiceMap } from '../lib/map.js';
import { initTestimonialSlider } from '../lib/tslider.js';

export default function initHome() {
  /* Hero text entrance (after preloader) */
  const heroTl = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });
  heroTl.from('.hero__badges .badge', { y: 16, opacity: 0, duration: .8, stagger: .08 }, 0)
    .from('.hero__lead', { y: 24, opacity: 0, duration: 1 }, .5)
    .from('.hero__actions > *', { y: 20, opacity: 0, duration: .9, stagger: .08 }, .65)
    .from('.lane-board', { y: 30, opacity: 0, duration: 1.1 }, .5)
    .from('.hero__stat', { y: 20, opacity: 0, duration: .9, stagger: .07 }, .8);
  const startHero = () => { heroTl.play(); qs('.hero__title')?.dispatchEvent(new Event('ndh:split-play')); };
  if (document.documentElement.classList.contains('is-loading')) window.addEventListener('ndh:ready', startHero, { once: true });
  else startHero();

  /* Lane board: rotate visible lanes */
  const board = qs('.lane-board');
  if (board && !reduceMotion) {
    const lanes = [
      ['NIT → Richmond, VA', '95 mi', 'Same day'], ['VIG → Washington, DC', '195 mi', 'Same day'], ['PMT → Baltimore, MD', '235 mi', 'Same day'],
      ['NIT → Charlotte, NC', '330 mi', 'Next day'], ['VIG → Philadelphia, PA', '290 mi', 'Same day'], ['NIT → Columbus, OH', '540 mi', 'Next day'],
      ['VIG → Newark, NJ', '360 mi', 'Next day'], ['NIT → Chicago, IL', '880 mi', '2 days'], ['PMT → Pittsburgh, PA', '420 mi', 'Next day'], ['VIP → Front Royal, VA', '230 mi', 'Same day']
    ];
    const rows = qsa('.lane-board__row', board);
    let cursor = rows.length;
    setInterval(() => {
      const row = rows[Math.floor(Math.random() * rows.length)];
      const lane = lanes[cursor++ % lanes.length];
      gsap.to(row, { opacity: 0, x: -8, duration: .3, onComplete: () => {
        qs('.lane span', row).textContent = lane[0]; qs('.miles', row).textContent = lane[1]; qs('.eta', row).textContent = lane[2];
        gsap.fromTo(row, { opacity: 0, x: 8 }, { opacity: 1, x: 0, duration: .5, ease: 'power3.out' });
      } });
    }, 2800);
  }

  /* Service map */
  initServiceMap(qs('#service-map'), { legend: qs('#map-legend'), tooltip: qs('#map-tooltip') });

  /* Horizontal process section */
  const process = qs('.process');
  if (process) {
    const track = qs('.process__track', process);
    const progress = qs('.process__progress span', process);
    const build = () => {
      if (window.innerWidth < 900) return;
      // Cache the track width instead of reading track.scrollWidth from a function-based
      // tween value: GSAP re-invokes that function on every scrub frame, so reading
      // scrollWidth there was forcing a synchronous layout dozens of times a second while
      // scrolling through this section (measured as the single worst scroll-jank spike
      // on the page). invalidateOnRefresh + onRefreshInit keeps it correct across resizes.
      let d = track.scrollWidth - window.innerWidth;
      const tween = gsap.to(track, {
        x: () => -d, ease: 'none',
        scrollTrigger: {
          trigger: process, start: 'top top', end: () => `+=${d + window.innerHeight * .4}`,
          pin: qs('.process__pin', process), scrub: .8, invalidateOnRefresh: true, anticipatePin: 1,
          onRefreshInit: () => { d = track.scrollWidth - window.innerWidth; },
          onUpdate: (s) => progress && gsap.set(progress, { scaleX: s.progress })
        }
      });
      qsa('.process__step', process).forEach((step) => {
        gsap.from(step, { y: 60, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: step, containerAnimation: tween, start: 'left 95%', once: true } });
      });
    };
    build();
  }

  /* Testimonials */
  initTestimonialSlider(qs('#tslider'));

  /* Service cards: subtle reveal on scroll (desktop). Batched instead of one ScrollTrigger
     per card - six individual triggers here were part of a page-load layout-thrashing issue. */
  const serviceCards = qsa('.service-card');
  if (!isTouch && serviceCards.length) {
    gsap.set(serviceCards, { y: 50, opacity: 0 });
    ScrollTrigger.batch(serviceCards, {
      start: 'top 90%', once: true,
      onEnter: (els) => gsap.to(els, { y: 0, opacity: 1, duration: 1, ease: 'power3.out', stagger: .06, overwrite: true })
    });
  }
}
