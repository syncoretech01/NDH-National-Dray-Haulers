import { gsap, ScrollTrigger, qs, qsa, reduceMotion, isTouch, splitLines } from './core.js';

/** Generic scroll-driven animation system, driven by data-attributes */
export function initReveals() {
  if (reduceMotion) {
    qsa('[data-reveal], [data-reveal-stagger] > *, [data-mask-reveal]').forEach((el) => { el.style.opacity = 1; el.style.transform = 'none'; el.style.clipPath = 'none'; });
    qsa('[data-split]').forEach((el) => { el.style.opacity = 1; });
    qsa('[data-counter]').forEach((el) => { el.textContent = el.dataset.counter; });
    return;
  }

  // Fade-up reveals. Batched into a small, shared set of ScrollTriggers instead of one
  // per element - with 20-40+ [data-reveal] nodes on a typical page, creating that many
  // individual ScrollTriggers each doing their own getBoundingClientRect/getComputedStyle
  // pass caused real layout thrashing (measured: 1000+ forced-layout reads on first load).
  const revealTargets = qsa('[data-reveal]');
  if (revealTargets.length) {
    ScrollTrigger.batch(revealTargets, {
      start: 'top 88%', once: true,
      // When several [data-reveal] nodes cross the threshold in the same scroll tick (common
      // in sections with multiple reveals stacked close together), starting all their
      // transform/opacity tweens in one frame promotes several compositor layers at once -
      // a measured jank spike (300ms+ single frames). A small auto-stagger (unless the
      // element already sets an explicit delay) spreads that layer-creation cost over a
      // couple of frames instead.
      onEnter: (els) => gsap.to(els, {
        opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', overwrite: true,
        delay: (i) => els[i].dataset.revealDelay ? parseFloat(els[i].dataset.revealDelay) : i * .06
      })
    });
  }

  // Staggered children
  qsa('[data-reveal-stagger]').forEach((el) => {
    gsap.to(el.children, {
      opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: parseFloat(el.dataset.revealStagger || .1),
      scrollTrigger: { trigger: el, start: 'top 85%', once: true }
    });
  });

  // Line-masked typography reveals. splitLines() still runs per-element up front (it has
  // to, regardless of scroll position), but the ScrollTrigger side is batched like above.
  const splitTargets = qsa('[data-split]');
  if (splitTargets.length) {
    const splitLinesByEl = new Map(splitTargets.map((el) => [el, splitLines(el)]));
    ScrollTrigger.batch(splitTargets, {
      start: 'top 88%', once: true,
      onEnter: (els) => els.forEach((el) => {
        gsap.to(splitLinesByEl.get(el), {
          y: 0, duration: 1.2, ease: 'expo.out', stagger: .09,
          delay: parseFloat(el.dataset.splitDelay || 0)
        });
      })
    });
  }

  // Image mask reveals. A real panel element that GSAP animates away via transform
  // (GPU-cheap, no layout forcing) - this used to animate clip-path directly, which was
  // a measured jank source when several of these fired in the same scroll frame.
  qsa('[data-mask-reveal]').forEach((el) => {
    const img = qs('img', el);
    const dir = el.dataset.maskReveal;
    const panel = document.createElement('span');
    panel.className = 'mask-reveal__panel';
    panel.style.transformOrigin = dir === 'left' ? 'right' : dir === 'right' ? 'left' : 'top';
    el.appendChild(panel);
    const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
    tl.to(panel, dir ? { scaleX: 0, duration: 1.1, ease: 'expo.inOut' } : { scaleY: 0, duration: 1.1, ease: 'expo.inOut' }, 0);
    if (img) tl.to(img, { scale: 1, duration: 1.6, ease: 'expo.out' }, .1);
    tl.set(panel, { display: 'none' });
  });

  // Parallax (image inside container moves at different speed)
  if (!isTouch) {
    qsa('[data-parallax]').forEach((el) => {
      const img = qs('img', el) || el;
      const speed = parseFloat(el.dataset.parallax || .15);
      gsap.fromTo(img, { yPercent: -speed * 100 * .5 }, {
        yPercent: speed * 100 * .5, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
  }

  // Counters
  qsa('[data-counter]').forEach((el) => {
    const target = parseFloat(el.dataset.counter);
    const decimals = (el.dataset.counter.split('.')[1] || '').length;
    const prefix = el.dataset.prefix || '', suffix = el.dataset.suffix || '';
    const obj = { v: 0 };
    el.textContent = prefix + (0).toFixed(decimals) + suffix;
    gsap.to(obj, {
      v: target, duration: 2, ease: 'power3.out',
      onUpdate: () => { el.textContent = prefix + obj.v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix; },
      scrollTrigger: { trigger: el, start: 'top 98%', once: true, onEnter: () => el.closest('.stat-tile')?.classList.add('is-in') }
    });
  });

  // Word-by-word statement highlight (scrubbed)
  qsa('[data-words]').forEach((el) => {
    const nodes = [];
    const walk = (node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((tok) => {
            if (!tok.trim()) { frag.appendChild(document.createTextNode(tok)); return; }
            const s = document.createElement('span'); s.className = 'word'; s.textContent = tok; frag.appendChild(s); nodes.push(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(el);
    ScrollTrigger.create({
      trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true,
      onUpdate: (self) => {
        const n = Math.floor(self.progress * nodes.length);
        nodes.forEach((w, i) => w.classList.toggle('is-on', i <= n));
      }
    });
  });

  // 3D tilt cards
  if (!isTouch) {
    qsa('[data-tilt]').forEach((card) => {
      const max = parseFloat(card.dataset.tilt || 8);
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        card.style.setProperty('--mx', `${px * 100}%`); card.style.setProperty('--my', `${py * 100}%`);
        gsap.to(card, { rotateY: (px - .5) * max * 2, rotateX: (.5 - py) * max * 2, transformPerspective: 1000, duration: .6, ease: 'power3.out' });
      });
      card.addEventListener('mouseleave', () => gsap.to(card, { rotateX: 0, rotateY: 0, duration: 1, ease: 'elastic.out(1, .5)' }));
    });
  }

  // Marquees
  qsa('[data-marquee]').forEach((m) => {
    const track = qs('.marquee__track', m);
    if (!track) return;
    const clone = track.cloneNode(true); clone.setAttribute('aria-hidden', 'true'); m.appendChild(clone);
    const speed = parseFloat(m.dataset.marquee || 60);
    const w = () => track.offsetWidth;
    const tween = gsap.to([track, clone], { x: () => -w(), duration: () => w() / speed, ease: 'none', repeat: -1 });
    m.addEventListener('mouseenter', () => gsap.to(tween, { timeScale: .25, duration: .6 }));
    m.addEventListener('mouseleave', () => gsap.to(tween, { timeScale: 1, duration: .6 }));
    ScrollTrigger.create({ trigger: m, start: 'top bottom', end: 'bottom top', onToggle: (s) => (s.isActive ? tween.play() : tween.pause()) });
  });

  // Timeline progress + items
  qsa('.timeline').forEach((tl) => {
    const bar = qs('.timeline__progress', tl);
    if (bar) gsap.to(bar, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: tl, start: 'top 70%', end: 'bottom 60%', scrub: true } });
    qsa('.timeline__item', tl).forEach((it) => ScrollTrigger.create({ trigger: it, start: 'top 70%', onEnter: () => it.classList.add('is-in'), onLeaveBack: () => it.classList.remove('is-in') }));
  });

  // Vertical column sliders (scroll-scrubbed, alternating directions)
  qsa('.col-slider').forEach((wrap) => {
    const cols = qsa('.col-slider__col', wrap);
    cols.forEach((col, i) => {
      const dir = i % 2 === 0 ? -1 : 1;
      const dist = col.scrollHeight - wrap.offsetHeight;
      gsap.fromTo(col, { y: dir === -1 ? 0 : -dist }, {
        y: dir === -1 ? -dist : 0, ease: 'none',
        scrollTrigger: { trigger: wrap, start: 'top bottom', end: 'bottom top', scrub: .6 }
      });
    });
  });

  // Page hero media parallax + zoom-in reveal
  qsa('.page-hero__media img, .hero__media img').forEach((img) => {
    gsap.fromTo(img, { scale: 1.12 }, { scale: 1, duration: 2.2, ease: 'expo.out', delay: .2 });
    if (!isTouch) gsap.to(img, { yPercent: 12, ease: 'none', scrollTrigger: { trigger: img.closest('section, header, div'), start: 'top top', end: 'bottom top', scrub: true } });
  });
  qsa('.driver-cta__media img').forEach((img) => {
    if (!isTouch) gsap.fromTo(img, { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: img.closest('section'), start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  // Scrollspy
  qsa('[data-spy]').forEach((nav) => {
    const links = qsa('a[href^="#"]', nav);
    links.forEach((a) => {
      const sec = qs(a.getAttribute('href'));
      if (!sec) return;
      ScrollTrigger.create({
        trigger: sec, start: 'top 45%', end: 'bottom 45%',
        onToggle: (s) => { if (s.isActive) { links.forEach((l) => l.classList.remove('is-active')); a.classList.add('is-active'); } }
      });
    });
  });
}

export function initAccordions() {
  qsa('.accordion').forEach((acc) => {
    const btns = qsa('.accordion__btn', acc);
    btns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const open = btn.getAttribute('aria-expanded') === 'true';
        if (acc.dataset.single !== 'false') btns.forEach((b) => b.setAttribute('aria-expanded', 'false'));
        btn.setAttribute('aria-expanded', String(!open));
        setTimeout(() => ScrollTrigger.refresh(), 520);
      });
    });
  });
}
