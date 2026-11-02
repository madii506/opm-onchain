// opm: an onchain prediction terminal. Live questions and odds from Polymarket's public APIs, a command line,
// a bet slip that pays in SOL, and a launcher that turns any question into a pump.fun coin that takes a side.
import { geoOf } from './geo.js';
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const GAMMA = 'https://gamma-api.polymarket.com', CLOB = 'https://clob.polymarket.com', DATA = 'https://data-api.polymarket.com';
const TAGS = ['', 'politics', 'crypto', 'sports', 'geopolitics', 'tech', 'pop-culture', 'economy', 'world'];
const CATS = [
  ['politics', /(?<!geo)politic|election|midterm|senate|congress|president|trump|governor|parliament|prime.minister|\bvote|democrat|republican/],
  ['crypto', /crypto|bitcoin|\bbtc\b|ethereum|\beth\b|solana|\bsol\b|\bxrp\b|doge|memecoin|airdrop|token|stablecoin|coinbase|binance/],
  ['sports', /sport|\bnba\b|\bnfl\b|\bmlb\b|\bnhl\b|soccer|football|tennis|\bufc\b|boxing|\bf1\b|formula|golf|cricket|esports|champions|premier.league|la.liga|world.cup|olympic|ncaa|super.bowl|playoff/],
  ['world', /geopolitic|\bwar\b|military|middle.east|ukraine|russia|china|iran|israel|ceasefire|nato|strike|invade|venezuela|taiwan|gaza/],
  ['tech', /\btech|\bai\b|openai|\bgpt|apple|google|tesla|spacex|science|nvidia|anthropic|grok|robot/],
  ['culture', /culture|music|movie|film|oscar|grammy|celebrit|netflix|award|album|youtube|tiktok|taylor|spotify|box.office/],
  ['economy', /econom|\bfed\b|interest.rate|rate.cut|inflation|recession|\bgdp\b|stock|s&p|nasdaq|finance|business|\bipo\b|earnings|tariff|unemployment/],
];
const EXCL = /up or down|\bupdown\b/i;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------------------------------------------------------------- helpers
function get(u, o = {}) { const c = new AbortController(), t = setTimeout(() => c.abort(), o.t || 14000); return fetch(u, { ...o, signal: c.signal }).then(async r => { clearTimeout(t); if (!r.ok) { let m = 'http ' + r.status; try { const j = await r.json(); m = j.error || j.message || m; } catch {} throw new Error(m); } return r.json(); }); }
const b64d = s => Uint8Array.from(atob(s), c => c.charCodeAt(0)), b64e = u => { let s = ''; for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); };
const post = (u, o, t = 30000) => get(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(o), t });
const J = s => { try { return typeof s === 'string' ? JSON.parse(s) : (s || []); } catch { return []; } };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pct = p => p == null ? '—' : p < .01 && p > 0 ? '<1' : p > .99 && p < 1 ? '>99' : Math.round(p * 100) + '';
const cents = p => p == null ? '—' : (p * 100 < 1 ? (p * 100).toFixed(1) : Math.round(p * 100)) + '¢';
const usd = v => !isFinite(v) ? '—' : v >= 1e9 ? '$' + (v / 1e9).toFixed(2) + 'B' : v >= 1e6 ? '$' + (v / 1e6).toFixed(2) + 'M' : v >= 1e3 ? '$' + (v / 1e3).toFixed(1) + 'K' : '$' + Math.round(v);
const ago = s => { const d = Math.max(0, Date.now() / 1000 - s); return d < 60 ? Math.floor(d) + 's' : d < 3600 ? Math.floor(d / 60) + 'm' : d < 86400 ? Math.floor(d / 3600) + 'h' : Math.floor(d / 86400) + 'd'; };
const left = iso => { if (!iso) return ''; const d = (new Date(iso) - Date.now()) / 864e5; return d < 0 ? 'resolving' : d < 1 ? 'ends <1d' : d < 60 ? `ends ${Math.round(d)}d` : 'ends ' + new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); };
let toastT; function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2800); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------------------------------------------------------------- data
function shapeMarket(m) {
  const out = J(m.outcomes), px = J(m.outcomePrices).map(Number), tok = J(m.clobTokenIds);
  let yi = out.findIndex(o => /^yes$/i.test(o)); if (yi < 0) yi = 0;
  return { id: m.id, q: m.question, slug: m.slug, cid: m.conditionId, label: m.groupItemTitle || '', yes: isFinite(px[yi]) ? px[yi] : null, no: isFinite(px[1 - yi]) ? px[1 - yi] : null,
    yesName: out[yi] || 'Yes', noName: out[1 - yi] || 'No', tok: tok[yi], tokNo: tok[1 - yi], v24: +m.volume24hr || 0, vol: +m.volumeNum || +m.volume || 0, end: m.endDate, d1: +m.oneDayPriceChange || 0 };
}
function shapeEvent(e) {
  const ms = (e.markets || []).filter(m => !m.closed && m.active !== false && m.archived !== true).map(shapeMarket).filter(m => m.yes != null);
  if (!ms.length) return null;
  const lead = ms.length > 1 ? [...ms].sort((a, b) => b.yes - a.yes || b.v24 - a.v24)[0] : ms[0];   // a multi-outcome question leads with its favourite
  const text = ((e.tags || []).map(t => t.slug || t.label || '').join(' ') + ' ' + e.title + ' ' + lead.q).toLowerCase();
  const cats = CATS.filter(c => c[1].test(text)).map(c => c[0]);
  return { id: String(e.id), slug: e.slug, title: e.title, img: e.image || e.icon || '', v24: +e.volume24hr || ms.reduce((s, m) => s + m.v24, 0), vol: +e.volume || 0, end: e.endDate, ms, lead, cats: cats.length ? cats : ['world'] };
}
let EV = [], BY = new Map();
async function load() {
  const res = await Promise.allSettled(TAGS.map(t => get(`${GAMMA}/events?${t ? 'tag_slug=' + t + '&' : ''}active=true&closed=false&archived=false&order=volume24hr&ascending=false&limit=${t ? 40 : 100}`)));
  const seen = new Map();
  for (const r of res) if (r.status === 'fulfilled' && Array.isArray(r.value)) for (const e of r.value) seen.set(String(e.id), e);
  if (!seen.size) throw new Error('no data');
  const out = [];
  for (const e of seen.values()) { if (!e.title || EXCL.test(e.title) || (e.endDate && new Date(e.endDate) < Date.now() - 864e5 * 2)) continue; const s = shapeEvent(e); if (s) out.push(s); }
  return out.sort((a, b) => b.v24 - a.v24);
}
const qOf = e => e.ms.length > 1 && e.lead.label ? e.title.replace(/\?$/, '') + ' · ' + e.lead.label : e.title;
const hist = new Map();
const FID = { '1d': 10, '1w': 120, '1m': 360, max: 1440 };
function priceHist(tok, range = '1w') { const k = tok + range; if (!hist.has(k)) hist.set(k, get(`${CLOB}/prices-history?market=${tok}&interval=${range}&fidelity=${FID[range] || 120}`).then(r => (r.history || []).map(h => [h.t, +h.p])).catch(() => { hist.delete(k); return []; })); return hist.get(k); }
function sparkPath(h, W = 100, H = 32, pad = 2) { const ys = h.map(p => p[1]), lo = Math.min(...ys), hi = Math.max(...ys), sp = Math.max(.01, hi - lo); return h.map(([, p], i) => `${(i / (h.length - 1) * W).toFixed(2)},${(H - pad - (p - lo) / sp * (H - pad * 2)).toFixed(2)}`).join(' '); }

// ---------------------------------------------------------------- scroll: progress, reveals, staggers, typed headers, nav
const prog = $('.prog'), tsk = $('#tsk'), heroL = $('.hero .hg > div:first-child'), fab = $('#fab');
const pin = $('#how'), track = $('#htrack'), steps = $$('#htrack .s'), rf = $('#rail-fill'), rd = $('#rail-dot');
const cl = (x, a, b) => Math.min(b, Math.max(a, x));
let sq = false, lastY = scrollY, vel = 0, skT;
const pinned = () => matchMedia('(min-width:901px) and (min-height:681px)').matches;
function pinStep() {                                   // 04 · the cycle: pinned, the steps slide by as you scroll
  if (!track) return;
  if (!pinned()) { track.style.transform = ''; steps.forEach(s => { if (s.getBoundingClientRect().top < innerHeight * .85) s.classList.add('on'); }); return; }
  const r = pin.getBoundingClientRect(), total = Math.max(1, pin.offsetHeight - (innerHeight - 64)), p = cl((64 - r.top) / total, 0, 1);
  const shift = Math.max(0, track.scrollWidth - track.parentElement.clientWidth);
  track.style.transform = `translate3d(${(-p * shift).toFixed(1)}px,0,0)`; rf.style.transform = `scaleX(${p.toFixed(4)})`; rd.style.left = (p * 100).toFixed(2) + '%';
  const vis = r.top < innerHeight * .7 && r.bottom > 0; steps.forEach((s, i) => s.classList.toggle('on', vis && p >= i / steps.length - .03));
}
function onScroll() {
  sq = false; const y = scrollY, m = document.documentElement.scrollHeight - innerHeight;
  prog.style.transform = `scaleX(${m > 0 ? Math.min(1, y / m) : 0})`;
  vel = vel * .5 + (y - lastY) * .5; lastY = y;
  if (!reduce) {
    tsk.style.transform = `skewX(${cl(-vel * .12, -9, 9).toFixed(2)}deg)`; clearTimeout(skT); skT = setTimeout(() => { vel = 0; tsk.style.transform = ''; }, 140);
    if (y < innerHeight * 1.3) { heroL.style.transform = `translate3d(0,${(y * .16).toFixed(1)}px,0)`; heroL.style.opacity = Math.max(0, 1 - y / (innerHeight * .85)).toFixed(3);
      const tb = $('#termbox'); if (!tb.matches(':hover')) tb.style.transform = y > 2 ? `translate3d(0,${(y * .06).toFixed(1)}px,0) rotate(${(y * .003).toFixed(3)}deg)` : ''; }
  }
  pinStep(); fab.classList.toggle('on', y > innerHeight * 1.1);
  if (!reduce) for (const b of nums) { const r = b.getBoundingClientRect(); if (r.bottom > 0 && r.top < innerHeight) b.style.setProperty('--py', ((r.top - innerHeight / 2) * -.18).toFixed(1) + 'px'); }
}
const nums = $$('section.blk[data-n]');
function scramble(el, delay = 0) {                     // the headline decodes itself, terminal style
  const to = el.dataset.t, G = '█▓▒░<>/\\|%$#01'; if (!to || reduce) return; let f = 0; const n = 26;
  setTimeout(() => { const t = setInterval(() => { f++; el.textContent = [...to].map((c, i) => f > n * (i + 1) / to.length ? c : G[(Math.random() * G.length) | 0]).join(''); if (f >= n) { clearInterval(t); el.textContent = to; } }, 32); }, delay);
}
addEventListener('scroll', () => { if (!sq) { sq = true; requestAnimationFrame(onScroll); } }, { passive: true });
addEventListener('resize', () => requestAnimationFrame(onScroll));
$$('.i4 .dots').forEach(d => d.innerHTML = Array.from({ length: 36 }, (_, i) => `<i style="--d:${(i * .04 + (i % 3) * .02).toFixed(2)}s"></i>`).join(''));
fab.addEventListener('click', () => { scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); setTimeout(() => $('#cmd').focus({ preventScroll: true }), 700); });
function typeIt(el) { const s = el.dataset.ty; if (!s || reduce) return; el.textContent = ''; let i = 0; const t = setInterval(() => { el.textContent = s.slice(0, ++i); if (i >= s.length) { clearInterval(t); el.style.borderRightColor = 'transparent'; } }, 34); }
const io = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; e.target.classList.add('in'); io.unobserve(e.target); $$('.ty', e.target).forEach(typeIt); $$('.yn i[data-w]', e.target).forEach(i => i.style.width = i.dataset.w); }), { threshold: .14 });
$$('.rv').forEach(el => io.observe(el));
function cntUp(el) { const to = +el.dataset.cnt, t0 = performance.now(); if (reduce || !(to > 0)) return; const f = now => { const k = Math.min(1, (now - t0) / 900); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(f); }; el.textContent = '0'; requestAnimationFrame(f); }
const stIO = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; e.target.classList.add('in'); stIO.unobserve(e.target); $$('[data-cnt]', e.target).forEach(cntUp); }), { threshold: .06 });
function stagger(sel, root = document, step = .05) { if (reduce) return; $$(sel, root).forEach((el, i) => { if (el.classList.contains('in')) return; el.classList.add('st'); el.style.setProperty('--d', ((i % 9) * step).toFixed(2) + 's'); stIO.observe(el); }); }
stagger('.faq details', document, .06);
const navIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) $$('.nav a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id)); }), { rootMargin: '-45% 0px -50% 0px' });
$$('section.blk').forEach(s => navIO.observe(s));
function countUp(el, to, fmt) { const from = +el.dataset.v || 0; el.dataset.v = to; if (reduce) { el.textContent = fmt(to); return; } const t0 = performance.now(); const st = now => { const k = Math.min(1, (now - t0) / 1000), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(from + (to - from) * e); if (k < 1) requestAnimationFrame(st); }; requestAnimationFrame(st); }
$('#termbox').addEventListener('pointermove', e => { if (reduce) return; const r = e.currentTarget.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; e.currentTarget.style.transform = `perspective(1200px) rotateY(${x * 3}deg) rotateX(${-y * 3}deg)`; });
$('#termbox').addEventListener('pointerleave', e => { e.currentTarget.style.transform = ''; });

$$('.ctas .btn, #b-go, #l-go').forEach(b => { b.addEventListener('pointermove', e => { if (reduce || e.pointerType !== 'mouse') return; const r = b.getBoundingClientRect(); b.style.transform = `translate(${((e.clientX - r.left) / r.width - .5) * 8}px,${((e.clientY - r.top) / r.height - .5) * 6 - 2}px)`; }); b.addEventListener('pointerleave', () => { b.style.transform = ''; }); });

// ---------------------------------------------------------------- the ticker
function ticker() {
  const items = EV.slice(0, 24).map(e => `<span>${esc(qOf(e))} <b>${pct(e.lead.yes)}% yes</b>${e.lead.d1 ? ` <em class="${e.lead.d1 > 0 ? 'up' : 'dn'}">${e.lead.d1 > 0 ? '▲' : '▼'}${Math.abs(e.lead.d1 * 100).toFixed(1)}</em>` : ''}</span>`).join('');
  $('#tick').innerHTML = items + items;
}

// ---------------------------------------------------------------- the terminal
const out = $('#out'), cmd = $('#cmd'), hist2 = []; let hi = -1;
function line(html, cls = '') { const d = document.createElement('div'); if (cls) d.className = cls; d.innerHTML = html; out.appendChild(d); out.scrollTop = out.scrollHeight; return d; }
async function typeLine(text, cls = '', speed = 14) { const d = line('', cls); if (reduce) { d.textContent = text; return; } for (let i = 1; i <= text.length; i++) { d.textContent = text.slice(0, i); out.scrollTop = out.scrollHeight; await sleep(speed); } }
const P = '<span class="c">anon@opm-lab ~ %</span> ';
function wireList(list, n = 8) {
  if (!list.length) return line('<span class="c">nothing on the wire for that. try opm topics.</span>');
  list.slice(0, n).forEach(e => { const i = EV.indexOf(e) + 1, p = (pct(e.lead.yes) + '%').padStart(4, ' ');
    line(`<span class="b">${String(i).padStart(2, '0')}</span>  <span class="k ${e.lead.yes >= .5 ? 'b' : 'r'}">${p}</span> <span class="c">yes</span>  ${esc(qOf(e))}  <span class="c">· ${esc(e.cats[0])} · ${usd(e.v24)}</span>`, 'wl'); });
  line('<span class="c">bet: opm bet &lt;n&gt; yes 0.5 · launch: opm launch &lt;n&gt;</span>', 'wl');
}
const HELP = [['opm wire [topic]', 'live questions, all or one topic'], ['opm topics', 'every topic on the wire'], ['opm odds <words>', 'search every live question'], ['opm bet <n> <yes|no> [sol]', 'open a bet slip'], ['opm launch <n> [yes|no]', 'launch a coin on it'], ['opm positions', 'your open bets'], ['opm connect', 'connect your Solana wallet'], ['clear', 'clear the screen']];
const helpLines = rows => rows.forEach(([k, v]) => line(`  <span class="b k">${esc(k.padEnd(28, ' '))}</span><span class="c">${esc(v)}</span>`, 'wl'));
async function run(raw) {
  const s = raw.trim(); if (!s) return; hist2.unshift(s); hi = -1;
  line(P + esc(s));
  const a = s.split(/\s+/), c0 = a[0].toLowerCase(), c1 = (a[1] || '').toLowerCase();
  if (c0 === 'clear') { out.innerHTML = ''; return; }
  if (c0 === 'help' || (c0 === 'opm' && (!c1 || c1 === '--help' || c1 === 'help'))) { helpLines(HELP); return; }
  if (c0 === 'whoami') return line('anon');
  if (c0 !== 'opm') return line(`<span class="r">zsh: command not found: ${esc(a[0])}</span> <span class="c">· try help</span>`);
  if (!EV.length && ['wire', 'odds', 'bet', 'launch'].includes(c1)) return line('<span class="c">the wire is still loading, one second…</span>');
  if (c1 === 'topics') { if (!EV.length) return line('<span class="c">the wire is still loading, one second…</span>'); CATS.forEach(([c]) => { const n = EV.filter(e => e.cats.includes(c)).length; if (n) line(`  <span class="b k">${c.padEnd(10, ' ')}</span><span class="c">${n} live · opm wire ${c}</span>`, 'wl'); }); return; }
  if (c1 === 'wire') { const t = (a[2] || '').toLowerCase(); return wireList(t ? EV.filter(e => e.cats.includes(t) || qOf(e).toLowerCase().includes(t)) : EV); }
  if (c1 === 'odds') { const t = a.slice(2).join(' ').toLowerCase(); return wireList(EV.filter(e => (e.title + ' ' + e.ms.map(m => m.q).join(' ')).toLowerCase().includes(t)), 10); }
  if (c1 === 'bet') { const e = EV[(+a[2] || 1) - 1]; if (!e) return line('<span class="r">no question with that number. run opm wire.</span>'); setBet(e, (a[3] || 'yes').toLowerCase() === 'no' ? 'no' : 'yes', +a[4] || null); line(`<span class="b">→</span> bet slip ready: ${esc(qOf(e))} · <span class="k">${bet.side}</span>`); $('#bet').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); return; }
  if (c1 === 'launch') { const e = EV[(+a[2] || 1) - 1]; if (!e) return line('<span class="r">no question with that number. run opm wire.</span>'); setLaunch(e, (a[3] || 'yes').toLowerCase() === 'no' ? 'no' : 'yes'); line(`<span class="b">→</span> coin drafted: <span class="k">${esc($('#l-name').value)}</span> ($${esc($('#l-sym').value)})`); $('#launch').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); return; }
  if (c1 === 'connect') { await connect(); return; }
  if (c1 === 'positions') { await positions(); return; }
  line(`<span class="r">opm: unknown command ${esc(c1)}</span> <span class="c">· try opm --help</span>`);
}
let lastType = 0;
cmd.addEventListener('keydown', e => {
  lastType = Date.now();
  if (e.key === 'Enter') { run(cmd.value); cmd.value = ''; }
  else if (e.key === 'ArrowUp') { hi = Math.min(hist2.length - 1, hi + 1); if (hist2[hi]) cmd.value = hist2[hi]; e.preventDefault(); }
  else if (e.key === 'ArrowDown') { hi = Math.max(-1, hi - 1); cmd.value = hi < 0 ? '' : hist2[hi]; e.preventDefault(); }
});
$('#chipsQ').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { run(b.dataset.c); cmd.focus({ preventScroll: true }); } });
$('#termbox').addEventListener('click', e => { if (!e.target.closest('button,a')) cmd.focus({ preventScroll: true }); });
async function boot() {
  $$('#h1 [data-t]').forEach((e, i) => scramble(e, i * 260));
  await typeLine('opm os 1.0 · onchain prediction terminal', 'c', 8);
  await typeLine('(c) opm-lab · solana mainnet · polymarket odds', 'c', 8);
  await typeLine('login: anon', '', 18);
  line(P + 'opm --help'); helpLines([HELP[0], HELP[2], HELP[3], HELP[4]]);
  line(P + 'opm wire');
  const wait = setInterval(() => { if (EV.length) { clearInterval(wait); wireList(EV, 6); } }, 200);
}

// ---------------------------------------------------------------- the wire
const st = { cat: 'all', q: '', sort: 'vol' };
function chips() { const n = c => EV.filter(e => e.cats.includes(c)).length; $('#chips').innerHTML = ['all', ...CATS.map(c => c[0]).filter(n)].map(c => `<button class="chip${st.cat === c ? ' on' : ''}" data-c="${c}">${c}<i>${c === 'all' ? EV.length : n(c)}</i></button>`).join(''); }
$('#chips').addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) { st.cat = b.dataset.c; chips(); cards(); } });
$('#q').addEventListener('input', e => { st.q = e.target.value.trim().toLowerCase(); cards(); });
$('#sort').addEventListener('change', e => { st.sort = e.target.value; cards(); });
function list() {
  const by = { vol: (x, y) => y.v24 - x.v24, move: (x, y) => Math.abs(y.lead.d1) - Math.abs(x.lead.d1), end: (x, y) => new Date(x.end || 9e15) - new Date(y.end || 9e15), odds: (x, y) => y.lead.yes - x.lead.yes };
  return EV.filter(e => (st.cat === 'all' || e.cats.includes(st.cat)) && (!st.q || (e.title + ' ' + e.ms.map(m => m.q).join(' ')).toLowerCase().includes(st.q))).sort(by[st.sort]);
}
const seen = new Set();
function card(e) {
  const m = e.lead, i = EV.indexOf(e) + 1;
  return `<article class="card${seen.has(e.id) || reduce ? '' : ' st'}" data-id="${e.id}">
    <div class="row"><span class="cat">#${i} · ${esc(e.cats[0])}</span><span class="chg ${m.d1 > 0 ? 'up' : m.d1 < 0 ? 'dn' : ''}">${m.d1 ? (m.d1 > 0 ? '▲ ' : '▼ ') + Math.abs(m.d1 * 100).toFixed(1) + ' pts' : esc(left(m.end || e.end))}</span></div>
    <h4>${esc(qOf(e))}</h4>
    <div class="row"><span class="p"><b${m.yes >= .01 && m.yes <= .99 ? ` data-cnt="${Math.round(m.yes * 100)}"` : ''}>${pct(m.yes)}</b>%<small>${esc(m.yesName.toLowerCase())}</small></span><span class="c" style="font-size:12px;color:var(--mute)">${usd(e.v24)} 24h</span></div>
    <div class="yn"><i style="width:${(m.yes * 100).toFixed(1)}%"></i></div>
    <svg class="spark" data-tok="${esc(m.tok || '')}" viewBox="0 0 100 32" preserveAspectRatio="none"></svg>
    <div class="foot"><button class="mini y" data-a="yes">bet yes ${cents(m.yes)}</button><button class="mini n" data-a="no">bet no ${cents(m.no)}</button><button class="mini l" data-a="launch">launch</button></div>
  </article>`;
}
const sparkIO = new IntersectionObserver(es => es.forEach(async en => {
  if (!en.isIntersecting) return; sparkIO.unobserve(en.target); const svg = en.target, tok = svg.dataset.tok; if (!tok) return;
  const h = await priceHist(tok); if (h.length < 3) return; const up = h[h.length - 1][1] >= h[0][1];
  svg.innerHTML = `<polyline class="l ${up ? 'u' : 'd'}" points="${sparkPath(h)}"/>`;
}), { rootMargin: '200px' });
let cardsKey = '';
function patchCard(e) {
  const c = $(`#cards .card[data-id="${e.id}"]`); if (!c) return; const m = e.lead, b = $('.p b', c), g = $('.chg', c);
  if (b) b.textContent = pct(m.yes); $('.yn i', c).style.width = (m.yes * 100).toFixed(1) + '%';
  if (g) { g.className = `chg ${m.d1 > 0 ? 'up' : m.d1 < 0 ? 'dn' : ''}`; g.textContent = m.d1 ? (m.d1 > 0 ? '▲ ' : '▼ ') + Math.abs(m.d1 * 100).toFixed(1) + ' pts' : left(m.end || e.end); }
  $('.mini.y', c).textContent = 'bet yes ' + cents(m.yes); $('.mini.n', c).textContent = 'bet no ' + cents(m.no);
}
function cards() {
  const a = list(), el = $('#cards'), key = [st.cat, st.q, st.sort, ...a.slice(0, 60).map(e => e.id)].join('|');
  if (key === cardsKey && el.querySelector('.card')) { a.slice(0, 60).forEach(patchCard); return; } cardsKey = key;
  el.innerHTML = a.length ? a.slice(0, 60).map(card).join('') : '<p class="empty">nothing matches. try another word.</p>';
  $$('.spark', el).forEach(s => sparkIO.observe(s)); stagger('.card.st', el, .04);
  $$('.card', el).forEach(c => seen.add(c.dataset.id));
}
$('#cards').addEventListener('pointermove', e => { if (reduce || e.pointerType !== 'mouse') return; const c = e.target.closest('.card'); if (!c) return; const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
  c.style.transform = `perspective(900px) rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg) translateY(-4px)`; });
$('#cards').addEventListener('pointerout', e => { const c = e.target.closest('.card'); if (c && !c.contains(e.relatedTarget)) c.style.transform = ''; });
$('#cards').addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (!b) return; const ev = BY.get(b.closest('.card').dataset.id); if (!ev) return;
  if (b.dataset.a === 'launch') { setLaunch(ev, 'yes'); $('#launch').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); } else { setBet(ev, b.dataset.a); $('#bet').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); } });
async function lead() {
  const e = EV.find(x => x.ms.length === 1) || EV[0]; if (!e) return; const m = e.lead, box = $('#lead');
  if (box.dataset.id === e.id && $('.big', box)) { $('.big', box).firstChild.textContent = pct(m.yes) + '%'; const i = $('.yn i', box); i.dataset.w = (m.yes * 100).toFixed(1) + '%'; if (box.classList.contains('in')) i.style.width = i.dataset.w; return; }
  $('#lead').innerHTML = `<div class="l"><span class="cat">top story · ${esc(e.cats[0])}</span><h3>${esc(qOf(e))}</h3>
    <div class="big">${pct(m.yes)}%<small>${esc(m.yesName.toLowerCase())}</small></div>
    <div style="margin-top:14px"><div class="yn"><i data-w="${(m.yes * 100).toFixed(1)}%"></i></div><div class="ynl"><b>yes ${cents(m.yes)}</b><b>no ${cents(m.no)}</b></div></div>
    <div class="acts" style="margin-top:18px"><button class="btn blue sm" data-a="yes">bet yes</button><button class="btn red sm" data-a="no">bet no</button><button class="btn ghost sm" data-a="launch">launch a coin on it</button></div></div>
    <div class="r"><svg class="chart" id="lead-chart" viewBox="0 0 300 120" preserveAspectRatio="none"></svg><div class="meta"><span>24h <b>${usd(e.v24)}</b></span><span>total <b>${usd(e.vol)}</b></span><span>${m.d1 ? `today <b class="${m.d1 > 0 ? 'up' : 'dn'}">${m.d1 > 0 ? '▲' : '▼'} ${Math.abs(m.d1 * 100).toFixed(1)} pts</b>` : ''}</span><span><b>${esc(left(m.end || e.end))}</b></span></div></div>`;
  $('#lead').dataset.id = e.id;
  if ($('#lead').classList.contains('in')) $$('.yn i[data-w]', $('#lead')).forEach(i => i.style.width = i.dataset.w);
  const h = await priceHist(m.tok); if (h.length > 2) { const p = sparkPath(h, 300, 120, 8); $('#lead-chart').innerHTML = `<polygon class="ar" points="0,120 ${p} 300,120"/><polyline class="ln" points="${p}"/>`; }
}
$('#lead').addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (!b) return; const ev = BY.get($('#lead').dataset.id); if (!ev) return;
  if (b.dataset.a === 'launch') { setLaunch(ev, 'yes'); $('#launch').scrollIntoView({ behavior: 'smooth' }); } else { setBet(ev, b.dataset.a); $('#bet').scrollIntoView({ behavior: 'smooth' }); } });
function stats() { $('#tlive').innerHTML = `<b>●</b> ${EV.reduce((s, e) => s + e.ms.length, 0).toLocaleString()} live${solUsd ? ' · SOL $' + solUsd.toFixed(2) : ''}`; }

// ---------------------------------------------------------------- the world: a globe of pins (world.js, loaded when you get close) and the board
let G = null; const gtip = $('#gtip'); let tipFor = null;
function tipHtml(e) { const g = geoOf(e.title + ' ' + e.lead.q); return `<small>${g ? esc(g.name.toUpperCase()) : 'IN ORBIT · ' + esc(e.cats[0].toUpperCase())}</small>${esc(qOf(e))} · <b class="${e.lead.yes < .5 ? 'r' : ''}">${pct(e.lead.yes)}% yes</b>`; }
const wio = new IntersectionObserver(async es => {
  if (!es[0].isIntersecting || G) return; wio.disconnect();
  try {
    const { mountGlobe } = await import('./world.js?v=3');
    G = mountGlobe($('#globe'), {
      onPick: e => { setBet(e, 'yes'); $('#bet').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); },
      label: e => { $$('#brows .brow').forEach(r => r.classList.toggle('hl', r.dataset.id === e.id)); },
    });
    G.onFrame((it, p) => {
      if (!it || !p || !p.vis) { gtip.classList.remove('on'); return; }
      if (tipFor !== it.e) { tipFor = it.e; gtip.innerHTML = tipHtml(it.e); }
      const box = $('#globe'); gtip.style.left = (p.x * box.clientWidth).toFixed(1) + 'px'; gtip.style.top = (p.y * box.clientHeight).toFixed(1) + 'px'; gtip.classList.add('on');
    });
    if (EV.length) G.update(EV);
  } catch (err) { $('#globe').classList.add('off'); }
}, { rootMargin: '500px' });
// the board: split-flap rows for the top questions, a new page every few seconds, digits flip when the odds move
const BD = { page: 0, rows: [], hold: false, cells: [] };
function boardText(e, i, qw) {
  const g = geoOf(e.title + ' ' + e.lead.q), place = (g ? g.name : e.cats[0]).toUpperCase().slice(0, 8).padEnd(8, ' ');
  let q = qOf(e).toUpperCase().replace(/\s+/g, ' '); q = q.length > qw ? q.slice(0, qw - 1) + '…' : q.padEnd(qw, ' ');
  return { t: String(i + 1).padStart(2, '0') + ' ' + place + ' ' + q + ' ' + (pct(e.lead.yes) + '%').padStart(4, ' '), qw };
}
function boardRender(flipAll) {
  const top = EV.slice(0, 24); if (!top.length) return; const pages = Math.ceil(top.length / 8); BD.page %= pages;
  const box = $('#brows'), cw = innerWidth <= 620 ? 12 : 13, n = Math.max(24, Math.floor((box.clientWidth - 8) / cw)), qw = Math.max(8, n - 17);
  const list = top.slice(BD.page * 8, BD.page * 8 + 8);
  if (box.children.length !== 8 || BD.qw !== qw) { BD.qw = qw; box.innerHTML = Array.from({ length: 8 }, () => `<div class="brow">${'<span class="fc"> </span>'.repeat(n)}</div>`).join(''); BD.n = n; }
  list.forEach((e, r) => {
    const row = box.children[r], { t } = boardText(e, BD.page * 8 + r, qw), cells = row.children, yes = e.lead.yes >= .5; row.dataset.id = e.id;
    for (let c = 0; c < cells.length; c++) {
      const ch = t[c] || ' ', el = cells[c], cls = c < 2 ? 'fc m' : c >= t.length - 4 ? 'fc ' + (yes ? 'b' : 'r') : c >= 3 && c < 11 ? 'fc m' : 'fc';
      if (el.textContent === ch && !flipAll) { el.className = ch === ' ' && c === 2 ? 'fc s' : cls; continue; }
      const d = reduce ? 0 : c * 14 + r * 45; setTimeout(() => { el.className = cls + ' f'; setTimeout(() => { el.textContent = ch; }, 80); setTimeout(() => el.classList.remove('f'), 175); }, d);
    }
  });
  for (let r = list.length; r < 8; r++) { const row = box.children[r]; row.dataset.id = ''; [...row.children].forEach(el => { if (el.textContent !== ' ') { el.className = 'fc f'; setTimeout(() => el.textContent = ' ', 80); } }); }
  $('#bpg').textContent = `page ${BD.page + 1}/${pages}`;
}
$('#brows').addEventListener('click', e => { const r = e.target.closest('.brow'); const ev = r && BY.get(r.dataset.id); if (ev) { setBet(ev, 'yes'); $('#bet').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); } });
$('#brows').addEventListener('mouseover', e => { const r = e.target.closest('.brow'); if (r && r.dataset.id && G) G.focus(r.dataset.id); });
$('#board').addEventListener('mouseenter', () => BD.hold = true); $('#board').addEventListener('mouseleave', () => BD.hold = false);
setInterval(() => { if (document.hidden || BD.hold || !EV.length) return; const r = $('#board').getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return; BD.page++; boardRender(true); }, 7000);
setInterval(() => { $('#bclock').textContent = new Date().toLocaleTimeString('en-GB', { hour12: false }) + ' · live'; }, 1000);
let bRS; addEventListener('resize', () => { clearTimeout(bRS); bRS = setTimeout(() => boardRender(false), 200); });

// ---------------------------------------------------------------- ⌘K: every live question, one keystroke away
const pal = $('#pal'), pq = $('#pq'), pl = $('#pl'); let palI = 0, palR = [];
function palRender() {
  const words = pq.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  palR = EV.filter(e => { const t = (e.title + ' ' + e.ms.map(m => m.q).join(' ') + ' ' + e.cats.join(' ')).toLowerCase(); return words.every(w => t.includes(w)); }).slice(0, 9); palI = 0;
  const hl = t => { let h = esc(t); for (const w of words) h = h.replace(new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>'); return h; };
  pl.innerHTML = palR.length ? palR.map((e, i) => `<button class="pi${i ? '' : ' on'}" data-i="${i}"><span class="pc">${esc(e.cats[0])}</span><span class="pq">${hl(qOf(e))}</span><b class="${e.lead.yes >= .5 ? 'up' : 'dn'}">${pct(e.lead.yes)}%</b></button>`).join('') : `<p class="pe">${EV.length ? 'nothing matches. try another word.' : 'the wire is still loading…'}</p>`;
}
function palOpen() { pal.hidden = false; pq.value = ''; palRender(); requestAnimationFrame(() => pal.classList.add('on')); setTimeout(() => pq.focus(), 30); }
function palClose() { pal.classList.remove('on'); setTimeout(() => { pal.hidden = true; }, 190); }
function palGo(i, launch) { const e = palR[i]; if (!e) return; palClose(); if (launch) { setLaunch(e, 'yes'); $('#launch').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); } else { setBet(e, 'yes'); $('#bet').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); } }
pq.addEventListener('input', palRender);
pq.addEventListener('keydown', e => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); palI = (palI + (e.key === 'ArrowDown' ? 1 : -1) + palR.length) % Math.max(1, palR.length); $$('.pi', pl).forEach((b, i) => b.classList.toggle('on', i === palI)); $$('.pi', pl)[palI]?.scrollIntoView({ block: 'nearest' }); }
  else if (e.key === 'Enter') { e.preventDefault(); palGo(palI, e.shiftKey); } else if (e.key === 'Escape') palClose();
});
pl.addEventListener('click', e => { const b = e.target.closest('.pi'); if (b) palGo(+b.dataset.i, e.shiftKey); });
pal.addEventListener('pointerdown', e => { if (e.target === pal) palClose(); });
$('#kbtn').addEventListener('click', palOpen);
addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); pal.hidden ? palOpen() : palClose(); }
  else if (e.key === '/' && pal.hidden && !/input|textarea|select/i.test(document.activeElement?.tagName || '')) { e.preventDefault(); palOpen(); }
  else if (e.key === 'Escape' && !pal.hidden) palClose();
});

// ---------------------------------------------------------------- the market panel: price chart with ranges and a live order book
const MK = { range: '1w', h: [], key: '' };
async function marketPanel() {
  const e = bet.e; if (!e) return; const m = e.lead, tok = bet.side === 'yes' ? m.tok : m.tokNo, key = tok + MK.range; if (!tok) return;
  $('#m-side').textContent = bet.side.toUpperCase() + ' PRICE'; $('#m-wrap').classList.toggle('no', bet.side === 'no');
  const h = await priceHist(tok, MK.range); if (bet.e !== e || (bet.side === 'yes' ? m.tok : m.tokNo) !== tok) return; MK.h = h; MK.key = key;
  const last = bet.side === 'yes' ? m.yes : m.no, first = h.length ? h[0][1] : last, d = (last - first) * 100;
  $('#m-px').textContent = cents(last); $('#m-chg').textContent = Math.abs(d) >= .05 ? `${d > 0 ? '▲' : '▼'} ${Math.abs(d).toFixed(1)} pts · ${MK.range === 'max' ? 'all' : MK.range}` : 'flat';
  $('#m-chg').className = d > 0 ? 'up' : d < 0 ? 'dn' : ''; $('#m-px').style.color = bet.side === 'yes' ? 'var(--blue)' : 'var(--red)';
  $('#m-chart').innerHTML = h.length > 2 ? (p => `<polygon class="ar" points="0,140 ${p} 300,140"/><polyline class="ln" points="${p}"/>`)(sparkPath(h, 300, 140, 12)) : '';
  book();
}
$('#m-tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; MK.range = b.dataset.r; $$('#m-tabs button').forEach(x => x.classList.toggle('on', x === b)); marketPanel(); });
$('#m-wrap').addEventListener('pointermove', e => {
  const h = MK.h; if (h.length < 3) return; const box = e.currentTarget, r = box.getBoundingClientRect(), f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), i = Math.round(f * (h.length - 1)), [t, p] = h[i];
  const ys = h.map(x => x[1]), lo = Math.min(...ys), hi = Math.max(...ys), sp = Math.max(.01, hi - lo), y = (140 - 12 - (p - lo) / sp * (140 - 24)) / 140;
  const x = i / (h.length - 1); $('#m-x').style.left = (x * 100) + '%'; $('#m-d').style.left = (x * 100) + '%'; $('#m-d').style.top = (y * 100) + '%';
  const tip = $('#m-tip'); tip.textContent = `${cents(p)} · ${new Date(t * 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`; tip.style.left = Math.min(Math.max(x * 100, 18), 82) + '%'; box.classList.add('hv');
});
$('#m-wrap').addEventListener('pointerleave', e => e.currentTarget.classList.remove('hv'));
async function book() {
  const e = bet.e; if (!e) return; const tok = bet.side === 'yes' ? e.lead.tok : e.lead.tokNo; if (!tok) return;
  let b; try { b = await get(`${CLOB}/book?token_id=${tok}`); } catch { $('#m-book').innerHTML = '<p class="empty" style="padding:14px">the book didn\'t answer</p>'; return; }
  if (bet.e !== e) return;
  const asks = (b.asks || []).map(x => [+x.price, +x.size]).filter(x => x[1] > 0).sort((a, c) => a[0] - c[0]).slice(0, 5), bids = (b.bids || []).map(x => [+x.price, +x.size]).filter(x => x[1] > 0).sort((a, c) => c[0] - a[0]).slice(0, 5);
  let ca = 0, cb = 0; const A = asks.map(x => [...x, ca += x[1]]), B = bids.map(x => [...x, cb += x[1]]), mx = Math.max(ca, cb, 1);
  const row = (x, c) => `<div class="bk ${c}" style="--w:${(x[2] / mx * 100).toFixed(1)}%"><span>${cents(x[0])}</span><span>${Math.round(x[1]).toLocaleString()}</span><span>${usd(x[0] * x[1])}</span></div>`;
  const spread = asks[0] && bids[0] ? asks[0][0] - bids[0][0] : null;
  $('#m-spread').textContent = spread != null ? `SPREAD ${(spread * 100).toFixed(1)}¢` : '';
  $('#m-book').innerHTML = `<div class="bk hd"><span>PRICE</span><span>SHARES</span><span>TOTAL</span></div>` + A.slice().reverse().map(x => row(x, 'a')).join('') +
    `<div class="bk mid"><span>${spread != null ? 'mid ' + cents((asks[0][0] + bids[0][0]) / 2) : 'no quotes'}</span><span></span><span>${bet.side}</span></div>` + B.map(x => row(x, 'bd')).join('');
}
setInterval(() => { if (document.hidden || !bet.e) return; const r = $('#bet').getBoundingClientRect(); if (r.bottom > 0 && r.top < innerHeight) book(); }, 15000);

// ---------------------------------------------------------------- wallet
let wallet = null, pubkey = null;
const provider = () => window.phantom?.solana || window.solflare || window.solana || null;
async function connect() {
  const p = provider(); if (!p) { toast('no Solana wallet found. install Phantom or Solflare.'); line('<span class="r">no wallet found.</span> <span class="c">install Phantom or Solflare.</span>'); return null; }
  try { const r = await p.connect(); wallet = p; pubkey = (r?.publicKey || p.publicKey).toString(); $('#connect').textContent = pubkey.slice(0, 4) + '…' + pubkey.slice(-4); line(`<span class="b">✓</span> connected ${pubkey.slice(0, 4)}…${pubkey.slice(-4)}`); refreshButtons(); return pubkey; }
  catch { toast('connection cancelled'); return null; }
}
$('#connect').addEventListener('click', () => pubkey ? toast(pubkey) : connect());
function refreshButtons() { $('#b-go').textContent = pubkey ? 'sign & place bet' : 'connect wallet to bet'; $('#l-go').textContent = pubkey ? 'sign & launch' : 'connect wallet to launch'; }

// ---------------------------------------------------------------- bet slip
const bet = { e: null, side: 'yes', amt: .5 }; let solUsd = null;
async function solPrice(e) {                          // the price you'd actually pay on Solana (Jupiter), when it's known
  try { const r = await post('/api/bet', { op: 'map', mid: e.lead.id, cid: e.lead.cid }, 12000); if (bet.e !== e || !r.pricing) return;
    bet.buy = { yes: r.pricing.buyYesPriceUsd / 1e6, no: r.pricing.buyNoPriceUsd / 1e6 }; $('#b-sol').hidden = false; quote(); } catch { if (bet.e === e) $('#b-sol').hidden = true; }
}
function setBet(e, side, amt) {
  bet.e = e; bet.side = side; bet.buy = null; if (amt) bet.amt = amt; solPrice(e);
  $('#b-q').textContent = qOf(e); $('#b-py').textContent = cents(e.lead.yes); $('#b-pn').textContent = cents(e.lead.no);
  $$('#bet .side button').forEach(b => b.classList.toggle('on', b.dataset.s === side));
  $('#b-a').value = bet.amt; $('#b-r').value = Math.min(10, bet.amt); quote(true); marketPanel();
}
function quote(reprint) {
  const e = bet.e; if (!e) return; const price = bet.buy ? bet.buy[bet.side] : bet.side === 'yes' ? e.lead.yes : e.lead.no, payUsd = solUsd ? bet.amt * solUsd : null;
  const shares = payUsd && price ? payUsd / price : null;
  $('#b-price').textContent = `${cents(price)} (${pct(price)}%)`; $('#b-pay').textContent = `${bet.amt} SOL${payUsd ? ' ≈ ' + usd(payUsd) : ''}`;
  $('#b-sh').textContent = shares ? '≈ ' + shares.toFixed(1) : '—'; $('#b-win').textContent = shares ? `≈ ${usd(shares)} (${(shares / solUsd).toFixed(2)} SOL)` : '—';
  $('#b-min').hidden = !(payUsd && payUsd < 5.3);
  $('#s-q').textContent = qOf(e); $('#s-s').textContent = bet.side.toUpperCase(); $('#s-s').style.color = bet.side === 'yes' ? 'var(--blue)' : 'var(--red)'; $('#s-a').textContent = bet.amt + ' SOL'; $('#s-p').textContent = cents(price); $('#s-w').textContent = shares ? usd(shares) : '—';
  if (reprint) { const s = $('#b-slip'); s.style.animation = 'none'; s.offsetHeight; s.style.animation = ''; }
}
$$('#bet .side button').forEach(b => b.addEventListener('click', () => { bet.side = b.dataset.s; $$('#bet .side button').forEach(x => x.classList.toggle('on', x === b)); quote(true); marketPanel(); }));
$('#b-r').addEventListener('input', e => { bet.amt = +(+e.target.value).toFixed(2); $('#b-a').value = bet.amt; quote(); });
$('#b-a').addEventListener('input', e => { bet.amt = Math.max(.01, +e.target.value || .01); $('#b-r').value = Math.min(10, bet.amt); quote(); });
$$('#bet .quick button').forEach(b => b.addEventListener('click', () => { bet.amt = +b.dataset.a; $('#b-a').value = bet.amt; $('#b-r').value = bet.amt; quote(true); }));
$('#b-change').addEventListener('click', () => $('#wire').scrollIntoView({ behavior: 'smooth' }));
async function stepper(id, n, waitMs = 520) { const li = $$(`#${id} li`); li.forEach(l => l.className = ''); for (let i = 0; i < Math.min(n, li.length); i++) { li[i].className = 'run'; await sleep(waitMs); li[i].className = 'ok'; } return li; }
// The bet route: the question is matched to the same Polymarket market on Solana (Jupiter's prediction API), your SOL
// is swapped to USDC, then the order opens on your side. Two wallet signatures, nothing held by opm. It stays off
// until the server has its key and a $5 test bet has filled; until then the slip shows what you'd sign, and nothing is sent.
const BETS_LIVE = false;
const bapi = (op, o = {}) => post('/api/bet', { op, owner: pubkey, ...o }, 40000);
async function signSend(txB64) {                       // wallet signs, the server sends and confirms
  const { VersionedTransaction } = await loadWeb3(); const signed = await wallet.signTransaction(VersionedTransaction.deserialize(b64d(txB64)));
  const r = await post('/api/send', { tx: b64e(signed.serialize()) }, 50000); if (!r.ok) throw new Error(r.pending ? 'still confirming. check your wallet in a minute' : 'not confirmed'); return r.sig;
}
$('#b-go').addEventListener('click', async () => {
  if (!bet.e) { toast('pick a question on the wire first'); $('#wire').scrollIntoView({ behavior: 'smooth' }); return; }
  if (!pubkey && !(await connect())) return;
  const li = $$('#b-steps li'), step = (i, c) => { if (li[i]) li[i].className = c; }; li.forEach(l => l.className = '');
  if (!BETS_LIVE) { step(0, 'run'); await sleep(600); step(0, 'ok'); toast('bets switch on at launch. nothing was sent.'); line('<span class="c">bet preview only: bets switch on at launch, nothing was sent.</span>'); quote(true); return; }
  if (solUsd && bet.amt * solUsd < 5.3) { toast('the minimum bet is about $5'); return; }
  const go = $('#b-go'); go.disabled = true; const m = bet.e.lead;
  try {
    step(0, 'run'); const mk = await bapi('map', { mid: m.id, cid: m.cid }); if (mk.status !== 'open') throw new Error('this market is closed for new bets');
    const sw = await bapi('swap', { lamports: Math.round(bet.amt * 1e9) }); if (BigInt(sw.usdcMin) < 5000000n) throw new Error('the minimum bet is about $5');
    step(0, 'ok'); step(1, 'run'); await signSend(sw.tx);
    step(1, 'ok'); step(2, 'run');
    const od = await bapi('order', { marketId: mk.marketId, side: bet.side, usdc: sw.usdcMin });
    const { VersionedTransaction } = await loadWeb3(); const signed = await wallet.signTransaction(VersionedTransaction.deserialize(b64d(od.tx)));
    const ex = await bapi('execute', { signed: b64e(signed.serialize()), context: od.context });
    step(2, 'ok'); step(3, 'run'); line(`<span class="b">✓</span> bet sent · ${esc(bet.side)} on ${esc(qOf(bet.e))} · <a href="https://solscan.io/tx/${esc(ex.signature || '')}" target="_blank" rel="noopener">tx</a>`, 'wl');
    let s = ''; for (let i = 0; i < 24 && od.order?.orderPubkey; i++) { await sleep(2500); try { const r = await bapi('status', { order: od.order.orderPubkey }); s = r.status || r.data?.status || ''; } catch {} if (/filled|failed/.test(s)) break; }
    if (s === 'filled') { step(3, 'ok'); step(4, 'ok'); toast('your bet is in'); line('<span class="b">✓</span> filled. see it with opm positions'); }
    else if (s === 'failed') { step(3, ''); toast('the order did not fill'); line('<span class="r">the order did not fill.</span> <span class="c">opm positions shows what you hold.</span>'); }
    else { toast('order placed, still filling'); line('<span class="c">order placed, still filling. check opm positions.</span>'); }
  } catch (err) { const i = li.findIndex(l => l.className === 'run'); if (i >= 0) li[i].className = ''; toast(/reject|cancel/i.test(String(err)) ? 'cancelled in your wallet' : String(err.message || err).slice(0, 90)); }
  finally { go.disabled = false; }
});
async function positions() {
  if (!BETS_LIVE) return line('<span class="c">positions show up here once bets are switched on.</span>');
  if (!pubkey && !(await connect())) return;
  try { const r = await bapi('positions'), ps = (Array.isArray(r) ? r : r.data || []).filter(p => !p.claimed);
    if (!ps.length) return line('<span class="c">no open positions.</span>');
    ps.slice(0, 12).forEach(p => line(`<span class="k ${p.isYes ? 'b' : 'r'}">${p.isYes ? 'YES' : 'NO '}</span>  ${esc(p.marketMetadata?.title || p.marketId)}  <span class="c">· ${esc(p.contractsDecimal ?? '')} shares · value ${usd((+p.valueUsd || 0) / 1e6)}${p.claimable ? ' · claimable' : ''}</span>`, 'wl'));
  } catch (e) { line(`<span class="r">${esc(String(e.message || e))}</span>`); }
}

// ---------------------------------------------------------------- launch: a coin that takes a side
const L = { e: null, side: 'yes', style: 'slip' };
const STOP = new Set('will the a an of in on by to be is at for and or with before after end than more less any what which who how does do 2025 2026 2027 next this that from into its'.split(' '));
function words(q) { return (q.match(/[A-Za-z0-9$%.]+/g) || []).filter(w => !STOP.has(w.toLowerCase()) && w.length > 1); }
function setLaunch(e, side) {
  L.e = e; L.side = side; const w = words(e.title), S = side.toUpperCase();
  $('#l-q').textContent = qOf(e); $$('#launch .side button').forEach(b => b.classList.toggle('on', b.dataset.s === side));
  const name = `${S} ${w.slice(0, 3).join(' ')}`.slice(0, 32), sym = (S + (w[0] || 'OPM')).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
  $('#l-name').value = name; $('#l-sym').value = sym;
  $('#l-desc').value = `This coin takes the ${S} side on "${e.title}". Launched on opm.`.slice(0, 400);
  drawCoin();
}
$$('#launch .side button').forEach(b => b.addEventListener('click', () => { if (L.e) setLaunch(L.e, b.dataset.s); else { L.side = b.dataset.s; $$('#launch .side button').forEach(x => x.classList.toggle('on', x === b)); drawCoin(); } }));
$('#l-style').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; L.style = b.dataset.s; $$('#l-style button').forEach(x => x.classList.toggle('on', x === b)); drawCoin(); const c = $('#coinimg'); c.classList.remove('flip'); void c.offsetWidth; c.classList.add('flip'); });
['l-name', 'l-sym'].forEach(id => $('#' + id).addEventListener('input', drawCoin));
$('#l-change').addEventListener('click', () => $('#wire').scrollIntoView({ behavior: 'smooth' }));
function wrapT(g, t, w) { const ws = String(t).split(/\s+/), o = []; let c = ''; for (const x of ws) { const n = c ? c + ' ' + x : x; if (g.measureText(n).width > w && c) { o.push(c); c = x; } else c = n; } if (c) o.push(c); return o; }
function drawCoin() {
  const c = $('#coinimg'), g = c.getContext('2d'), W = 1024, F = '"JetBrains Mono", monospace', yes = L.side === 'yes', SIDE = yes ? 'YES' : 'NO', COL = yes ? '#3f6dff' : '#e8483b';
  const q = L.e ? qOf(L.e) : 'pick a question on the wire', p = L.e ? (yes ? L.e.lead.yes : L.e.lead.no) : null, sym = '$' + ($('#l-sym').value || 'OPM');
  g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  if (L.style === 'poster') {
    g.fillStyle = COL; g.fillRect(0, 0, W, W); g.fillStyle = 'rgba(255,255,255,.08)'; for (let i = 0; i < W; i += 32) for (let j = 0; j < W; j += 32) g.fillRect(i, j, 3, 3);
    g.fillStyle = '#fff'; g.font = `800 ${yes ? 380 : 440}px ${F}`; g.textAlign = 'center'; g.fillText(SIDE, W / 2, 560);
    g.font = `700 44px ${F}`; wrapT(g, q, W - 140).slice(0, 3).forEach((l, i) => g.fillText(l, W / 2, 700 + i * 58)); g.font = `700 40px ${F}`; g.fillText(sym, W / 2, 940);
  } else if (L.style === 'news') {
    g.fillStyle = '#f4f7ff'; g.fillRect(0, 0, W, W); g.fillStyle = '#e8483b'; g.fillRect(0, 70, 420, 90); g.fillStyle = '#fff'; g.font = `800 56px ${F}`; g.fillText('BREAKING', 40, 134);
    g.fillStyle = '#1d2233'; g.font = `800 66px ${F}`; const nl = wrapT(g, q, W - 120).slice(0, 3); nl.forEach((l, i) => g.fillText(l, 60, 270 + i * 80));
    if (L.e) { const y = 290 + nl.length * 80, yp = L.e.lead.yes; g.fillStyle = '#e8483b'; g.beginPath(); g.roundRect(60, y, W - 120, 36, 18); g.fill(); g.fillStyle = '#3f6dff'; g.beginPath(); g.roundRect(60, y, Math.max(36, (W - 120) * yp), 36, 18); g.fill();
      g.font = `700 40px ${F}`; g.fillStyle = '#3f6dff'; g.fillText(`yes ${pct(yp)}%`, 60, y + 96); g.textAlign = 'right'; g.fillStyle = '#e8483b'; g.fillText(`no ${pct(1 - yp)}%`, W - 60, y + 96); g.textAlign = 'left'; }
    g.fillStyle = COL; g.fillRect(0, W - 300, W, 300); g.fillStyle = '#fff'; g.font = `800 150px ${F}`; g.fillText(SIDE, 60, W - 110); g.font = `700 46px ${F}`; g.textAlign = 'right'; g.fillText(sym, W - 60, W - 120);
  } else if (L.style === 'odds') {
    g.fillStyle = '#eef2fd'; g.fillRect(0, 0, W, W); g.fillStyle = '#1d2233'; g.font = `700 40px ${F}`; wrapT(g, q, W - 140).slice(0, 3).forEach((l, i) => g.fillText(l, 70, 130 + i * 52));
    g.fillStyle = COL; g.font = `800 330px ${F}`; g.fillText(p != null ? pct(p) + '%' : '—', 50, 620);
    g.fillStyle = '#e8483b'; g.beginPath(); g.roundRect(70, 700, W - 140, 60, 30); g.fill(); g.fillStyle = '#3f6dff'; g.beginPath(); g.roundRect(70, 700, (W - 140) * (L.e ? L.e.lead.yes : .5), 60, 30); g.fill();
    g.fillStyle = '#1d2233'; g.font = `800 64px ${F}`; g.fillText(SIDE + ' · ' + sym, 70, 900);
  } else {
    g.fillStyle = '#a9b8e2'; g.fillRect(0, 0, W, W); g.save(); g.translate(W / 2, W / 2); g.rotate(-.05); g.fillStyle = '#fbf8f1'; g.shadowColor = 'rgba(0,0,0,.25)'; g.shadowBlur = 40; g.fillRect(-300, -440, 600, 880); g.shadowBlur = 0;
    g.fillStyle = '#1d2233'; g.textAlign = 'center'; g.font = `800 64px ${F}`; g.fillText('OPM', 0, -350); g.font = `700 28px ${F}`; g.fillText('BET SLIP', 0, -306);
    for (let x = -260; x < 260; x += 16) g.fillRect(x, -280, 9, 3);
    g.font = `700 34px ${F}`; wrapT(g, q, 520).slice(0, 4).forEach((l, i) => g.fillText(l, 0, -210 + i * 44));
    g.fillStyle = COL; g.font = `800 190px ${F}`; g.fillText(SIDE, 0, 170); g.fillStyle = '#1d2233'; g.font = `700 40px ${F}`; g.fillText(sym, 0, 260);
    for (let x = -260; x < 260; x += 16) g.fillRect(x, 300, 9, 3); g.font = `500 26px ${F}`; g.fillStyle = '#6b7391'; g.fillText('launched on opm', 0, 360); g.restore();
  }
}
const loadWeb3 = () => import('https://esm.sh/@solana/web3.js@1.95.3?bundle');
$('#l-go').addEventListener('click', async () => {
  if (!L.e) { toast('pick a question on the wire first'); $('#wire').scrollIntoView({ behavior: 'smooth' }); return; }
  const name = $('#l-name').value.trim(), symbol = $('#l-sym').value.trim().toUpperCase();
  if (!name || !symbol) { toast('give it a name and a ticker'); return; }
  if (!pubkey && !(await connect())) return;
  const li = $$('#l-steps li'); li.forEach(l => l.className = ''); const go = $('#l-go'); go.disabled = true;
  const step = (i, s) => { li[i].className = s; };
  try {
    step(0, 'run');
    const meta = await get('/api/meta', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, symbol, description: $('#l-desc').value.trim(), twitter: $('#l-x').value.trim(), image: $('#coinimg').toDataURL('image/png'), market: L.e.slug, side: L.side }), t: 30000 });
    step(0, 'ok'); step(1, 'run');
    const { Keypair, VersionedTransaction } = await loadWeb3(); const mint = Keypair.generate();
    const built = await get('/api/create', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ publicKey: pubkey, mint: mint.publicKey.toBase58(), name, symbol, uri: meta.uri, buy: Math.max(0, +$('#l-buy').value || 0) }), t: 30000 });
    step(1, 'ok'); step(2, 'run');
    const tx = VersionedTransaction.deserialize(b64d(built.tx)); tx.sign([mint]);
    step(2, 'ok'); step(3, 'run');
    const signed = await wallet.signTransaction(tx);
    const sent = await post('/api/send', { tx: b64e(signed.serialize()) }, 50000); if (!sent.ok) throw new Error(sent.pending ? 'still confirming. check your wallet in a minute' : 'not confirmed');
    step(3, 'ok'); step(4, 'ok');
    line(`<span class="b">✓</span> ${esc(name)} is live · <a href="https://pump.fun/coin/${mint.publicKey.toBase58()}" target="_blank" rel="noopener">pump.fun</a> · <a href="https://solscan.io/tx/${esc(sent.sig)}" target="_blank" rel="noopener">tx</a>`);
    toast('your coin is live');
  } catch (err) { const i = li.findIndex(l => l.className === 'run'); if (i >= 0) li[i].className = ''; toast(/reject|cancel/i.test(String(err)) ? 'cancelled in your wallet' : 'launch failed: ' + String(err.message || err).slice(0, 80)); }
  finally { go.disabled = false; }
});

// ---------------------------------------------------------------- the world's tape
const seenT = new Set(); let tapeFirst = true;
async function tape() {
  let rows = []; try { rows = await get(`${DATA}/trades?limit=60&filterType=CASH&filterAmount=500&takerOnly=true`); } catch {}
  if (!Array.isArray(rows) || !rows.length) return;
  rows.sort((a, b) => b.timestamp - a.timestamp);
  $('#tape').innerHTML = rows.slice(0, 40).map(x => { const k = x.transactionHash + x.asset + x.size, fresh = !tapeFirst && !seenT.has(k); seenT.add(k); const v = x.size * x.price, ev = EV.find(e => e.slug === x.eventSlug);
    return `<div class="tp${fresh ? ' new' : ''}${v >= 5000 ? ' whale' : ''}" ${ev ? `data-id="${ev.id}"` : ''}><small>${ago(x.timestamp)} ago</small><span class="s ${x.side === 'BUY' ? 'up' : 'dn'}">${x.side.toLowerCase()}</span><em>${esc(String(x.outcome || '').toLowerCase())}</em><em>${usd(v)}</em><small>${cents(+x.price)}</small><p>${esc(x.title)}</p></div>`; }).join('');
  const fresh = tapeFirst ? [] : rows.filter(x => !tapeSeen.has(x.transactionHash + x.asset + x.size)); rows.forEach(x => tapeSeen.add(x.transactionHash + x.asset + x.size));
  replay = rows.slice(0, 14); fresh.slice(0, 6).forEach((x, i) => setTimeout(() => ripple(x, true), i * 1400));
  const whale = fresh.find(x => x.size * x.price >= 5000);
  if (whale && Date.now() - lastType > 20000 && Date.now() - lastLive > 30000) { lastLive = Date.now();
    line(`<span class="c">· live</span>  <span class="k ${whale.side === 'BUY' ? 'b' : 'r'}">${whale.side.toLowerCase()} ${esc(String(whale.outcome || '').toLowerCase())}</span> ${usd(whale.size * whale.price)} <span class="c">· ${esc(whale.title)}</span>`, 'wl'); }
  tapeFirst = false; $('#tape-at').textContent = 'world.log · updated ' + new Date().toLocaleTimeString();
}
const tapeSeen = new Set(); let replay = [], lastLive = 0;

// ---------------------------------------------------------------- the hero field: dots that part for the cursor and ripple with real trades
const field = (() => {
  const hero = $('.hero'), c = document.createElement('canvas'); c.className = 'hfield'; hero.prepend(c);
  const g = c.getContext('2d'), STEP = 26; let W = 0, H = 0, dpr = 1, pts = [], mx = -1e4, my = -1e4, rips = [], raf = 0, vis = true;
  function size() { dpr = Math.min(2, devicePixelRatio || 1); W = hero.clientWidth; H = hero.clientHeight; c.width = W * dpr; c.height = H * dpr; c.style.width = W + 'px'; c.style.height = H + 'px'; pts = []; for (let y = STEP / 2; y < H; y += STEP) for (let x = STEP / 2 + ((y / STEP) % 2 ? STEP / 2 : 0); x < W; x += STEP) pts.push(x, y); kick(); }
  function draw(now) {
    raf = 0; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H); rips = rips.filter(r => now - r.t0 < r.life);
    g.fillStyle = 'rgba(29,34,51,.13)'; const hot = [];
    for (let i = 0; i < pts.length; i += 2) {
      let x = pts[i], y = pts[i + 1], k = 0, col = 0; const dx = x - mx, dy = y - my, d2 = dx * dx + dy * dy;
      if (d2 < 22500) { const d = Math.sqrt(d2) || 1, q = 1 - d / 150; x += dx / d * q * q * 16; y += dy / d * q * q * 16; k = q; col = 1; }
      for (const r of rips) { const age = (now - r.t0) / r.life, rr = age * r.R, ex = pts[i] - r.x, ey = pts[i + 1] - r.y, dd = Math.hypot(ex, ey) || 1, w = Math.abs(dd - rr);
        if (w < 26) { const q = (1 - w / 26) * (1 - age); x += ex / dd * q * 7; y += ey / dd * q * 7; if (q > k) { k = q; col = r.col; } } }
      if (k > .02) hot.push(x, y, k, col); else g.fillRect(x - 1, y - 1, 2, 2);
    }
    for (let i = 0; i < hot.length; i += 4) { const k = hot[i + 2], col = hot[i + 3]; g.fillStyle = col === 2 ? `rgba(232,72,59,${.2 + k * .75})` : `rgba(63,109,255,${.2 + k * .75})`; const s = 2 + k * 2.2; g.fillRect(hot[i] - s / 2, hot[i + 1] - s / 2, s, s); }
    for (const r of rips) { const age = (now - r.t0) / r.life; if (age < .5 && r.text) { g.globalAlpha = Math.min(1, (.5 - age) * 4) * .9; g.font = '700 11px "JetBrains Mono", monospace'; g.fillStyle = r.col === 2 ? '#e8483b' : '#3f6dff'; g.fillText(r.text, r.x + 10, r.y - 8); g.globalAlpha = 1; } }
    if (vis && (rips.length || mx > -1e3)) kick();
  }
  function kick() { if (!raf && !reduce) raf = requestAnimationFrame(draw); }
  hero.addEventListener('pointermove', e => { const r = hero.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; kick(); });
  hero.addEventListener('pointerleave', () => { mx = my = -1e4; kick(); });
  new IntersectionObserver(es => { vis = es[0].isIntersecting; if (vis) kick(); }).observe(hero);
  new ResizeObserver(() => size()).observe(hero);
  return { pulse(x, y, col, text, big) { rips.push({ x, y, col, text, t0: performance.now(), life: big ? 3200 : 2400, R: big ? 620 : 420 }); kick(); }, size: () => [W, H] };
})();
function ripple(x, fresh) {                              // a real trade lands somewhere in the field
  const [W, H] = field.size(); if (!W) return; const v = x.size * x.price, side = x.side === 'BUY' ? 1 : 2;
  field.pulse(40 + Math.random() * (W - 80), 30 + Math.random() * (H - 60), side, `${x.side.toLowerCase()} ${String(x.outcome || '').toLowerCase()} ${usd(v)}`, v >= 5000 || fresh);
}
let rpI = 0; setInterval(() => { if (!document.hidden && replay.length && scrollY < innerHeight) ripple(replay[rpI++ % replay.length]); }, 2600);
$('#tape').addEventListener('click', e => { const r = e.target.closest('.tp[data-id]'); if (!r) return; const ev = BY.get(r.dataset.id); if (ev) { setBet(ev, 'yes'); $('#bet').scrollIntoView({ behavior: 'smooth' }); } });

// ---------------------------------------------------------------- run
async function refresh() {
  try {
    EV = await load(); BY = new Map(EV.map(e => [e.id, e]));
    ticker(); chips(); cards(); lead(); stats(); boardRender(!BD.drawn); BD.drawn = true; if (G) G.update(EV); onScroll();
    if (!bet.e && EV[0]) setBet(EV.find(x => x.ms.length === 1) || EV[0], 'yes');
    if (!L.e && EV[0]) setLaunch(EV.find(x => x.ms.length === 1) || EV[0], 'yes');
    tape();
  } catch { if (!EV.length) { $('#cards').innerHTML = '<p class="empty">the wire didn\'t answer. retrying…</p>'; $('#tick').innerHTML = '<span>the wire is reconnecting…</span>'; } }
}
async function sol() {
  try { const r = await get('https://lite-api.jup.ag/price/v3?ids=So11111111111111111111111111111111111111112'); solUsd = +(r.So11111111111111111111111111111111111111112?.usdPrice) || solUsd; }
  catch { try { const r = await get('https://api.coinbase.com/v2/prices/SOL-USD/spot'); solUsd = +r.data?.amount || solUsd; } catch {} }
  if (bet.e) quote(); if (EV.length) $('#tlive').innerHTML = `<b>●</b> ${EV.reduce((s, e) => s + e.ms.length, 0).toLocaleString()} live${solUsd ? ' · SOL $' + solUsd.toFixed(2) : ''}`;
}
async function intro() {
  const el = $('#intro'), H = document.documentElement; if (!el) return;
  if (!H.classList.contains('intro-on')) { el.remove(); return; }
  try { const mod = await Promise.race([import('./intro.js?v=7'), new Promise((_, no) => setTimeout(() => no(new Error('slow')), 8000))]); await mod.playIntro(el, () => EV); }
  catch { el.classList.add('out'); }
  $('#termbox').classList.add('land'); setTimeout(() => { H.classList.remove('intro-on'); el.remove(); }, 850);
}
drawCoin(); refresh(); sol(); intro().then(() => { boot(); wio.observe($('#globe')); });
setInterval(refresh, 60000); setInterval(() => { if (!document.hidden) tape(); }, 20000); setInterval(sol, 120000);
