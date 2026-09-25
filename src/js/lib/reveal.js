import { gsap, ScrollTrigger, qs, qsa, reduceMotion, isTouch, splitLinesAll, onFirstView, onVisibility } from './core.js';

/** Generic scroll-driven animation system, driven by data-attributes */
export function initReveals() {
  // Hero content has its own CSS entrance (layout.css) and must never wait on JS, and anything
  // already on screen when this runs has been painted visible - hiding it now just to fade it
  // back in reads as a flicker/delay. Strip the reveal hooks from both so they stay put; only
  // content below the fold gets the scroll-in treatment.
  // All reads first, then all writes: one layout pass total.
  const vh = window.innerHeight;
  const hooks = ['data-reveal', 'data-reveal-stagger', 'data-split', 'data-mask-reveal'];
  const onScreen = qsa(hooks.map((a) => `[${a}]`).join(','))
    .filter((el) => el.closest('.hero, .page-hero') || el.getBoundingClientRect().top < vh);
  onScreen.forEach((el) => hooks.forEach((a) => el.removeAttribute(a)));

  if (reduceMotion) {
    qsa('[data-reveal], [data-reveal-stagger], [data-split]').forEach((el) => el.classList.add('is-in'));
    qsa('[data-counter]').forEach((el) => { el.textContent = format(el, parseFloat(el.dataset.counter)); });
    qsa('.stat-tile').forEach((el) => el.classList.add('is-in'));
    return;
  }

  // Fade-up reveals: CSS animation (see layout.css), JS only flips the class. When several
  // cross the threshold together, a small auto-stagger keeps them from all starting on the
  // same frame, unless the element sets its own data-reveal-delay.
  onFirstView(qsa('[data-reveal]'), (els) => els.forEach((el, i) => {
    el.style.animationDelay = `${el.dataset.revealDelay ? parseFloat(el.dataset.revealDelay) : i * .06}s`;
    el.classList.add('is-in');
  }));

  // Staggered children
  onFirstView(qsa('[data-reveal-stagger]'), (els) => els.forEach((el) => {
    const step = parseFloat(el.dataset.revealStagger || .1);
    Array.from(el.children).forEach((c, i) => { c.style.animationDelay = `${i * step}s`; });
    el.classList.add('is-in');
  }), .15);

  // Line-masked typography reveals. Splitting measures line breaks, so wait for the web fonts
  // (otherwise lines are computed with fallback-font metrics); everything split here is below
  // the fold, so nothing visible waits on this.
  const splitTargets = qsa('[data-split]');
  if (splitTargets.length) {
    const fontsReady = Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 2500))]);
    fontsReady.then(() => {
      const lines = splitLinesAll(splitTargets);
      splitTargets.forEach((el, k) => {
        const delay = parseFloat(el.dataset.splitDelay || 0);
        lines[k].forEach((span, i) => { span.style.animationDelay = `${delay + i * .09}s`; });
      });
      onFirstView(splitTargets, (els) => els.forEach((el) => el.classList.add('is-in')));
    });
  }

  // Image mask reveals. A real panel element that GSAP animates away via transform
  // (GPU-cheap, no layout forcing).
  const masks = qsa('[data-mask-reveal]');
  masks.forEach((el) => {
    const panel = document.createElement('span');
    panel.className = 'mask-reveal__panel';
    const dir = el.dataset.maskReveal;
    panel.style.transformOrigin = dir === 'left' ? 'right' : dir === 'right' ? 'left' : 'top';
    el.appendChild(panel);
  });
  onFirstView(masks, (els) => els.forEach((el) => {
    const img = qs('img', el);
    const panel = qs('.mask-reveal__panel', el);
    const tl = gsap.timeline();
    tl.to(panel, el.dataset.maskReveal ? { scaleX: 0, duration: 1.1, ease: 'expo.inOut' } : { scaleY: 0, duration: 1.1, ease: 'expo.inOut' }, 0);
    if (img) tl.to(img, { scale: 1, duration: 1.6, ease: 'expo.out' }, .1);
    tl.set(panel, { display: 'none' });
  }), .15);

  // Parallax (image inside container moves at different speed) - scrubbed, so ScrollTrigger
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

  // Counters. The real figure is in the HTML (so it's right even before/without JS); count up
  // from zero once scrolled into view. (Hero stats fade in with a CSS delay, so by the time
  // they're visible this has already reset them.)
  const counters = qsa('[data-counter]');
  counters.forEach((el) => { el.textContent = format(el, 0); });
  onFirstView(counters, (els) => els.forEach((el) => {
    el.closest('.stat-tile')?.classList.add('is-in');
    const obj = { v: 0 };
    gsap.to(obj, { v: parseFloat(el.dataset.counter), duration: 2, ease: 'power3.out', onUpdate: () => { el.textContent = format(el, obj.v); } });
  }), .02);

  // Word-by-word statement highlight (scrubbed). Only touch the words whose state changed -
  // this used to re-toggle every word's class on every scroll update.
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
    let lit = -1;
    ScrollTrigger.create({
      trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true,
      onUpdate: (self) => {
        const n = Math.min(nodes.length - 1, Math.floor(self.progress * nodes.length));
        if (n === lit) return;
        const [a, b] = n > lit ? [lit + 1, n] : [n + 1, lit];
        for (let i = Math.max(0, a); i <= b; i++) nodes[i].classList.toggle('is-on', i <= n);
        lit = n;
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
        gsap.to(card, { rotateY: (px - .5) * max * 2, rotateX: (.5 - py) * max * 2, transformPerspective: 1000, duration: .6, ease: 'power3.out', overwrite: 'auto' });
      });
      card.addEventListener('mouseleave', () => gsap.to(card, { rotateX: 0, rotateY: 0, duration: 1, ease: 'elastic.out(1, .5)', overwrite: 'auto' }));
    });
  }

  // Marquees: a pure CSS animation (components.css), paused while off screen. Hover slows it
  // via the Web Animations API, which keeps it on the compositor.
  qsa('[data-marquee]').forEach((m) => {
    const track = qs('.marquee__track', m);
    if (!track) return;
    const inner = document.createElement('div');
    inner.className = 'marquee__inner';
    const clone = track.cloneNode(true); clone.setAttribute('aria-hidden', 'true');
    m.appendChild(inner); inner.append(track, clone);
    const speed = parseFloat(m.dataset.marquee || 60);
    const setDur = () => inner.style.setProperty('--marquee-dur', `${track.offsetWidth / speed}s`);
    document.fonts?.ready.then(setDur) ?? setDur();
    const rate = (r) => inner.getAnimations?.().forEach((a) => a.updatePlaybackRate(r));
    m.addEventListener('mouseenter', () => rate(.25));
    m.addEventListener('mouseleave', () => rate(1));
    onVisibility(m, (vis) => m.classList.toggle('is-paused', !vis));
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

  // Hero media parallax (the zoom-in entrance is CSS now - see .hero__media in layout.css)
  if (!isTouch) {
    qsa('.page-hero__media img, .hero__media img').forEach((img) => {
      gsap.to(img, { yPercent: 12, ease: 'none', scrollTrigger: { trigger: img.closest('section, header, div'), start: 'top top', end: 'bottom top', scrub: true } });
    });
    qsa('.driver-cta__media img').forEach((img) => {
      gsap.fromTo(img, { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: img.closest('section'), start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  }

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

// toLocaleString(locale, options) builds a fresh Intl.NumberFormat on every call - and this runs
// every animation frame for every counter. Build one formatter per precision and reuse it.
const formatters = new Map();
function format(el, v) {
  const decimals = (el.dataset.counter.split('.')[1] || '').length;
  if (!formatters.has(decimals)) formatters.set(decimals, new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }));
  return (el.dataset.prefix || '') + formatters.get(decimals).format(v) + (el.dataset.suffix || '');
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
