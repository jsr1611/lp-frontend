/**
 * Vercel function bridging the Telegram railway-ticket bot's login, so the bot
 * can stay on a local machine (outbound-only) with no tunnel.
 *
 *   GET  /api/connect                 → install page with a one-click bookmarklet
 *   POST /api/connect { code, token } → (from the bookmarklet on eticket.railway.uz)
 *                                        stashes the token under the user's code
 *   GET  /api/connect?code=X&pickup=1 → (the bot polls) returns & deletes the token
 *
 * Storage: Upstash Redis via its REST API (free tier). Provision it in the Vercel
 * dashboard (Storage → Upstash for Redis) — it injects KV_REST_API_URL /
 * KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL / _TOKEN). Tokens are short-lived
 * (10-min TTL), single-use, deleted the moment the bot picks them up.
 */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * Resolve the Upstash REST URL + write token from env, whatever prefix the Vercel
 * integration used (e.g. KV_REST_API_URL, UPSTASH_REDIS_REST_URL, STORAGE_REST_API_URL…).
 * We match any *_REST_API_URL / *_REST_API_TOKEN pair, skipping the read-only token.
 */
function kvConfig() {
  const e = process.env;
  const pick = (suffix, skip) => {
    for (const [k, v] of Object.entries(e)) {
      if (v && k.endsWith(suffix) && !(skip && k.endsWith(skip))) return v;
    }
    return null;
  };
  return {
    url: e.KV_REST_API_URL || e.UPSTASH_REDIS_REST_URL || pick('_REST_API_URL'),
    token: e.KV_REST_API_TOKEN || e.UPSTASH_REDIS_REST_TOKEN || pick('_REST_API_TOKEN', '_READ_ONLY_TOKEN'),
  };
}

async function kv(command) {
  const { url, token } = kvConfig();
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  const j = await res.json();
  return j.result;
}

export default async function handler(req, res) {
  for (const [k, v] of Object.entries(CORS)) res.setHeader(k, v);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const code = String(req.query?.code || '').trim().toUpperCase();

  if (req.method === 'POST') {
    const body = typeof req.body === 'object' && req.body ? req.body : safeJson(req.body);
    const c = String(body?.code || '').trim().toUpperCase();
    if (!c || !body?.token) return res.status(400).json({ ok: false, error: 'code and token required' });
    if (!kvConfig().url) return res.status(500).json({ ok: false, error: 'store not configured' });
    await kv(['SET', `rl:${c}`, body.token, 'EX', 600]);
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'GET' && req.query?.pickup) {
    if (!code || !kvConfig().url) return res.status(200).json({ token: null });
    const token = await kv(['GET', `rl:${code}`]);
    if (token) await kv(['DEL', `rl:${code}`]);
    return res.status(200).json({ token: token || null });
  }

  const proto = req.headers['x-forwarded-proto'] || 'https';
  const fnUrl = `${proto}://${req.headers.host}${String(req.url).split('?')[0]}`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(page(fnUrl));
}

function safeJson(s) {
  try {
    return JSON.parse(s || '{}');
  } catch {
    return {};
  }
}

function bookmarklet(fnUrl) {
  return (
    'javascript:(function(){' +
    "var t=sessionStorage.getItem('token');" +
    "if(!t){alert('Log in at eticket.railway.uz first, then click this again.');return;}" +
    "var c=prompt('Enter the 6-character code from the Telegram bot:');" +
    'if(!c)return;' +
    `fetch(${JSON.stringify(fnUrl)},{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:c,token:t})})` +
    ".then(function(r){alert(r.ok?'Sent! Check Telegram.':'Failed ('+r.status+'). Get a fresh code with /login.');})" +
    ".catch(function(e){alert('Error: '+e);});" +
    '})();'
  );
}

function page(fnUrl) {
  const bm = bookmarklet(fnUrl).replace(/"/g, '&quot;');
  return `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
<title>Connect railway.uz to the bot</title>
<style>body{font:16px/1.6 system-ui,sans-serif;max-width:640px;margin:40px auto;padding:0 20px;color:#111}
a.bm{display:inline-block;background:#0a7d2c;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600}
ol{padding-left:20px}code{background:#f0f0f0;padding:1px 5px;border-radius:4px}</style>
<h1>🚆 Connect your railway.uz account</h1>
<p>One-time setup — drag this button to your bookmarks bar:</p>
<p><a class="bm" href="${bm}">→ Send to bot</a></p>
<ol>
<li>Log in at <a href="https://eticket.railway.uz" target="_blank" rel="noopener">eticket.railway.uz</a>.</li>
<li>In the Telegram bot, send <code>/login</code> to get a 6-character code.</li>
<li>While on eticket.railway.uz, click the <b>→ Send to bot</b> bookmark and enter the code.</li>
</ol>
<p>The bot signs you in automatically. Repeat step 3 whenever it says your session expired.</p>`;
}
