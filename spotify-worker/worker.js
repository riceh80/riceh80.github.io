// Spotify for the About page's music card.
//
// A tiny Cloudflare Worker that holds your Spotify app's secret, so the website never sees it.
// The page asks it "what's playing?" and gets back only this:
//
//   { now:  { song, artist, cover, url, duration_ms, playing, progress_ms, changed_at } | null,
//     last: { song, artist, cover, url, duration_ms, played_at } | null,
//     age_ms }                       // how old this answer is (it's reused for a few seconds)
//
// Secrets (set by connect-spotify.py, never stored in this repo):
//   SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN

const ALLOWED_ORIGINS = [
  'https://riceh80.github.io',
  'http://localhost:8417',          // local preview
  'http://127.0.0.1:8417',
];
const REUSE_MS = 5000;              // answer at most one Spotify check per 5s, however many visitors

let token = { value: '', expires: 0 };
let refreshing = null;
let saved = { body: '', at: 0 };
let pending = null;

// one refresh at a time, shared by everything that needs a token meanwhile
function accessToken(env, fresh = false) {
  if (!fresh && token.value && Date.now() < token.expires - 60_000) return Promise.resolve(token.value);
  refreshing = refreshing || refreshToken(env).finally(() => { refreshing = null; });
  return refreshing;
}

async function refreshToken(env) {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: env.SPOTIFY_REFRESH_TOKEN }),
  });
  if (!res.ok) throw new Error(`Spotify token refresh failed (${res.status})`);
  const j = await res.json();
  token = { value: j.access_token, expires: Date.now() + (j.expires_in || 3600) * 1000 };
  return token.value;
}

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
  return res;
}

async function readSpotify(env) {
  const [nowRes, lastRes] = await Promise.all([
    spotify(env, '/me/player/currently-playing?additional_types=episode'),
    spotify(env, '/me/player/recently-played?limit=1'),
  ]);
  if (nowRes.status >= 400 && lastRes.status >= 400) throw new Error(`Spotify said ${nowRes.status}/${lastRes.status}`);

  let now = null;
  if (nowRes.status === 200) {
    const j = await nowRes.json();
    const info = describe(j.item);
    if (info) now = { ...info, playing: !!j.is_playing, progress_ms: j.progress_ms || 0, changed_at: j.timestamp || 0 };
  }
  let last = null;
  if (lastRes.ok) {
    const j = await lastRes.json();
    const it = j.items && j.items[0];
    const info = it && describe(it.track);
    if (info) last = { ...info, played_at: it.played_at };
  }
  return { now, last };
}

export default {
  async fetch(request, env) {
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

    if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET || !env.SPOTIFY_REFRESH_TOKEN) {
      return reply(JSON.stringify({ error: 'not connected yet: run connect-spotify.py' }), 503);
    }

    if (!saved.body || Date.now() - saved.at > REUSE_MS) {
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
    const age = Date.now() - saved.at;
    return reply(`${saved.body.slice(0, -1)},"age_ms":${age}}`);
  },
};
