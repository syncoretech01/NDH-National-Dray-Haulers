import { qs, qsa, gsap } from '../lib/core.js';
import { initServiceMap, REGIONS } from '../lib/map.js';

export default function initServiceAreas() {
  const map = initServiceMap(qs('#service-map'), { legend: qs('#map-legend'), tooltip: qs('#map-tooltip'), autoplay: true });
  if (!map) return;
  // Region cards highlight their routes when hovered / focused
  qsa('.region-card').forEach((card) => {
    const region = REGIONS.find((r) => r.id === card.id);
    if (!region) return;
    card.addEventListener('mouseenter', () => map.highlightRegion(region.id));
    card.addEventListener('mouseleave', () => map.highlightRegion(null));
    qsa('[data-city]', card).forEach((li) => {
      li.addEventListener('mouseenter', () => map.runTruck(li.dataset.city));
    });
  });
  // "Fly to" links scroll to map and run a lane
  qsa('[data-lane]').forEach((b) => b.addEventListener('click', () => {
    map.runTruck(b.dataset.lane);
    gsap.to(window, { duration: .1 });
  }));
}
