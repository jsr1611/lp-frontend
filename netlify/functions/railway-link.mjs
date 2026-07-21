import { getStore } from '@netlify/blobs';

/**
 * Bridge for the Telegram railway-ticket bot's login, so the bot can stay on a
 * local machine (outbound-only) with no tunnel.
 *
 *   GET  /connect                 → install page with a one-click bookmarklet
 *   POST /connect { code, token } → (from the bookmarklet on eticket.railway.uz)
 *                                    stashes the token under the user's code
 *   GET  /connect?code=X&pickup=1 → (the bot polls) returns & deletes the token
 *
 * The token is a short-lived railway.uz session token; it is stored briefly
 * (10 min), keyed by a single-use code, and deleted the moment the bot picks it up.
 */
export const config = { path: '/connect' };

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...CORS } });

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: CORS });

  const url = new URL(req.url);
  const store = getStore('railway-link');
  const code = (url.searchParams.get('code') || '').trim().toUpperCase();

  // Bookmarklet posts the token.
  if (req.method === 'POST') {
    let body = {};
    try {
      body = await req.json();
    } catch {
      /* ignore */
    }
    const c = String(body.code || '').trim().toUpperCase();
    if (!c || !body.token) return json({ ok: false, error: 'code and token required' }, 400);
    await store.setJSON(c, { token: body.token, exp: Date.now() + 10 * 60 * 1000 });
    return json({ ok: true });
  }

  // Bot polls to pick up the token (single-use).
  if (req.method === 'GET' && url.searchParams.get('pickup')) {
    if (!code) return json({ token: null });
    const rec = await store.get(code, { type: 'json' }).catch(() => null);
    if (!rec) return json({ token: null });
    await store.delete(code).catch(() => {});
    return json({ token: rec.exp > Date.now() ? rec.token : null });
  }

  // Otherwise serve the install page.
  const fnUrl = url.origin + url.pathname;
  return new Response(page(fnUrl), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', ...CORS } });
};

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
