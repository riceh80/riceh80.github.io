// The About page's "Off the clock" helper: a tiny Cloudflare Worker that holds your secrets,
// so the website never sees them. It does three jobs:
//
// 1. Music (when the page asks): what you're playing on Spotify. The page gets back only this:
//
//      { now:  { song, artist, cover, url, duration_ms, playing, progress_ms, changed_at } | null,
//        last: { song, artist, cover, url, duration_ms, played_at } | null,
//        age_ms }                    // how old this answer is (it's reused for up to a second)
//
// 2. Games (every minute, on its own): if Discord shows you in a game, it saves the game to
//    your Lanyard KV every 10 seconds (last_game, last_game_at, last_game_minutes, last_game_art),
//    so the page can say "Last played" after you stop.
//
// 3. Keeping Spotify connected. Spotify makes every app's access run out 6 months after you
//    approve it. Open  https://<this worker>/connect  and press Agree to renew it (one click).
//    With a DISCORD_WEBHOOK secret, it pings you in Discord 7 and 2 days before it runs out.
//
// Secrets (never stored in this repo):
//   SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN   (connect-spotify.py)
//   LANYARD_KEY       (optional)  npx wrangler secret put LANYARD_KEY
//   DISCORD_WEBHOOK   (optional)  npx wrangler secret put DISCORD_WEBHOOK
// Settings (wrangler.toml): DISCORD_ID, RENEW_URL, and the STATE store (renewed Spotify access, reminders)

const ALLOWED_ORIGINS = [
  'https://riceh80.github.io',
  'http://localhost:8417',          // local preview
  'http://127.0.0.1:8417',
];
const SCOPES = 'user-read-currently-playing user-read-recently-played';
const REUSE_MS = 1000;              // at most one Spotify check a second, however many visitors
const LAST_REUSE_MS = 30_000;       // "last listened" changes rarely: check it every 30s at most
const DAY = 86_400_000;
const LIFETIME_DAYS = 180;          // Spotify's limit on how long an approval lasts
const REMIND_DAYS = [7, 2];         // ping this many days before it runs out

let token = { value: '', expires: 0 };
let refreshing = null;
let saved = { body: '', at: 0 };
let pending = null;
let lastPlayed = { value: null, at: 0 };
let coolDownUntil = 0;              // Spotify asked us to slow down until then

const enc = new TextEncoder();

/* ---------------- Spotify access ---------------- */

// The access saved by /connect wins over the one connect-spotify.py stored as a secret.
async function refreshTokenValue(env) {
  return (env.STATE && await env.STATE.get('refresh_token')) || env.SPOTIFY_REFRESH_TOKEN;
}

const basicAuth = (env) => `Basic ${btoa(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`)}`;

async function spotifyToken(env, fields) {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { Authorization: basicAuth(env), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(`Spotify token request failed (${res.status} ${j.error || ''})`);
    err.expired = j.error === 'invalid_grant';     // the 6 months are up (or access was removed)
    throw err;
  }
  return j;
}

// one refresh at a time, shared by everything that needs a token meanwhile
function accessToken(env, fresh = false) {
  if (!fresh && token.value && Date.now() < token.expires - 60_000) return Promise.resolve(token.value);
  refreshing = refreshing || (async () => {
    const current = await refreshTokenValue(env);
    const j = await spotifyToken(env, { grant_type: 'refresh_token', refresh_token: current });
    token = { value: j.access_token, expires: Date.now() + (j.expires_in || 3600) * 1000 };
    // if Spotify hands back a new refresh token, keep it (the 6-month clock doesn't change)
    if (j.refresh_token && j.refresh_token !== current && env.STATE) await env.STATE.put('refresh_token', j.refresh_token);
    return token.value;
  })().finally(() => { refreshing = null; });
  return refreshing;
}

/* ---------------- music ---------------- */

// the ~300px cover (Spotify lists 640 / 300 / 64)
const pickCover = (images = []) =>
  ([...images].sort((a, b) => Math.abs((a.width || 0) - 300) - Math.abs((b.width || 0) - 300))[0] || {}).url || '';

// a song, or a podcast episode
function describe(item) {
  if (!item || !item.name) return null;
  const episode = item.type === 'episode';
  return {
    song: item.name,
    artist: episode ? (item.show && item.show.name) || '' : (item.artists || []).map((a) => a.name).join(', '),
    cover: pickCover(episode ? item.images || (item.show && item.show.images) : item.album && item.album.images),
    url: (item.external_urls && item.external_urls.spotify) || '',
    duration_ms: item.duration_ms || 0,
  };
}

async function spotify(env, path, retried = false) {
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${await accessToken(env, retried)}` },
  });
  if (res.status === 401 && !retried) return spotify(env, path, true);   // token expired early
  if (res.status === 429) {
    const wait = Number(res.headers.get('Retry-After')) || 5;
    coolDownUntil = Date.now() + wait * 1000;
    throw new Error(`Spotify asked to slow down for ${wait}s`);
  }
  return res;
}

async function readSpotify(env) {
  const nowRes = await spotify(env, '/me/player/currently-playing?additional_types=episode');
  let now = null;
  if (nowRes.status === 200) {
    const j = await nowRes.json();
    const info = describe(j.item);
    if (info) now = { ...info, playing: !!j.is_playing, progress_ms: j.progress_ms || 0, changed_at: j.timestamp || 0 };
  } else if (nowRes.status >= 400) {
    throw new Error(`Spotify said ${nowRes.status}`);
  }
  // "last listened" only matters when nothing is playing, and it changes rarely
  if (!(now && now.playing) && Date.now() - lastPlayed.at > LAST_REUSE_MS) {
    const lastRes = await spotify(env, '/me/player/recently-played?limit=1');
    if (lastRes.ok) {
      const j = await lastRes.json();
      const it = j.items && j.items[0];
      const info = it && describe(it.track);
      lastPlayed = { value: info ? { ...info, played_at: it.played_at } : null, at: Date.now() };
    }
  }
  return { now, last: lastPlayed.value };
}

/* ---------------- games: remember the last one ---------------- */
const CHECK_EVERY_MS = 10_000;
const CHECKS_PER_RUN = 6;          // 6 checks 10s apart fill the minute until the next run

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// the same art the page shows while you're playing
function discordArt(act) {
  const img = act.assets && act.assets.large_image;
  if (!img) return '';
  if (img.startsWith('mp:')) return `https://media.discordapp.net/${img.slice(3)}`;
  if (act.application_id) return `https://cdn.discordapp.com/app-assets/${act.application_id}/${img}.png`;
  return '';
}

async function currentGame(env) {
  const res = await fetch(`https://api.lanyard.rest/v1/users/${env.DISCORD_ID}`);
  if (!res.ok) return null;
  const j = await res.json();
  return ((j.data && j.data.activities) || []).find((a) => a.type === 0) || null;
}

async function saveGame(env, act) {
  const start = act.timestamps && act.timestamps.start;
  const values = {
    last_game: act.name,
    last_game_at: new Date().toISOString(),
    last_game_minutes: start ? String(Math.floor((Date.now() - start) / 60000)) : '',
    last_game_art: discordArt(act),
  };
  // Lanyard KV only takes non-empty strings
  const body = Object.fromEntries(Object.entries(values).filter(([, v]) => v));
  const res = await fetch(`https://api.lanyard.rest/v1/users/${env.DISCORD_ID}/kv`, {
    method: 'PATCH',
    headers: { Authorization: env.LANYARD_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Lanyard didn't save the game (${res.status}). Check the LANYARD_KEY secret.`);
}

async function rememberGame(env) {
  if (!env.LANYARD_KEY || !env.DISCORD_ID) return;
  for (let i = 0; i < CHECKS_PER_RUN; i++) {
    if (i) await wait(CHECK_EVERY_MS);
    const act = await currentGame(env);
    if (!act) return;              // not playing: the last saved game stays as it is
    await saveGame(env, act);
  }
}

/* ---------------- keeping Spotify connected ---------------- */

const longDate = (ms) => new Date(ms).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' });

async function ping(env, text) {
  const res = await fetch(env.DISCORD_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: env.DISCORD_ID ? `<@${env.DISCORD_ID}> ${text}` : text,
      allowed_mentions: { users: env.DISCORD_ID ? [env.DISCORD_ID] : [] },
    }),
  });
  if (!res.ok) throw new Error(`Discord didn't take the reminder (${res.status}). Check the DISCORD_WEBHOOK secret.`);
}

// Runs once an hour (and once right after you add the Discord webhook).
async function checkSpotifyLink(env, renewUrl, hourly) {
  if (!env.STATE || !env.SPOTIFY_CLIENT_ID) return;
  const welcome = !!env.DISCORD_WEBHOOK && !(await env.STATE.get('webhook_ok'));
  if (!hourly && !welcome) return;
  let authorizedAt = await env.STATE.get('authorized_at');
  if (!authorizedAt) {
    authorizedAt = new Date().toISOString();
    await env.STATE.put('authorized_at', authorizedAt);
  }
  const endsAt = Date.parse(authorizedAt) + LIFETIME_DAYS * DAY;

  let expired = false;
  try {
    const t = await accessToken(env);
    if (!(await env.STATE.get('owner_id'))) {      // remember whose Spotify this is, for /connect
      const me = await fetch('https://api.spotify.com/v1/me', { headers: { Authorization: `Bearer ${t}` } });
      if (me.ok) await env.STATE.put('owner_id', (await me.json()).id);
    }
  } catch (e) {
    expired = !!e.expired;
    if (!expired && !welcome) return;               // Spotify hiccup: try again next hour
  }
  if (!env.DISCORD_WEBHOOK) return;

  if (welcome) {
    await ping(env, `Reminders are on. I'll ping you here before your site's Spotify connection runs out (around ${longDate(endsAt)}). To renew anytime: ${renewUrl}`);
    await env.STATE.put('webhook_ok', '1');
  }

  const daysLeft = Math.ceil((endsAt - Date.now()) / DAY);
  const stage = expired || daysLeft <= 0 ? 'out' : REMIND_DAYS.find((d) => daysLeft <= d && daysLeft > (REMIND_DAYS[REMIND_DAYS.indexOf(d) + 1] || 0));
  if (!stage) return;
  const key = `${authorizedAt}:${stage}`;
  if ((await env.STATE.get('reminded')) === key) return;   // already pinged for this one
  await ping(env, stage === 'out'
    ? `Your site's Spotify connection has run out, so the music card is showing Discord's Spotify status for now. Renew it in one click: ${renewUrl}`
    : `Your site's Spotify connection runs out on ${longDate(endsAt)} (in ${daysLeft} day${daysLeft === 1 ? '' : 's'}). Renew it in one click: ${renewUrl}`);
  await env.STATE.put('reminded', key);
}

// /connect state: signed with your Spotify secret, so no storage is needed and it can't be forged
async function sign(env, text) {
  const key = await crypto.subtle.importKey('raw', enc.encode(env.SPOTIFY_CLIENT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(text)));
  return btoa(String.fromCharCode(...sig)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function page(message, status = 200) {
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<title>Spotify for riceh80.github.io</title>` +
    `<p style="font:20px/1.5 system-ui,sans-serif;max-width:36em;margin:15vh auto;padding:0 24px">${message}</p>`;
  return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

async function startConnect(env, url) {
  if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) return page('Run connect-spotify.py once first.', 503);
  const ts = String(Date.now());
  const auth = new URL('https://accounts.spotify.com/authorize');
  auth.search = new URLSearchParams({
    client_id: env.SPOTIFY_CLIENT_ID, response_type: 'code', scope: SCOPES,
    redirect_uri: `${url.origin}/callback`, state: `${ts}.${await sign(env, ts)}`,
  });
  return Response.redirect(auth.toString(), 302);
}

async function finishConnect(env, url) {
  const [ts, sig] = (url.searchParams.get('state') || '').split('.');
  if (!ts || !sig || Date.now() - Number(ts) > 10 * 60_000 || sig !== await sign(env, ts)) {
    return page('That renew link has expired. <a href="/connect">Start again</a>.', 400);
  }
  const code = url.searchParams.get('code');
  if (!code) return page(`Spotify didn't connect (${escapeHtml(url.searchParams.get('error') || 'no answer')}). <a href="/connect">Try again</a>.`, 400);
  if (!env.STATE) return page('The STATE store is missing from wrangler.toml.', 500);

  let j;
  try {
    j = await spotifyToken(env, { grant_type: 'authorization_code', code, redirect_uri: `${url.origin}/callback` });
  } catch (e) {
    return page('Spotify turned that down. <a href="/connect">Try again</a>.', 400);
  }
  const me = await fetch('https://api.spotify.com/v1/me', { headers: { Authorization: `Bearer ${j.access_token}` } });
  const id = me.ok ? (await me.json()).id : '';
  const owner = await env.STATE.get('owner_id');
  if (!id || (owner && id !== owner)) return page('That isn’t the Spotify account this site uses.', 403);

  const now = new Date();
  await Promise.all([
    env.STATE.put('refresh_token', j.refresh_token),
    env.STATE.put('authorized_at', now.toISOString()),
    env.STATE.put('owner_id', id),
    env.STATE.delete('reminded'),
  ]);
  token = { value: j.access_token, expires: Date.now() + (j.expires_in || 3600) * 1000 };
  saved = { body: '', at: 0 };
  return page(`Spotify is connected again. Your music card is good until <b>${longDate(now.getTime() + LIFETIME_DAYS * DAY)}</b>. You can close this tab.`);
}

/* ---------------- entry points ---------------- */

export default {
  async scheduled(event, env, ctx) {
    const renewUrl = env.RENEW_URL || 'https://spotify-now.riceh80.workers.dev/connect';
    const hourly = new Date(event.scheduledTime || Date.now()).getUTCMinutes() === 0;
    ctx.waitUntil(Promise.all([rememberGame(env), checkSpotifyLink(env, renewUrl, hourly)]));
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/connect') return startConnect(env, url);
    if (url.pathname === '/callback') return finishConnect(env, url);

    const origin = request.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      Vary: 'Origin',
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'GET') return new Response('Only GET', { status: 405, headers: cors });

    const reply = (body, status = 200) => new Response(body, {
      status,
      headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    });

    if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET || !(env.SPOTIFY_REFRESH_TOKEN || env.STATE)) {
      return reply(JSON.stringify({ error: 'not connected yet: run connect-spotify.py' }), 503);
    }

    if ((!saved.body || Date.now() - saved.at > REUSE_MS) && Date.now() >= coolDownUntil) {
      // one Spotify check at a time; everyone arriving meanwhile shares its answer
      pending = pending || readSpotify(env)
        .then((data) => { saved = { body: JSON.stringify(data), at: Date.now() }; })
        .finally(() => { pending = null; });
      try {
        await pending;
      } catch (e) {
        if (!saved.body) return reply(JSON.stringify({ error: 'Spotify is unavailable right now' }), 502);
        // otherwise fall through and serve the last good answer
      }
    }
    if (!saved.body) return reply(JSON.stringify({ error: 'Spotify is unavailable right now' }), 502);
    const age = Date.now() - saved.at;
    return reply(`${saved.body.slice(0, -1)},"age_ms":${age}}`);
  },
};
