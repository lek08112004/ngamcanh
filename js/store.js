// The save file: one small document database in the visitor's own browser.
//
// The site has no server, so "the database" lives in localStorage under a single key, as one
// versioned JSON document. Everything that persists goes through here: settings, the trek
// log, the day's thread, the flower book and the constellation game.
//
//   store.get('settings.season', 'spring')     read a value (never throws)
//   store.set('trek.dist', 1234)               write a value (saved a moment later)
//   store.export() / store.import(text)        back the whole thing up, or restore it
//   store.reset()                              forget everything
//
// Rules it keeps:
//  - Reading and writing never throw: in private mode, or with storage full, the site simply
//    remembers nothing.
//  - Writes are batched (one disk write per burst) and flushed when the page is hidden.
//  - Anything read back, and anything imported, is cleaned against the schema below: unknown
//    keys are dropped, wrong types fall back to defaults, lists and strings are capped.
//  - Older saves (the separate keys the site used before) are folded in once, then removed.
const KEY = 'aurora-vale-db';
const VERSION = 1;
const LEGACY = {
  quality: 'aurora-vale-quality',
  name: 'aurora-vale-name',
  trek: 'aurora-vale-trek-v1',
  story: 'aurora-vale-story-v1',
  game: 'aurora-vale-save-v2',
};

/* ---------- schema: [kind, default, limit] ---------- */
const str = (def, max = 24) => ['str', def, max];
const num = (def, min = 0, max = 1e9) => ['num', def, [min, max]];
const bool = (def) => ['bool', def];
const list = (max = 64) => ['list', [], max];
const SCHEMA = {
  settings: { quality: str('auto', 8), season: str('spring', 8), flow: bool(true), name: str('', 16) },
  trek: { dist: num(0), found: list(32) },
  // satchel: flowers picked but not yet pressed at the tent; log: the camp diary (short ids, newest last)
  story: { done: list(40), seen: list(16), flowers: list(24), satchel: list(24), log: list(64), folded: bool(false) },
  // stage: how far through the constellations the weaving has come (sets the difficulty)
  game: { best: num(0), wishes: num(0), woven: list(16), stage: num(0, 0, 999) },
  // the shelf on the garden bench: the book left open, and the page each book was left at ('id:n')
  read: { book: str('', 16), at: list(12) },
};

function cleanValue(rule, v) {
  const [kind, def, lim] = rule;
  if (kind === 'str') return typeof v === 'string' ? v.slice(0, lim) : def;
  if (kind === 'num') return Number.isFinite(v) ? Math.min(lim[1], Math.max(lim[0], v)) : def;
  if (kind === 'bool') return typeof v === 'boolean' ? v : def;
  if (!Array.isArray(v)) return [];
  return [...new Set(v.filter((x) => typeof x === 'string').map((x) => x.slice(0, 24)))].slice(0, lim);
}
/** a complete, well-formed document built from whatever was handed in */
function clean(raw) {
  const doc = { v: VERSION };
  for (const [table, fields] of Object.entries(SCHEMA)) {
    const src = raw && typeof raw[table] === 'object' && raw[table] ? raw[table] : {};
    doc[table] = {};
    for (const [field, rule] of Object.entries(fields)) doc[table][field] = cleanValue(rule, src[field]);
  }
  return doc;
}

/* ---------- storage access that cannot throw ---------- */
const disk = {
  read(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
  write(key, text) { try { localStorage.setItem(key, text); return true; } catch (e) { return false; } },
  remove(key) { try { localStorage.removeItem(key); } catch (e) { /* ignore */ } },
};
const parse = (text) => { try { return JSON.parse(text); } catch (e) { return null; } };

/** fold the separate keys of earlier versions into one document */
function migrateLegacy() {
  const raw = {};
  let found = false;
  const quality = disk.read(LEGACY.quality), name = disk.read(LEGACY.name);
  if (quality !== null || name !== null) { raw.settings = { quality: quality || 'auto', name: name || '' }; found = true; }
  for (const table of ['trek', 'story', 'game']) {
    const old = parse(disk.read(LEGACY[table]));
    if (old && typeof old === 'object') { raw[table] = old; found = true; }
  }
  return found ? raw : null;
}

class Store {
  constructor() {
    this.timer = 0;
    this.persistent = true;            // false once a write has failed (private mode, quota)
    const saved = parse(disk.read(KEY));
    if (saved && typeof saved === 'object') {
      this.doc = clean(saved);
    } else {
      const legacy = migrateLegacy();
      this.doc = clean(legacy || {});
      if (legacy && this.flush()) for (const key of Object.values(LEGACY)) disk.remove(key);
    }
    if (typeof addEventListener === 'function') {
      addEventListener('pagehide', () => this.flush());
      addEventListener('visibilitychange', () => { if (document.hidden) this.flush(); });
    }
  }

  /** read 'table.field'; lists come back as copies */
  get(path, fallback) {
    const [table, field] = path.split('.');
    const v = this.doc[table] ? this.doc[table][field] : undefined;
    if (v === undefined) return fallback;
    return Array.isArray(v) ? [...v] : v;
  }

  /** write 'table.field'; the value is cleaned against the schema first */
  set(path, value) {
    const [table, field] = path.split('.');
    const rule = SCHEMA[table] && SCHEMA[table][field];
    if (!rule) return;
    this.doc[table][field] = cleanValue(rule, Array.isArray(value) ? value : value instanceof Set ? [...value] : value);
    this.touch();
  }

  /** several fields of one table at once */
  patch(table, fields) { for (const [field, value] of Object.entries(fields)) this.set(`${table}.${field}`, value); }

  touch() {
    if (this.timer) return;
    this.timer = setTimeout(() => this.flush(), 400);
  }

  flush() {
    clearTimeout(this.timer);
    this.timer = 0;
    this.persistent = disk.write(KEY, JSON.stringify(this.doc));
    return this.persistent;
  }

  /** the whole save as text, for a backup file */
  export() {
    return JSON.stringify({ app: 'aurora-vale', exported: new Date().toISOString(), ...this.doc }, null, 2);
  }

  /** replace the save with a backup; returns false if the text is not one */
  import(text) {
    const raw = parse(String(text).slice(0, 200000));
    if (!raw || typeof raw !== 'object' || raw.app !== 'aurora-vale') return false;
    this.doc = clean(raw);
    return this.flush() || true;
  }

  reset() {
    const quality = this.doc.settings.quality;       // a display setting, not progress: keep it
    this.doc = clean({ settings: { quality } });
    this.flush();
  }
}

export const store = new Store();
