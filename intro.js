// The way in. A screen lights up on the world: a dotted globe where every live question is pinned in the city it's
// happening in, the odds rising off the pins. A bet goes in and stamps. The camera pulls back out of the screen: it's
// a beige PC standing on top of the world, the whole planet below it pinned with live questions, rings of odds in orbit.
// It swoops back in and throws you through a tunnel of live numbers into the terminal.
// About 10 s, no captions. Click, tap, Esc, Enter or "skip" skips it. Once per session; ?intro forces it; ?introt=T freezes.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RGBShiftShader } from 'three/addons/shaders/RGBShiftShader.js';
import { VignetteShader } from 'three/addons/shaders/VignetteShader.js';
import { LAND } from './land.js';
import { geoOf } from './geo.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z), D = Math.PI / 180;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const easeOut = x => 1 - Math.pow(1 - x, 3);
const backOut = x => { const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const ll = (lat, lon, r = 1) => { const p = (90 - lat) * D, t = (lon + 180) * D; return V(-r * Math.sin(p) * Math.cos(t), r * Math.cos(p), r * Math.sin(p) * Math.sin(t)); };
const INK = '#1d2233', BLUE = '#3f6dff', RED = '#e8483b', MUTE = '#6474a3', F = '"JetBrains Mono", monospace';
function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tx(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
function tag(text, { size = 44, color = INK, bg = 'rgba(251,250,246,.94)', sub = '', subColor = BLUE } = {}) {   // a little label card, as a sprite
  const c = cv(10, 10), g = c.getContext('2d'); g.font = `700 ${size}px ${F}`; const w1 = g.measureText(text).width; g.font = `700 ${size * .8}px ${F}`; const w2 = sub ? g.measureText(sub).width : 0;
  c.width = Math.ceil(Math.max(w1, w2) + size * .9); c.height = Math.ceil(size * (sub ? 2.5 : 1.55)); const h = c.height;
  if (!/,\s*\.?0\)$/.test(bg)) { g.fillStyle = bg; g.beginPath(); g.roundRect(0, 0, c.width, h, size * .3); g.fill(); g.strokeStyle = 'rgba(29,34,51,.14)'; g.lineWidth = 3; g.stroke(); }
  g.textBaseline = 'middle'; g.font = `700 ${size}px ${F}`; g.fillStyle = color; g.fillText(text, size * .45, sub ? size * .82 : h / 2);
  if (sub) { g.font = `700 ${size * .8}px ${F}`; g.fillStyle = subColor; g.fillText(sub, size * .45, size * 1.78); }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx(c), transparent: true, depthWrite: false, toneMapped: false })); s.userData.aspect = c.width / c.height; return s;
}

// the timeline (seconds)
const T_GLOBE = .45, T_BET = 3.2, T_STAMP = 3.95, T_BACK = 4.35, T_WIDE = 6.9, T_TERM = 6.3, T_ALIGN = 8.45, T_DIVE = 9.05, T_END = 10.2;

export async function playIntro(el, getLive) {
  try { sessionStorage.setItem('opm:intro', '1'); } catch {}
  await Promise.all([`700 40px ${F}`, `400 30px ${F}`].map(f => document.fonts.load(f))).catch(() => {});
  const canvas = el.querySelector('canvas'), flash = el.querySelector('.flash');
  const small = innerWidth < 760, aspect = innerWidth / innerHeight;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1.25 : 1.5)); renderer.setSize(innerWidth, innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .9;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const sky = cv(4, 256), skg = sky.getContext('2d'), sgr = skg.createLinearGradient(0, 0, 0, 256); sgr.addColorStop(0, '#eef2fd'); sgr.addColorStop(.55, '#cdd7f4'); sgr.addColorStop(1, '#a9b8e2'); skg.fillStyle = sgr; skg.fillRect(0, 0, 4, 256);
  scene.background = tx(sky); scene.fog = new THREE.Fog(0xc6d1f1, 10, 30);
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .35;
  const std = o => new THREE.MeshStandardMaterial(o);
  const mesh = (geo, mat, x = 0, y = 0, z = 0, parent = scene) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
  const live = () => (getLive && getLive() || []).filter(e => e && e.title && e.lead && e.lead.yes != null);
  const qOf = e => e.ms && e.ms.length > 1 && e.lead.label ? e.title.replace(/\?$/, '') + ' · ' + e.lead.label : e.title;

  // ---------------------------------------------------------------- the PC, on a plinth, on top of the world
  const plastic = std({ color: 0xe2d4b0, roughness: .55 }), plastic2 = std({ color: 0xcfbf97, roughness: .6 }), dark = std({ color: 0x3a3a36, roughness: .7 }), black = std({ color: 0x141416, roughness: .5 });
  const pc = new THREE.Group(); scene.add(pc);
  mesh(new RoundedBoxGeometry(.98, .2, .78, 4, .02), plastic, 0, .1, -.12, pc);
  const front = (w, h, x, y, m = black) => mesh(new THREE.BoxGeometry(w, h, .01), m, x, y, .272, pc);
  front(.3, .016, .2, .12); front(.3, .016, .2, .07); front(.12, .03, -.3, .1, dark);
  const ledA = mesh(new THREE.BoxGeometry(.014, .014, .01), new THREE.MeshBasicMaterial({ color: 0x3f6dff, toneMapped: false }), -.42, .06, .274, pc);
  mesh(new THREE.BoxGeometry(.014, .014, .01), new THREE.MeshBasicMaterial({ color: 0xe8483b, toneMapped: false }), -.39, .06, .274, pc);
  for (let i = 0; i < 7; i++) front(.004, .1, -.15 + i * .018, .1, dark);
  const mon = new THREE.Group(); mon.position.set(0, .26, -.05); pc.add(mon);
  mesh(new THREE.CylinderGeometry(.16, .2, .05, 32), plastic2, 0, -.035, -.05, mon);
  mesh(new RoundedBoxGeometry(.8, .64, .1, 5, .03), plastic, 0, .32, .06, mon);
  const back = new THREE.BoxGeometry(.74, .58, .5), bp = back.attributes.position;
  for (let i = 0; i < bp.count; i++) if (bp.getZ(i) < 0) { bp.setX(i, bp.getX(i) * .66); bp.setY(i, bp.getY(i) * .7 + .02); }
  back.computeVertexNormals(); mesh(back, plastic2, 0, .32, -.2, mon);
  mesh(new THREE.BoxGeometry(.64, .49, .02), std({ color: 0xcfc6b0, roughness: .5 }), 0, .335, .105, mon);
  const sg = new THREE.PlaneGeometry(.6, .45, 24, 18), sp = sg.attributes.position;
  for (let i = 0; i < sp.count; i++) { const a = sp.getX(i) / .3, b = sp.getY(i) / .225; sp.setZ(i, .016 * (1 - .5 * (a * a + b * b))); }
  sg.computeVertexNormals();
  const S = cv(1024, 768), sx = S.getContext('2d'), scrTex = tx(S);
  const rtW = small ? 1024 : 1440, rt = new THREE.WebGLRenderTarget(rtW, rtW * .75, { samples: 4 });
  const scrMat = new THREE.MeshBasicMaterial({ map: scrTex, toneMapped: false, color: new THREE.Color(.92, .92, .92) });
  const screen = new THREE.Mesh(sg, scrMat); screen.position.set(0, .335, .118); mon.add(screen);
  const O = cv(1024, 768), ox = O.getContext('2d'), ovTex = tx(O);                 // the prompt and the stamp, over the globe
  const over = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ map: ovTex, transparent: true, toneMapped: false, depthWrite: false })); over.position.set(0, .335, .1195); mon.add(over);
  const glass = new THREE.Mesh(sg, new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .05, transparent: true, opacity: 0, clearcoat: 1 })); glass.position.set(0, .335, .121); mon.add(glass);
  const kb = new THREE.Group(); kb.position.set(0, .018, .43); kb.rotation.x = .05; scene.add(kb);
  mesh(new RoundedBoxGeometry(.86, .03, .27, 3, .01), plastic, 0, 0, 0, kb);
  const keys = new THREE.InstancedMesh(new THREE.BoxGeometry(.034, .014, .034), plastic2, 120); let n = 0; const M4 = new THREE.Matrix4();
  for (let r = 0; r < 6; r++) for (let c = 0; c < 20; c++) { if (r === 5 && c > 3 && c < 12) continue; M4.makeTranslation(-.38 + c * .04, .021, -.1 + r * .042); keys.setMatrixAt(n++, M4); }
  M4.makeScale(8, 1, 1).setPosition(-.06, .021, .11); keys.setMatrixAt(n++, M4); keys.count = n; keys.castShadow = keys.receiveShadow = true; kb.add(keys);
  const yesMat = new THREE.MeshStandardMaterial({ color: 0x3f6dff, roughness: .5, emissive: 0x3f6dff, emissiveIntensity: 0 });
  const yesKey = mesh(new THREE.BoxGeometry(.034, .016, .034), yesMat, .3, .022, .11, kb);
  mesh(new THREE.BoxGeometry(.034, .016, .034), std({ color: 0xe8483b, roughness: .5 }), .34, .022, .11, kb);
  mesh(new THREE.CylinderGeometry(1.05, 1.12, .1, 64), std({ color: 0xece2c9, roughness: .6 }), 0, -.05, .1);   // the plinth
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x3f6dff, transparent: true, opacity: .55, toneMapped: false });
  const halo = new THREE.Mesh(new THREE.TorusGeometry(1.09, .006, 8, 128), ringMat); halo.rotation.x = Math.PI / 2; halo.position.set(0, .003, .1); scene.add(halo);

  // ---------------------------------------------------------------- the planet below: dotted land, every live question pinned where it's happening
  const R = 6, C = V(0, -R - .08, 0), planet = new THREE.Group(); planet.position.copy(C); scene.add(planet);
  const ocean = new THREE.Mesh(new THREE.SphereGeometry(R, 96, 72), std({ color: 0xdce4f9, roughness: .92 })); ocean.receiveShadow = true; planet.add(ocean);
  const cells = []; LAND.forEach((row, j) => { const lat = 78 - (j + .5) * (140 / 82), step = Math.max(1, Math.round(1 / Math.cos(lat * D))); for (let i = 0; i < row.length; i++) if (row[i] === 'X' && i % step === 0) cells.push([lat, -180 + (i + .5) * 1.8]); });
  const o3 = new THREE.Object3D();
  const landBig = new THREE.InstancedMesh(new THREE.CircleGeometry(.05, 8), new THREE.MeshBasicMaterial({ color: 0x34437c }), cells.length);
  cells.forEach(([lat, lon], k) => { const p = ll(lat, lon, R + .006); o3.position.copy(p); o3.lookAt(p.clone().multiplyScalar(2)); o3.updateMatrix(); landBig.setMatrixAt(k, o3.matrix); }); planet.add(landBig);
  const pinsBig = new THREE.Group(); planet.add(pinsBig);
  // rings of odds in orbit
  const orbits = [], orbitTags = [];
  [[4.5, .1, .2, -1.05], [5.7, -.14, 1.4, -1.95]].forEach(([r, tilt, rot, y], k) => {
    const g = new THREE.Group(); g.position.set(0, y, 0); g.rotation.set(tilt, rot, k ? .1 : -.06); scene.add(g); orbits.push(g);
    g.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 200 }, (_, i) => V(Math.cos(i / 200 * Math.PI * 2) * r, 0, Math.sin(i / 200 * Math.PI * 2) * r))), new THREE.LineBasicMaterial({ color: 0x3f6dff, transparent: true, opacity: .32 })));
    g.userData.r = r;
  });

  // ---------------------------------------------------------------- the world on the screen (rendered into the screen's texture)
  const gs = new THREE.Scene(); gs.background = new THREE.Color(0xeef2fd);
  const gcam = new THREE.PerspectiveCamera(30, 4 / 3, .1, 50); gcam.position.set(0, 0, 3.75);
  const globe = new THREE.Group(); gs.add(globe);
  globe.add(new THREE.Mesh(new THREE.SphereGeometry(.994, 72, 54), new THREE.MeshBasicMaterial({ color: 0xf8faff })));
  const hc = cv(256, 256), hg = hc.getContext('2d'), gr = hg.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, 'rgba(63,109,255,0)'); gr.addColorStop(.74, 'rgba(63,109,255,0)'); gr.addColorStop(.775, 'rgba(63,109,255,.34)'); gr.addColorStop(.88, 'rgba(63,109,255,.07)'); gr.addColorStop(1, 'rgba(63,109,255,0)'); hg.fillStyle = gr; hg.fillRect(0, 0, 256, 256);
  const ghalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(hc), depthWrite: false, transparent: true })); ghalo.scale.set(2.6, 2.6, 1); gs.add(ghalo);
  const land = new THREE.InstancedMesh(new THREE.CircleGeometry(.0078, 6), new THREE.MeshBasicMaterial({ color: 0x2f3d73 }), cells.length);
  cells.forEach(([lat, lon], k) => { const p = ll(lat, lon, 1.001); o3.position.copy(p); o3.lookAt(p.clone().multiplyScalar(2)); o3.updateMatrix(); land.setMatrixAt(k, o3.matrix); }); globe.add(land);
  const gmat = new THREE.LineBasicMaterial({ color: 0x3f6dff, transparent: true, opacity: .12 });
  for (let lat = -60; lat <= 60; lat += 30) globe.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 96 }, (_, i) => ll(lat, i * 3.75, 1.002))), gmat));
  for (let lon = -180; lon < 180; lon += 30) globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 61 }, (_, i) => ll(-90 + i * 3, lon, 1.002))), gmat));
  const pins = new THREE.Group(); globe.add(pins);
  const risers = [];                                       // odds floating up off the pins

  // pins for both worlds, built as soon as the live questions are in
  let built = false, tour = [];
  function build() {
    const L = live(); if (!L.length) return; built = true;
    const top = L.slice(0, 40), vmax = Math.log10(Math.max(1e3, ...top.map(e => e.v24 || 0))), seen = new Map();
    top.forEach((e, idx) => {
      const geo = geoOf(e.title + ' ' + e.lead.q); if (!geo) return;
      const k = seen.get(geo.name) || 0; seen.set(geo.name, k + 1); const a = k * 2.4, rr = k ? 1.2 + k * .3 : 0;
      const lat = geo.lat + Math.cos(a) * rr, lon = geo.lon + Math.sin(a) * rr / Math.max(.3, Math.cos(geo.lat * D)), up = V(0, 1, 0), nrm = ll(lat, lon);
      const yes = e.lead.yes >= .5, col = yes ? 0x3f6dff : 0xe8483b, hot = new THREE.Color(col).multiplyScalar(1.7), vol = Math.max(0, (Math.log10(Math.max(1e3, e.v24 || 0)) - 3) / Math.max(.5, vmax - 3));
      // small world
      const h = .05 + .3 * vol, g = new THREE.Group(); g.position.copy(nrm); g.quaternion.setFromUnitVectors(up, nrm); g.scale.setScalar(.001); pins.add(g);
      const m = new THREE.MeshBasicMaterial({ color: hot, toneMapped: false });
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(.004, .004, h, 6), m); beam.position.y = h / 2; g.add(beam);
      const head = new THREE.Mesh(new THREE.SphereGeometry(.014, 12, 10), m); head.position.y = h; g.add(head);
      const ring = new THREE.Mesh(new THREE.RingGeometry(.011, .017, 28), new THREE.MeshBasicMaterial({ color: col, transparent: true, side: THREE.DoubleSide, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = .002; g.add(ring);
      const it = { e, geo, g, head, ring, h, born: .55 + idx * .05, yes, pct: Math.round(e.lead.yes * 100) };
      if (tour.length < 3 && e.lead.yes > .05 && e.lead.yes < .95 && !tour.some(t => t.geo.name === geo.name)) {           // the stories the screen tours, with a label each
        it.label = tag(geo.name.toUpperCase(), { size: 40, sub: `${it.pct}% yes · ${qOf(e).length > 28 ? qOf(e).slice(0, 27) + '…' : qOf(e)}`, subColor: yes ? BLUE : RED });
        it.label.center.set(0, 0); it.label.scale.set(.0001, .0001, 1); gs.add(it.label); tour.push(it);
      }
      pins.userData.items = (pins.userData.items || []).concat(it);
      // big world
      const H = .25 + 1.25 * vol, G = new THREE.Group(), nb = ll(lat, lon, R); G.position.copy(nb); G.quaternion.setFromUnitVectors(up, nb.clone().normalize()); pinsBig.add(G);
      const bm = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, H, 8), m); bm.position.y = H / 2; G.add(bm);
      const bh = new THREE.Mesh(new THREE.SphereGeometry(.07, 14, 12), m); bh.position.y = H; G.add(bh);
      const br = new THREE.Mesh(new THREE.RingGeometry(.06, .095, 32), new THREE.MeshBasicMaterial({ color: col, transparent: true, side: THREE.DoubleSide, depthWrite: false })); br.rotation.x = -Math.PI / 2; br.position.y = .01; G.add(br);
      pinsBig.userData.items = (pinsBig.userData.items || []).concat({ ring: br, ph: Math.random() });
    });
    // the orbits carry the numbers
    const words = []; L.filter(e => e.lead.yes > .03 && e.lead.yes < .97).slice(0, 14).forEach(e => { const p = Math.round(e.lead.yes * 100); words.push([`YES ${p}%`, BLUE], [`NO ${100 - p}%`, RED]); });
    orbits.forEach((g, k) => { for (let i = 0; i < 9; i++) { const [w, c] = words[(i * 2 + k * 9) % words.length] || ['YES', BLUE]; const s = tag(w, { size: 46, color: c }); s.scale.set(.42 * s.userData.aspect, .42, 1); g.add(s); orbitTags.push({ s, g, a: i / 9 * Math.PI * 2, sp: k ? -.11 : .14 }); } });
    // numbers that rise off the pins on the screen
    for (let i = 0; i < 14; i++) { const it = (pins.userData.items || [])[i % Math.max(1, (pins.userData.items || []).length)]; if (!it) break; const s = tag(`${it.pct}%`, { size: 40, color: it.yes ? BLUE : RED, bg: 'rgba(251,250,246,.0)' }); s.scale.set(.0001, .0001, 1); gs.add(s); risers.push({ s, it, ph: i * .37 }); }
  }

  // ---------------------------------------------------------------- light: a clear morning over the world
  scene.add(new THREE.HemisphereLight(0xeef2ff, 0xb9ab8a, 1.05));
  const key = new THREE.DirectionalLight(0xfff2de, 1.6); key.position.set(-3, 6, 4); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -1.6, right: 1.6, top: 1.6, bottom: -1.6, near: .5, far: 16 }); key.shadow.radius = 5; key.shadow.bias = -.0005; scene.add(key);
  const glow = new THREE.PointLight(0x9fb4ff, .4, 1.6, 2); glow.position.set(0, .62, .7); scene.add(glow);
  const DUST = 260, dpos = new Float32Array(DUST * 3), dseed = new Float32Array(DUST);
  for (let i = 0; i < DUST; i++) { dpos[i * 3] = -3 + Math.random() * 6; dpos[i * 3 + 1] = Math.random() * 3.2; dpos[i * 3 + 2] = -3 + Math.random() * 6; dseed[i] = Math.random() * 100; }
  const dgeo = new THREE.BufferGeometry(); dgeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3)); const base = dpos.slice();
  const dotT = tx((() => { const c = cv(32, 32), g = c.getContext('2d'), r = g.createRadialGradient(16, 16, 0, 16, 16, 16); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 32, 32); return c; })());
  const dust = new THREE.Points(dgeo, new THREE.PointsMaterial({ size: .03, map: dotT, transparent: true, opacity: .7, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); scene.add(dust);

  // ---------------------------------------------------------------- what the screen shows
  const NOISE = [0, 1, 2].map(() => { const c = cv(256, 192), g = c.getContext('2d'), d = g.createImageData(256, 192); for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255 | 0; d.data[i] = v; d.data[i + 1] = v; d.data[i + 2] = v + 10; d.data[i + 3] = 255; } g.putImageData(d, 0, 0); return c; });
  let ST = null;
  const stories = () => { if (!ST) { const s = live().slice(0, 8).map(e => ({ q: qOf(e), yes: e.lead.yes })); if (s.length) ST = s; } return ST || [{ q: 'the world is placing its bets', yes: null }]; };
  function powerOn(T) {                                   // a CRT warming up: a dot, a line, the full raster
    const g = sx, W = 1024, H = 768; g.fillStyle = '#05060a'; g.fillRect(0, 0, W, H);
    const k1 = easeOut(clamp(T / .14)), k2 = easeOut(clamp((T - .14) / .22)), w = W * k1, h = Math.max(3, H * k2);
    const r = g.createLinearGradient(0, H / 2 - h / 2, 0, H / 2 + h / 2); r.addColorStop(0, 'rgba(230,236,255,0)'); r.addColorStop(.5, 'rgba(250,252,255,1)'); r.addColorStop(1, 'rgba(230,236,255,0)');
    g.fillStyle = k2 > 0 ? r : '#fff'; g.fillRect((W - w) / 2, H / 2 - h / 2, w, h);
    if (T > .32) { g.globalAlpha = clamp((T - .32) / .13); g.fillStyle = '#eef2fd'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    sx.fillStyle = 'rgba(20,30,70,.035)'; for (let y = 0; y < H; y += 4) sx.fillRect(0, y, W, 2); scrTex.needsUpdate = true;
  }
  function overlay(T) {                                   // over the world: the bet typed in, then the stamp
    const g = ox, W = 1024, H = 768; g.clearRect(0, 0, W, H);
    if (T < T_GLOBE + .35) { g.fillStyle = `rgba(250,252,255,${1 - clamp((T - T_GLOBE) / .35)})`; g.fillRect(0, 0, W, H); }
    g.fillStyle = 'rgba(20,30,70,.03)'; for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 2);
    g.font = `700 24px ${F}`; g.fillStyle = INK; g.fillText('opm', 46, 132); g.fillStyle = BLUE; g.fillRect(104, 112, 10, 24);
    g.font = `400 21px ${F}`; g.fillStyle = MUTE; g.fillText('world · live', 128, 131);
    if (Math.floor(T * 1.6) % 2 === 0) { g.fillStyle = RED; g.beginPath(); g.arc(W - 128, 124, 8, 0, 7); g.fill(); } g.font = `700 22px ${F}`; g.fillStyle = RED; g.fillText('LIVE', W - 112, 132);
    if (T < T_BET - .25) { overTex(); return; }
    const y = 560, cmd = 'opm bet --side yes --sol 0.5', t = T - T_BET, nn = t > 0 ? Math.floor(clamp(t / .62) * cmd.length) : 0, placed = T >= T_STAMP, a = clamp((T - T_BET + .25) / .25);
    g.globalAlpha = a; g.fillStyle = 'rgba(251,252,255,.96)'; g.beginPath(); g.roundRect(56, y, W - 112, 76, 14); g.fill(); g.strokeStyle = placed ? BLUE : '#c9d3ef'; g.lineWidth = 3; g.stroke();
    g.font = `400 28px ${F}`; g.fillStyle = MUTE; g.fillText('%', 82, y + 48); g.fillStyle = INK; const typed = cmd.slice(0, nn); g.fillText(typed, 120, y + 48);
    if (!placed && Math.floor(T * 3) % 2 === 0) { g.fillStyle = BLUE; g.fillRect(124 + g.measureText(typed).width, y + 22, 15, 32); }
    if (placed) { g.font = `700 28px ${F}`; g.fillStyle = BLUE; g.textAlign = 'right'; g.fillText('✓ placed', W - 84, y + 48); g.textAlign = 'left'; }
    g.globalAlpha = 1;
    if (placed) {
      const k = clamp((T - T_STAMP) / .16), s = 2.6 - 1.6 * backOut(k);
      g.save(); g.translate(W / 2, 380); g.rotate(-.12); g.scale(s, s); g.globalAlpha = clamp(k * 2.2) * .95;
      g.fillStyle = 'rgba(251,252,255,.55)'; g.beginPath(); g.roundRect(-250, -86, 500, 172, 18); g.fill();
      g.strokeStyle = BLUE; g.lineWidth = 10; g.beginPath(); g.roundRect(-250, -86, 500, 172, 18); g.stroke(); g.lineWidth = 3; g.beginPath(); g.roundRect(-236, -72, 472, 144, 12); g.stroke();
      g.fillStyle = BLUE; g.textAlign = 'center'; g.font = `800 76px ${F}`; g.fillText('BET PLACED', 0, 14); g.font = `700 26px ${F}`; g.fillText('YES · 0.5 SOL · ✓', 0, 56); g.restore();
    }
    overTex();
  }
  function overTex() { ovTex.needsUpdate = true; }
  function drawTerm(T) {                                   // the PC's own screen: the terminal you're about to land in
    const g = sx, W = 1024, H = 768, t = T - T_TERM;
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#f6f8ff'); bg.addColorStop(1, '#e2e9fb'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.fillStyle = '#e6ecfb'; g.fillRect(0, 0, W, 70); g.fillStyle = '#c9d3ef'; g.fillRect(0, 70, W, 3);
    [RED, '#e6b84b', '#57b36b'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(44 + i * 34, 35, 10, 0, 7); g.fill(); });
    g.font = `400 24px ${F}`; g.fillStyle = MUTE; g.textAlign = 'center'; g.fillText('anon@opm-lab — zsh', W / 2, 44); g.textAlign = 'left';
    const s = stories(); g.font = `400 22px ${F}`;
    s.slice(0, 5).forEach((x, i) => { if (t < .1 + i * .12) return; g.fillStyle = BLUE; g.fillText(String(i + 1).padStart(2, '0'), 58, 120 + i * 34); g.fillStyle = x.yes != null && x.yes < .5 ? RED : BLUE; g.fillText(x.yes != null ? (Math.round(x.yes * 100) + '%').padStart(4, ' ') : '  — ', 112, 120 + i * 34);
      g.fillStyle = INK; const q = x.q.length > 46 ? x.q.slice(0, 45) + '…' : x.q; g.fillText(q, 200, 120 + i * 34); });
    g.font = `700 196px ${F}`; g.fillStyle = INK; const tw = g.measureText('opm').width, x0 = (W - tw - 60) / 2; g.fillText('opm', x0, 470);
    if (Math.floor(T * 2.4) % 2 === 0) { g.fillStyle = BLUE; g.fillRect(x0 + tw + 18, 334, 42, 140); }
    const by = 518, bx = 96, bw = W - 192;
    g.fillStyle = BLUE; g.beginPath(); g.roundRect(bx, by, bw * .62 - 6, 34, 17); g.fill(); g.fillStyle = RED; g.beginPath(); g.roundRect(bx + bw * .62 + 6, by, bw * .38 - 6, 34, 17); g.fill();
    const cmd = 'opm --enter', nn = Math.floor(clamp((T - (T_ALIGN - .3)) / .5) * cmd.length);
    g.font = `400 30px ${F}`; g.fillStyle = MUTE; g.fillText('anon@opm-lab ~ %', 58, H - 66); const px = 58 + g.measureText('anon@opm-lab ~ % ').width;
    g.fillStyle = INK; g.fillText(cmd.slice(0, nn), px, H - 66); if (Math.floor(T * 3) % 2 === 0) { g.fillStyle = BLUE; g.fillRect(px + g.measureText(cmd.slice(0, nn)).width + 4, H - 92, 14, 32); }
    if (t < .14) { g.globalAlpha = 1 - t / .14; g.imageSmoothingEnabled = false; g.drawImage(NOISE[(T * 30 | 0) % 3], 0, 0, W, H); g.imageSmoothingEnabled = true; g.globalAlpha = 1; }
    g.fillStyle = 'rgba(20,30,70,.035)'; for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 2);
    const v = g.createRadialGradient(W / 2, H / 2, 320, W / 2, H / 2, 780); v.addColorStop(0, 'rgba(90,110,170,0)'); v.addColorStop(1, 'rgba(90,110,170,.22)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
    scrTex.needsUpdate = true;
  }
  // the screen's world: turns to each big story in turn, pins pop, odds rise off them
  let gyaw = -1.15, gpitch = .38;
  function drawWorld(T) {
    if (!built) build();
    const items = pins.userData.items || [];
    for (const it of items) { const k = clamp((T - it.born) / .35); it.g.scale.setScalar(Math.max(.001, backOut(k))); const p = ((T * .62) + it.born) % 1; it.ring.scale.setScalar(1 + p * 2.6); it.ring.material.opacity = (1 - p) * .9 * k; }
    const seg = (T_BACK - .7) / Math.max(1, tour.length), ti = Math.min(tour.length - 1, Math.floor((T - .7) / seg)), cur = T > .7 && tour.length ? tour[Math.max(0, ti)] : null;
    if (cur) { const p = cur.g.position.clone().add(V(0, cur.h, 0).applyQuaternion(cur.g.quaternion)), ty = Math.atan2(-p.x, p.z), tp = Math.max(-.6, Math.min(.6, Math.atan2(p.y, Math.hypot(p.x, p.z))));
      let d = ty - gyaw; d = Math.atan2(Math.sin(d), Math.cos(d)); const f = DEBUG ? 1 : .06; gyaw += d * f; gpitch += (tp - gpitch) * f; }
    else gyaw += .004;
    globe.rotation.set(gpitch, gyaw, 0);
    const z = 4.45 - .4 * easeOut(clamp(T / T_BACK)); gcam.position.set(0, -.05, z); gcam.lookAt(0, -.02, 0);
    tour.forEach((it, i) => { const on = it === cur, lt = (T - .7) - i * seg, k = on ? easeOut(clamp(lt / .3)) : lt >= seg ? Math.max(0, 1 - clamp((lt - seg) / .2)) : 0;
      it.head.getWorldPosition(wp); const sc = .105 * k; it.label.scale.set(sc * it.label.userData.aspect, sc, 1); it.label.position.copy(wp).add(V(.05, .05, .1)); });
    risers.forEach(r => { const k = ((T * .5 + r.ph) % 1), it = r.it; if (!it || it.g.scale.x < .5) { r.s.scale.set(.0001, .0001, 1); return; } it.head.getWorldPosition(wp);
      r.s.position.copy(wp).add(V(0, k * .5, .05)); const sc = .07 * Math.sin(k * Math.PI); r.s.scale.set(sc * r.s.userData.aspect, sc, 1); r.s.material.opacity = Math.sin(k * Math.PI); });
    renderer.setRenderTarget(rt); renderer.render(gs, gcam); renderer.setRenderTarget(null);
  }

  // ---------------------------------------------------------------- the tunnel of live odds you fall through at the end
  const tun = new THREE.Scene(); tun.background = new THREE.Color(0xeef2fd); tun.fog = new THREE.Fog(0xeef2fd, 6, 34);
  const tcam = new THREE.PerspectiveCamera(78, aspect, .05, 80);
  let tunBuilt = false;
  function buildTunnel() {
    tunBuilt = true; const L = ['YES', 'NO', '% opm bet', '% opm wire', 'opm▌', '◌ live', '✓ placed']; stories().forEach(x => { if (x.yes != null) L.push(`YES ${Math.round(x.yes * 100)}%`, `NO ${100 - Math.round(x.yes * 100)}%`); L.push(x.q.length > 30 ? x.q.slice(0, 29) + '…' : x.q); });
    const mats = L.map(t => { const c = cv(512, 96), g = c.getContext('2d'), big = t.length < 10; g.font = `700 ${big ? 64 : 34}px ${F}`; g.fillStyle = /^NO/.test(t) ? RED : /^YES|✓|%|opm/.test(t) ? BLUE : INK; g.textBaseline = 'middle'; g.fillText(t, 8, 50);
      return new THREE.MeshBasicMaterial({ map: tx(c), transparent: true, depthWrite: false, toneMapped: false, fog: true }); });
    for (let i = 0; i < 90; i++) { const a = i * 2.39996, r = 1.05 + (i % 5) * .28, z = -i * .62 - 1, big = i % 7 === 0, m = new THREE.Mesh(new THREE.PlaneGeometry(big ? 4.2 : 3.0, big ? .79 : .56), mats[i % mats.length]);
      m.position.set(Math.cos(a) * r, Math.sin(a) * r * .75, z); m.lookAt(0, 0, z + 6); tun.add(m); }
    const ring = new THREE.LineBasicMaterial({ color: 0x3f6dff, transparent: true, opacity: .25 });
    for (let i = 0; i < 18; i++) { const l = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(new THREE.EllipseCurve(0, 0, 2.3, 1.75).getPoints(64)), ring); l.position.z = -i * 3.2; tun.add(l); }
  }

  // ---------------------------------------------------------------- camera and post
  const cam = new THREE.PerspectiveCamera(aspect < 1 ? 62 : 40, aspect, .02, 80);
  const fov0 = cam.fov, SCR = V(0, .595, .07), tanV = Math.tan(THREE.MathUtils.degToRad(fov0 / 2));
  const dNear = aspect >= 1 ? Math.max(.6 * .49 / (tanV * aspect), .45 * .37 / tanV) : .6 * .53 / (tanV * aspect);
  const near = V(0, .595, .084 + dNear), wide = aspect < 1 ? V(5.4, 4.0, 11.2) : V(4.7, 3.2, 8.7);
  const out1 = new THREE.CatmullRomCurve3([near.clone(), V(0, .72, 1.55), V(1.5, 1.9, 3.9), wide], false, 'centripetal');
  const look1 = new THREE.CatmullRomCurve3([SCR.clone(), V(0, .42, 0), V(0, -.4, 0), V(0, -1.35, 0)], false, 'centripetal');
  const alignP = V(0, .62, aspect < 1 ? 1.1 : .66);
  const in1 = new THREE.CatmullRomCurve3([wide.clone(), V(2.0, 2.0, 4.4), V(.6, .9, 1.8), alignP], false, 'centripetal');
  const look2 = new THREE.CatmullRomCurve3([V(0, -1.35, 0), V(0, -.2, 0), V(0, .45, 0), SCR.clone()], false, 'centripetal');
  const look = V(0, 0, 0), wp = V(0, 0, 0);
  const composer = new EffectComposer(renderer), rp = new RenderPass(scene, cam); composer.addPass(rp);
  const bokeh = new BokehPass(scene, cam, { focus: dNear, aperture: .002, maxblur: .006 }); bokeh.enabled = !small; composer.addPass(bokeh);
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), .22, .45, .92));
  const rgb = new ShaderPass(RGBShiftShader); rgb.uniforms.amount.value = 0; composer.addPass(rgb);
  const vig = new ShaderPass(VignetteShader); vig.uniforms.offset.value = .6; vig.uniforms.darkness.value = 1; composer.addPass(vig);
  composer.addPass(new OutputPass());
  const hideForDepth = [dust, glass, over, halo], bokehRender = bokeh.render.bind(bokeh);
  bokeh.render = (...a) => { const v = hideForDepth.map(o => o.visible); hideForDepth.forEach(o => o.visible = false); bokehRender(...a); hideForDepth.forEach((o, i) => o.visible = v[i]); };
  const fit = () => { renderer.setSize(innerWidth, innerHeight, false); composer.setSize(innerWidth, innerHeight); cam.aspect = tcam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); tcam.updateProjectionMatrix(); };
  addEventListener('resize', fit);

  const DEBUG = new URLSearchParams(location.search).get('introt');
  let t0 = 0, done = false, raf = 0, nf = 0, inTunnel = false, mapIs = 'canvas';
  const skip = el.querySelector('.skip');
  return new Promise(resolve => {
    const finish = () => {
      if (done) return; done = true; el.classList.add('out'); resolve();
      setTimeout(() => { cancelAnimationFrame(raf); removeEventListener('resize', fit); rt.dispose(); renderer.dispose(); el.remove(); }, 900);
    };
    if (!DEBUG) { el.addEventListener('pointerdown', finish); if (skip) skip.addEventListener('click', finish); addEventListener('keydown', e => { if (['Escape', 'Enter', ' '].includes(e.key)) finish(); }); }
    function setMap(which) { if (mapIs === which) return; mapIs = which; scrMat.map = which === 'world' ? rt.texture : scrTex; scrMat.needsUpdate = true; }
    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (!t0) { t0 = now; el.classList.add('on'); }
      const T = DEBUG ? +DEBUG : (now - t0) / 1000;
      if (!built) build();
      // the screen
      if (T < T_GLOBE) { powerOn(T); setMap('canvas'); over.visible = false; }
      else if (T < T_TERM) { drawWorld(T); overlay(T); setMap('world'); over.visible = true; }
      else { drawTerm(T); setMap('canvas'); over.visible = false; }
      // the world below and around
      planet.rotation.y = -.25 + T * .035;
      for (const it of pinsBig.userData.items || []) { const p = (T * .55 + it.ph) % 1; it.ring.scale.setScalar(1 + p * 2.4); it.ring.material.opacity = (1 - p) * .85; }
      for (const o of orbitTags) { const a = o.a + T * o.sp, r = o.g.userData.r; o.s.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); }
      ringMat.opacity = .35 + .25 * Math.sin(T * 3);
      for (let i = 0; i < DUST; i++) { const s = dseed[i]; dpos[i * 3] = base[i * 3] + Math.sin(T * .3 + s) * .08; dpos[i * 3 + 1] = base[i * 3 + 1] + Math.sin(T * .22 + s * 1.7) * .06 + T * .02; dpos[i * 3 + 2] = base[i * 3 + 2] + Math.cos(T * .25 + s) * .08; }
      dgeo.attributes.position.needsUpdate = true; dust.visible = T > T_BACK; glass.material.opacity = .05 * clamp((T - T_BACK) / .5);
      glow.intensity = T < T_GLOBE ? .4 * clamp((T - .2) / .25) : .4 + (T >= T_STAMP && T < T_STAMP + .3 ? .6 * (1 - (T - T_STAMP) / .3) : 0);
      const down = T > T_STAMP - .14 && T < T_STAMP + .08; yesKey.position.y = down ? .012 : .022; yesMat.emissiveIntensity = T > T_STAMP - .14 && T < T_STAMP + .9 ? .9 * (1 - clamp((T - T_STAMP) / .9)) : 0;
      ledA.visible = !(T > T_STAMP && T < T_STAMP + 1.2 && Math.floor(T * 10) % 2);
      // camera: on the screen, the stamp shakes it, out to the PC and up over the world, back in, then the dive
      let fov = fov0;
      if (T < T_BACK) { cam.position.set(Math.sin(T * .4) * .004, near.y, near.z - (T / T_BACK) * .03); look.copy(SCR);
        if (T > T_STAMP) { const a = .007 * (1 - clamp((T - T_STAMP) / .33)); cam.position.x += Math.sin(T * 95) * a; cam.position.y += Math.cos(T * 77) * a; } }
      else if (T < T_WIDE) { const k = ease(clamp((T - T_BACK) / (T_WIDE - T_BACK))); out1.getPointAt(k, cam.position); look1.getPointAt(k, look); }
      else if (T < T_ALIGN) { const k = ease(clamp((T - T_WIDE) / (T_ALIGN - T_WIDE))); in1.getPointAt(k, cam.position); look2.getPointAt(k, look); }
      else { const k = clamp((T - T_ALIGN) / (T_DIVE - T_ALIGN)), e = k * k * k; cam.position.lerpVectors(alignP, V(0, .595, .13), e); look.copy(SCR); fov = fov0 + 26 * e; }
      cam.lookAt(look); if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
      bokeh.uniforms.focus.value = cam.position.distanceTo(V(0, .45, .06)); bokeh.uniforms.aperture.value = T > T_BACK && T < T_ALIGN ? .0022 : .001;
      const passGlass = T > T_BACK && T < T_BACK + .6 ? Math.sin(clamp((T - T_BACK) / .6) * Math.PI) : 0, dive = T > T_ALIGN ? clamp((T - T_ALIGN) / (T_DIVE - T_ALIGN)) : 0;
      rgb.uniforms.amount.value = .0035 * passGlass + .012 * dive * dive + (T > T_GLOBE - .1 && T < T_GLOBE + .25 ? .004 : 0); rgb.uniforms.angle.value = T * .7;
      const f1 = T > T_DIVE - .12 ? (T < T_DIVE + .08 ? clamp((T - (T_DIVE - .12)) / .12) : 1 - clamp((T - T_DIVE - .08) / .22)) : 0, f2 = clamp((T - (T_END - .35)) / .3);
      flash.style.opacity = Math.max(f1, f2).toFixed(3);
      if (T >= T_DIVE) {
        if (!tunBuilt) buildTunnel(); if (!inTunnel) { inTunnel = true; rp.scene = tun; rp.camera = tcam; bokeh.enabled = false; }
        const k = clamp((T - T_DIVE) / (T_END - T_DIVE)); tcam.position.set(Math.sin(k * 3) * .25, Math.cos(k * 2.4) * .18, 3 - 46 * k * k * (3 - 2 * k)); tcam.rotation.z = k * .6; tcam.fov = 78 - 18 * k; tcam.updateProjectionMatrix();
        rgb.uniforms.amount.value = .006 * (1 - k) + .002;
      }
      composer.render();
      if (T > T_END) finish();
      if (DEBUG && ++nf > 2) { cancelAnimationFrame(raf); window.__introReady = 1; }   // stills for review
    }
    raf = requestAnimationFrame(frame);
  });
}
