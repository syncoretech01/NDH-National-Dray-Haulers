import { gsap, qs, qsa, reduceMotion, ScrollTrigger } from './core.js';

/** 3D coverflow-style testimonial slider with drag, keyboard and autoplay */
export function initTestimonialSlider(root) {
  if (!root) return;
  const cards = qsa('.tcard', root);
  const prev = qs('[data-prev]', root.parentElement);
  const next = qs('[data-next]', root.parentElement);
  const dotsWrap = qs('.tslider__dots', root.parentElement);
  const n = cards.length;
  if (!n) return;
  let idx = 0, timer = null, inView = true;

  const dots = cards.map((_, i) => {
    const b = document.createElement('button');
    b.setAttribute('aria-label', `Show testimonial ${i + 1}`);
    b.addEventListener('click', () => go(i, true));
    dotsWrap?.appendChild(b);
    return b;
  });

  function layout(animate = true) {
    cards.forEach((card, i) => {
      let off = i - idx;
      if (off > n / 2) off -= n; if (off < -n / 2) off += n;
      const abs = Math.abs(off);
      const visible = abs <= 2;
      const props = {
        xPercent: -50 + off * 62, yPercent: -50, z: -abs * 220, rotateY: off * -18,
        opacity: visible ? 1 - abs * .35 : 0, scale: 1 - abs * .08, zIndex: 10 - abs,
        duration: animate && !reduceMotion ? 1 : 0, ease: 'expo.out', overwrite: true
      };
      gsap.to(card, props);
      card.setAttribute('aria-hidden', String(off !== 0));
      card.style.pointerEvents = visible ? 'auto' : 'none';
      card.tabIndex = off === 0 ? 0 : -1;
    });
    dots.forEach((d, i) => d.classList.toggle('is-active', i === idx));
  }

  function go(i, user = false) { idx = (i + n) % n; layout(); if (user) restart(); }
  // Autoplay used to run on a setInterval for the page's entire lifetime, animating every
  // card's 3D transform every 6s regardless of whether the slider was anywhere near the
  // viewport - a background cost that could collide with an unrelated fast scroll elsewhere
  // on the page and cause a visible stall. Gated on visibility instead.
  function restart() { clearInterval(timer); if (!reduceMotion && inView) timer = setInterval(() => go(idx + 1), 6000); }

  prev?.addEventListener('click', () => go(idx - 1, true));
  next?.addEventListener('click', () => go(idx + 1, true));
  root.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') go(idx + 1, true); if (e.key === 'ArrowLeft') go(idx - 1, true); });
  cards.forEach((c, i) => c.addEventListener('click', () => { if (i !== idx) go(i, true); }));

  // Drag / swipe
  let startX = null;
  root.addEventListener('pointerdown', (e) => { startX = e.clientX; root.setPointerCapture?.(e.pointerId); });
  root.addEventListener('pointerup', (e) => { if (startX === null) return; const dx = e.clientX - startX; startX = null; if (Math.abs(dx) > 40) go(dx < 0 ? idx + 1 : idx - 1, true); });
  root.addEventListener('pointercancel', () => (startX = null));
  root.addEventListener('mouseenter', () => clearInterval(timer));
  root.addEventListener('mouseleave', restart);

  ScrollTrigger.create({
    trigger: root, start: 'top bottom', end: 'bottom top',
    onToggle: (s) => { inView = s.isActive; if (inView) restart(); else clearInterval(timer); }
  });

  layout(false);
  restart();
}
