// A copy of the save on the owner's Supabase project, and the opt-in performance line.
//
// Offline-first: store.js stays the one source of truth and the game never waits on the network
// (except for at most `boot()`'s short look before the game starts, and only for a visitor who
// has synced before). This module only reads and writes the save through store.js; supabase-js
// keeps its login session through store.js too (the storage adapter below), so nothing here
// touches localStorage. supabase-js is loaded from the CDN only when it is first needed, and if
// it cannot be loaded the site simply carries on without a copy.
//
// Who is who: supabase.auth.signInAnonymously() makes a lasting anonymous user the first time
// there is progress to keep. Row Level Security (supabase/schema.sql) lets that user read and
// write only its own row in `saves`. Being anonymous, the identity lives in this browser: clear
// the site's data and the copy cannot be reached any more, and another device is another user.
//
// Which copy wins: the one whose progress changed last (`doc.t`, the time of the change, kept
// inside the save on both sides). Postgres's `updated_at` says when a copy was uploaded, which is
// not the same thing (an old offline session uploads late), so it is only shown, not compared.
//
// Telemetry (`settings.telemetry`, off until the visitor turns it on in the dock): one row in
// `telemetry` per visit, after a minute of play: the tier, the average frame rate, the GPU's name
// string, day or night, the season. Nothing else, no id. It goes through a second client that has
// no session, as the `anon` role, which the table's policy allows to insert and nothing more.
import { store } from './store.js';

const URL_ = 'https://koycwvchywvfstxtuujs.supabase.co';
// the publishable key: meant to ship to every browser, it can do only what RLS allows
const KEY = 'sb_publishable_YZGsEC4x3Q2K0ybeJikmig_teuxDySx';

const query = new URLSearchParams(location.search);
// ?debug=1 counts only on this machine (as in main.js): on a public copy the cloud behaves as usual
if (!/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) query.delete('debug');
// the test tools run with ?debug=1: they leave the project alone unless asked (?cloud=1)
export const enabled = query.get('cloud') !== '0' && !(query.has('debug') && query.get('cloud') !== '1');

let lib = null;
let client = null;
let anonClient = null;
let started = false;      // the game is running (after this, a newer copy can no longer be taken in quietly)
let paused = false;       // a newer copy is in the cloud: do not overwrite it
let timer = 0;
let failures = 0;
let busy = false, again = false;
let baseT = -1;           // the progress time of the copy last seen in the cloud (-1 = not looked yet)
const watchers = [];
let status = { state: enabled ? 'idle' : 'off', text: '' };

function setStatus(state, text) {
  status = { state, text };
  for (const fn of watchers) { try { fn(status); } catch (e) { /* ignore */ } }
}
/** fn({state, text}) whenever the line under the dock should change */
export function onStatus(fn) { watchers.push(fn); fn(status); }

async function loadLib() {
  if (!lib) lib = await import('@supabase/supabase-js');
  return lib;
}
// supabase-js's session store, kept inside the save (store.js, `cloud.auth`)
const authStorage = {
  read() { try { return JSON.parse(store.get('cloud.auth', '') || '{}') || {}; } catch (e) { return {}; } },
  getItem(k) { const m = this.read(); return Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null; },
  setItem(k, v) { const m = this.read(); m[k] = String(v); store.set('cloud.auth', JSON.stringify(m)); },
  removeItem(k) { const m = this.read(); delete m[k]; store.set('cloud.auth', JSON.stringify(m)); },
};
const hasSession = () => Object.keys(authStorage.read()).length > 0;

async function getClient() {
  if (client) return client;
  const { createClient } = await loadLib();
  client = createClient(URL_, KEY, {
    auth: { storage: authStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
  return client;
}
async function userId(create) {
  const c = await getClient();
  const { data } = await c.auth.getSession();
  if (data && data.session) return data.session.user.id;
  if (!create) return null;
  const { data: d, error } = await c.auth.signInAnonymously();
  if (error) throw error;
  return d.user.id;
}
const clock = (iso) => { const d = iso ? new Date(iso) : new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('timeout')), ms))]);

/** the copy in the cloud: { t, updated_at, doc } or null */
async function fetchRemote(uid, full) {
  const c = await getClient();
  const { data, error } = await c.from('saves').select(full ? 'doc, updated_at' : 'updated_at, t:doc->t').eq('user_id', uid).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const t = full ? Number(data.doc && data.doc.t) || 0 : Number(data.t) || 0;
  return { t, updated_at: data.updated_at, doc: full ? data.doc : null };
}

/**
 * Before the game reads the save: if this browser has synced before and is online, look at the
 * cloud copy for at most `ms` and take it if its progress is newer. Never throws.
 */
export async function boot(ms = 1500) {
  if (!enabled || !navigator.onLine || !hasSession()) return;
  const look = (async () => {
    const uid = await userId(false);
    if (!uid) return;
    const r = await fetchRemote(uid, true);
    if (!r) { baseT = 0; return; }
    if (r.t > store.edited) {
      if (!started) {
        store.adopt(r.doc);
        baseT = r.t;
        setStatus('ok', `Đã lấy tiến độ từ bản lưu trên mây (${clock(r.updated_at)})`);
      } else {
        // too late to take it in quietly: the game has read the old one
        paused = true;
        setStatus('newer', 'Trên mây có tiến độ mới hơn · tải lại trang để dùng');
      }
    } else {
      baseT = r.t;
      if (store.edited > r.t) schedule(1000);
    }
  })().catch(() => { /* offline, asleep, or no library: carry on locally */ });
  try { await withTimeout(look, ms); } catch (e) { /* the look goes on in the background */ }
}

async function push() {
  timer = 0;
  if (paused || !enabled) return;
  if (busy) { again = true; return; }
  busy = true;
  try { await pushOnce(); } finally {
    busy = false;
    if (again) { again = false; schedule(1500); }
  }
}
async function pushOnce() {
  if (!navigator.onLine) { setStatus('offline', 'Ngoại tuyến · tiến độ vẫn lưu trên máy này'); return; }
  setStatus('busy', 'Đang lưu lên mây…');
  try {
    const uid = await withTimeout(userId(true), 15000);
    // another session of this same browser profile may have saved newer progress meanwhile
    {
      const r = await withTimeout(fetchRemote(uid, false), 10000);
      if (r && r.t > store.edited) {
        paused = true;
        setStatus('newer', 'Trên mây có tiến độ mới hơn · tải lại trang để dùng');
        return;
      }
    }
    const doc = store.syncDoc();
    const c = await getClient();
    const { error } = await withTimeout(c.from('saves').upsert({ user_id: uid, doc }, { onConflict: 'user_id' }), 15000);
    if (error) throw error;
    baseT = doc.t;
    failures = 0;
    setStatus('ok', `Đã lưu lên mây lúc ${clock()}`);
  } catch (e) {
    // offline, the free project asleep, the CDN down: keep everything here and try again later
    failures++;
    setStatus('error', 'Chưa lưu lên mây được · vẫn lưu trên máy này, sẽ thử lại');
    schedule(Math.min(300000, 20000 * 2 ** Math.min(failures, 4)));
  }
}
function schedule(ms) {
  if (!enabled || paused) return;
  clearTimeout(timer);
  timer = setTimeout(push, ms);
}

/** the game is running: from now on every change is copied, a few seconds after it settles */
export function start() {
  started = true;
  if (!enabled) return;
  // a few seconds after the first change, not after the last: walking changes the trek log all
  // the time, and a debounce that restarts on every change would never fire
  store.onChange(() => { if (!timer) schedule(4000); });
  addEventListener('online', () => schedule(800));
  addEventListener('offline', () => setStatus('offline', 'Ngoại tuyến · tiến độ vẫn lưu trên máy này'));
  if (!navigator.onLine) setStatus('offline', 'Ngoại tuyến · tiến độ vẫn lưu trên máy này');
  else if (hasSession() && status.state === 'idle') setStatus('idle', 'Có bản sao trên mây từ lần trước · thay đổi mới sẽ được gửi khi bạn chơi');
  else if (status.state === 'idle') setStatus('idle', 'Tiến độ sẽ được sao lưu lên mây khi bạn bắt đầu chơi');
}

/** one anonymous performance line; resolves true when the row was accepted */
export async function sendTelemetry(row) {
  if (!navigator.onLine) return false;
  try {
    if (!anonClient) {
      const { createClient } = await loadLib();
      // no session at all: requests go as `anon`, the only role the telemetry policy lets insert
      anonClient = createClient(URL_, KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'av-telemetry' } });
    }
    const { error } = await withTimeout(anonClient.from('telemetry').insert(row), 15000);
    return !error;
  } catch (e) { return false; }
}
