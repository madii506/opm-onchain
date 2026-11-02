// The way in. A CRT powers on, the opm news channel tunes in and cuts across the world's live questions. A bet goes in
// on air and a BET PLACED stamp slams down. The camera pulls back through the glass, swings round the beige PC in the
// morning sun while the slip prints, pushes back in, and throws you through a tunnel of live odds into the terminal.
// About 10.5 s, no captions. Click, tap, Esc, Enter or "skip" skips it. Once per session; ?intro forces it; ?introt=T freezes.
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

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const easeOut = x => 1 - Math.pow(1 - x, 3);
const backOut = x => { const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const INK = '#1d2233', BLUE = '#3f6dff', RED = '#e8483b', MUTE = '#6474a3', F = '"JetBrains Mono", monospace';
function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tx(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }

// the timeline (seconds)
const T_ON = .55, T_NEWS = 1.0, CUT = .9, T_BET = 3.75, T_STAMP = 4.62, T_BACK = 4.95, T_ORBIT = 7.0, T_TERM = 6.2, T_ALIGN = 8.7, T_DIVE = 9.3, T_END = 10.45;

export async function playIntro(el, getLive) {
  try { sessionStorage.setItem('opm:intro', '1'); } catch {}
  await Promise.all([`700 40px ${F}`, `400 30px ${F}`].map(f => document.fonts.load(f))).catch(() => {});
  const canvas = el.querySelector('canvas'), flash = el.querySelector('.flash');
  const small = innerWidth < 760, aspect = innerWidth / innerHeight;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1.25 : 1.5)); renderer.setSize(innerWidth, innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .84;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xa9b8e2);
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .3;
  const std = o => new THREE.MeshStandardMaterial(o);
  const mesh = (geo, mat, x = 0, y = 0, z = 0, parent = scene) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };

  // ---------------------------------------------------------------- the room: periwinkle wall, cream desk, morning sun
  mesh(new THREE.PlaneGeometry(24, 12), std({ color: 0xa9b8e2, roughness: .95 }), 0, 4, -1.3);
  mesh(new THREE.BoxGeometry(12, .08, 2.6), std({ color: 0xe4cfa6, roughness: .7 }), 0, -.04, -.05);
  mesh(new THREE.BoxGeometry(12, .5, .06), std({ color: 0xd9cba9, roughness: .8 }), 0, -.3, 1.25);

  // ---------------------------------------------------------------- the PC
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
  const S = cv(1024, 768), sx = S.getContext('2d'), scrTex = tx(S);
  const sg = new THREE.PlaneGeometry(.6, .45, 24, 18), sp = sg.attributes.position;
  for (let i = 0; i < sp.count; i++) { const a = sp.getX(i) / .3, b = sp.getY(i) / .225; sp.setZ(i, .016 * (1 - .5 * (a * a + b * b))); }
  sg.computeVertexNormals();
  const scrMat = new THREE.MeshBasicMaterial({ map: scrTex, toneMapped: false, color: new THREE.Color(.92, .92, .92) });
  const screen = new THREE.Mesh(sg, scrMat); screen.position.set(0, .335, .118); mon.add(screen);
  const glass = new THREE.Mesh(sg, new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .05, metalness: 0, transparent: true, opacity: .08, clearcoat: 1 })); glass.position.set(0, .335, .121); mon.add(glass);
  const kb = new THREE.Group(); kb.position.set(0, .018, .43); kb.rotation.x = .05; scene.add(kb);
  mesh(new RoundedBoxGeometry(.86, .03, .27, 3, .01), plastic, 0, 0, 0, kb);
  const keys = new THREE.InstancedMesh(new THREE.BoxGeometry(.034, .014, .034), plastic2, 120); let n = 0; const M4 = new THREE.Matrix4();
  for (let r = 0; r < 6; r++) for (let c = 0; c < 20; c++) { if (r === 5 && c > 3 && c < 12) continue; M4.makeTranslation(-.38 + c * .04, .021, -.1 + r * .042); keys.setMatrixAt(n++, M4); }
  M4.makeScale(8, 1, 1).setPosition(-.06, .021, .11); keys.setMatrixAt(n++, M4); keys.count = n; keys.castShadow = keys.receiveShadow = true; kb.add(keys);
  const yesMat = new THREE.MeshStandardMaterial({ color: 0x3f6dff, roughness: .5, emissive: 0x3f6dff, emissiveIntensity: 0 });
  const yesKey = mesh(new THREE.BoxGeometry(.034, .016, .034), yesMat, .3, .022, .11, kb);
  mesh(new THREE.BoxGeometry(.034, .016, .034), std({ color: 0xe8483b, roughness: .5 }), .34, .022, .11, kb);

  // ---------------------------------------------------------------- the bet slip, printed out of the drive
  const slipC = cv(256, 1400), sl = slipC.getContext('2d');
  sl.fillStyle = '#f7f3ea'; sl.fillRect(0, 0, 256, 1400); sl.textAlign = 'center'; sl.fillStyle = '#2a2a2e';
  sl.font = `700 44px ${F}`; sl.fillText('OPM', 128, 70); sl.font = `700 22px ${F}`; sl.fillText('BET SLIP', 128, 112);
  for (let x = 16; x < 240; x += 10) sl.fillRect(x, 132, 6, 2);
  for (let i = 0; i < 22; i++) { const y = 186 + i * 52, yes = (i * 7) % 5 !== 2; sl.fillStyle = 'rgba(40,40,46,.55)'; for (let x = 24; x < 150; x += 9) sl.fillRect(x, y - 16, 6, 4); sl.textAlign = 'right'; sl.font = `700 28px ${F}`; sl.fillStyle = yes ? BLUE : RED; sl.fillText(yes ? 'YES' : 'NO', 234, y); sl.textAlign = 'center'; }
  const pts = [V(-.3, .1, .27), V(-.31, .1, .36), V(-.36, .04, .48), V(-.46, .004, .62), V(-.62, .004, .76), V(-.78, .02, .86), V(-.9, .003, 1.0)];
  const curve = new THREE.CatmullRomCurve3(pts), SEG = 80, posA = [], uv = [], idx = [];
  for (let i = 0; i <= SEG; i++) { const t = i / SEG, c = curve.getPointAt(t), tan = curve.getTangentAt(t), side = V(0, 1, 0).cross(tan).normalize().multiplyScalar(.05); side.y = 0;
    posA.push(c.x - side.x, c.y + .002, c.z - side.z, c.x + side.x, c.y + .002, c.z + side.z); uv.push(0, 1 - t, 1, 1 - t); if (i < SEG) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
  const slipG = new THREE.BufferGeometry(); slipG.setAttribute('position', new THREE.Float32BufferAttribute(posA, 3)); slipG.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); slipG.setIndex(idx); slipG.computeVertexNormals();
  slipG.setDrawRange(0, 0);
  const slip = new THREE.Mesh(slipG, std({ map: tx(slipC), roughness: .85, side: THREE.DoubleSide })); slip.castShadow = slip.receiveShadow = true; scene.add(slip);

  // ---------------------------------------------------------------- light: sun through a four-pane window, sky fill, screen glow
  const panes = tx((() => { const c = cv(512, 512), g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 512, 512); g.fillStyle = '#fff'; const m = 60, b = 18; for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) g.fillRect(m + i * (512 - 2 * m + b) / 2, m + j * (512 - 2 * m + b) / 2, (512 - 2 * m - b) / 2, (512 - 2 * m - b) / 2); g.filter = 'blur(3px)'; g.drawImage(c, 0, 0); return c; })());
  const sun = new THREE.SpotLight(0xfff1d6, 26, 0, .5, .5, 1.4); sun.position.set(-1.6, 2.9, 3.3); sun.target.position.set(0, 1.25, -1.25); sun.map = panes;
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -.0008; sun.shadow.radius = 5; scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight(0xdde5ff, 0xb89e72, .55));
  const key = new THREE.DirectionalLight(0xfff0dc, .95); key.position.set(-2, 3, 3); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.camera.left = key.shadow.camera.bottom = -3; key.shadow.camera.right = key.shadow.camera.top = 3; key.shadow.radius = 4; key.shadow.bias = -.0006; scene.add(key);
  const glow = new THREE.PointLight(0x9fb4ff, .35, 1.4, 2); glow.position.set(0, .62, .7); scene.add(glow);

  // shafts of sun and the dust floating in them
  const shaftTex = tx((() => { const c = cv(64, 256), g = c.getContext('2d'); const a = g.createLinearGradient(0, 0, 0, 256); a.addColorStop(0, 'rgba(255,246,226,0)'); a.addColorStop(.25, 'rgba(255,246,226,1)'); a.addColorStop(.8, 'rgba(255,246,226,.7)'); a.addColorStop(1, 'rgba(255,246,226,0)'); g.fillStyle = a; g.fillRect(0, 0, 64, 256); g.globalCompositeOperation = 'destination-in'; const b = g.createLinearGradient(0, 0, 64, 0); b.addColorStop(0, 'rgba(0,0,0,0)'); b.addColorStop(.5, 'rgba(0,0,0,1)'); b.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = b; g.fillRect(0, 0, 64, 256); return c; })());
  const sunDir = sun.target.position.clone().sub(sun.position).normalize(), shafts = [];
  [[-.55, .05, .55, .07], [-.1, .1, .4, .05], [-.95, -.05, .7, .045], [-.3, .25, .3, .04]].forEach(([dx, dy, w, op]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 4.4), new THREE.MeshBasicMaterial({ map: shaftTex, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    m.userData.c = sun.position.clone().add(sunDir.clone().multiplyScalar(2.6)).add(V(dx, dy, 0)); m.userData.op = op; scene.add(m); shafts.push(m); });
  const DUST = 420, dpos = new Float32Array(DUST * 3), dseed = new Float32Array(DUST);
  for (let i = 0; i < DUST; i++) { dpos[i * 3] = -1.7 + Math.random() * 2.6; dpos[i * 3 + 1] = Math.random() * 2.1; dpos[i * 3 + 2] = -1 + Math.random() * 2.6; dseed[i] = Math.random() * 100; }
  const dgeo = new THREE.BufferGeometry(); dgeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  const dot = tx((() => { const c = cv(32, 32), g = c.getContext('2d'), r = g.createRadialGradient(16, 16, 0, 16, 16, 16); r.addColorStop(0, 'rgba(255,250,236,1)'); r.addColorStop(1, 'rgba(255,250,236,0)'); g.fillStyle = r; g.fillRect(0, 0, 32, 32); return c; })());
  const dust = new THREE.Points(dgeo, new THREE.PointsMaterial({ size: .014, map: dot, transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); scene.add(dust);
  const base = dpos.slice();

  // ---------------------------------------------------------------- the screen, drawn every frame
  const FALL = [{ q: 'The world is placing its bets', yes: null, cat: 'LIVE', geo: null }];
  let ST = null;
  const stories = () => {
    if (!ST) { const s = (getLive && getLive() || []).filter(e => e && e.title && e.lead && e.lead.yes != null).slice(0, 8).map(e => ({ q: e.title, yes: e.lead.yes, cat: (e.cats && e.cats[0]) || 'world', geo: geoOf(e.title + ' ' + e.lead.q) })); if (s.length) ST = s; }
    return ST || FALL;
  };
  const MAP = []; LAND.forEach((row, j) => { if (j % 2) return; for (let i = 0; i < row.length; i += 2) if (row[i] === 'X') MAP.push([i, j]); });   // every other cell, for a TV-sized dotted map
  const NOISE = [0, 1, 2].map(() => { const c = cv(256, 192), g = c.getContext('2d'), d = g.createImageData(256, 192); for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255 | 0; d.data[i] = v; d.data[i + 1] = v; d.data[i + 2] = v + 10; d.data[i + 3] = 255; } g.putImageData(d, 0, 0); return c; });
  function wrap(g, text, maxW) { const w = String(text).split(/\s+/), out = []; let cur = ''; for (const x of w) { const t = cur ? cur + ' ' + x : x; if (g.measureText(t).width > maxW && cur) { out.push(cur); cur = x; } else cur = t; } if (cur) out.push(cur); return out; }
  const clock = () => new Date().toLocaleTimeString('en-GB', { hour12: false });

  function powerOn(T) {                                  // a CRT warming up: a dot, a line, the full raster
    const g = sx, W = 1024, H = 768; g.fillStyle = '#05060a'; g.fillRect(0, 0, W, H);
    const k1 = easeOut(clamp(T / .16)), k2 = easeOut(clamp((T - .16) / .26)), w = W * k1, h = Math.max(3, H * k2);
    const r = g.createLinearGradient(0, H / 2 - h / 2, 0, H / 2 + h / 2); r.addColorStop(0, 'rgba(210,222,255,.0)'); r.addColorStop(.5, 'rgba(250,252,255,1)'); r.addColorStop(1, 'rgba(210,222,255,0)');
    g.fillStyle = k2 > 0 ? r : '#fff'; g.fillRect((W - w) / 2, H / 2 - h / 2, w, h);
    if (T > .38) { g.globalAlpha = clamp((T - .38) / .17); g.imageSmoothingEnabled = false; g.drawImage(NOISE[(T * 30 | 0) % 3], 0, 0, W, H); g.globalAlpha = 1; }
  }
  function tuneIn(T) {                                   // static, then the channel locks on the opm news ident
    const g = sx, W = 1024, H = 768, t = T - T_ON;
    g.imageSmoothingEnabled = false; g.drawImage(NOISE[(T * 30 | 0) % 3], 0, 0, W, H); g.imageSmoothingEnabled = true;
    const roll = (t * 1900) % H; g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, roll, W, 60);
    if (t > .2) {                                        // the ident punches in
      const k = clamp((t - .2) / .12), j = (1 - k) * 18; g.save(); g.globalAlpha = .4 + .6 * k;
      g.fillStyle = BLUE; g.fillRect(j, 0, W, H); g.fillStyle = 'rgba(255,255,255,.08)'; for (let x = 0; x < W; x += 32) for (let y = 0; y < H; y += 32) g.fillRect(x, y, 3, 3);
      g.font = `700 200px ${F}`; g.fillStyle = '#fff'; const tw = g.measureText('opm').width, x0 = (W - tw - 60) / 2; g.fillText('opm', x0 + j, 430); g.fillRect(x0 + tw + 20 + j, 280, 44, 150);
      g.font = `400 40px ${F}`; g.textAlign = 'center'; g.fillText('news · world desk', W / 2 + j, 520); g.textAlign = 'left'; g.restore();
      if (k < 1) { g.globalAlpha = .5 * (1 - k); g.drawImage(NOISE[(T * 30 + 1 | 0) % 3], 0, 0, W, H); g.globalAlpha = 1; }
    }
  }
  function storyAt(i) { const s = stories(); return s[i % s.length]; }
  function drawStory(st, lt, T, first) {                  // one live question, the way a news set would show it
    const g = sx, W = 1024, H = 768;
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#f4f7ff'); bg.addColorStop(1, '#dbe4fb'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    // the map inset: the dotted world, with the place this story is happening in
    const mx = 560, my = 196, mw = 420, mh = 172, sx2 = mw / 100, sy2 = mh / 41;
    g.fillStyle = 'rgba(63,109,255,.2)'; for (const [i, j] of MAP) { g.fillRect(mx + (i / 2) * sx2, my + (j / 2) * sy2, 2.4, 2.4); }
    if (st.geo) { const px = mx + ((st.geo.lon + 180) / 360) * mw, py = my + ((78 - st.geo.lat) / 140) * mh, pr = (lt * 1.6) % 1;
      g.strokeStyle = `rgba(232,72,59,${1 - pr})`; g.lineWidth = 3; g.beginPath(); g.arc(px, py, 6 + pr * 34, 0, 7); g.stroke();
      g.fillStyle = RED; g.beginPath(); g.arc(px, py, 6, 0, 7); g.fill(); g.font = `700 20px ${F}`; g.fillStyle = INK; const nm = st.geo.name.toUpperCase(); g.fillText(nm, Math.min(px + 14, mx + mw - g.measureText(nm).width), Math.max(my + 14, py - 12)); }
    else { const a = (lt * 2.4) % (Math.PI * 2), cx = mx + mw / 2, cy = my + mh / 2; g.strokeStyle = 'rgba(63,109,255,.35)'; g.lineWidth = 2; g.beginPath(); g.ellipse(cx, cy, mw * .46, mh * .3, -.18, 0, 7); g.stroke();
      g.fillStyle = BLUE; g.beginPath(); g.arc(cx + Math.cos(a) * mw * .46 * Math.cos(-.18) - Math.sin(a) * mh * .3 * Math.sin(-.18), cy + Math.cos(a) * mw * .46 * Math.sin(-.18) + Math.sin(a) * mh * .3 * Math.cos(-.18), 8, 0, 7); g.fill(); }
    // channel strip (revealed on the pull back)
    g.fillStyle = '#e6ecfb'; g.fillRect(0, 0, W, 88); g.fillStyle = '#c9d3ef'; g.fillRect(0, 88, W, 3);
    g.font = `700 28px ${F}`; g.fillStyle = INK; g.fillText('opm', 40, 56); g.fillStyle = BLUE; g.fillRect(108, 33, 12, 28);
    g.font = `400 24px ${F}`; g.fillStyle = MUTE; g.fillText('news · world desk', 140, 55); g.textAlign = 'right'; g.fillText(clock(), W - 40, 55); g.textAlign = 'left';
    // the bug
    g.fillStyle = RED; g.fillRect(0, 116, 286, 56); g.fillStyle = '#fff'; g.font = `700 32px ${F}`; g.fillText('BREAKING', 30, 155);
    const cat = String(st.cat).toUpperCase(); g.font = `700 26px ${F}`; const cw = g.measureText(cat).width + 44;
    g.fillStyle = INK; g.fillRect(286, 116, cw, 56); g.fillStyle = '#fff'; g.fillText(cat, 308, 153);
    if (Math.floor(T * 1.6) % 2 === 0) { g.fillStyle = RED; g.beginPath(); g.arc(W - 128, 144, 11, 0, 7); g.fill(); }
    g.font = `700 28px ${F}`; g.fillStyle = RED; g.fillText('LIVE', W - 108, 154);
    // the headline slides in
    const a = first ? easeOut(clamp(lt / .3)) : 1; g.save(); g.globalAlpha = a; g.translate(-(1 - a) * 40, 0);
    let fs = 52, ls; for (fs of [52, 46, 40, 36]) { g.font = `700 ${fs}px ${F}`; ls = wrap(g, st.q, 488); if (ls.length <= 3) break; }
    if (ls.length > 3) { ls.length = 3; ls[2] = ls[2].replace(/\s*\S*$/, '') + '…'; } g.fillStyle = INK; ls.forEach((l, i) => g.fillText(l, 56, 238 + fs * .9 + i * fs * 1.2)); g.restore();
    if (st.yes != null) {
      const y = 430, x0 = 56, w = W - 112, k = easeOut(clamp((lt - .1) / .6)) * st.yes, yp = Math.round(st.yes * 100);
      g.fillStyle = 'rgba(232,72,59,.88)'; g.beginPath(); g.roundRect(x0, y, w, 28, 14); g.fill();
      g.fillStyle = BLUE; g.beginPath(); g.roundRect(x0, y, Math.max(28, w * k), 28, 14); g.fill();
      g.font = `700 30px ${F}`; g.fillStyle = BLUE; g.fillText(`yes ${Math.round(k / Math.max(.001, st.yes) * yp)}%`, x0, y + 66); g.textAlign = 'right'; g.fillStyle = RED; g.fillText(`no ${100 - yp}%`, x0 + w, y + 66); g.textAlign = 'left';
    }
    // the crawl, inside the crop
    const s = stories(); g.fillStyle = BLUE; g.fillRect(0, 604, W, 62); g.fillStyle = '#fff'; g.font = `700 28px ${F}`;
    const crawl = s.map(x => x.yes != null ? `${x.q.toUpperCase()}  ${Math.round(x.yes * 100)}% YES` : x.q.toUpperCase()).join('   ·   ') + '   ·   ';
    const cwid = g.measureText(crawl).width, off = (T * 230) % cwid; g.fillText(crawl + crawl, 24 - off, 645);
    // odds strip (revealed on the pull back)
    g.fillStyle = '#e6ecfb'; g.fillRect(0, 676, W, H - 676);
    s.slice(1, 4).forEach((x, i) => { const px = 40 + i * 330; g.font = `400 20px ${F}`; g.fillStyle = MUTE; g.fillText(String(x.cat).toUpperCase(), px, 712);
      g.font = `700 24px ${F}`; g.fillStyle = x.yes != null && x.yes >= .5 ? BLUE : RED; g.fillText(x.yes != null ? Math.round(x.yes * 100) + '% yes' : '—', px, 744); });
  }
  function drawNews(T) {                                  // cuts between stories, each one wiped in on a diagonal
    const g = sx, W = 1024, H = 768, t = T - T_NEWS, i = Math.max(0, Math.floor(t / CUT)), lt = t - i * CUT, last = Math.floor((T_BET - T_NEWS) / CUT);
    const idx = Math.min(i, last), cur = storyAt(idx); drawStory(cur, T >= T_BET ? T - T_NEWS - last * CUT : lt, T, idx === 0);
    const wt = idx < last ? lt - (CUT - .2) : -1;          // the wipe runs in the last .2 s of a story
    if (wt >= 0) { const k = easeOut(clamp(wt / .2)), edge = -260 + k * (W + 520);
      g.save(); g.beginPath(); g.moveTo(0, 0); g.lineTo(edge + 120, 0); g.lineTo(edge - 120, H); g.lineTo(0, H); g.closePath(); g.clip(); drawStory(storyAt(idx + 1), 0, T); g.restore();
      g.fillStyle = RED; g.beginPath(); g.moveTo(edge + 120, 0); g.lineTo(edge + 170, 0); g.lineTo(edge - 70, H); g.lineTo(edge - 120, H); g.fill();
      g.fillStyle = BLUE; g.beginPath(); g.moveTo(edge + 170, 0); g.lineTo(edge + 250, 0); g.lineTo(edge + 10, H); g.lineTo(edge - 70, H); g.fill(); }
  }
  function drawPrompt(T) {                                 // the order going in, typed on air, then the stamp
    const g = sx, W = 1024, y = 506, cmd = 'opm bet --side yes --sol 0.5', t = T - T_BET, n = t > 0 ? Math.floor(clamp(t / .7) * cmd.length) : 0, placed = T >= T_STAMP;
    g.fillStyle = 'rgba(248,250,255,.97)'; g.beginPath(); g.roundRect(56, y, W - 112, 78, 14); g.fill();
    g.strokeStyle = placed ? BLUE : '#c9d3ef'; g.lineWidth = 3; g.stroke();
    g.font = `400 28px ${F}`; g.fillStyle = MUTE; g.fillText('%', 82, y + 49); g.fillStyle = INK; const typed = cmd.slice(0, n); g.fillText(typed, 120, y + 49);
    if (!placed && Math.floor(T * 3) % 2 === 0) { g.fillStyle = BLUE; g.fillRect(124 + g.measureText(typed).width, y + 23, 15, 32); }
    if (T > T_BET + .82 && !placed) { g.font = `700 22px ${F}`; g.fillStyle = MUTE; g.textAlign = 'right'; g.fillText('↵', W - 84, y + 48); g.textAlign = 'left'; }
    if (placed) {
      const k = clamp((T - T_STAMP) / .16), s = 2.6 - 1.6 * backOut(k);
      g.save(); g.translate(W / 2 + 120, 330); g.rotate(-.13); g.scale(s, s); g.globalAlpha = clamp(k * 2.2) * .94;
      g.strokeStyle = BLUE; g.lineWidth = 10; g.beginPath(); g.roundRect(-250, -86, 500, 172, 18); g.stroke(); g.lineWidth = 3; g.beginPath(); g.roundRect(-236, -72, 472, 144, 12); g.stroke();
      g.fillStyle = BLUE; g.textAlign = 'center'; g.font = `800 76px ${F}`; g.fillText('BET PLACED', 0, 14); g.font = `700 26px ${F}`; g.fillText('YES · 0.5 SOL · ✓', 0, 56); g.restore();
    }
  }
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
    const cmd = 'opm --enter', n = Math.floor(clamp((T - 8.2) / .5) * cmd.length);
    g.font = `400 30px ${F}`; g.fillStyle = MUTE; g.fillText('anon@opm-lab ~ %', 58, H - 66); const px = 58 + g.measureText('anon@opm-lab ~ % ').width;
    g.fillStyle = INK; g.fillText(cmd.slice(0, n), px, H - 66); if (Math.floor(T * 3) % 2 === 0) { g.fillStyle = BLUE; g.fillRect(px + g.measureText(cmd.slice(0, n)).width + 4, H - 92, 14, 32); }
    if (t < .14) { g.globalAlpha = 1 - t / .14; g.imageSmoothingEnabled = false; g.drawImage(NOISE[(T * 30 | 0) % 3], 0, 0, W, H); g.imageSmoothingEnabled = true; g.globalAlpha = 1; }   // the channel change
  }
  function finishScreen(T) {
    const g = sx, W = 1024, H = 768;
    g.fillStyle = 'rgba(20,30,70,.035)'; for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 2);
    const v = g.createRadialGradient(W / 2, H / 2, 320, W / 2, H / 2, 780); v.addColorStop(0, 'rgba(90,110,170,0)'); v.addColorStop(1, 'rgba(90,110,170,.22)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
    scrTex.needsUpdate = true;
  }
  function drawScreen(T) {
    if (T < T_ON) powerOn(T); else if (T < T_NEWS) tuneIn(T); else if (T < T_TERM) { drawNews(T); if (T >= T_BET - .4) drawPrompt(T); } else drawTerm(T);
    finishScreen(T);
  }

  // ---------------------------------------------------------------- the tunnel of live odds you fall through at the end
  const tun = new THREE.Scene(); tun.background = new THREE.Color(0xeef2fd); tun.fog = new THREE.Fog(0xeef2fd, 6, 34);
  const tcam = new THREE.PerspectiveCamera(78, aspect, .05, 80);
  const labels = () => { const s = stories(), L = ['YES', 'NO', '% opm bet', '% opm wire', 'opm▌', '◌ live', '✓ placed']; s.forEach(x => { if (x.yes != null) { L.push(`YES ${Math.round(x.yes * 100)}%`, `NO ${100 - Math.round(x.yes * 100)}%`); } L.push(x.q.length > 30 ? x.q.slice(0, 29) + '…' : x.q); }); return L; };
  let tunBuilt = false;
  function buildTunnel() {                                 // built late, so it carries the live questions
    tunBuilt = true; const L = labels(), mats = L.map(t => { const c = cv(512, 96), g = c.getContext('2d'), big = t.length < 10;
      g.font = `700 ${big ? 64 : 34}px ${F}`; g.fillStyle = /^NO|✕/.test(t) ? RED : /^YES|✓|%|opm/.test(t) ? BLUE : INK; g.textBaseline = 'middle'; g.fillText(t, 8, 50);
      return new THREE.MeshBasicMaterial({ map: tx(c), transparent: true, depthWrite: false, toneMapped: false, fog: true }); });
    for (let i = 0; i < 90; i++) { const a = i * 2.39996, r = 1.05 + (i % 5) * .28, z = -i * .62 - 1, big = i % 7 === 0, m = new THREE.Mesh(new THREE.PlaneGeometry(big ? 4.2 : 3.0, big ? .79 : .56), mats[i % mats.length]);
      m.position.set(Math.cos(a) * r, Math.sin(a) * r * .75, z); m.lookAt(0, 0, z + 6); tun.add(m); }
    const ring = new THREE.LineBasicMaterial({ color: 0x3f6dff, transparent: true, opacity: .25 });
    for (let i = 0; i < 18; i++) { const g = new THREE.BufferGeometry().setFromPoints(new THREE.EllipseCurve(0, 0, 2.3, 1.75).getPoints(64)); const l = new THREE.LineLoop(g, ring); l.position.z = -i * 3.2; tun.add(l); }
  }

  // ---------------------------------------------------------------- camera and post
  const cam = new THREE.PerspectiveCamera(aspect < 1 ? 62 : 40, aspect, .02, 60);
  const fov0 = cam.fov, SCR = V(0, .595, .07), tanV = Math.tan(THREE.MathUtils.degToRad(fov0 / 2));
  const dNear = aspect >= 1 ? Math.max(.6 * .49 / (tanV * aspect), .45 * .37 / tanV) : .6 * .53 / (tanV * aspect);
  const near = V(0, .595, .084 + dNear);
  const out1 = new THREE.CatmullRomCurve3([near.clone().add(V(0, 0, -.03)), V(0, .63, .95), aspect < 1 ? V(.9, 1.05, 2.9) : V(1.02, .98, 1.95)], false, 'centripetal');
  const in1 = new THREE.CatmullRomCurve3([out1.points[2], aspect < 1 ? V(.5, .92, 2.4) : V(.62, .84, 1.5), V(0, .62, aspect < 1 ? 1.1 : .66)], false, 'centripetal');
  const tmp = V(0, 0, 0), look = V(0, 0, 0), lookOrbit = V(-.06, .42, 0);
  const composer = new EffectComposer(renderer), rp = new RenderPass(scene, cam); composer.addPass(rp);
  const bokeh = new BokehPass(scene, cam, { focus: dNear, aperture: .0035, maxblur: .006 }); bokeh.enabled = !small; composer.addPass(bokeh);
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), .16, .4, .95));
  const rgb = new ShaderPass(RGBShiftShader); rgb.uniforms.amount.value = 0; composer.addPass(rgb);
  const vig = new ShaderPass(VignetteShader); vig.uniforms.offset.value = .62; vig.uniforms.darkness.value = 1; composer.addPass(vig);
  const hideForDepth = [dust, glass, ...shafts], bokehRender = bokeh.render.bind(bokeh);   // see-through things stay out of the depth pass
  bokeh.render = (...a) => { const v = hideForDepth.map(o => o.visible); hideForDepth.forEach(o => o.visible = false); bokehRender(...a); hideForDepth.forEach((o, i) => o.visible = v[i]); };
  composer.addPass(new OutputPass());
  const fit = () => { renderer.setSize(innerWidth, innerHeight, false); composer.setSize(innerWidth, innerHeight); cam.aspect = tcam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); tcam.updateProjectionMatrix(); };
  addEventListener('resize', fit);
  renderer.shadowMap.needsUpdate = true;

  const DEBUG = new URLSearchParams(location.search).get('introt');
  let t0 = 0, done = false, raf = 0, nf = 0, inTunnel = false;
  const skip = el.querySelector('.skip');
  return new Promise(resolve => {
    const finish = () => {
      if (done) return; done = true; el.classList.add('out'); resolve();
      setTimeout(() => { cancelAnimationFrame(raf); removeEventListener('resize', fit); renderer.dispose(); el.remove(); }, 900);
    };
    if (!DEBUG) { el.addEventListener('pointerdown', finish); if (skip) skip.addEventListener('click', finish); addEventListener('keydown', e => { if (['Escape', 'Enter', ' '].includes(e.key)) finish(); }); }
    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (!t0) { t0 = now; el.classList.add('on'); }
      const T = DEBUG ? +DEBUG : (now - t0) / 1000;
      drawScreen(T);
      // the room reacts: the screen lights the desk, the key goes down, the slip prints, dust drifts in the sun
      glow.intensity = T < T_ON ? .35 * clamp((T - .2) / .3) : .35 + (T >= T_STAMP && T < T_STAMP + .3 ? .5 * (1 - (T - T_STAMP) / .3) : 0);
      const pr = clamp((T - 5.0) / 1.8); slipG.setDrawRange(0, Math.floor(easeOut(pr) * SEG) * 6); if (T > 5.0 && T < 7.0) renderer.shadowMap.needsUpdate = true;
      const down = T > T_STAMP - .14 && T < T_STAMP + .08; yesKey.position.y = down ? .012 : .022; yesMat.emissiveIntensity = T > T_STAMP - .14 && T < T_STAMP + .9 ? .9 * (1 - clamp((T - T_STAMP) / .9)) : 0;
      ledA.visible = !(T > 5 && T < 6.8 && Math.floor(T * 10) % 2);
      for (let i = 0; i < DUST; i++) { const s = dseed[i]; dpos[i * 3] = base[i * 3] + Math.sin(T * .3 + s) * .06; dpos[i * 3 + 1] = base[i * 3 + 1] + Math.sin(T * .22 + s * 1.7) * .05 + T * .008; dpos[i * 3 + 2] = base[i * 3 + 2] + Math.cos(T * .25 + s) * .05; }
      dgeo.attributes.position.needsUpdate = true; dust.visible = T > T_BACK; glass.material.opacity = .05 * clamp((T - T_BACK) / .5);
      // camera: inside the news, the stamp shakes it, back out through the glass, round the PC, back in, then the dive
      let fov = fov0, focus = 1;
      if (T < T_BET) { const k = T / T_BET; cam.position.set(Math.sin(T * .4) * .005, near.y, near.z - k * .02); look.copy(SCR); }
      else if (T < T_BACK) { cam.position.set(0, near.y, near.z - .02 - clamp((T - T_BET) / .9) * .01); look.copy(SCR);
        if (T > T_STAMP) { const a = .007 * (1 - clamp((T - T_STAMP) / .33)); cam.position.x += Math.sin(T * 95) * a; cam.position.y += Math.cos(T * 77) * a; } }
      else if (T < T_ORBIT) { const k = ease(clamp((T - T_BACK) / (T_ORBIT - T_BACK))); out1.getPointAt(k, cam.position); look.lerpVectors(SCR, lookOrbit, easeOut(clamp(k * 1.4))); }
      else if (T < T_ALIGN) { const k = ease(clamp((T - T_ORBIT) / (T_ALIGN - T_ORBIT))); in1.getPointAt(k, cam.position); look.lerpVectors(lookOrbit, SCR, k); }
      else { const k = clamp((T - T_ALIGN) / (T_DIVE - T_ALIGN)), e = k * k * k; cam.position.lerpVectors(in1.points[2], V(0, .595, .13), e); look.copy(SCR); fov = fov0 + 26 * e; }
      cam.lookAt(look); if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
      focus = cam.position.distanceTo(V(0, .5, .06)); bokeh.uniforms.focus.value = focus; bokeh.uniforms.aperture.value = T > T_BACK && T < T_ALIGN ? .0035 : .0012;
      // the glass: a chromatic tear as the camera passes through it, and again on the dive
      const passGlass = T > T_BACK && T < T_BACK + .6 ? Math.sin(clamp((T - T_BACK) / .6) * Math.PI) : 0, dive = T > T_ALIGN ? clamp((T - T_ALIGN) / (T_DIVE - T_ALIGN)) : 0;
      rgb.uniforms.amount.value = .0035 * passGlass + .012 * dive * dive + (T < T_NEWS && T > T_ON ? .004 : 0); rgb.uniforms.angle.value = T * .7;
      for (const m of shafts) { const c = m.userData.c, y = sunDir, toCam = cam.position.clone().sub(c), z = toCam.sub(y.clone().multiplyScalar(toCam.dot(y))).normalize(), x = V(0, 0, 0).crossVectors(y, z);
        m.position.copy(c); m.quaternion.setFromRotationMatrix(M4.makeBasis(x, y, z)); m.material.opacity = m.userData.op * (T < T_BACK ? 0 : clamp((T - T_BACK) / .8)); }
      // the tunnel takes over after the dive's flash
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
