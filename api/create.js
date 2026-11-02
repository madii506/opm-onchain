// POST {publicKey, mint, name, symbol, uri, buy}
// Asks PumpPortal to build an unsigned pump.fun create transaction for the user's wallet (creator) and the
// browser-made mint key. Returns {tx: base64}. Nothing is signed here; the browser signs with the mint key,
// then the wallet signs and pays.
const { B58, body, send, clean } = require('./_util');
module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  try {
    const b = await body(req);
    const publicKey = String(b.publicKey || ''), mint = String(b.mint || ''), uri = String(b.uri || '');
    const name = clean(b.name, 32), symbol = clean(b.symbol, 10).toUpperCase().replace(/[^A-Z0-9]/g, '');
    const buy = Math.max(0, Math.min(50, +b.buy || 0));
    if (!B58.test(publicKey) || !B58.test(mint)) return send(res, 400, { error: 'bad wallet or mint' });
    if (!name || !symbol || !/^https:\/\//.test(uri)) return send(res, 400, { error: 'missing coin details' });
    const r = await fetch('https://pumpportal.fun/api/trade-local', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ publicKey, action: 'create', tokenMetadata: { name, symbol, uri }, mint, denominatedInSol: 'true', amount: buy, slippage: 10, priorityFee: 0.0005, pool: 'pump' }),
    });
    if (r.status !== 200) return send(res, 502, { error: 'pump.fun: ' + clean(await r.text(), 160) });
    send(res, 200, { tx: Buffer.from(await r.arrayBuffer()).toString('base64') });
  } catch (e) { send(res, 500, { error: clean(e.message || e, 160) }); }
};
