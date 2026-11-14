// Developer tool: things a screenshot cannot prove. Serve the repo root first
// (python -m http.server 8765 --bind 127.0.0.1), then:
//
//   node tools/check.mjs audio          loudness and spectrum of every sound layer, rendered offline
//   node tools/check.mjs walk           hold real keys down: walking, strafing, running, bumping into a boulder
//   node tools/check.mjs story          the day's thread: pages turn when you do the thing
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
    // --- inside the cabin: the four walls and the furniture hold you, the floor holds you up
    await b.goto(`${BASE}/?auto=view&q=low&time=day&debug=1&x=-9.5&z=-10`);
    await b.waitFor('window.__av && __av.started()', 60000, 'the scene to start');
    await sleep(800);
    await b.eval('__av.enterRoom()');
    await sleep(500);
    const room = () => b.eval('(() => { const [x, z] = __av.room.toLocal(__av.camBase.x, __av.camBase.z); return { x, z, y: __av.camBase.y - __av.room.floorY, on: __av.indoor.on }; })()');
    let worst = { x: 0, z: 0 }, lowest = 9, highest = 0;
    for (const [keys, ms] of [['w', 4000], ['a', 3000], ['s', 6000], ['d', 5000], [['shift', 'w'], 3000], ['a', 4000], [['shift', 's'], 4000]]) {
      await b.key('keyDown', Array.isArray(keys) ? keys[0] : keys);
      if (Array.isArray(keys)) await b.key('keyDown', keys[1]);
      for (let t = 0; t < ms; t += 250) {
        await sleep(250);
        const p = await room();
        worst = { x: Math.max(worst.x, Math.abs(p.x)), z: Math.max(worst.z, Math.abs(p.z)) };
        lowest = Math.min(lowest, p.y); highest = Math.max(highest, p.y);
      }
      if (Array.isArray(keys)) await b.key('keyUp', keys[1]);
      await b.key('keyUp', Array.isArray(keys) ? keys[0] : keys);
    }
    check(worst.x < 2.18 && worst.z < 3.08, `29 s of walking and running about the room, into walls and furniture: never further than ${worst.x.toFixed(2)} m / ${worst.z.toFixed(2)} m from its middle (walls at 2.18 / 3.08)`);
    check(lowest > 1.4 && highest < 1.8, `the floor holds you: eye ${lowest.toFixed(2)}–${highest.toFixed(2)} m over it`);
    const bed = await b.eval('(() => { const r = __av.room; let inBed = 0; for (let i = 0; i < 60; i++) { const [x, z] = r.toWorld(-1.7 + (i % 6) * 0.1, -2.6 + Math.floor(i / 6) * 0.15); const [lx, lz] = r.toLocal(...r.confine(x, z, 0.32)); if (lx < -1.18 + 0.32 - 1e-3 && lz < -0.98 + 0.32 - 1e-3 && lz > -3.08) inBed++; } return inBed; })()');
    check(bed === 0, 'nobody can stand in the bed (every point in it is pushed out)');
    await b.eval('__av.leaveRoom()');
    await sleep(500);
    const outP = await pos();
    check(!(await b.eval('__av.indoor.on')) && Math.hypot(outP.x + 8.3, outP.z + 9) < 1, 'leaving puts you back on the porch');
    // --- the stream: you wade it (slowly, splashing) in summer and walk on it once it has frozen
    const wetSummer = await b.eval('__av.clock.setSeason("summer", true), __av.wetAt(__av.streamX(-70), -70)');
    await b.eval('__av.clock.setSeason("winter")');
    await b.waitFor('__av.clock.weights[3] > 0.95', 30000, 'winter to settle in');
    const wetWinter = await b.eval('__av.wetAt(__av.streamX(-70), -70)');
    check(wetSummer && !wetWinter, `the stream is water in summer (wet: ${wetSummer}) and ice you walk on in winter (wet: ${wetWinter})`);
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

// The day's thread: pages turn when you really do the thing.
async function story() {
  const b = await launch();
  const done = () => b.eval('[...__av.story.done]');
  const open = async (q) => { await b.goto(`${BASE}/?auto=view&q=low&debug=1&${q}`); await b.waitFor('window.__av && __av.started()', 60000, 'the scene to start'); await sleep(1000); };
  try {
    await open('time=day&x=-40&z=60');
    await b.eval('__av.story.restart(); __av.story.seen.clear()');
    await b.hold(['shift', 'w'], 6500);
    await sleep(700);
    check((await done()).includes('walk'), 'walking a little turns the first page');
    await b.hold(' ', 80);
    await sleep(500);
    check(!(await done()).includes('fire'), 'the fire cannot be fed from fifty metres away');
    await open('time=day&x=3&z=-1');
    const wood0 = await b.eval('__av.fire.wood');
    await b.hold(' ', 80);
    await sleep(500);
    check((await done()).includes('fire'), 'stoking the fire from beside it turns its page');
    check((await b.eval('__av.fire.wood')) === wood0 - 1, `a stick of wood is used up (${wood0} -> ${await b.eval('__av.fire.wood')})`);
    check((await b.eval('document.getElementById("storyTitle").textContent')) === 'Xuống luống tulip', 'the card moves on to the next open page');
    // the fire burns out; with no wood it cannot be lit, the woodpile fills your arms, then it can
    await b.eval('__av.fire.level = 0; __av.fire.wood = 0; __av.fire.cooldown = 0');
    await sleep(400);
    await b.hold(' ', 80);
    await sleep(500);
    check((await b.eval('__av.fire.level')) < 0.05, 'a dead fire with no wood in hand stays out');
    await open('time=day&x=7.1&z=-3.6');
    await sleep(1500);
    check((await b.eval('__av.fire.wood')) === 4, 'walking past the woodpile picks up an armful of wood');
    await b.eval('__av.fire.level = 0; __av.fire.cooldown = 0');
    await sleep(300);
    await b.hold(' ', 80);
    await sleep(500);
    check((await b.eval('__av.fire.level')) > 0.3 && (await done()).includes('kindle'), 'and the fire can be kindled again (its page turns)');
    // resting in the cabin: the clock moves on to the next part of the day
    await open('time=day&x=-9.5&z=-10');
    await sleep(1200);
    check(!(await b.eval('document.getElementById("actBtn").classList.contains("hidden")')), 'on the cabin porch, "Vào nhà nghỉ" is offered');
    const hr0 = await b.eval('__av.clock.hour');
    await b.hold('e', 80);
    await sleep(2600);
    const hr1 = await b.eval('__av.clock.hour');
    check(Math.abs(hr1 - 17.6) < 0.2 && (await done()).includes('rest'), `resting from ${hr0.toFixed(1)} h wakes you at ${hr1.toFixed(1)} h`);
    // and you are really in the room now: the camera draws the room's layer and nothing else
    const inside = await b.eval('({ on: __av.indoor.on, mask: __av.camera.layers.mask, local: __av.room.toLocal(__av.camBase.x, __av.camBase.z), y: __av.camBase.y - __av.room.floorY })');
    check(inside.on && inside.mask === 2 && Math.abs(inside.local[0]) < 2.2 && Math.abs(inside.local[1]) < 3.1 && Math.abs(inside.y - 1.6) < 0.2,
      `inside the cabin: camera sees only the room (layers ${inside.mask}), standing at (${inside.local.map((v) => v.toFixed(2)).join(', ')}) in the room, eye ${inside.y.toFixed(2)} m over the floor`);
    await b.hold('e', 80);
    await sleep(1600);
    check(!(await b.eval('__av.rest.on')) && (await b.eval('__av.indoor.on')), 'E lifts the veil on the room; you are still inside');
    check((await b.eval('document.getElementById("actBtn").textContent')).includes('Rời nhà'), 'by the door, "Rời nhà" is offered');
    await b.hold('e', 80);
    await sleep(1500);
    const out = await b.eval('({ on: __av.indoor.on, mask: __av.camera.layers.mask, d: Math.hypot(__av.camBase.x + 8.3, __av.camBase.z + 9) })');
    check(!out.on && out.mask === 1 && out.d < 1.5, `and E steps back out onto the porch (layers ${out.mask}, ${out.d.toFixed(2)} m from the step)`);
    // the corgi: stand by it, scratch its ears, the diary remembers
    await open('time=day&x=0&z=4');
    await b.eval('__av.corgi.place(__av.camBase.x + 1.1, __av.camBase.z, -Math.PI / 2, "sit", 30)');
    await sleep(900);
    check((await b.eval('document.getElementById("actBtn").textContent')).includes('Vuốt ve corgi'), 'next to Bơ, "Vuốt ve corgi" is offered');
    const log0 = await b.eval('__av.story.log.length');
    await b.hold('e', 80);
    await sleep(400);
    const pet = await b.eval('({ state: __av.corgi.state, log: __av.story.log.slice(), season: __av.clock.seasonIndex })');
    check(pet.state === 'happy' && pet.log.includes(`c:${pet.season}`) && pet.log.length === log0 + 1, `E: the dog is glad (${pet.state}) and the diary gets a line (c:${pet.season})`);
    await sleep(3200);
    check((await b.eval('__av.corgi.state')) === 'sit', 'after a moment of joy it sits down by you');
    check((await b.eval('__av.pagesOf("diary").some((p) => p.t.includes("Bơ"))')), 'the line shows in the camp diary book on the shelf');
    // the garden bench: sit, open the book, turn a page, close it
    await open('time=day&spot=bench');
    await sleep(1200);
    check((await b.eval('document.getElementById("actBtn").textContent')).includes('đọc sách'), 'on the garden bench, "Ngồi đọc sách" is offered');
    await b.eval('__av.store.set("read.at", []); __av.store.set("read.book", "")');
    await b.hold('e', 80);
    await sleep(700);
    const shelf = await b.eval('({ open: __av.book.open, shelf: !document.getElementById("shelfView").classList.contains("hidden"), spines: [...document.querySelectorAll("#shelf .spine")].map((s) => s.dataset.book) })');
    check(shelf.open && shelf.shelf && shelf.spines.length >= 5 && shelf.spines.length <= 6, `E opens the shelf first (${shelf.spines.length} books: ${shelf.spines.join(', ')})`);
    // every book, every page, read on screen: none blank, none broken
    const bad = [];
    let total = 0;
    for (const id of shelf.spines) {
      await b.click(`#shelf [data-book="${id}"]`);
      await sleep(250);
      const n = await b.eval('__av.book.pages.length');
      for (let i = 0; i < n; i++) {
        if (i > 0) { await b.eval('__av.book.turning = 0; __av.turnPage(1)'); await sleep(330); }
        const pg = await b.eval('({ i: __av.book.i, h: document.getElementById("bookTitle").textContent, t: document.getElementById("bookText").textContent, q: document.getElementById("bookQuote").textContent, run: document.getElementById("bookRun").textContent })');
        total++;
        if (pg.i !== i || pg.h.trim().length < 2 || pg.t.trim().length < 20 || /undefined|null|NaN|\[object/.test(pg.h + pg.t + pg.q + pg.run)) bad.push(`${id} p${i + 1}: "${pg.h}" (${pg.t.length} chars)`);
      }
      await b.click('#bookShelf');
      await sleep(200);
    }
    check(bad.length === 0 && total >= 25, `all ${shelf.spines.length} books turned page by page, ${total} pages, none blank or broken${bad.length ? `: ${bad.slice(0, 4).join('; ')}` : ''}`);
    // a classic carries its source and a verbatim quotation; the modern books only a note
    const cl = await b.eval('(() => { const r = {}; for (const bk of __av.shelf) { const ps = __av.pagesOf(bk.id); r[bk.id] = { kind: bk.kind, src: bk.src || "", quotes: ps.filter((p) => p.q).length, refs: ps.filter((p) => p.q && p.ref).length }; } return r; })()');
    const classics = Object.values(cl).filter((x) => x.kind === 'classic'), notes = Object.values(cl).filter((x) => x.kind === 'notes');
    check(classics.length >= 1 && classics.every((x) => x.quotes >= 3 && x.quotes === x.refs && /Gutenberg/.test(x.src)) && notes.length >= 1 && notes.every((x) => x.quotes === 0) && Object.values(cl).filter((x) => x.kind === 'vale').length >= 2,
      `classics quote with chapter and source (${classics.map((x) => x.quotes).join('/')} quotes), the modern book quotes nothing, the rest are the valley's own books`);
    // with everything found, the valley's books grow and still have no blank page
    const full = await b.eval(`(() => {
      const s = __av.story, g = __av.game, keep = { f: [...s.flowers], seen: [...s.seen], woven: [...g.woven], log: [...s.log] };
      for (const f of ['tulip','muscari','daffodil','lavender','poppy','cosmos','sunflower','rose','daisy','mum','snowdrop','heather','cherry','camellia']) s.flowers.add(f);
      for (const c of ['uma','cas','ori','cyg','lyr','leo','sco']) { s.seen.add(c); g.woven.add(c); }
      s.log.push('w:cas', 'p:tulip', 't:uma', 'r:1', 'k:1', 'd:1', 'b:0', 'l:walden', 'f:4');
      const out = {};
      for (const bk of __av.shelf) { const ps = __av.pagesOf(bk.id); out[bk.id] = { n: ps.length, bad: ps.filter((p) => !p.h || !p.t || p.t.length < 20 || /undefined|null|NaN/.test(p.h + p.t)).map((p) => p.h) }; }
      s.flowers.clear(); keep.f.forEach((x) => s.flowers.add(x)); s.seen.clear(); keep.seen.forEach((x) => s.seen.add(x));
      g.woven.clear(); keep.woven.forEach((x) => g.woven.add(x)); s.log.length = 0; s.log.push(...keep.log);
      return out; })()`);
    check(Object.values(full).every((x) => x.bad.length === 0) && full.flowers.n > 30 && full.sky.n > 20 && full.diary.n >= 3,
      `with every flower pressed and every figure woven: ${Object.entries(full).map(([k, v]) => `${k} ${v.n}`).join(', ')} pages, none blank${Object.values(full).some((x) => x.bad.length) ? ` (bad: ${JSON.stringify(full)})` : ''}`);
    // where you left off is saved through the store, and the shelf shows it
    check((await b.eval('__av.store.get("read.at")')).includes('walden:7'), 'leaving a book at its last page is remembered (walden:7)');
    await b.eval('__av.store.set("read.at", [])');
    await b.click('#shelf [data-book="walden"]');
    await sleep(250);
    for (let k = 0; k < 3; k++) { await b.eval('__av.book.turning = 0'); await b.hold('ArrowRight', 60); await sleep(380); }
    await b.click('#bookShelf');
    await sleep(250);
    const saved = await b.eval('({ at: __av.store.get("read.at"), book: __av.store.get("read.book"), mark: document.querySelector(\'#shelf [data-book="walden"] .spine-mark\').textContent, walked: __av.walker.on })');
    check(saved.at.includes('walden:3') && saved.book === 'walden' && saved.mark.startsWith('tr. 4') && !saved.walked, `the arrow keys turn pages (not walk); the place is saved (${saved.at.join(', ')}; spine says "${saved.mark}")`);
    await b.click('#shelf [data-book="walden"]');
    await sleep(250);
    check((await b.eval('__av.book.i')) === 3, 'and the book opens again at that page');
    await b.hold('e', 80);
    await sleep(400);
    check(!(await b.eval('__av.book.open')), 'and E closes it again');
    await open('time=day&x=-3.6&z=-5.2&eye=1.2&pitch=-40');
    await sleep(3500);
    check((await done()).includes('bloom'), 'bending to a flower is noticed');
    check((await done()).includes('walk'), 'progress survives a reload');
    // aim at the middle of the first constellation and hold still
    await open('time=night');
    const aim = await b.eval('(() => { const c = __av.game.cons[0]; let x = 0, y = 0, z = 0; for (const d of c.dirs) { x += d.x; y += d.y; z += d.z; } const l = Math.hypot(x, y, z); return { yaw: Math.atan2(x, -z) * 180 / Math.PI, pitch: Math.asin(y / l) * 180 / Math.PI, name: c.def.name }; })()');
    await open(`time=night&yaw=${aim.yaw.toFixed(1)}&pitch=${aim.pitch.toFixed(1)}`);
    await sleep(5000);
    const d = await done();
    check(d.includes('night'), 'nightfall turns its page');
    check(d.includes('star') && (await b.eval('__av.story.seen.size')) >= 1, `holding ${aim.name} in the middle of the view recognises it`);
    // the stroll walks by itself, and lingering among flowers presses them into the book
    await open('time=day&x=0&z=6');
    await b.eval('__av.story.flowers.clear()');
    const s0 = await b.eval('({ x: __av.camBase.x, z: __av.camBase.z })');
    await b.click('#qStroll');
    await sleep(6000);
    const s1 = await b.eval('({ x: __av.camBase.x, z: __av.camBase.z, on: __av.stroll.on })');
    check(s1.on && Math.hypot(s1.x - s0.x, s1.z - s0.z) > 3, `"Dạo vườn" walks on its own: ${Math.hypot(s1.x - s0.x, s1.z - s0.z).toFixed(1)} m in 6 s`);
    await b.hold('w', 300);
    check(!(await b.eval('__av.stroll.on')), 'touching a key hands the walk back');
    await open('time=day&season=summer&x=43&z=2');
    await sleep(3500);
    check((await b.eval('[...__av.story.satchel]')).includes('sunflower') && !(await b.eval('[...__av.story.flowers]')).includes('sunflower'), 'standing among the sunflowers picks one into the satchel, not yet the book');
    await open('time=day&season=summer&x=10&z=-3.8');
    await sleep(1500);
    check((await b.eval('[...__av.story.flowers]')).includes('sunflower') && (await b.eval('__av.story.satchel.size')) === 0, 'back at the tent it is pressed into the flower book');
    check((await b.eval('__av.story.log')).includes('p:sunflower'), 'and the camp diary notes it');
    // the star game: the difficulty climbs with what has been woven
    await b.eval('__av.store.set("game.stage", 0)');
    await open('time=night');
    const weave = `(() => { const g = __av.game; const c = g.current; g.charge = 9; const order = []; const seen = new Set([0]); order.push(0);
      while (order.length < c.def.local.length) { for (let k = 0; k < c.def.local.length; k++) if (!seen.has(k) && [...c.def.adj[k]].some((j) => seen.has(j))) { seen.add(k); order.push(k); break; } }
      for (const k of order) { g.charge = 9; g._lightNode(c, k); } return { id: c.def.id, done: c.done, stage: g.stage }; })()`;
    await b.click('#segPlay');
    await sleep(800);
    const r0 = await b.eval('({ guides: __av.game.rules.guides, id: __av.game.current.def.id })');
    const w1 = await b.eval(weave);
    check(r0.id === 'cas' && w1.done && w1.stage === 1, `the first weave is the simplest figure (${r0.id}), with guide lines (${r0.guides})`);
    await b.eval('__av.store.set("game.stage", 4); __av.store.flush()');
    await open('time=night');
    await b.click('#segPlay');
    await sleep(800);
    const r4 = await b.eval('({ id: __av.game.current.def.id, guides: __av.game.rules.guides, beckon: __av.game.rules.beckon, slips: __av.game.rules.slips })');
    check(r4.id === 'sco' && !r4.guides && !r4.beckon && r4.slips === 3, `at stage 4 (${r4.id}): no guide lines, no gold hint, three wrong strokes allowed`);
    const slip = await b.eval(`(() => { const g = __av.game, c = g.current; g.charge = 9; g._lightNode(c, 0); let n = 0;
      for (let tries = 0; tries < 4; tries++) {
        const k = [...Array(c.def.local.length).keys()].find((i) => !c.lit[i] && ![...c.def.adj[i]].some((j) => c.lit[j]));
        if (k === undefined) break;
        g.charge = 9; g._lightNode(c, k); n++;
      }
      return { lit: c.lit.filter(Boolean).length, slips: g.slips, n }; })()`);
    check(slip.n === 4 && slip.lit === 0 && slip.slips === 0, `a fourth wrong stroke unravels the weave and it starts again (${slip.n} strokes, ${slip.lit} lit)`);
    const w2 = await b.eval(weave);
    check(w2.done && (await b.eval('__av.store.get("game.stage")')) === 5, 'weaving it moves the saved stage on');
    check((await b.eval('__av.game.keepsakes().length')) >= 2, 'each woven constellation leaves a keepsake star');
    await b.click('#segView');
    // seasons and time of day: chosen in the dock, eased in, remembered in the save
    await open('x=0&z=6');
    // left alone, the clock runs: a day and night in sixteen minutes
    const h0 = await b.eval('__av.clock.hour');
    await sleep(2000);
    const ran = ((await b.eval('__av.clock.hour')) - h0 + 24) % 24;
    check(ran > 0.02 && ran < 0.2, `time flows by itself: ${(ran * 60).toFixed(1)} valley minutes in 2 s`);
    await b.eval('document.querySelector("#seasonChips [data-season=winter]").click(); const sl = document.getElementById("timeSlider"); sl.value = "18.2"; sl.dispatchEvent(new Event("input"))');
    await sleep(7500);
    const w = await b.eval('({ season: __av.clock.season.id, winter: __av.clock.weights[3], dusk: __av.clock.dusk, phase: __av.clock.phase.id, label: document.getElementById("qTime").textContent })');
    check(w.season === 'winter' && w.winter > 0.99, `choosing winter brings winter in (weight ${w.winter.toFixed(2)})`);
    check(w.phase === 'dusk' && w.dusk > 0.85, `dragging the clock to 18:12 brings the sunset in (the clock reads "${w.label}")`);
    await b.eval('document.getElementById("qTime").click()');
    await sleep(4500);
    check((await b.eval('__av.clock.phase.id')) === 'night', 'the clock button runs time forward to night');
    await b.eval('__av.store.flush()');
    await open('x=0&z=6');
    check((await b.eval('__av.clock.season.id')) === 'winter', 'the season is remembered after a reload');
    const backup = await b.eval('__av.store.export()');
    check(JSON.parse(backup).settings.season === 'winter' && (await b.eval(`__av.store.import(${JSON.stringify(backup)})`)), 'the save exports and imports as a backup');
    check(!(await b.eval('__av.store.import("{\\"not\\": 1}")')), 'a file that is not a backup is refused');
    await b.eval('__av.clock.setSeason("spring"); __av.story.restart(); __av.story.seen.clear(); __av.story.flowers.clear(); __av.story.satchel.clear(); __av.story.log.length = 0; __av.story.save(); __av.store.set("game.stage", 0); __av.store.set("game.woven", []); __av.store.flush()');
    check(errorsOf(b).length === 0, `no console errors${errorsOf(b).length ? ': ' + errorsOf(b).join(' | ') : ''}`);
  } finally { await b.close(); }
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

const run = { audio, walk, story, party: () => party(process.argv[3]), fps: () => fps(process.argv[3]) }[what];
if (!run) { console.log('usage: node tools/check.mjs audio | walk | story | party [png] | fps [query]'); process.exit(2); }
run().then(() => { if (fail.length) { console.log(`\n${fail.length} check(s) failed`); process.exit(1); } }, (e) => { console.error(String(e && e.stack || e)); process.exit(1); });
