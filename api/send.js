// POST {tx: base64 of a fully signed transaction} → sends it to Solana and waits for confirmation. Returns {sig, ok}.
const { body, send, clean } = require('./_util');
const RPC = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
async function rpc(method, params) {
  const r = await fetch(RPC, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
  const j = await r.json(); if (j.error) throw new Error(j.error.message || 'rpc error'); return j.result;
}
module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  try {
    const b = await body(req), tx = String(b.tx || '');
    if (!/^[A-Za-z0-9+/=]{100,2000}$/.test(tx)) return send(res, 400, { error: 'bad transaction' });
    const sig = await rpc('sendTransaction', [tx, { encoding: 'base64', preflightCommitment: 'confirmed', maxRetries: 5 }]);
    for (let i = 0; i < 40; i++) {
      const v = (await rpc('getSignatureStatuses', [[sig]])).value[0];
      if (v && (v.confirmationStatus === 'confirmed' || v.confirmationStatus === 'finalized')) return v.err ? send(res, 400, { error: 'failed on chain', sig }) : send(res, 200, { sig, ok: true });
      await new Promise(r => setTimeout(r, 1000));
    }
    send(res, 200, { sig, ok: false, pending: true });
  } catch (e) { send(res, 500, { error: clean(e.message || e, 160) }); }
};
