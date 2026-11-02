// POST {op, ...} → the bet route: SOL in, a YES or NO position out, every step signed in the user's own wallet.
// Bets fill on Polymarket's markets through Jupiter's Prediction API (Solana side). Orders there are funded in
// USDC, so SOL is swapped to USDC first (Jupiter Swap), then the order is opened. Jupiter keeps US and South
// Korea out of its prediction API; this route keeps them out too (by the visitor's country) instead of routing
// around that. Needs JUP_API_KEY. Nothing here holds keys or funds: it builds transactions, the wallet signs.
const { B58, body, send, clean } = require('./_util');
const JUP = 'https://api.jup.ag', KEY = process.env.JUP_API_KEY || '';
const SOL = 'So11111111111111111111111111111111111111112', USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const BLOCKED = new Set(['US', 'KR']);
async function jup(path, opt = {}) {
  const r = await fetch(JUP + path, { ...opt, headers: { 'content-type': 'application/json', ...(KEY ? { 'x-api-key': KEY } : {}), ...(opt.headers || {}) } });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = { message: t }; }
  if (!r.ok) { const e = new Error(clean(j.message || j.error || ('jupiter ' + r.status), 160)); e.code = r.status; throw e; }
  return j;
}
// Jupiter lists Polymarket's markets under the same ids: market 559653 on Polymarket is POLY-559653 there. The
// condition id is checked too, so a bet can only ever land on the exact market shown on the wire. Cached 60 s.
const MK = new Map();
async function market(mid, cid) {
  const k = String(mid), hit = MK.get(k); if (hit && Date.now() - hit.t < 60000) return hit.v;
  let v = null; try { const m = await jup(`/prediction/v1/markets/POLY-${encodeURIComponent(k)}`); if (!cid || !m.conditionId || m.conditionId === cid) v = m; } catch (e) { if (e.code !== 404) throw e; }
  MK.set(k, { t: Date.now(), v }); return v;
}
module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  const cc = String(req.headers['x-vercel-ip-country'] || '').toUpperCase();
  if (BLOCKED.has(cc)) return send(res, 451, { error: 'prediction bets are not available in your region' });
  try {
    const b = await body(req), op = String(b.op || ''), owner = String(b.owner || '');
    if (!KEY && op !== 'map') return send(res, 503, { error: 'bets are not switched on yet' });
    if (op !== 'map' && !B58.test(owner)) return send(res, 400, { error: 'connect a wallet first' });
    if (op === 'map') {                                   // {mid, cid} → the same market on Solana, its status and buy prices
      const mid = String(b.mid || '').replace(/\D/g, ''); if (!mid) return send(res, 400, { error: 'no market' });
      const m = await market(mid, String(b.cid || ''));
      if (!m) return send(res, 404, { error: 'this question is not open for bets on Solana yet' });
      return send(res, 200, { marketId: m.marketId, status: m.status, pricing: m.pricing || null });
    }
    if (op === 'swap') {                                  // {owner, lamports} → SOL → USDC, exact in. Returns the tx and the USDC floor.
      const lamports = Math.floor(+b.lamports || 0); if (!(lamports >= 1e6)) return send(res, 400, { error: 'amount too small' });
      const quote = await jup(`/swap/v1/quote?inputMint=${SOL}&outputMint=${USDC}&amount=${lamports}&slippageBps=50&swapMode=ExactIn`);
      const sw = await jup('/swap/v1/swap', { method: 'POST', body: JSON.stringify({ quoteResponse: quote, userPublicKey: owner, wrapAndUnwrapSol: true, dynamicComputeUnitLimit: true, prioritizationFeeLamports: { priorityLevelWithMaxLamports: { maxLamports: 800000, priorityLevel: 'high' } } }) });
      return send(res, 200, { tx: sw.swapTransaction, usdcOut: String(quote.outAmount), usdcMin: String(quote.otherAmountThreshold), impact: quote.priceImpactPct });
    }
    if (op === 'order') {                                 // {owner, marketId, side, usdc (base units)} → the order tx to sign
      const usdc = String(b.usdc || '').replace(/\D/g, ''); if (!usdc || BigInt(usdc) < 5000000n) return send(res, 400, { error: 'the minimum bet is $5' });
      if (!/^POLY-\d+$/.test(String(b.marketId))) return send(res, 400, { error: 'bad market' });
      const mk = await jup(`/prediction/v1/markets/${b.marketId}`); if (mk.status !== 'open') return send(res, 409, { error: 'this market is closed' });
      const o = await jup('/prediction/v1/orders', { method: 'POST', body: JSON.stringify({ ownerPubkey: owner, marketId: String(b.marketId), isYes: b.side !== 'no', isBuy: true, depositAmount: usdc, depositMint: USDC }) });
      if (!o.transaction) return send(res, 502, { error: 'no transaction came back' });
      if (Array.isArray(o.requiredSigners) && o.requiredSigners.some(k => k !== owner)) return send(res, 502, { error: 'unexpected signer' });
      return send(res, 200, { tx: o.transaction, context: o.execution?.context ?? null, order: o.order || null });
    }
    if (op === 'execute') {                               // {signed, context} → submitted through Jupiter
      const signed = String(b.signed || ''); if (!/^[A-Za-z0-9+/=]{100,3000}$/.test(signed)) return send(res, 400, { error: 'bad transaction' });
      const r = await jup('/prediction/v1/execute', { method: 'POST', body: JSON.stringify({ signedTransaction: signed, ...(b.context != null ? { context: b.context } : {}) }) });
      return send(res, r.status === 'Success' ? 200 : 400, r);
    }
    if (op === 'status') { const id = String(b.order || ''); if (!B58.test(id)) return send(res, 400, { error: 'bad order' }); return send(res, 200, await jup(`/prediction/v1/orders/status/${id}`)); }
    if (op === 'positions') return send(res, 200, await jup(`/prediction/v1/positions?ownerPubkey=${owner}`));
    send(res, 400, { error: 'unknown op' });
  } catch (e) { send(res, e.code >= 400 && e.code < 500 ? e.code : 502, { error: clean(e.message || e, 180) }); }
};
