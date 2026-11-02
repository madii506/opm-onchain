// POST {name, symbol, description, twitter, image: data URL, market, side}
// Stores the coin image and its pump.fun metadata JSON on Vercel Blob and returns {uri, image}.
// pump.fun's own upload endpoint is retired, so the metadata is self-hosted.
const { put } = require('@vercel/blob');
const { body, send, clean } = require('./_util');
module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return send(res, 503, { error: 'launches are not switched on yet' });
  try {
    const b = await body(req);
    const name = clean(b.name, 32), symbol = clean(b.symbol, 10).toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!name || !symbol) return send(res, 400, { error: 'give it a name and a ticker' });
    const m = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(b.image || ''));
    if (!m) return send(res, 400, { error: 'image missing' });
    const img = Buffer.from(m[2], 'base64'); if (img.length > 3e6) return send(res, 413, { error: 'image too large' });
    const ext = m[1] === 'jpeg' ? 'jpg' : m[1], id = Date.now().toString(36);
    const im = await put(`coins/${id}.${ext}`, img, { access: 'public', contentType: 'image/' + m[1], addRandomSuffix: true });
    const host = req.headers['x-forwarded-host'] || req.headers.host || '', site = host ? 'https://' + host : undefined;
    const tw = clean(b.twitter, 120), meta = { name, symbol, description: clean(b.description, 400), image: im.url, showName: true };
    if (site) { meta.createdOn = site; meta.website = site; }
    if (/^https:\/\/(x|twitter)\.com\//i.test(tw)) meta.twitter = tw;
    const mj = await put(`coins/${id}.json`, JSON.stringify(meta), { access: 'public', contentType: 'application/json', addRandomSuffix: true });
    send(res, 200, { uri: mj.url, image: im.url });
  } catch (e) { send(res, 500, { error: clean(e.message || e, 160) }); }
};
