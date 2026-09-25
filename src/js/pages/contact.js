import { qs, gsap, reduceMotion, onVisibility } from '../lib/core.js';

/** Stylized Virginia locator map (SVG) for the contact page */
export default function initContact() {
  const wrap = qs('#contact-map');
  if (!wrap) return;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 800 380');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Stylized map of Virginia showing NDH operating locations in Northern Virginia and Hampton Roads');
  // Simplified Virginia outline + Eastern Shore (lon/lat), equirectangular with cos(37.5) correction
  const VA = [[-83.68,36.59],[-81.68,36.59],[-80.9,36.56],[-78.0,36.54],[-75.87,36.55],[-75.97,36.93],[-76.3,37.05],[-76.5,37.25],[-76.35,37.5],[-76.55,37.7],[-76.3,37.95],[-76.6,38.2],[-77.05,38.4],[-77.05,38.75],[-77.05,38.95],[-77.35,39.06],[-77.55,39.28],[-77.85,39.4],[-78.3,39.47],[-78.6,39.1],[-79.0,38.85],[-79.5,38.45],[-79.7,38.35],[-80.0,37.95],[-80.3,37.55],[-80.9,37.3],[-81.7,37.2],[-81.97,37.53],[-82.35,37.28],[-82.7,37.1],[-83.1,36.85]];
  const SHORE = [[-76.02,37.12],[-75.95,37.55],[-75.65,37.97],[-75.25,38.03],[-75.4,37.7],[-75.75,37.35]];
  const COS = Math.cos(37.5 * Math.PI / 180), K = 800 / (9.2 * COS);
  const proj = ([lon, lat]) => [(lon + 84.2) * COS * K, (39.75 - lat) * K];
  const polys = [VA.map(proj), SHORE.map(proj)];
  const inAny = (p) => polys.some((pts) => { let ins = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if (((yi > p[1]) !== (yj > p[1])) && (p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi)) ins = !ins; } return ins; });
  // One path of zero-length round-capped segments (each renders as a dot) instead of hundreds
  // of separate <circle> nodes.
  let d = '';
  for (let y = 6; y < 380; y += 11) for (let x = 6; x < 800; x += 11) if (inAny([x, y])) d += `M${x} ${y}h0`;
  const dots = document.createElementNS(NS, 'path');
  dots.setAttribute('d', d); dots.setAttribute('fill', 'none'); dots.setAttribute('stroke', 'rgba(255,255,255,.16)'); dots.setAttribute('stroke-width', '4.4'); dots.setAttribute('stroke-linecap', 'round');
  svg.appendChild(dots);
  const pulses = [];
  const spots = [
    { name: 'Northern Virginia HQ', lon: -77.45, lat: 38.85, color: '#1aa3e3', dx: 12, dy: 18 },
    { name: 'Hampton Roads Terminals', lon: -76.33, lat: 36.9, color: '#2fb57c', dx: -14, dy: 22, anchor: 'end' },
    { name: 'Richmond Marine Terminal', lon: -77.42, lat: 37.45, color: '#ffffff' },
    { name: 'Virginia Inland Port', lon: -78.2, lat: 38.92, color: '#ffffff', dx: -12, dy: -10, anchor: 'end' }
  ];
  const [ox, oy] = proj([spots[0].lon, spots[0].lat]);
  const [hx, hy] = proj([spots[1].lon, spots[1].lat]);
  const route = document.createElementNS(NS, 'path');
  route.setAttribute('d', `M ${ox} ${oy} Q ${(ox + hx) / 2 + 40} ${(oy + hy) / 2 - 30} ${hx} ${hy}`);
  route.setAttribute('fill', 'none'); route.setAttribute('stroke', '#1aa3e3'); route.setAttribute('stroke-width', '2'); route.setAttribute('stroke-dasharray', '6 6');
  svg.appendChild(route);
  spots.forEach((s) => {
    const [x, y] = proj([s.lon, s.lat]);
    const grp = document.createElementNS(NS, 'g');
    const halo = document.createElementNS(NS, 'circle'); halo.setAttribute('cx', x); halo.setAttribute('cy', y); halo.setAttribute('r', 14); halo.setAttribute('fill', s.color); halo.setAttribute('opacity', '.2');
    const dot = document.createElementNS(NS, 'circle'); dot.setAttribute('cx', x); dot.setAttribute('cy', y); dot.setAttribute('r', 5); dot.setAttribute('fill', s.color);
    const t = document.createElementNS(NS, 'text'); t.setAttribute('x', x + (s.dx ?? 12)); t.setAttribute('y', y + (s.dy ?? 4)); if (s.anchor) t.setAttribute('text-anchor', s.anchor); t.setAttribute('fill', '#fff'); t.setAttribute('font-size', '13'); t.setAttribute('font-family', 'Inter, sans-serif'); t.setAttribute('font-weight', '600'); t.textContent = s.name;
    grp.append(halo, dot, t); svg.appendChild(grp);
    if (!reduceMotion) pulses.push(gsap.to(halo, { attr: { r: 26 }, opacity: 0, duration: 2.4, repeat: -1, ease: 'power2.out', delay: Math.random(), paused: true }));
  });
  wrap.prepend(svg);
  // The pulses repaint the SVG every frame, so only run them while the map is on screen.
  onVisibility(wrap, (vis) => pulses.forEach((tw) => (vis ? tw.play() : tw.pause())));
}
