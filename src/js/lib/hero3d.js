import * as THREE from 'three';
import { gsap, ScrollTrigger, reduceMotion } from './core.js';

const NAVY = 0x1b2433, CYAN = 0x1aa3e3, GREEN = 0x2fb57c, WHITE = 0xf3f6f9, STEEL = 0x2a3547, RUBBER = 0x0f141c;

function box(w, h, d, mat, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  if (parent) parent.add(m);
  return m;
}

function wheel(r, wdt, mat, x, y, z, parent) {
  const g = new THREE.CylinderGeometry(r, r, wdt, 28);
  g.rotateX(Math.PI / 2);
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y, z);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * .45, r * .45, wdt + .02, 16).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xc9d1dc, metalness: .8, roughness: .35 }));
  m.add(hub);
  parent.add(m);
  return m;
}

export function initHero3D(canvas) {
  if (!canvas) return null;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 200);
  camera.position.set(16, 8, 34);

  // Lights: cool key, cyan + green rims (brand)
  scene.add(new THREE.HemisphereLight(0xdfe8f2, 0x0b1220, .9));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(8, 14, 10); scene.add(key);
  const rimC = new THREE.PointLight(CYAN, 60, 60, 1.6); rimC.position.set(-12, 6, -6); scene.add(rimC);
  const rimG = new THREE.PointLight(GREEN, 50, 60, 1.6); rimG.position.set(12, 4, 10); scene.add(rimG);

  const mWhite = new THREE.MeshStandardMaterial({ color: WHITE, metalness: .25, roughness: .35 });
  const mNavy = new THREE.MeshStandardMaterial({ color: NAVY, metalness: .35, roughness: .5 });
  const mSteel = new THREE.MeshStandardMaterial({ color: STEEL, metalness: .7, roughness: .45 });
  const mRubber = new THREE.MeshStandardMaterial({ color: RUBBER, metalness: .1, roughness: .9 });
  const mGlass = new THREE.MeshStandardMaterial({ color: 0x0b1220, metalness: .9, roughness: .1 });
  const mCyan = new THREE.MeshStandardMaterial({ color: CYAN, emissive: CYAN, emissiveIntensity: .35, roughness: .4 });
  const mGreen = new THREE.MeshStandardMaterial({ color: GREEN, emissive: GREEN, emissiveIntensity: .35, roughness: .4 });

  const rig = new THREE.Group();
  scene.add(rig);

  /* ---- Container (40') ---- */
  const container = new THREE.Group();
  const CL = 12.2, CH = 2.6, CW = 2.44;
  box(CL, CH, CW, mNavy, 0, CH / 2, 0, container);
  // Corrugation ribs on both long sides
  const ribGeo = new THREE.BoxGeometry(.16, CH - .3, .06);
  const ribs = new THREE.InstancedMesh(ribGeo, mNavy.clone(), 2 * 40);
  const dummy = new THREE.Object3D();
  let i = 0;
  for (let side = -1; side <= 1; side += 2) {
    for (let k = 0; k < 40; k++) {
      dummy.position.set(-CL / 2 + .3 + k * ((CL - .6) / 39), CH / 2, side * (CW / 2 + .03));
      dummy.updateMatrix(); ribs.setMatrixAt(i++, dummy.matrix);
    }
  }
  container.add(ribs);
  // Corner castings
  [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => {
    box(.3, .3, .3, mSteel, sx * (CL / 2 - .12), .15, sz * (CW / 2 - .12), container);
    box(.3, .3, .3, mSteel, sx * (CL / 2 - .12), CH - .15, sz * (CW / 2 - .12), container);
  });
  // Door end details + brand stripe
  box(.06, CH - .4, .1, mSteel, CL / 2 + .02, CH / 2, -.5, container);
  box(.06, CH - .4, .1, mSteel, CL / 2 + .02, CH / 2, .5, container);
  box(CL * .42, .16, .05, mCyan, -CL * .2, .55, CW / 2 + .07, container);
  box(CL * .42, .16, .05, mGreen, CL * .22, .55, CW / 2 + .07, container);
  box(CL * .42, .16, .05, mCyan, CL * .2, .55, -CW / 2 - .07, container);
  box(CL * .42, .16, .05, mGreen, -CL * .22, .55, -CW / 2 - .07, container);
  // Edge glow lines
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(CL + .02, CH + .02, CW + .02)), new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: .55 }));
  edges.position.y = CH / 2; container.add(edges);
  container.position.y = 1.35;
  rig.add(container);

  /* ---- Chassis ---- */
  const chassis = new THREE.Group();
  box(CL + .4, .22, .18, mSteel, 0, 1.05, -.55, chassis);
  box(CL + .4, .22, .18, mSteel, 0, 1.05, .55, chassis);
  for (let x = -5.6; x <= 5.6; x += 1.6) box(.12, .16, 1.3, mSteel, x, 1.05, 0, chassis);
  // Bogie (tandem axles) at rear
  [-4.2, -5.5].forEach((ax) => {
    box(.12, .12, 2.3, mSteel, ax, .55, 0, chassis);
    [-1.05, -.8, .8, 1.05].forEach((z) => wheel(.52, .3, mRubber, ax, .52, z, chassis));
    box(.5, .5, .4, mSteel, ax, .8, -.55, chassis); box(.5, .5, .4, mSteel, ax, .8, .55, chassis);
  });
  // Landing gear
  box(.1, .7, .1, mSteel, 2.4, .6, -.6, chassis); box(.1, .7, .1, mSteel, 2.4, .6, .6, chassis);
  // Twist-lock posts
  [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => box(.28, .16, .28, mSteel, sx * (CL / 2 - .12), 1.24, sz * .95, chassis));
  // Rear light bar
  box(.06, .12, 1.8, mSteel, -CL / 2 - .2, 1.05, 0, chassis);
  box(.04, .1, .25, new THREE.MeshStandardMaterial({ color: 0xff3b3b, emissive: 0xff2222, emissiveIntensity: .8 }), -CL / 2 - .24, 1.05, -.7, chassis);
  box(.04, .1, .25, new THREE.MeshStandardMaterial({ color: 0xff3b3b, emissive: 0xff2222, emissiveIntensity: .8 }), -CL / 2 - .24, 1.05, .7, chassis);
  rig.add(chassis);

  /* ---- Tractor (day cab) ---- */
  const tractor = new THREE.Group();
  const TX = CL / 2 + 1.4; // front of chassis
  box(3.0, .3, 1.1, mSteel, TX + .2, 1.0, 0, tractor); // frame
  box(2.2, 2.4, 2.45, mWhite, TX + .2, 2.35, 0, tractor); // cab
  box(1.7, 1.4, 2.3, mWhite, TX + 2.0, 1.85, 0, tractor); // hood
  box(1.75, .2, 2.35, mNavy, TX + 2.0, 2.58, 0, tractor); // hood top stripe
  box(.06, 1.0, 2.1, mGlass, TX + 1.32, 2.85, 0, tractor); // windshield
  box(.05, .8, .9, mGlass, TX + .2, 2.9, -1.24, tractor); box(.05, .8, .9, mGlass, TX + .2, 2.9, 1.24, tractor); // side windows
  box(.12, 1.2, 2.2, mSteel, TX + 2.86, 1.7, 0, tractor); // grille
  box(.08, .3, 2.4, mSteel, TX + 2.92, 1.1, 0, tractor); // bumper
  box(.06, .22, .4, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xdfefff, emissiveIntensity: 1.2 }), TX + 2.94, 1.55, -.85, tractor);
  box(.06, .22, .4, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xdfefff, emissiveIntensity: 1.2 }), TX + 2.94, 1.55, .85, tractor);
  box(.5, .25, .5, mNavy, TX + .3, 1.4, 0, tractor); // fifth wheel
  box(.3, 1.4, .3, mSteel, TX - .7, 3.0, -.6, tractor); box(.3, 1.4, .3, mSteel, TX - .7, 3.0, .6, tractor); // exhaust stacks
  box(1.2, .1, .8, mNavy, TX - .8, 3.75, 0, tractor); // roof fairing base
  box(1.6, .5, 2.2, mWhite, TX + .1, 3.8, 0, tractor); // roof fairing
  box(.6, .5, .05, mCyan, TX + .2, 2.2, -1.25, tractor); box(.6, .5, .05, mGreen, TX + .2, 2.2, 1.25, tractor); // door badges
  wheel(.56, .36, mRubber, TX + 2.1, .56, -1.05, tractor); wheel(.56, .36, mRubber, TX + 2.1, .56, 1.05, tractor); // steer axle
  [TX - .5, TX + .7].forEach((ax) => [-1.15, -.85, .85, 1.15].forEach((z) => wheel(.54, .3, mRubber, ax, .54, z, tractor))); // drive axles
  rig.add(tractor);

  /* ---- Ground: shadow blob + grid ---- */
  const shadowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
    g.addColorStop(0, 'rgba(0,0,0,.75)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  })();
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(26, 9), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.set(1.5, .01, 0); rig.add(shadow);
  const grid = new THREE.GridHelper(120, 60, CYAN, 0x2a3547);
  grid.material.transparent = true; grid.material.opacity = .14; grid.position.y = 0;
  scene.add(grid);
  scene.fog = new THREE.FogExp2(0x0b1220, .028);

  // Floating container cubes in the background (depth)
  const cubes = new THREE.Group();
  const cubeGeo = new THREE.BoxGeometry(2.4, 1.2, 1.2);
  const cubeFill = new THREE.MeshStandardMaterial({ color: 0x14335a, metalness: .4, roughness: .5, transparent: true, opacity: .35 });
  const cubeEdge = new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: .5 });
  for (let k = 0; k < 9; k++) {
    const m = new THREE.Mesh(cubeGeo, cubeFill);
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(cubeGeo), cubeEdge));
    m.position.set(-6 + Math.random() * 40, 1 + Math.random() * 5, -34 - Math.random() * 20);
    m.rotation.set(Math.random() * .4, Math.random() * Math.PI, 0);
    m.userData.spin = (Math.random() - .5) * .15; m.userData.y0 = m.position.y; m.userData.phase = Math.random() * Math.PI * 2;
    cubes.add(m);
  }
  scene.add(cubes);

  rig.position.set(3.5, 0, 0);
  rig.rotation.y = -0.55;
  const target = new THREE.Vector3(6, -2.4, 0);

  /* ---- Sizing ---- */
  const resize = () => {
    const w = canvas.clientWidth || canvas.parentElement.clientWidth, h = canvas.clientHeight || canvas.parentElement.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    // Push the rig to the right of the hero text on wide screens
    rig.position.x = w > 1400 ? 9 : w > 1100 ? 7 : 5;
    camera.position.z = w < 1100 ? 46 : 34;
  };
  resize();
  window.addEventListener('resize', resize);

  /* ---- Interaction ---- */
  const mouse = { x: 0, y: 0 }, smooth = { x: 0, y: 0 };
  window.addEventListener('pointermove', (e) => { mouse.x = (e.clientX / innerWidth) * 2 - 1; mouse.y = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });
  const scroll = { p: 0 };
  ScrollTrigger.create({ trigger: canvas.parentElement, start: 'top top', end: 'bottom top', scrub: true, onUpdate: (s) => (scroll.p = s.progress) });

  /* ---- Intro assembly ---- */
  const allWheels = [];
  rig.traverse((o) => { if (o.geometry?.type === 'CylinderGeometry' && o.parent && o.parent.type === 'Group') allWheels.push(o); });
  const play = () => {
    if (reduceMotion) { canvas.classList.add('is-ready'); return; }
    container.position.y = 9; container.rotation.z = .06;
    tractor.position.x = 14; chassis.position.x = -10;
    cubes.children.forEach((c) => c.scale.setScalar(0.001));
    canvas.classList.add('is-ready');
    gsap.timeline({ defaults: { ease: 'expo.out' } })
      .to(chassis.position, { x: 0, duration: 1.6 }, 0)
      .to(tractor.position, { x: 0, duration: 1.7 }, .15)
      .to(container.position, { y: 1.35, duration: 1.5, ease: 'expo.inOut' }, .5)
      .to(container.rotation, { z: 0, duration: 1.2 }, .8)
      .to(cubes.children.map((c) => c.scale), { x: 1, y: 1, z: 1, duration: 1.4, stagger: .04 }, .6);
  };
  if (document.documentElement.classList.contains('is-loading')) window.addEventListener('ndh:ready', play, { once: true });
  else play();

  /* ---- Loop (paused when off-screen) ---- */
  let visible = true, t0 = performance.now();
  new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0 }).observe(canvas);
  const tick = () => {
    if (!visible) return;
    const t = (performance.now() - t0) / 1000;
    smooth.x += (mouse.x - smooth.x) * .05; smooth.y += (mouse.y - smooth.y) * .05;
    rig.rotation.y = -0.55 + Math.sin(t * .25) * .12 + smooth.x * .18;
    rig.rotation.x = smooth.y * .04;
    rig.position.y = Math.sin(t * .8) * .06 - scroll.p * 6;
    camera.position.x = 16 + smooth.x * 1.2; camera.position.y = 8 - smooth.y * .8 + scroll.p * 4;
    camera.lookAt(target);
    allWheels.forEach((w) => (w.rotation.z -= .01));
    cubes.children.forEach((c) => { c.rotation.y += c.userData.spin * .01; c.position.y = c.userData.y0 + Math.sin(t * .5 + c.userData.phase) * .6; });
    rimC.intensity = 55 + Math.sin(t * 1.3) * 12; rimG.intensity = 45 + Math.cos(t * 1.1) * 10;
    renderer.render(scene, camera);
  };
  gsap.ticker.add(tick);

  return { renderer, scene, dispose: () => { gsap.ticker.remove(tick); renderer.dispose(); } };
}
