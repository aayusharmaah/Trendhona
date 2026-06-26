import { SUPABASE_URL, SUPABASE_ANON, YT_API_KEY } from './config.js';
import { state } from './state.js';
import { YT_HANDLE } from './data.js';

// ── Supabase client ────────────────────────────────────────────────────────────
export const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// ── Profile ────────────────────────────────────────────────────────────────────
export async function loadProfile() {
  if (!state.currentUser) return;
  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .eq('id', state.currentUser.id)
    .single();
  state.userProfile = error ? null : data;
}

// ── YouTube live data cache ────────────────────────────────────────────────────
export const LIVE = {};          // name → { photo, url, subs, title }
const CACHE_KEY = 'trendhona_live_v1';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;   // 7 days

function loadCache() {
  try {
    const raw = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    if (raw.t && (Date.now() - raw.t) < CACHE_TTL && raw.data) {
      Object.assign(LIVE, raw.data);
      return true;
    }
  } catch (_) {}
  return false;
}

function saveCache() {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), data: LIVE })); } catch (_) {}
}

function fmtCount(n) {
  n = +n;
  if (n >= 1e7) return (n / 1e7).toFixed(1).replace(/\.0$/, '') + 'Cr';
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
  return '' + n;
}

async function fetchChannel(name) {
  const handle = YT_HANDLE[name];
  if (!handle || !YT_API_KEY) return null;
  const url = `https://www.googleapis.com/youtube/v3/channels`
    + `?part=snippet,statistics&forHandle=${encodeURIComponent(handle)}&key=${YT_API_KEY}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const item = data.items?.[0];
    if (!item) return null;
    const th = item.snippet.thumbnails;
    return {
      photo: (th.high || th.medium || th.default).url,
      url:   'https://www.youtube.com/channel/' + item.id,
      subs:  item.statistics?.subscriberCount ? fmtCount(item.statistics.subscriberCount) : null,
      title: item.snippet.title,
    };
  } catch (_) { return null; }
}

// onUpdate is called after all fetches complete so the directory can re-render.
export async function hydrateLiveData(onUpdate) {
  if (!YT_API_KEY) return;
  loadCache();
  const names = Object.keys(YT_HANDLE).filter(n => !LIVE[n]);
  for (const name of names) {
    const d = await fetchChannel(name);
    if (d) LIVE[name] = d;
  }
  saveCache();
  if (onUpdate) onUpdate();
}
