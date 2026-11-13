// Developer tool: things a screenshot cannot prove. Serve the repo root first
// (python -m http.server 8765 --bind 127.0.0.1), then:
//
//   node tools/check.mjs audio          loudness and spectrum of every sound layer, rendered offline
//   node tools/check.mjs walk           hold real keys down: walking, strafing, running, bumping into a boulder
//   node tools/check.mjs party [png]    two browsers meet in a room through the public PeerJS broker
//   node tools/check.mjs fps [query]    frame rate, and which renderer produced it (~12 s)
//
// `party` talks to esm.sh and the PeerJS broker (a random room code and a made-up name),
// so it needs the internet. Everything else stays on this machine.
import { launch, sleep } from './drive.mjs';

const BASE = process.env.BASE || 'http://127.0.0.1:8765';
const what = process.argv[2];
const fail = [];
const check = (ok, text) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${text}`); if (!ok) fail.push(text); };
const errorsOf = (b) => b.logs.filter((l) => /^(error|EXCEPTION)/.test(l) && !/AudioContext|favicon/.test(l));

async function audio() {
  const b = await launch();
  try {
    await b.goto(`${BASE}/tools/audio-probe.html`);
    await b.waitFor('document.title === "probe done"', 120000, 'audio probe to finish');
    console.log(await b.eval('document.getElementById("out").textContent'));
  } finally { await b.close(); }
}

async function walk() {
  const b = await launch();
  try {
    const pos = () => b.eval('({ x: __av.camBase.x, z: __av.camBase.z, dist: __av.trek.dist, on: __av.walker.on })');
    // --- walking north from the camp, strafing, running
    await b.goto(`${BASE}/?auto=view&q=low&time=day&debug=1&x=-40&z=60`);
    await b.waitFor('window.__av && __av.started()', 60000, 'the scene to start');
    await sleep(1200);
    const p0 = await pos();
    await b.hold('w', 2500);
    await sleep(600);
    const p1 = await pos();
    check(p1.z < p0.z - 2 && Math.abs(p1.x - p0.x) < 1, `W walks north: z ${p0.z.toFixed(1)} -> ${p1.z.toFixed(1)}`);
    check(p1.dist > p0.dist + 2, `trek distance counts up: +${(p1.dist - p0.dist).toFixed(1)} m`);
    await b.hold('d', 2000);
    await sleep(600);
    const p2 = await pos();
    check(p2.x > p1.x + 1.5, `D strafes east: x ${p1.x.toFixed(1)} -> ${p2.x.toFixed(1)}`);
    await b.hold('s', 2000);
    await sleep(600);
    const p3 = await pos();
    check(p3.z > p2.z + 1.5, `S walks back south: z ${p2.z.toFixed(1)} -> ${p3.z.toFixed(1)}`);
    const walked = Math.abs(p1.z - p0.z);
    await b.hold(['shift', 'w'], 2500);
    await sleep(600);
    const p4 = await pos();
    check(Math.abs(p4.z - p3.z) > walked * 1.4, `Shift runs faster: ${Math.abs(p4.z - p3.z).toFixed(1)} m against ${walked.toFixed(1)} m in the same time`);
    // --- a boulder in the way: you go round it, not through it
    const [rx, rz, size] = await b.eval('__av.rocks[8]');
    await b.goto(`${BASE}/?auto=view&q=low&time=day&debug=1&x=${rx}&z=${rz + 9}`);
    await b.waitFor('window.__av && __av.started()', 60000, 'the scene to start');
    await sleep(1200);
    let nearest = 1e9;
    await b.key('keyDown', 'w');
    for (let i = 0; i < 40; i++) {
      await sleep(120);
      const p = await pos();
      nearest = Math.min(nearest, Math.hypot(p.x - rx, p.z - rz));
    }
    await b.key('keyUp', 'w');
    check(nearest > size * 0.8, `the boulder (size ${size}) stops you: never closer than ${nearest.toFixed(2)} m to its centre`);
    check(errorsOf(b).length === 0, `no console errors${errorsOf(b).length ? ': ' + errorsOf(b).join(' | ') : ''}`);
  } finally { await b.close(); }
}

async function party(png) {
  const host = await launch({ port: 9333 });
  const guest = await launch({ port: 9334 });
  try {
    await host.goto(`${BASE}/?auto=view&q=low&time=day&debug=1&x=0&z=6`);
    await guest.goto(`${BASE}/?auto=view&q=low&time=day&debug=1&x=3&z=2&yaw=-150&pitch=-4`);
    for (const b of [host, guest]) await b.waitFor('window.__av && __av.started()', 60000, 'the scene to start');
    await host.click('#qFriends');
    await host.eval('document.getElementById("partyName").value = "Thu A"');
    await host.click('#partyHost');
    const code = await host.waitFor('(document.getElementById("partyCodeShow").textContent || "").length === 6 && document.getElementById("partyCodeShow").textContent', 40000, 'the host to get a room code');
    console.log(`room opened: ${code}`);
    await guest.click('#qFriends');
    await guest.eval(`document.getElementById("partyName").value = "Thu B"; document.getElementById("partyCode").value = ${JSON.stringify(code)}`);
    await guest.click('#partyJoin');
    await host.waitFor('__av.party.count === 1', 40000, 'the host to see the guest');
    await guest.waitFor('__av.party.count === 1', 40000, 'the guest to see the host');
    check(true, 'both sides see one companion');
    check((await guest.eval('[...__av.party.others.values()][0].name')) === 'Thu A', 'the guest sees the name the host typed');
    await host.click('#partyClose');
    await guest.click('#partyClose');
    // the host walks; the guest must see the figure move and stride
    const seen = () => guest.eval('(() => { const f = [...__av.friends.values()][0]; return f ? { x: f.x, z: f.z, speed: f.speed } : null; })()');
    await sleep(1500);
    const a = await seen();
    await host.key('keyDown', 'w');
    await sleep(1800);
    const mid = await seen();
    await sleep(900);
    await host.key('keyUp', 'w');
    await sleep(1500);
    const c = await seen();
    check(a && c && Math.hypot(c.x - a.x, c.z - a.z) > 2, `the guest sees the host walk: ${a && c ? Math.hypot(c.x - a.x, c.z - a.z).toFixed(1) : '?'} m`);
    check(mid && mid.speed > 0.5, `…and the figure strides while moving (speed ${mid ? mid.speed.toFixed(2) : '?'} m/s)`);
    // waving and stoking the fire travel too
    await guest.eval('window.__toasts = []; new MutationObserver(() => __toasts.push(document.getElementById("toast").textContent)).observe(document.getElementById("toast"), { childList: true, characterData: true, subtree: true })');
    await host.hold('g', 80);
    await sleep(1500);
    check((await guest.eval('__toasts.join("|")')).includes('Thu A'), 'a wave from the host reaches the guest');
    check((await guest.eval('[...__av.friends.values()][0].wave')) > 0, '…and the figure raises its arm');
    const fire0 = await guest.eval('__av.fire.level');
    await host.hold(' ', 80);
    await sleep(1200);
    check((await guest.eval('__av.fire.level')) > fire0 + 0.1, 'stoking the fire on one side feeds it on the other');
    if (png) { await guest.shot(png); console.log(`guest's view saved to ${png}`); }
    await host.click('#qFriends');
    await host.click('#partyLeave');
    await guest.waitFor('__av.party.count === 0', 20000, 'the guest to notice the host left');
    check(true, 'the guest notices when the host leaves');
    for (const [name, b] of [['host', host], ['guest', guest]]) check(errorsOf(b).length === 0, `no console errors on the ${name}${errorsOf(b).length ? ': ' + errorsOf(b).join(' | ') : ''}`);
  } finally { await host.close(); await guest.close(); }
}

// Frame rate. Headless Chrome normally draws in software, which says nothing about a real
// machine, so this asks for the graphics card; the line it prints names the renderer that
// was actually used. Set HEADFUL=1 to measure in a normal visible window instead.
async function fps(query = 'auto=view&time=day') {
  const b = await launch({ size: [1920, 1080], gpu: true, headful: !!process.env.HEADFUL });
  try {
    await b.goto(`${BASE}/?${query}&debug=1`);
    await b.waitFor('window.__av && __av.started()', 60000, 'the scene to start');
    await sleep(3000);
    const r = await b.eval(`new Promise((res) => { let n = 0; const t0 = performance.now(); const tick = () => { n++; if (performance.now() - t0 < 8000) requestAnimationFrame(tick); else res({ fps: n * 1000 / (performance.now() - t0), tier: __av.tier, gpu: __av.gpu(), size: innerWidth + 'x' + innerHeight }); }; requestAnimationFrame(tick); })`);
    console.log(`${r.fps.toFixed(1)} fps · tier ${r.tier} · ${r.size} · ${r.gpu}`);
  } finally { await b.close(); }
}

const run = { audio, walk, party: () => party(process.argv[3]), fps: () => fps(process.argv[3]) }[what];
if (!run) { console.log('usage: node tools/check.mjs audio | walk | party [png] | fps [query]'); process.exit(2); }
run().then(() => { if (fail.length) { console.log(`\n${fail.length} check(s) failed`); process.exit(1); } }, (e) => { console.error(String(e && e.stack || e)); process.exit(1); });
