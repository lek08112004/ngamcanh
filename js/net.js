// "Đi cùng bạn" — optional walking together, peer to peer.
//
// Nothing here runs until the visitor presses the button. Browsers then connect
// directly to each other with WebRTC data channels; the public PeerJS broker is
// used only to introduce them. One browser hosts the room and relays for the rest.
// The only data exchanged is: a nickname you type, your position and heading in
// the valley, and a few events (waving, stoking the fire, day/night).
// Like any WebRTC session, people in the same room can learn each other's IP
// address, so room codes are for friends, not for posting in public.
const PREFIX = 'aurora-vale-room-';
const MAX_GUESTS = 7;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';     // no look-alikes

export const cleanName = (s) => String(s || '').replace(/[^\p{L}\p{N} _-]/gu, '').trim().slice(0, 16) || 'Bạn đường';
export const cleanCode = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
const num = (v, lo, hi) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : 0);

function makeCode() {
  const a = new Uint32Array(6);
  crypto.getRandomValues(a);
  return [...a].map((n) => ALPHABET[n % ALPHABET.length]).join('');
}

export class Party {
  constructor() {
    this.peer = null;
    this.conns = new Map();        // peer id -> DataConnection
    this.isHost = false;
    this.code = '';
    this.name = '';
    this.others = new Map();       // id -> { name, x, z, yaw, t }
    this.onStatus = () => {};
    this.onEvent = () => {};
    this.onChange = () => {};
  }

  get active() { return !!this.peer; }
  get count() { return this.others.size; }

  async _open(id) {
    const { Peer } = await import('https://esm.sh/peerjs@1.5.4');
    return new Promise((resolve, reject) => {
      const peer = id ? new Peer(id) : new Peer();
      const timer = setTimeout(() => { peer.destroy(); reject(new Error('timeout')); }, 15000);
      peer.on('open', () => { clearTimeout(timer); resolve(peer); });
      peer.on('error', (err) => { clearTimeout(timer); reject(err); });
    });
  }

  async host(name) {
    this.leave();
    this.name = cleanName(name);
    this.code = makeCode();
    this.onStatus('Đang mở phòng…');
    this.peer = await this._open(PREFIX + this.code);
    this.isHost = true;
    this.peer.on('connection', (conn) => {
      if (this.conns.size >= MAX_GUESTS) { conn.close(); return; }
      this._wire(conn);
    });
    this.peer.on('disconnected', () => this.onStatus('Mất kết nối tới máy chủ môi giới — bạn bè đã vào vẫn ở lại'));
    this.onStatus(`Phòng ${this.code} đã mở`);
    return this.code;
  }

  async join(code, name) {
    this.leave();
    this.name = cleanName(name);
    this.code = cleanCode(code);
    if (this.code.length !== 6) throw new Error('code');
    this.onStatus('Đang tìm phòng…');
    this.peer = await this._open();
    this.isHost = false;
    await new Promise((resolve, reject) => {
      const conn = this.peer.connect(PREFIX + this.code, { reliable: false });
      const timer = setTimeout(() => reject(new Error('timeout')), 15000);
      conn.on('open', () => { clearTimeout(timer); resolve(); });
      conn.on('error', (e) => { clearTimeout(timer); reject(e); });
      this.peer.on('error', (e) => { clearTimeout(timer); reject(e); });
      this._wire(conn);
    });
    this.onStatus(`Đã vào phòng ${this.code}`);
  }

  _wire(conn) {
    this.conns.set(conn.peer, conn);
    conn.on('data', (msg) => this._receive(conn.peer, msg));
    const gone = () => {
      this.conns.delete(conn.peer);
      if (this.isHost) {
        this._drop(conn.peer);
        this._broadcast({ t: 'bye', id: conn.peer });
      } else {
        this.others.clear();
        this.onChange();
        this.onStatus('Chủ phòng đã rời đi');
      }
    };
    conn.on('close', gone);
    conn.on('error', gone);
  }

  _drop(id) {
    if (this.others.delete(id)) this.onChange();
  }

  _broadcast(msg, except) {
    for (const [id, c] of this.conns) {
      if (id !== except && c.open) { try { c.send(msg); } catch (e) { /* peer went away */ } }
    }
  }

  // Everything that arrives is untrusted: validate shape, clamp numbers, clean text.
  _receive(from, msg) {
    if (!msg || typeof msg !== 'object') return;
    const id = this.isHost ? from : String(msg.id || from).slice(0, 80);
    if (msg.t === 's') {
      let o = this.others.get(id);
      if (!o) {
        if (this.others.size >= MAX_GUESTS + 1) return;
        o = { name: '', x: 0, z: 0, yaw: 0, t: 0 };
        this.others.set(id, o);
        this.onChange();
      }
      o.name = cleanName(msg.n);
      o.x = num(msg.x, -400, 400);
      o.z = num(msg.z, -400, 400);
      o.yaw = num(msg.y, -1e6, 1e6);
      o.t = performance.now();
      if (this.isHost) this._broadcast({ t: 's', id, n: o.name, x: o.x, z: o.z, y: o.yaw }, from);
    } else if (msg.t === 'e') {
      const kind = ['wave', 'stoke'].includes(msg.k) ? msg.k : null;
      if (!kind) return;
      this.onEvent(kind, this.others.get(id));
      if (this.isHost) this._broadcast({ t: 'e', id, k: kind }, from);
    } else if (msg.t === 'w' && !this.isHost) {
      this.onEvent('world', { day: !!msg.day, mood: num(msg.mood, 0, 4) | 0 });
    } else if (msg.t === 'bye' && !this.isHost) {
      this._drop(String(msg.id).slice(0, 80));
    }
  }

  sendState(x, z, yaw) {
    if (!this.peer) return;
    this._broadcast({ t: 's', n: this.name, x: +x.toFixed(2), z: +z.toFixed(2), y: +yaw.toFixed(1) });
  }

  sendEvent(kind) { if (this.peer) this._broadcast({ t: 'e', k: kind }); }

  /** Host only: keep everyone under the same sky. */
  sendWorld(day, mood) { if (this.peer && this.isHost) this._broadcast({ t: 'w', day, mood }); }

  /** Forget friends we have not heard from in a while. */
  prune() {
    const now = performance.now();
    for (const [id, o] of this.others) if (now - o.t > 8000) this._drop(id);
  }

  leave() {
    if (this.peer) { try { this.peer.destroy(); } catch (e) { /* ignore */ } }
    this.peer = null;
    this.conns.clear();
    this.others.clear();
    this.isHost = false;
    this.code = '';
    this.onChange();
  }
}
