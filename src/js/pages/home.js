import { gsap, qs, qsa, reduceMotion, onVisibility } from '../lib/core.js';
import { initTestimonialSlider } from '../lib/tslider.js';

export default function initHome() {
  // (The hero entrance is pure CSS now - see .hero__* in layout.css - so it plays from first
  // paint instead of waiting for this module to download and run.)

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
    const tick = () => {
      const row = rows[Math.floor(Math.random() * rows.length)];
      const lane = lanes[cursor++ % lanes.length];
      gsap.to(row, { opacity: 0, x: -8, duration: .3, onComplete: () => {
        qs('.lane span', row).textContent = lane[0]; qs('.miles', row).textContent = lane[1]; qs('.eta', row).textContent = lane[2];
        gsap.fromTo(row, { opacity: 0, x: 8 }, { opacity: 1, x: 0, duration: .5, ease: 'power3.out' });
      } });
    };
    // Only rotates while actually on screen (the board is display:none on phones, so there it
    // never starts at all).
    let laneTimer = null;
    onVisibility(board, (vis) => { clearInterval(laneTimer); if (vis) laneTimer = setInterval(tick, 2800); });
  }

  /* Service map: ~40KB of code plus a large SVG, nowhere near the first screen - so load and
     build it only as the visitor scrolls toward it, not during the initial page load. */
  const mapEl = qs('#service-map');
  if (mapEl) {
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      // The canvas has a fixed aspect-ratio, so inserting the SVG shifts nothing, and the map's
      // own ScrollTriggers measure themselves on creation - no global refresh (which would
      // re-measure everything mid-scroll) needed.
      import('../lib/map.js').then(({ initServiceMap }) => initServiceMap(mapEl, { legend: qs('#map-legend'), tooltip: qs('#map-tooltip') }));
    }, { rootMargin: '100% 0px' });
    io.observe(mapEl);
  }

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
}
