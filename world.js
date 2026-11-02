// The world, live: every question pinned on a dotted globe where its story is happening. The height of a pin is its
// 24h volume, the colour is the side the market leans to. Questions with no place (crypto, mostly) orbit the globe.
// Drag to turn it; it tours the biggest stories on its own. Hover for the question, click to bet on it.
import * as THREE from 'three';
import { LAND } from './land.js';
import { geoOf } from './geo.js';

const D = Math.PI / 180, V = (x, y, z) => new THREE.Vector3(x, y, z);
const ll = (lat, lon, r = 1) => { const p = (90 - lat) * D, t = (lon + 180) * D; return V(-r * Math.sin(p) * Math.cos(t), r * Math.cos(p), r * Math.sin(p) * Math.sin(t)); };
const BLUE = 0x3f6dff, RED = 0xe8483b;

export function mountGlobe(box, { onPick, onHover, label } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); box.prepend(renderer.domElement);
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 1, .1, 50); cam.position.set(0, 0, 4.6);
  const globe = new THREE.Group(); globe.rotation.set(.32, -.4, 0); scene.add(globe);
  globe.add(new THREE.Mesh(new THREE.SphereGeometry(.994, 72, 54), new THREE.MeshBasicMaterial({ color: 0xebeffb })));
  // the halo
  const hc = document.createElement('canvas'); hc.width = hc.height = 256; const hg = hc.getContext('2d'), gr = hg.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, 'rgba(63,109,255,0)'); gr.addColorStop(.74, 'rgba(63,109,255,0)'); gr.addColorStop(.775, 'rgba(63,109,255,.32)'); gr.addColorStop(.86, 'rgba(63,109,255,.08)'); gr.addColorStop(1, 'rgba(63,109,255,0)'); hg.fillStyle = gr; hg.fillRect(0, 0, 256, 256);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(hc), depthWrite: false, transparent: true })); halo.scale.set(2.6, 2.6, 1); halo.renderOrder = -1; scene.add(halo);
  // land, as dots that thin out toward the poles so they sit evenly on the sphere
  const cells = []; LAND.forEach((row, j) => { const lat = 78 - (j + .5) * (140 / 82), step = Math.max(1, Math.round(1 / Math.cos(lat * D))); for (let i = 0; i < row.length; i++) if (row[i] === 'X' && i % step === 0) cells.push([lat, -180 + (i + .5) * 1.8]); });
  const dots = new THREE.InstancedMesh(new THREE.CircleGeometry(.0075, 6), new THREE.MeshBasicMaterial({ color: 0x2f3d73, transparent: true, opacity: .78 }), cells.length);
  const o = new THREE.Object3D(); cells.forEach(([lat, lon], k) => { const p = ll(lat, lon, 1.001); o.position.copy(p); o.lookAt(p.clone().multiplyScalar(2)); o.updateMatrix(); dots.setMatrixAt(k, o.matrix); }); globe.add(dots);
  // a faint graticule
  const gmat = new THREE.LineBasicMaterial({ color: 0x3f6dff, transparent: true, opacity: .1 });
  for (let lat = -60; lat <= 60; lat += 30) globe.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 96 }, (_, i) => ll(lat, i * 3.75, 1.002))), gmat));
  for (let lon = -180; lon < 180; lon += 30) globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 61 }, (_, i) => ll(-90 + i * 3, lon, 1.002))), gmat));

  const pins = new THREE.Group(); globe.add(pins);
  const sats = new THREE.Group(); scene.add(sats);
  let items = [], tour = [], tourI = 0, focusOn = null, hoverOn = null;
  const ringGeo = new THREE.RingGeometry(.011, .017, 28), headGeo = new THREE.SphereGeometry(.013, 12, 10), hitGeo = new THREE.SphereGeometry(.055, 8, 6), hitMat = new THREE.MeshBasicMaterial({ visible: false });
  function update(EV) {
    pins.clear(); sats.clear(); items = []; tour = [];
    const top = EV.slice(0, 48), vmax = Math.log10(Math.max(1e3, ...top.map(e => e.v24 || 0))), seen = new Map(); let ns = 0;
    top.forEach(e => {
      const geo = geoOf(e.title + ' ' + e.lead.q), col = e.lead.yes >= .5 ? BLUE : RED, h = .05 + .32 * Math.max(0, (Math.log10(Math.max(1e3, e.v24 || 0)) - 3) / Math.max(.5, vmax - 3));
      if (geo) {
        const n = seen.get(geo.name) || 0; seen.set(geo.name, n + 1); const a = n * 2.4, rr = n ? 1.1 + n * .25 : 0;
        const lat = geo.lat + Math.cos(a) * rr, lon = geo.lon + Math.sin(a) * rr / Math.max(.3, Math.cos(geo.lat * D)), nrm = ll(lat, lon), up = V(0, 1, 0);
        const g = new THREE.Group(); g.position.copy(nrm); g.quaternion.setFromUnitVectors(up, nrm); pins.add(g);
        const mat = new THREE.MeshBasicMaterial({ color: col });
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(.0042, .0042, h, 6), mat); beam.position.y = h / 2; g.add(beam);
        const head = new THREE.Mesh(headGeo, mat); head.position.y = h; g.add(head);
        const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: col, transparent: true, side: THREE.DoubleSide, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = .002; g.add(ring);
        const hit = new THREE.Mesh(hitGeo, hitMat); hit.position.y = h; g.add(hit);
        const it = { e, geo, head, ring, hit, beam, ph: Math.random(), kind: 'pin' }; hit.userData.it = it; items.push(it); if (tour.length < 10) tour.push(it);
      } else if (ns < 9) {
        const i = ns++, r = 1.24 + (i % 3) * .13, inc = .35 + (i * .37) % 1.1, node = new THREE.Group(); node.rotation.set(inc, i * 1.3, (i % 2 ? -1 : 1) * .3); sats.add(node);
        node.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 128 }, (_, k) => V(Math.cos(k / 128 * Math.PI * 2) * r, 0, Math.sin(k / 128 * Math.PI * 2) * r))), new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: .12 })));
        const head = new THREE.Mesh(new THREE.SphereGeometry(.022, 14, 12), new THREE.MeshBasicMaterial({ color: col })); node.add(head);
        const hit = new THREE.Mesh(hitGeo, hitMat); head.add(hit);
        const it = { e, head, hit, node, r, sp: .09 + (i % 4) * .03, ph: i * 1.7, kind: 'sat' }; hit.userData.it = it; items.push(it);
      }
    });
  }
  // turning: drag with inertia, a slow idle spin, and a tour that brings each big story to the front
  let yaw = globe.rotation.y, pitch = globe.rotation.x, vy = 0, vp = 0, drag = null, idleUntil = 0, tourAt = 0;
  const el = renderer.domElement;
  el.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, moved: 0 }; el.setPointerCapture(e.pointerId); idleUntil = performance.now() + 9000; focusOn = null; });
  el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect(); mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); mouseIn = true;
    if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
    vy = dx * .0055; vp = dy * .0045; yaw += vy; pitch = Math.max(-.7, Math.min(.7, pitch + vp));
  });
  el.addEventListener('pointerup', e => { if (drag && drag.moved < 6 && hoverOn && onPick) onPick(hoverOn.e); drag = null; });
  el.addEventListener('pointerleave', () => { mouseIn = false; setHover(null); });
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(); let mouseIn = false;
  function setHover(it) { if (it === hoverOn) return; hoverOn = it; el.style.cursor = it ? 'pointer' : 'grab'; if (onHover) onHover(it ? it.e : null); }
  function focus(id) { const it = items.find(x => x.e.id === id && x.kind === 'pin'); if (it) { focusOn = it; idleUntil = performance.now() + 6000; } }
  const wp = V(0, 0, 0), camDir = V(0, 0, 0);
  function screenOf(it) {                               // where a pin or satellite sits on screen, and whether the globe hides it
    it.head.getWorldPosition(wp); camDir.copy(cam.position).normalize();
    const vis = it.kind === 'sat' ? (wp.z > -.15 || Math.hypot(wp.x, wp.y) > 1.04) : wp.clone().normalize().dot(camDir) > .15;
    const p = wp.clone().project(cam); return { x: (p.x + 1) / 2, y: (1 - p.y) / 2, vis };
  }
  function resize() { const w = box.clientWidth, h = box.clientHeight || w; renderer.setSize(w, h, false); renderer.domElement.style.width = w + 'px'; renderer.domElement.style.height = h + 'px'; cam.aspect = w / h; cam.updateProjectionMatrix(); }
  new ResizeObserver(resize).observe(box); resize();
  let on = false, raf = 0, last = 0;
  new IntersectionObserver(es => { on = es[0].isIntersecting; if (on && !raf) raf = requestAnimationFrame(frame); }, { rootMargin: '120px' }).observe(box);
  function frame(now) {
    raf = 0; if (!on || document.hidden) return; raf = requestAnimationFrame(frame); if (document.documentElement.classList.contains('intro-on')) return;
    const dt = Math.min(.05, (now - (last || now)) / 1000); last = now;
    if (!drag) {
      if (focusOn) { const p = focusOn.head.position.clone().applyQuaternion(focusOn.head.parent.quaternion).add(focusOn.head.parent.position);
        const ty = Math.atan2(-p.x, p.z), r2 = Math.hypot(p.x, p.z), tp = Math.max(-.55, Math.min(.55, Math.atan2(p.y, r2)));
        let d = ty - yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); yaw += d * Math.min(1, dt * 2.6); pitch += (tp - pitch) * Math.min(1, dt * 2.6); }
      else { vy *= .94; vp *= .9; yaw += vy + (now > idleUntil ? dt * .09 : 0); pitch += vp; pitch += (.28 - pitch) * dt * .3; }
      if (now > idleUntil && now > tourAt && tour.length) { focusOn = tour[tourI++ % tour.length]; tourAt = now + 4600; if (label) label(focusOn.e, focusOn.geo); }
    }
    globe.rotation.set(pitch, yaw, 0);
    for (const it of items) {
      if (it.kind === 'pin') { const k = (now / 1600 + it.ph) % 1; it.ring.scale.setScalar(1 + k * 2.6); it.ring.material.opacity = (1 - k) * .9; const s = it === focusOn || it === hoverOn ? 1.7 : 1; it.head.scale.setScalar(it.head.scale.x + (s - it.head.scale.x) * .2); }
      else { const a = now / 1000 * it.sp + it.ph; it.head.position.set(Math.cos(a) * it.r, 0, Math.sin(a) * it.r); const s = it === hoverOn ? 1.6 : 1; it.head.scale.setScalar(s); }
    }
    if (mouseIn && !drag) { ray.setFromCamera(mouse, cam); const hits = ray.intersectObjects(items.map(i => i.hit), false); setHover(hits.length ? hits[0].object.userData.it : null); }
    renderer.render(scene, cam);
    if (cb) { const it = hoverOn || focusOn; cb(it, it ? screenOf(it) : null); }
  }
  let cb = null;
  return { update, focus, onFrame: f => { cb = f; } };
}
