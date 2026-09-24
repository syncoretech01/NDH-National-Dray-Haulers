import { gsap, ScrollTrigger, qs, qsa, reduceMotion } from './core.js';

/* Simplified continental US outline (lon, lat) traced clockwise, Great Lakes shorelines included */
const US = [[-124.7,48.4],[-122.7,49.0],[-95.2,49.0],[-95.2,49.4],[-94.6,48.7],[-92.0,48.6],[-89.6,48.0],[-91.5,47.5],[-92.1,46.8],[-90.8,46.7],[-89.5,46.9],[-88.0,46.9],[-87.4,46.5],[-86.0,46.7],[-84.9,46.5],[-84.6,46.2],[-84.7,45.8],[-83.4,45.0],[-83.3,44.3],[-83.9,43.7],[-82.6,43.6],[-82.5,43.0],[-82.9,42.3],[-83.3,41.8],[-81.7,41.5],[-80.0,42.2],[-79.0,42.9],[-78.9,43.3],[-77.6,43.3],[-76.2,43.5],[-76.2,44.2],[-75.0,45.0],[-71.5,45.0],[-70.3,45.9],[-69.2,47.4],[-67.8,47.1],[-67.8,45.7],[-67.0,44.8],[-68.5,44.3],[-70.0,43.7],[-70.7,43.1],[-70.8,42.6],[-70.0,41.8],[-70.0,41.5],[-71.4,41.5],[-72.9,41.2],[-74.0,40.6],[-74.1,39.6],[-75.0,38.8],[-75.1,38.4],[-76.0,37.2],[-75.9,36.9],[-75.7,36.0],[-75.5,35.2],[-76.5,34.7],[-77.9,33.9],[-79.0,33.3],[-80.8,32.0],[-81.5,30.7],[-81.3,29.8],[-80.6,28.4],[-80.1,26.8],[-80.2,25.5],[-81.2,25.2],[-81.8,26.0],[-82.7,27.6],[-82.8,28.9],[-84.0,30.1],[-85.3,29.7],[-86.5,30.4],[-88.0,30.4],[-89.4,30.2],[-89.6,29.3],[-90.3,29.1],[-91.3,29.5],[-92.5,29.6],[-93.8,29.7],[-94.8,29.4],[-96.4,28.4],[-97.2,27.6],[-97.4,26.0],[-97.2,25.9],[-99.1,26.4],[-99.5,27.5],[-100.5,28.6],[-101.4,29.8],[-102.5,29.8],[-103.1,29.0],[-104.5,29.6],[-104.9,30.6],[-106.4,31.8],[-108.2,31.8],[-111.1,31.3],[-114.8,32.5],[-117.1,32.5],[-118.5,34.0],[-120.6,34.6],[-122.4,37.2],[-124.0,40.0],[-124.4,42.0],[-124.0,44.5],[-124.0,46.3]];
const LAKE_MICHIGAN = [[-87.5,41.6],[-87.9,43.0],[-87.6,44.6],[-86.9,45.7],[-85.5,46.0],[-85.0,45.3],[-86.2,44.0],[-86.5,43.0],[-86.3,42.0]];

export const ORIGIN = { id: 'norfolk', name: 'Port of Virginia', sub: 'Norfolk / Portsmouth, VA', lon: -76.29, lat: 36.85 };

export const REGIONS = [
  { id: 'virginia', name: 'Hampton Roads & Virginia', eta: 'Same day', cities: [
    { id: 'richmond', name: 'Richmond', lon: -77.44, lat: 37.54, mi: 95, eta: 'Same day' },
    { id: 'frontroyal', name: 'Front Royal (VIP)', lon: -78.19, lat: 38.92, mi: 230, eta: 'Same day' },
    { id: 'roanoke', name: 'Roanoke', lon: -79.94, lat: 37.27, mi: 260, eta: 'Same day' }
  ]},
  { id: 'mid-atlantic', name: 'Mid-Atlantic', eta: 'Same / next day', cities: [
    { id: 'dc', name: 'Washington, DC', lon: -77.04, lat: 38.91, mi: 195, eta: 'Same day' },
    { id: 'baltimore', name: 'Baltimore', lon: -76.61, lat: 39.29, mi: 235, eta: 'Same day' },
    { id: 'harrisburg', name: 'Harrisburg', lon: -76.88, lat: 40.27, mi: 300, eta: 'Next day' },
    { id: 'philadelphia', name: 'Philadelphia', lon: -75.17, lat: 39.95, mi: 290, eta: 'Same day' }
  ]},
  { id: 'northeast', name: 'Northeast', eta: '1-2 days', cities: [
    { id: 'newark', name: 'Newark / NJ', lon: -74.17, lat: 40.73, mi: 360, eta: 'Next day' },
    { id: 'nyc', name: 'New York', lon: -73.85, lat: 40.85, mi: 380, eta: 'Next day' },
    { id: 'boston', name: 'Boston', lon: -71.06, lat: 42.36, mi: 570, eta: '2 days' }
  ]},
  { id: 'midwest', name: 'Midwest', eta: '1-2 days', cities: [
    { id: 'pittsburgh', name: 'Pittsburgh', lon: -80.0, lat: 40.44, mi: 420, eta: 'Next day' },
    { id: 'cleveland', name: 'Cleveland', lon: -81.69, lat: 41.5, mi: 560, eta: 'Next day' },
    { id: 'columbus', name: 'Columbus', lon: -82.99, lat: 39.96, mi: 540, eta: 'Next day' },
    { id: 'cincinnati', name: 'Cincinnati', lon: -84.51, lat: 39.1, mi: 600, eta: '2 days' },
    { id: 'detroit', name: 'Detroit', lon: -83.05, lat: 42.33, mi: 700, eta: '2 days' },
    { id: 'indianapolis', name: 'Indianapolis', lon: -86.16, lat: 39.77, mi: 700, eta: '2 days' },
    { id: 'louisville', name: 'Louisville', lon: -85.76, lat: 38.25, mi: 640, eta: '2 days' },
    { id: 'chicago', name: 'Chicago', lon: -87.63, lat: 41.88, mi: 880, eta: '2 days' },
    { id: 'stlouis', name: 'St. Louis', lon: -90.2, lat: 38.63, mi: 900, eta: '2 days' }
  ]},
  { id: 'southeast', name: 'Southeast', eta: '1-2 days', cities: [
    { id: 'raleigh', name: 'Raleigh', lon: -78.64, lat: 35.78, mi: 190, eta: 'Same day' },
    { id: 'greensboro', name: 'Greensboro', lon: -79.79, lat: 36.07, mi: 250, eta: 'Same day' },
    { id: 'charlotte', name: 'Charlotte', lon: -80.84, lat: 35.23, mi: 330, eta: 'Next day' },
    { id: 'nashville', name: 'Nashville', lon: -86.78, lat: 36.16, mi: 700, eta: '2 days' },
    { id: 'atlanta', name: 'Atlanta', lon: -84.39, lat: 33.75, mi: 560, eta: 'Next day' },
    { id: 'charleston', name: 'Charleston', lon: -79.93, lat: 32.78, mi: 470, eta: 'Next day' },
    { id: 'savannah', name: 'Savannah', lon: -81.1, lat: 32.08, mi: 550, eta: 'Next day' },
    { id: 'memphis', name: 'Memphis', lon: -90.05, lat: 35.15, mi: 880, eta: '2 days' }
  ]}
];

const W = 1000, H = 640;
const LON0 = -104.5, LAT1 = 47.6, K = 33.2, COS = Math.cos((38 * Math.PI) / 180);
const project = (lon, lat) => ({ x: (lon - LON0) * COS * K, y: (LAT1 - lat) * K });

function inPoly(pt, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    const inter = ((yi > pt[1]) !== (yj > pt[1])) && (pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi);
    if (inter) inside = !inside;
  }
  return inside;
}

const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, parent) => {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
};

export function initServiceMap(container, { legend, tooltip, autoplay = true } = {}) {
  if (!container) return null;
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Map of NDH drayage routes from the Port of Virginia to destinations across the eastern United States' }, container);
  const defs = el('defs', {}, svg);
  const grad = el('linearGradient', { id: 'routeGrad', gradientUnits: 'userSpaceOnUse', x1: 0, y1: 0, x2: W, y2: 0 }, defs);
  el('stop', { offset: '0%', 'stop-color': '#2fb57c' }, grad);
  el('stop', { offset: '100%', 'stop-color': '#1aa3e3' }, grad);

  // Dot matrix
  const dots = el('g', { class: 'map-dots' }, svg);
  const step = 11;
  const usProj = US.map(([lon, lat]) => { const p = project(lon, lat); return [p.x, p.y]; });
  const lakeProj = LAKE_MICHIGAN.map(([lon, lat]) => { const p = project(lon, lat); return [p.x, p.y]; });
  for (let y = 6; y < H; y += step) {
    for (let x = 6; x < W; x += step) {
      if (inPoly([x, y], usProj) && !inPoly([x, y], lakeProj)) el('circle', { cx: x, cy: y, r: 2.1, class: 'map-dot' }, dots);
    }
  }

  const o = project(ORIGIN.lon, ORIGIN.lat);
  const routesG = el('g', { class: 'map-routes' }, svg);
  const citiesG = el('g', { class: 'map-cities' }, svg);
  const routes = [];

  REGIONS.forEach((region) => {
    region.cities.forEach((c) => {
      const p = project(c.lon, c.lat);
      const mx = (o.x + p.x) / 2, my = (o.y + p.y) / 2;
      const dx = p.x - o.x, dy = p.y - o.y;
      const len = Math.hypot(dx, dy) || 1;
      const bend = Math.min(90, len * .18) * (p.y < o.y ? -1 : 1) * (p.x < o.x ? 1 : -1);
      const cx = mx + (-dy / len) * bend, cy = my + (dx / len) * bend;
      const d = `M ${o.x} ${o.y} Q ${cx} ${cy} ${p.x} ${p.y}`;
      el('path', { d, class: 'map-route map-route--ghost' }, routesG);
      const path = el('path', { d, class: 'map-route', 'data-region': region.id, 'data-city': c.id }, routesG);
      // Approximate quadratic-bezier arc length instead of path.getTotalLength(): that call
      // forces a synchronous layout, and doing it 25+ times right after each path is inserted
      // (read immediately after write, in a loop) was measurably thrashing layout on load.
      // (chord + control-polygon) / 2 is a standard, visually indistinguishable approximation
      // for a dash-draw reveal - exact length isn't needed here.
      const L = (Math.hypot(cx - o.x, cy - o.y) + Math.hypot(p.x - cx, p.y - cy) + Math.hypot(p.x - o.x, p.y - o.y)) / 2;
      path.style.strokeDasharray = L; path.style.strokeDashoffset = L;
      routes.push({ path, L, city: c, region: region.id, p, ox: o.x, oy: o.y, cx, cy });

      const g = el('g', { class: 'map-city', 'data-city': c.id, 'data-region': region.id, tabindex: '0', role: 'button', 'aria-label': `${c.name}: ${c.mi} miles, ${c.eta}` }, citiesG);
      el('circle', { cx: p.x, cy: p.y, r: 9, class: 'halo' }, g);
      el('circle', { cx: p.x, cy: p.y, r: 3.6, class: 'pin' }, g);
      const anchor = p.x > o.x + 40 ? 'start' : (p.x < o.x - 40 ? 'end' : 'middle');
      const t = el('text', { x: p.x + (anchor === 'start' ? 10 : anchor === 'end' ? -10 : 0), y: p.y + (anchor === 'middle' ? -12 : 4), 'text-anchor': anchor }, g);
      t.textContent = c.name.replace(' (VIP)', '');
      const show = () => showTip(c, p);
      g.addEventListener('mouseenter', show); g.addEventListener('focus', show);
      g.addEventListener('mouseleave', hideTip); g.addEventListener('blur', hideTip);
      g.addEventListener('click', () => runTruck(c.id));
    });
  });

  // Origin marker
  const og = el('g', { class: 'map-origin' }, svg);
  el('circle', { cx: o.x, cy: o.y, r: 10, class: 'ring' }, og);
  el('circle', { cx: o.x, cy: o.y, r: 10, class: 'ring' }, og);
  el('circle', { cx: o.x, cy: o.y, r: 10, class: 'ring' }, og);
  el('circle', { cx: o.x, cy: o.y, r: 6, class: 'core' }, og);
  const ot = el('text', { x: o.x + 14, y: o.y + 22 }, og); ot.textContent = 'PORT OF VIRGINIA';

  // Truck marker
  const truck = el('g', { class: 'map-truck', opacity: 0 }, svg);
  el('circle', { r: 5 }, truck);
  el('circle', { r: 10, fill: 'rgba(26,163,227,.25)' }, truck);

  function showTip(c, p) {
    if (!tooltip) return;
    const r = container.getBoundingClientRect();
    tooltip.style.left = `${(p.x / W) * r.width}px`;
    tooltip.style.top = `${(p.y / H) * r.height}px`;
    tooltip.innerHTML = `<strong>${c.name}</strong><span>${c.mi} mi &middot; ${c.eta}</span>`;
    tooltip.classList.add('is-visible');
  }
  function hideTip() { tooltip?.classList.remove('is-visible'); }

  let truckTween = null;
  function runTruck(cityId) {
    const r = routes.find((x) => x.city.id === cityId);
    if (!r || reduceMotion) return;
    truckTween?.kill();
    qsa('.map-city', svg).forEach((g) => g.classList.toggle('is-active', g.dataset.city === cityId));
    const prog = { t: 0 };
    gsap.set(truck, { opacity: 1 });
    truckTween = gsap.to(prog, {
      t: 1, duration: Math.max(1.4, r.L / 220), ease: 'power2.inOut',
      onUpdate: () => {
        // Direct quadratic-bezier evaluation instead of path.getPointAtLength(): that method
        // also forces a synchronous layout, and this runs on every animation frame (not once),
        // so it was a much bigger real-world jank source than the one-time route setup above.
        const t = prog.t, it = 1 - t;
        const x = it * it * r.ox + 2 * it * t * r.cx + t * t * r.p.x;
        const y = it * it * r.oy + 2 * it * t * r.cy + t * t * r.p.y;
        truck.setAttribute('transform', `translate(${x}, ${y})`);
      },
      onComplete: () => gsap.to(truck, { opacity: 0, duration: .5, delay: .3 })
    });
  }

  function highlightRegion(regionId) {
    routes.forEach((r) => { gsap.to(r.path, { opacity: !regionId || r.region === regionId ? .95 : .15, strokeWidth: regionId && r.region === regionId ? 3 : 2, duration: .5 }); });
    qsa('.map-city', svg).forEach((g) => gsap.to(g, { opacity: !regionId || g.dataset.region === regionId ? 1 : .3, duration: .5 }));
    if (legend) qsa('.map-legend__item', legend).forEach((b) => b.classList.toggle('is-active', b.dataset.region === regionId));
  }

  // Draw routes on enter
  let drawn = false;
  const draw = () => {
    if (drawn) return; drawn = true;
    const sorted = [...routes].sort((a, b) => a.L - b.L);
    const tl = gsap.timeline({ onComplete: () => { if (autoplay) cycle(); } });
    sorted.forEach((r, i) => tl.to(r.path, { strokeDashoffset: 0, duration: 1.2, ease: 'power2.out' }, i * .06));
    tl.fromTo(qsa('.map-city', svg), { opacity: 0 }, { opacity: 1, duration: .5, stagger: .03 }, .4);
  };
  if (reduceMotion) { routes.forEach((r) => (r.path.style.strokeDashoffset = 0)); }
  else ScrollTrigger.create({ trigger: container, start: 'top 75%', once: true, onEnter: draw });

  // Auto cycle through regions while in view
  let cycleTimer = null, cycleIdx = 0, active = false;
  function cycle() {
    clearTimeout(cycleTimer);
    if (!active) return;
    const region = REGIONS[cycleIdx % REGIONS.length];
    highlightRegion(region.id);
    const city = region.cities[Math.floor(Math.random() * region.cities.length)];
    runTruck(city.id);
    cycleIdx++;
    cycleTimer = setTimeout(cycle, 3600);
  }
  ScrollTrigger.create({ trigger: container, start: 'top 85%', end: 'bottom 15%', onToggle: (s) => { active = s.isActive; if (active && drawn && autoplay) cycle(); else clearTimeout(cycleTimer); } });

  // Legend interactions
  if (legend) {
    qsa('.map-legend__item', legend).forEach((b) => {
      b.addEventListener('mouseenter', () => { clearTimeout(cycleTimer); highlightRegion(b.dataset.region); });
      b.addEventListener('click', () => { clearTimeout(cycleTimer); highlightRegion(b.dataset.region); const region = REGIONS.find((r) => r.id === b.dataset.region); runTruck(region.cities[0].id); });
      b.addEventListener('mouseleave', () => { if (active && autoplay) cycleTimer = setTimeout(cycle, 1800); });
    });
  }

  return { svg, highlightRegion, runTruck, routes };
}
