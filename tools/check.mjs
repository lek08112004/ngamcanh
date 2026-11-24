// Developer tool: things a screenshot cannot prove. Serve the repo root first
// (python -m http.server 8765 --bind 127.0.0.1), then:
//
//   node tools/check.mjs audio          loudness and spectrum of every sound layer, rendered offline
//   node tools/check.mjs walk           hold real keys down: walking, strafing, running, bumping into a boulder
//   node tools/check.mjs story          the day's thread: pages turn when you do the thing
//   node tools/check.mjs cat            Choco: the name card, what it does with what you offer, its limits, the save
//   node tools/check.mjs world          the save's new parts, tea, the rocking chair, decorations, views, the quality
//                                       ladder, the shader warm-up, a lost WebGL context
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
    // Bấc, the winter snowman: there in winter only, greets you, and the animals sleep on his straw at night
    await open('hour=11&season=summer&x=3.6&z=-5.0');
    await sleep(600);
    check(!(await b.eval('__av.snowman.here || __av.snowman.group.visible')), 'in summer there is no snowman');
    await open('hour=11&season=winter&x=3.2&z=-5.6');
    await b.eval('__av.corgi.hold("sit"); __av.corgi.place(-6, 6, 0, "sit", 99); __av.cat.hold("sit"); __av.cat.place(-7, 6, 0, "sit", 99)');
    await sleep(900);
    check((await b.eval('__av.snowman.here && __av.snowman.group.visible')) && (await b.eval('document.getElementById("actBtn").textContent')).includes('Chào Bấc'), 'in winter he stands behind the fire, and "Chào Bấc" is offered beside him');
    const logS = await b.eval('__av.story.log.length');
    await b.hold('e', 80);
    await sleep(400);
    const hi = await b.eval('({ log: __av.story.log.slice(), n: __av.snowman.greeted, diary: __av.pagesOf("diary").some((p) => p.t.includes("Bấc")) })');
    check(hi.n === 1 && hi.log.includes('s:3') && hi.log.length === logS + 1 && hi.diary, `E: he says something (${hi.n}) and the diary gets a line (s:3)`);
    {
      const at0 = await b.eval('[__av.camBase.x, __av.camBase.z]');
      await b.eval('__av.view.yawT = __av.view.yaw = Math.atan2(__av.snowman.x - __av.camBase.x, -(__av.snowman.z - __av.camBase.z)) * 180 / Math.PI');
      await b.hold('w', 2200);
      const at1 = await b.eval('[__av.camBase.x, __av.camBase.z, __av.snowman.distanceTo(__av.camBase.x, __av.camBase.z)]');
      check(Math.hypot(at1[0] - at0[0], at1[1] - at0[1]) > 0.3 && at1[2] > 0.45, `you cannot walk through him (stopped ${at1[2].toFixed(2)} m from his middle)`);
    }
    await open('hour=22.5&season=winter&x=6.2&z=-8.6');
    await b.waitFor('__av.corgi.state === "lie" || __av.corgi.state === "sleep"', 45000, 'the dog to lie down for the night');
    await b.waitFor('__av.cat.state === "loaf" || __av.cat.state === "sleep"', 45000, 'the cat to settle for the night');
    const bed = await b.eval('({ dog: Math.hypot(__av.corgi.x - __av.snowman.shelter.x, __av.corgi.z - __av.snowman.shelter.z), cat: Math.hypot(__av.cat.x - __av.snowman.shelter.x, __av.cat.z - __av.snowman.shelter.z) })');
    check(bed.dog < 0.7 && bed.cat < 1.2, `on a winter night Bơ and Choco sleep on the straw behind him (dog ${bed.dog.toFixed(2)} m, cat ${bed.cat.toFixed(2)} m from its middle)`);
    // the garden bench: sit, open the book, turn a page, close it
    await open('time=day&spot=bench');
    await sleep(1200);
    check((await b.eval('document.getElementById("actBtn").textContent')).includes('đọc sách'), 'on the garden bench, "Ngồi đọc sách" is offered');
    await b.eval('__av.store.set("read.at", []); __av.store.set("read.book", "")');
    await b.hold('e', 80);
    await sleep(700);
    const shelf = await b.eval('({ open: __av.book.open, shelf: !document.getElementById("shelfView").classList.contains("hidden"), spines: [...document.querySelectorAll("#shelf .spine")].map((s) => s.dataset.book) })');
    // seven books, plus the owner's private books when private/ is present on this machine
    check(shelf.open && shelf.shelf && shelf.spines.length >= 7 && shelf.spines.length <= 10, `E opens the shelf first (${shelf.spines.length} books: ${shelf.spines.join(', ')})`);
    // every book, every page, read on screen: none blank, none broken
    const bad = [];
    let total = 0, pics = 0;
    for (const id of shelf.spines) {
      await b.click(`#shelf [data-book="${id}"]`);
      await sleep(250);
      const n = await b.eval('__av.book.pages.length');
      for (let i = 0; i < n; i++) {
        if (i > 0) { await b.eval('__av.book.turning = 0; __av.turnPage(1)'); await sleep(330); }
        const pg = await b.eval('({ i: __av.book.i, h: document.getElementById("bookTitle").textContent, t: document.getElementById("bookText").textContent, q: document.getElementById("bookQuote").textContent, run: document.getElementById("bookRun").textContent, img: [...document.querySelectorAll("#bookText img")].map((im) => im.complete && im.naturalWidth > 0 ? 1 : (im.loading = "eager", 0)) })');
        total++;
        if (pg.i !== i || pg.h.trim().length < 2 || (pg.t.trim().length < 20 && !pg.img.length) || /undefined|null|NaN|\[object|\[\[/.test(pg.h + pg.t + pg.q + pg.run)) bad.push(`${id} p${i + 1}: "${pg.h}" (${pg.t.length} chars)`);
        pics += pg.img.length;
      }
      await b.click('#bookShelf');
      await sleep(200);
    }
    check(bad.length === 0 && total >= 25, `all ${shelf.spines.length} books turned page by page, ${total} pages (${pics} pictures), none blank or broken${bad.length ? `: ${bad.slice(0, 4).join('; ')}` : ''}`);
    if (shelf.spines.includes('money')) {
      const pv = await b.eval('(() => { const bk = __av.shelf.find((x) => x.id === "money"); return { title: bk.title, author: bk.author, translator: bk.translator, pages: bk.pages.length, pics: bk.pages.reduce((n, p) => n + (p.t.match(/\\[\\[img:/g) || []).length, 0) }; })()');
      check(pv.title === 'Tâm Lý Học Về Tiền' && pv.author === 'Morgan Housel' && pv.translator === 'Hoàng Thị Minh Phúc' && pics === pv.pics,
        `the private book: "${pv.title}", ${pv.author}, dịch ${pv.translator}: ${pv.pages} pages, all ${pv.pics} pictures shown`);
    }
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
    // from the menu: Khám phá → Quanh trại → Dạo vườn
    await b.click('#qExplore'); await sleep(200);
    await b.click('#mtab-camp'); await sleep(200);
    await b.eval(`document.querySelector('#mpane-camp .m-btn.primary').click()`);
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
    // the clock chip opens "Giờ & mùa"; its "Tới ban đêm" runs time forward (N does the same from the keyboard)
    await b.eval('document.getElementById("qTime").click()');
    await sleep(300);
    const pop = await b.eval('!document.getElementById("timePop").classList.contains("hidden") && !!document.querySelector("#timePop #timeSlider")');
    await b.eval('[...document.querySelectorAll("#timePop .m-chip")].find((x) => /ban đêm/.test(x.textContent)).click()');
    await sleep(4500);
    check(pop && (await b.eval('__av.clock.phase.id')) === 'night', 'the clock chip opens "Giờ & mùa" (with the time slider in it), and "Tới ban đêm" runs time forward to night');
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

// Choco: the name card, what it does with what you offer, its limits, what is saved.
async function catCheck() {
  const b = await launch();
  const open = async (q) => { await b.goto(`${BASE}/?auto=view&q=low&debug=1&seed=11&${q}`); await b.waitFor('window.__av && __av.started()', 60000, 'the scene to start'); await sleep(900); };
  const tag = () => b.eval('(() => { const t = document.getElementById("catTag"); return { shown: t.style.display !== "none" && Number(t.style.opacity || 0) > 0.3, text: t.querySelector(".pet-tag-name").textContent, sub: t.querySelector(".pet-tag-sub").textContent, op: Number(t.style.opacity || 0) }; })()');
  // look at a point from where you stand
  const face = (x, z) => b.eval(`(() => { const dx = ${x} - __av.camBase.x, dz = ${z} - __av.camBase.z; __av.view.yaw = __av.view.yawT = Math.atan2(dx, -dz) * 180 / Math.PI; __av.view.pitch = __av.view.pitchT = -12; })()`);
  try {
    // a clean slate: an old save without any of Choco's fields still loads, with defaults
    await open('hour=10&season=summer&x=1&z=-2');
    const old = await b.eval('(() => { const d = JSON.parse(__av.store.export()); delete d.cat; delete d.settings.tags; return __av.store.import(JSON.stringify(d)) && { bond: __av.store.get("cat.bond"), marks: __av.store.get("cat.marks"), tags: __av.store.get("settings.tags") }; })()');
    check(old && old.bond === 0 && old.marks.length === 0 && old.tags === true, `a save from before Choco's fields loads with defaults (bond ${old.bond}, tags ${old.tags})`);
    await b.eval('__av.store.reset(); __av.catMind.bond = 0; __av.catMind.marks.clear(); __av.catMind.habits.clear(); __av.story.log.length = 0');

    // the name card: over its head near by, faded out far off, gone behind you, in zen, when turned off
    await b.eval('__av.cat.hold("sit"); __av.cat.place(1, -4.5, 0, "sit", 99); __av.corgi.hold("sit"); __av.corgi.place(-6, 4, 0, "sit", 99)');
    await face(1, -4.5);
    await sleep(1500);
    let t = await tag();
    const pos = await b.eval('(() => { const r = document.getElementById("catTag").getBoundingClientRect(); const p = __av.cat.headPos(new __av.camera.position.constructor()).project(__av.camera); return { tagBottom: r.bottom, tagX: (r.left + r.right) / 2, headY: (-p.y * 0.5 + 0.5) * innerHeight, headX: (p.x * 0.5 + 0.5) * innerWidth }; })()');
    check(t.shown && t.text === 'Choco' && pos.tagBottom < pos.headY && Math.abs(pos.tagX - pos.headX) < 40, `"Choco" floats over its head (card bottom ${pos.tagBottom.toFixed(0)} px, head ${pos.headY.toFixed(0)} px, ${Math.abs(pos.tagX - pos.headX).toFixed(0)} px across)`);
    await b.eval('__av.view.yaw = __av.view.yawT = __av.view.yaw + 180');
    await sleep(900);
    check(!(await tag()).shown, 'behind you: no card');
    await face(1, -4.5);
    await b.eval('__av.cat.place(1, -22, 0, "sit", 99)');
    await sleep(1200);
    check(!(await tag()).shown, 'eighteen metres off: no card');
    await b.eval('__av.cat.place(1, -4.5, 0, "sit", 99)');
    await sleep(1200);
    await b.hold('h', 60);
    await sleep(600);
    const zenHidden = await b.eval('getComputedStyle(document.getElementById("catTag")).display === "none"');
    await b.hold('h', 60);
    check(zenHidden, 'zen mode hides the card');
    await b.click('#tagBtn');
    await sleep(800);
    check(!(await tag()).shown && (await b.eval('__av.store.get("settings.tags")')) === false, '"Tên bạn nhỏ" turns it off, and that is saved');
    await b.click('#tagBtn');
    // behind the cabin's wall: hidden (and you cannot call it through the wall)
    await b.eval('(() => { const c = Math.cos(-0.9), s = Math.sin(-0.9); const w = (lx, lz) => [-13 + c * lx - s * lz, -14 + s * lx + c * lz]; const [cx, cz] = w(0, -4.6), [px, pz] = w(0, 5.0); __av.cat.place(cx, cz, 0, "sit", 99); __av.walker.on = false; __av.camTarget.set(px, __av.terrainH(px, pz) + 1.7, pz); __av.camBase.copy(__av.camTarget); })()');
    await face(...(await b.eval('[__av.cat.x, __av.cat.z]')));
    await sleep(1500);
    check(!(await tag()).shown && (await b.eval('__av.catMind.can("call")')) !== '', `behind the cabin it shows no card and cannot be called ("${await b.eval('__av.catMind.can("call")')}")`);

    // beside it with your eyes level it used to be under the bottom of the picture: opening the
    // menu and sitting down with it must bring it into view (above the menu)
    await open('hour=10&season=summer&x=1&z=-2');
    await b.eval('__av.cat.hold("sit"); __av.cat.place(1, -3.7, Math.PI, "sit", 99); __av.corgi.hold("sit"); __av.corgi.place(-6, 4, 0, "sit", 99)');
    await b.eval('__av.view.yaw = __av.view.yawT = 0; __av.view.pitch = __av.view.pitchT = 0');
    await sleep(700);
    const inView = () => b.eval(`(() => { const p = __av.cat.headPos(new __av.camera.position.constructor()).project(__av.camera); return [+p.x.toFixed(2), +p.y.toFixed(2)]; })()`);
    const level = await inView();
    await b.hold('e', 60);
    await sleep(2600);
    const menuView = await inView();
    await b.eval('document.querySelector(\'#catMenu [data-act="sit"]\').click()');
    await sleep(2600);
    const sitView = await inView();
    const visible = ([x, y]) => Math.abs(x) < 0.7 && y > -0.15 && y < 0.85;   // above the menu, inside the frame
    check(!visible(level) && visible(menuView) && visible(sitView), `the menu turns your eyes to it: eyes level ${level}, menu open ${menuView}, sitting with it ${sitView}`);
    const up = await b.eval(`!document.getElementById('upBtn').classList.contains('hidden')`);
    await b.eval(`dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`);   // the menu first
    await b.eval(`dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`);   // then you stand up
    await sleep(300);
    check(up && !(await b.eval('__av.seat.on')), 'sitting with it shows "get up"; Esc closes the menu, then stands you up');

    // free again: what it does with what you offer
    await open('hour=10&season=summer&x=1&z=-2');
    await b.eval('__av.cat.free(); __av.cat.place(1, -3.6, Math.PI, "sit", 4); __av.catMind.moved(); __av.corgi.hold("sit"); __av.corgi.place(-6, 4, 0, "sit", 99)');
    await sleep(800);
    await face(1, -3.6);
    await sleep(700);
    check((await b.eval('document.getElementById("actBtn").textContent')) === 'Choco · E', 'beside it, the action reads "Choco · E"');
    await b.hold('e', 60);
    await sleep(300);
    check(!(await b.eval('document.getElementById("catMenu").classList.contains("hidden")')), 'E opens what you can do with it');
    const b0 = await b.eval('__av.catMind.bond');
    await b.hold('1', 60);
    await sleep(400);
    const p1 = await b.eval('({ state: __av.cat.state, cur: __av.catMind.debug().cur, lock: __av.catMind.lock, bond: __av.catMind.bond })');
    check(p1.cur === 'petted' && p1.state === 'happy' && p1.lock && p1.bond > b0, `1 strokes it: accepted (${p1.cur}, ${p1.state}, locked), and it knows you a little better`);
    await b.hold('1', 60);
    await sleep(200);
    check((await b.eval('__av.catMind.can("pet")')) === 'Chờ một chút', 'a second stroke straight away waits for its cooldown');
    // stroked again and again: it says no, gently, then goes a little way off
    await sleep(3600);
    const said = [];
    for (let i = 0; i < 4; i++) { await b.eval('__av.catMind.offerCool.pet = 0'); said.push(await b.eval('__av.catMind.offer("pet")')); await sleep(250); }
    await sleep(600);
    const away = await b.eval('({ cur: __av.catMind.debug().cur, away: __av.cat.expr.away, tol: __av.catMind.tol })');
    check(said.some((s) => /quay đầu|phẩy/.test(s)) && (away.cur === 'avoid' || away.away > 0.5), `stroked over and over it turns away and leaves (${away.cur}, tol ${away.tol.toFixed(2)})`);
    check(!(await b.eval('__av.catMind.marks.size')), 'and no moment is recorded for it');
    // the bond cannot be farmed: thirty accepted strokes in a row add at most six points
    await b.eval('__av.catMind.moved(); __av.cat.place(1, -3.3, Math.PI, "sit", 4)');
    await sleep(300);
    const farm = await b.eval(`(() => { const m = __av.catMind; const b0 = m.bond; m.gains.length = 0; let took = 0;
      for (let i = 0; i < 30; i++) { m.moved(); m.offerCool.pet = 0; m.tol = 1; __av.cat.place(1, -3.3, Math.PI, 'sit', 4); m.offer('pet'); if (m.debug().cur === 'petted') took++; }
      return { b0, b1: m.bond, took }; })()`);
    check(farm.took === 30 && farm.b1 > farm.b0 && farm.b1 - farm.b0 <= 6.001, `thirty accepted strokes in a row: +${(farm.b1 - farm.b0).toFixed(2)} points (each kind counts less when repeated; cap 6 per ten minutes)`);
    // a moment is written once (offered again after it happened, no second line)
    await b.eval('__av.catMind.offerCool.hand = 0; __av.catMind.tol = 1; __av.catMind.needs.social = 1; __av.catMind.bond = 50; __av.cat.place(1, -3.3, Math.PI, "sit", 4); __av.catMind.moved()');
    let hello = false;
    for (let k = 0; k < 4 && !hello; k++) {
      await b.eval('__av.catMind.offerCool.hand = 0; __av.catMind.tol = 1; __av.catMind.offer("hand")');
      for (let w = 0; w < 40 && !hello && (await b.eval('__av.catMind.debug().cur')) === 'hand'; w++) { await sleep(250); hello = await b.eval('__av.catMind.marks.has("hello")'); }
    }
    await b.waitFor('__av.catMind.debug().cur !== "hand"', 15000, 'the greeting to finish');
    await b.eval('__av.catMind.offerCool.hand = 0; __av.catMind.tol = 1; __av.catMind.offer("hand")');
    await b.waitFor('__av.catMind.debug().cur !== "hand"', 15000, 'the second greeting to finish');
    const lines = await b.eval('__av.story.log.filter((x) => x === "q:hello").length');
    check(hello && lines === 1 && (await b.eval('__av.store.get("cat.marks")')).includes('hello'), `holding out a hand: it sniffs, then rubs past you; "Lời chào" is written once (${lines} line) and saved`);
    // asleep: you cannot play with it, and calling only turns an ear
    await b.eval('__av.catMind.moved(); __av.cat.place(1, -3.4, 0, "sleep", 99); __av.catMind.moved()');
    await b.eval('__av.cat.setState("sleep", 1e4)');
    check(/ngủ/.test(await b.eval('__av.catMind.can("play")')), 'asleep, it cannot be asked to play');
    await sleep(300);
    const callAsleep = await b.eval('__av.catMind.offerCool.call = 0; __av.catMind.offer("call")');
    await sleep(1500);
    check(/vẫn ngủ/.test(callAsleep) && (await b.eval('__av.cat.state')) === 'sleep', `called while asleep: "${callAsleep}" (and it sleeps on)`);
    // you walk off in the middle of it: nothing is left hanging
    await b.eval('__av.catMind.moved(); __av.cat.place(1, -3.6, Math.PI, "sit", 4); __av.catMind.moved(); __av.catMind.offerCool.hand = 0; __av.catMind.tol = 1; __av.catMind.offer("hand")');
    await sleep(600);
    await b.eval('__av.walker.on = false; __av.camTarget.set(20, __av.terrainH(20, 20) + 1.7, 20); __av.camBase.copy(__av.camTarget)');
    await sleep(9000);
    const left = await b.eval('({ cur: __av.catMind.debug().cur, lock: __av.catMind.lock, lean: __av.cat.lean })');
    check(left.cur !== 'hand' && !left.lock && left.lean === 0, `you walk away mid-greeting: it lets go and carries on (${left.cur})`);
    // the ball of wool: watch, stalk, pounce, and then a wash
    await b.eval('__av.walker.on = false; __av.camTarget.set(1, __av.terrainH(1, -2) + 1.7, -2); __av.camBase.copy(__av.camTarget)');
    await b.eval('__av.cat.place(1, -3.6, Math.PI, "sit", 4); __av.catMind.moved(); __av.catMind.needs.play = 1; __av.catMind.needs.energy = 1; __av.catMind.tol = 1; __av.catMind.offerCool.play = 0');
    await sleep(300);
    const said2 = await b.eval('__av.catMind.offer("play")');
    const seen = new Set();
    let kicked = false;
    for (let i = 0; i < 70; i++) { await sleep(200); seen.add(await b.eval('__av.cat.state')); kicked = kicked || (await b.eval('__av.toy.speed() > 0.5')); }
    check(/cuộn len/.test(said2) && seen.has('stalk') && seen.has('pounce') && kicked, `rolling the wool: it stalks, pounces, bats it (${[...seen].join(', ')})`);
    await b.waitFor('!__av.catMind.playing', 30000, 'the game to end');
    await sleep(8500);
    check(!(await b.eval('__av.toy.active')), 'after the game the wool is put away');
    // the star game: no card over it, and it keeps living
    await open('time=night&x=1&z=-2');
    await b.click('#segPlay');
    await sleep(1500);
    check(!(await tag()).shown && (await b.eval('typeof __av.catMind.debug().cur')) === 'string', 'during the star game there is no card');
    await b.click('#segView');
    // stuck in the stream (unfrozen): it gets itself out
    await open('hour=10&season=summer&x=-20&z=-40');
    const wet = await b.eval('(() => { for (let z = -45; z > -70; z -= 1) { const x = __av.streamX(z); if (__av.wetAt(x, z)) return [x, z]; } return null; })()');
    await b.eval(`__av.cat.place(${wet[0]}, ${wet[1]}, 0, "sit", 2); __av.catMind.moved()`);
    await b.waitFor('!__av.wetAt(__av.cat.x, __av.cat.z)', 15000, 'the cat to get out of the water');
    check(true, 'put down in the stream, it walks out of the water');
    // into the cabin with you when it is near; left outside (and unseen) when it is far off
    await open('time=day&x=-9.5&z=-10');
    await b.eval('__av.cat.place(-8, -8, 0, "sit", 3); __av.catMind.moved()');
    await b.hold('e', 80);
    await sleep(2600);
    check(await b.eval('__av.cat.inside && __av.cat.group.visible'), 'it was near the porch, so it comes in with you');
    await b.hold('e', 80); await sleep(1600); await b.hold('e', 80); await sleep(1500);
    check(await b.eval('!__av.cat.inside && !__av.indoor.on'), 'and comes out again with you');
    await b.eval('__av.cat.place(30, 12, 0, "sit", 3); __av.catMind.moved()');
    await b.eval('__av.camBase.set(-9.5, __av.camBase.y, -10)');
    await sleep(400);
    await b.hold('e', 80);
    await sleep(2600);
    const st = await b.eval('({ inside: __av.cat.inside, vis: __av.cat.group.visible, can: __av.catMind.can("pet"), menu: document.getElementById("actBtn").textContent })');
    check(!st.inside && !st.vis && st.can === 'Choco không ở đây' && !/Choco/.test(st.menu), `from the garden it stays outside: not shown in the room, nothing offered ("${st.can}")`);
    // reading on the garden bench: once it knows you, it comes along the walk and lies at your feet
    await open('hour=10&season=summer&spot=bench');
    await b.eval('__av.catMind.bond = 20; __av.catMind.marks.delete("reading"); __av.cat.free(); __av.cat.place(-1.5, -3.5, 0, "sit", 2); __av.catMind.moved()');
    await sleep(1200);
    await b.hold('e', 80);
    await sleep(800);
    check(await b.eval('__av.book.open'), 'sitting down to read on the bench');
    const t0 = Date.now();
    await b.waitFor('__av.catMind.marks.has("reading")', 150000, 'Choco to come to the bench');
    const there = await b.eval('({ d: Math.hypot(__av.cat.x - __av.camBase.x, __av.cat.z - __av.camBase.z), wet: __av.wetAt(__av.cat.x, __av.cat.z) })');
    check(there.d < 2 && !there.wet, `while you read, Choco walks the ${((Date.now() - t0) / 1000).toFixed(0)} s along the walk and lies down ${there.d.toFixed(2)} m from you`);
    check(errorsOf(b).length === 0, `no console errors${errorsOf(b).length ? ': ' + errorsOf(b).join(' | ') : ''}`);
  } finally { await b.close(); }
}

// The valley as yours and the quiet things to do: the save (old saves, display settings, the
// separate reset), tea by the fire, the rocking chair, decorations, favourite views, the valley's
// name; and the picture's plumbing: the quality ladder, the lens pass left out when its aperture
// is shut, the shader warm-up, and what happens when the graphics card drops the page.
async function worldCheck() {
  const b = await launch({ size: [1280, 800] });
  const at = (x, z, yaw = 0, pitch = -10) => b.eval(`(() => { const a = __av; a.walker.on = true; a.walker.x = ${x}; a.walker.z = ${z}; a.camTarget.set(${x}, a.terrainH(${x}, ${z}) + 1.7, ${z}); a.camBase.copy(a.camTarget); a.view.yaw = a.view.yawT = ${yaw}; a.view.pitch = a.view.pitchT = ${pitch}; })()`);
  try {
    // --- an old save (before display settings and the "me" table) still loads, and is kept
    // (written from a page of the same site that does not run the game, or its save on leaving
    // would overwrite this one)
    await b.goto(`${BASE}/package.json`);
    await b.eval(`localStorage.setItem('aurora-vale-db', JSON.stringify({ v: 1, t: 1700000000000, settings: { quality: 'low', season: 'autumn', flow: true, name: 'Lá' }, story: { log: ['r:1'] }, cat: { bond: 20 } }))`);
    await b.goto(`${BASE}/?auto=view&debug=1&cloud=0&hour=10.5&season=summer`);
    await b.waitFor('window.__av && __av.started()', 60000, 'the scene to start');
    await sleep(1500);
    const old = await b.eval(`({ q: __av.store.get('settings.quality'), log: __av.store.get('story.log', []).join(), bond: __av.store.get('cat.bond'), pr: __av.store.get('settings.priority'), lens: __av.store.get('settings.lens'), valley: __av.store.get('me.valley'), views: __av.store.get('me.views', []).length })`);
    check(old.q === 'low' && old.log === 'r:1' && old.bond === 20 && old.pr === 'balanced' && old.lens === true && old.valley === '' && old.views === 0, `an old save loads with its progress and the new fields at their defaults (${JSON.stringify(old)})`);
    // display settings are not progress: they do not move doc.t and survive a full reset
    const t0 = await b.eval('__av.store.edited');
    await b.eval(`__av.store.set('settings.bloom', false); __av.store.set('settings.priority', 'smooth')`);
    check(await b.eval('__av.store.edited') === t0, 'changing a display setting does not count as progress (doc.t unchanged)');
    // the personal part resets on its own
    await b.eval(`__av.store.set('me.valley', 'Thung Mơ'); __av.store.set('me.views', ['1,2,3,4,1.7']); __av.store.set('me.firsts', ['tea']); __av.store.resetTable('me')`);
    const after = await b.eval(`({ v: __av.store.get('me.valley'), n: __av.store.get('me.views', []).length, f: __av.store.get('me.firsts', []).length, log: __av.store.get('story.log', []).join(), bond: __av.store.get('cat.bond') })`);
    check(after.v === '' && after.n === 0 && after.f === 0 && after.log === 'r:1' && after.bond === 20, 'resetting the personal part clears only me.* (the diary and the bond stay)');
    // export never carries the session; import keeps this device's display settings
    await b.eval(`__av.store.set('cloud.auth', '{"secret":"x"}')`);
    const exp = await b.eval('__av.store.export()');
    check(!/secret/.test(exp) && !/"cloud"/.test(exp), 'the backup file has no login session in it');
    const imported = await b.eval(`(() => { const d = JSON.parse(__av.store.export()); d.settings.priority = 'beauty'; d.settings.bloom = true; d.me = { valley: 'Từ file', views: [], decor: [], firsts: [] }; __av.store.import(JSON.stringify(d)); return { pr: __av.store.get('settings.priority'), bloom: __av.store.get('settings.bloom'), v: __av.store.get('me.valley'), auth: __av.store.get('cloud.auth') }; })()`);
    check(imported.pr === 'smooth' && imported.bloom === false && imported.v === 'Từ file' && imported.auth === '{"secret":"x"}', `a restored backup brings the progress and the valley, keeps this device's display settings and session (${JSON.stringify(imported)})`);
    await b.eval(`__av.store.set('cloud.auth', ''); __av.store.set('settings.bloom', true); __av.store.set('settings.priority', 'balanced')`);

    // --- tea by the fire: no fire, no tea; with a fire it heats, pours, steams; a step ends it
    // (the dog and the cat are held off to one side, so the button is about the tea)
    await b.eval(`__av.corgi.hold('sit'); __av.corgi.place(-6, 3, 0, 'sit', 999); __av.cat.hold('sit'); __av.cat.place(25, 12, 0, 'sit', 999)`);
    const T = await b.eval('__av.TEA_SEAT');
    await at(T.x, T.z + 1.0, 180);
    await sleep(600);
    check(await b.eval('__av.actKind()') === 'tea', 'by the stool the button offers tea');
    await b.eval('__av.fire.level = 0');
    await b.eval('__av.startTea()');
    check(await b.eval('__av.pastimes.tea.state') === 'idle' && await b.eval('__av.pastime.kind') === 'tea', 'with the fire out you sit, but the kettle is not put on (and you are told why)');
    await b.eval('__av.endPastime(true); __av.fire.level = 0.9');
    await at(T.x, T.z + 1.0, 180);
    await sleep(300);
    await b.eval('__av.startTea()');
    await b.waitFor(`__av.pastimes.tea.state === 'poured'`, 20000, 'the tea to be poured');
    await sleep(300);
    const tea = await b.eval(`({ log: __av.store.get('story.log', []).filter((x) => x.startsWith('h:')), firsts: __av.store.get('me.firsts', []), act: __av.actKind(), walker: __av.walker.on, up: !document.getElementById('upBtn').classList.contains('hidden') })`);
    check(tea.log.length === 1 && tea.firsts.includes('tea') && tea.act === 'sip' && tea.up && !tea.walker, `the tea is poured: one diary line (${tea.log}), the first time remembered, the button offers a sip (${tea.act}), "get up" is shown`);
    // four sips empty the cup; the cup goes back to the tray each time; then another pot is offered
    const sips = [];
    for (let i = 0; i < 4; i++) {
      await b.click('#actBtn');
      await sleep(1300);
      const mid = await b.eval('__av.pastimes.tea.sip');
      await sleep(1900);
      sips.push([mid > 0 ? 'up' : 'no', (await b.eval('__av.pastimes.tea.fill')).toFixed(2)].join(' '));
    }
    const emptied = await b.eval(`({ st: __av.pastimes.tea.state, act: __av.actKind(), back: __av.pastimes.tea.sip < 0 })`);
    check(sips.every((x) => x.startsWith('up')) && emptied.st === 'cool' && emptied.act === 'brew' && emptied.back, `four sips lift the cup and empty it (${sips.join(', ')}); then another pot is offered (${emptied.act})`);
    await b.eval('__av.endPastime(true); __av.startTea()');
    await b.waitFor(`__av.pastimes.tea.state === 'poured'`, 20000, 'a second pot');
    check((await b.eval(`__av.store.get('story.log', []).filter((x) => x.startsWith('h:')).length`)) === 1, 'a second pot the same season writes no second diary line');
    await b.hold('s', 300);
    await sleep(300);
    check(await b.eval('__av.pastime.kind') === '' && await b.eval('__av.walker.on'), 'a step gets you up from the stool');
    // the "get up" chip does it too, and Esc stands you up from "sit with Choco"
    await b.eval('__av.fire.level = 0.9; __av.startTea()');
    await sleep(400);
    await b.click('#upBtn');
    await sleep(300);
    const upChip = await b.eval(`({ kind: __av.pastime.kind, walker: __av.walker.on, hidden: document.getElementById('upBtn').classList.contains('hidden') })`);
    check(upChip.kind === '' && upChip.walker && upChip.hidden, 'the "get up" chip stands you up from the stool and goes away');
    await b.eval('__av.fire.level = 0');
    await b.eval('__av.startTea()');
    await b.eval('__av.endPastime(true)');

    // --- the rocking chair: sit, read where you sit (not at the bench), Esc closes the book first
    await b.eval('__av.enterRoom()');
    await sleep(500);
    await b.eval(`(() => { const a = __av, c = a.room.chair; a.walker.x = c.x + 0.9; a.walker.z = c.z + 0.6; })()`);
    await sleep(700);
    const nearChair = await b.eval('__av.actKind()');
    await b.eval('__av.startChair()');
    await sleep(2500);
    check(nearChair === 'chair' && await b.eval('__av.pastime.kind') === 'chair' && await b.eval('__av.actKind()') === 'chairread', `beside the chair E sits you down (${nearChair}); seated, it offers a book`);
    const camBefore = await b.eval('[__av.camTarget.x, __av.camTarget.z]');
    await b.eval('__av.openBook(true, true)');
    await sleep(400);
    const camAfter = await b.eval('[__av.camTarget.x, __av.camTarget.z]');
    check(await b.eval('__av.book.open') && Math.hypot(camAfter[0] - camBefore[0], camAfter[1] - camBefore[1]) < 0.01 && await b.eval('__av.indoor.on'), 'reading in the chair opens the shelf where you sit (not at the garden bench)');
    await b.key('keyDown', 'Escape'); await b.key('keyUp', 'Escape');
    await sleep(200);
    check(!(await b.eval('__av.book.open')) && await b.eval('__av.pastime.kind') === 'chair', 'Esc closes the book first, and you are still in the chair');
    await b.key('keyDown', 'Escape'); await b.key('keyUp', 'Escape');
    await sleep(200);
    check(await b.eval('__av.pastime.kind') === '' && await b.eval('__av.indoor.on'), 'Esc again gets you up (still inside)');
    await b.eval('__av.startChair()');
    await sleep(300);
    await b.eval('__av.leaveRoom()');
    await sleep(300);
    check(await b.eval('__av.pastime.kind') === '' && !(await b.eval('__av.indoor.on')), 'going out of the door ends the sitting');

    // --- decorations and views, the valley's name
    await b.eval(`__av.setDecor('porch', 'lanterns'); __av.setDecor('tent', 'pots')`);
    check(JSON.stringify(await b.eval(`__av.store.get('me.decor', []).sort()`)) === JSON.stringify(['porch:lanterns', 'tent:pots']), 'chosen decorations are saved');
    await b.eval(`__av.setDecor('tent', 'nonsense')`);
    check(JSON.stringify(await b.eval(`__av.store.get('me.decor', [])`)) === JSON.stringify(['porch:lanterns']), 'an unknown variant counts as none');
    await at(10, 20, 30, -5);
    await sleep(300);
    for (let i = 0; i < 7; i++) { await at(10 + i * 3, 20, 30, -5); await b.eval('__av.saveView()'); }
    check((await b.eval(`__av.store.get('me.views', []).length`)) === 6, 'at most six favourite views are kept');
    const first = await b.eval(`__av.store.get('me.views', [])[0]`);
    await at(-30, 60, 0, 0);
    await b.eval(`__av.goView(${JSON.stringify(first)})`);
    await sleep(900);
    const pos = await b.eval('[__av.camBase.x, __av.camBase.z, __av.view.yaw]');
    check(Math.hypot(pos[0] - 10, pos[1] - 20) < 0.6 && Math.abs(pos[2] - 30) < 1, `going to a saved view puts you there, looking the same way (${pos.map((v) => v.toFixed(1))})`);
    await b.eval(`(() => { const el = document.getElementById('valleyName'); el.value = 'Thung <b>Mơ</b>'; el.dispatchEvent(new Event('input')); })()`);
    const named = await b.eval(`({ t: document.title, s: __av.store.get('me.valley') })`);
    check(named.s === 'Thung bMơ/b' && named.t.startsWith('Thung bMơ/b'), `the valley's name is cleaned and shown in the title (${named.t})`);
    await b.goto(`${BASE}/?auto=view&debug=1&cloud=0&hour=10.5&season=summer`);
    await b.waitFor('window.__av && __av.started()', 60000, 'the scene to start again');
    await sleep(800);
    check(await b.eval(`__av.pastimes.chosen.porch === 'lanterns' && document.title.startsWith('Thung')`), 'after a reload the decorations and the name are still there');

    // --- the quality ladder: every step can be taken back; "Đẹp" never sheds grass or resolution
    const full = await b.eval('JSON.stringify(__av.quality())');
    await b.eval('__av.applyShed(9)');
    const shed = await b.eval('__av.quality()');
    await b.eval('__av.applyShed(0)');
    const back = await b.eval('__av.quality()');
    check(shed.grassFrac < 1 && shed.flowerFrac < 1 && back.grassFrac === 1 && back.flowerFrac === 1 && back.pixelRatio === JSON.parse(full).pixelRatio && back.shed === 0, 'the quality ladder sheds grass, flowers and resolution and gives them all back');
    await b.eval('__av.applyShed(5); __av.setPriority("beauty")');
    check((await b.eval('__av.quality().shed')) <= 2, 'switching to "Đẹp" climbs back above the grass and resolution steps at once');
    await b.eval('__av.setPriority("balanced"); __av.applyShed(0)');

    // --- the shader warm-up runs, and reports when it is done (or skipped on this renderer)
    await b.waitFor(`/done|failed|no/.test(__av.warm())`, 30000, 'the shader warm-up');
    check(/done/.test(await b.eval('__av.warm()')), `shader warm-up: ${await b.eval('__av.warm()')}`);
    check(errorsOf(b).length === 0, `no console errors${errorsOf(b).length ? ': ' + errorsOf(b).join(' | ') : ''}`);

    // --- the graphics card drops the page: a message, then a reload when it comes back
    await b.eval(`(() => { const gl = __av.renderer.getContext(); window.__lose = gl.getExtension('WEBGL_lose_context'); __lose.loseContext(); })()`);
    await sleep(500);
    check(!(await b.eval(`document.getElementById('glLost').classList.contains('hidden')`)), 'losing the WebGL context shows the message instead of a frozen picture');
    await b.eval('window.__marker = 1; __lose.restoreContext()');
    await sleep(2500);
    check(await b.eval('window.__marker === undefined'), 'when the context comes back the page reloads itself');
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

// The activities of this round: fishing and the fish book, the myth chapters, the telescope and
// the solar-system model. Data checks run here in Node (the data modules import no three.js);
// the rest drives the page.
async function actsCheck() {
  const fd = await import('../js/fishdata.js');
  const astro = await import('../js/astro.js');
  const myths = await import('../js/myths.js');
  const FAMS = ['salmonid', 'coregonid', 'pike', 'perch', 'cyprinid', 'burbot', 'stickle', 'cottid', 'eel', 'smelt'];
  // --- the fish data
  const ids = fd.ALL_FISH.map((f) => f.id);
  check(new Set(ids).size === ids.length, `every species has its own id (${ids.length})`);
  check(fd.ALL_FISH.length >= 24 && fd.FISH.length >= 16, `at least 24 real species in the book, at least 16 that can be caught (${fd.ALL_FISH.length} / ${fd.FISH.length})`);
  const spotIds = fd.SPOTS.map((s) => s.id);
  const missing = fd.ALL_FISH.filter((f) => !(f.vi && f.sci && f.url && f.max && f.id_ && f.id_.length >= 2 && f.range && f.about && f.iucn && FAMS.includes(f.shape.fam) && f.look && f.look.pat));
  check(!missing.length, `no species is missing names, sizes, identification, range, text, source or a body family (${missing.map((f) => f.id)})`);
  const badSpots = fd.FISH.filter((f) => !f.habitat.every((h) => spotIds.includes(h)) || !Object.keys(f.bite.spots).every((k) => f.habitat.includes(k)) || f.sizeRange[0] <= 0 || f.sizeRange[1] <= f.sizeRange[0]);
  check(!badSpots.length, `each valley fish bites only where it lives, with a sane size range (${badSpots.map((f) => f.id)})`);
  check(fd.EXTRA.every((f) => f.why && !f.bite), 'the reference pages say why they are not in the valley, and none can be caught');
  const looks = new Set(fd.ALL_FISH.map((f) => `${f.shape.fam}|${f.shape.depth}|${f.shape.width}|${f.look.pat}`));
  check(looks.size === fd.ALL_FISH.length, 'no two species share the same body family, proportions and pattern');
  // the draw: thousands of bites at every spot, season and hour
  let wrong = 0, outside = 0, n = 0;
  const per = {};
  let seed = 1; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (const sp of fd.SPOTS) for (let season = 0; season < 3; season++) for (const hour of [5, 12, 19, 23]) for (let i = 0; i < 300; i++) {
    const r = fd.drawFish(sp.id, season, hour, rnd, [], new Set());
    n++;
    if (!r) { wrong++; continue; }
    if (!r.fish.habitat.includes(sp.id)) wrong++;
    if (r.cm < r.fish.sizeRange[0] || r.cm > r.fish.sizeRange[1]) outside++;
    (per[sp.id] = per[sp.id] || new Set()).add(r.fish.id);
  }
  check(!wrong && !outside, `${n} bites: every fish from a species that lives at that spot, every size inside its range (${wrong} wrong place, ${outside} outside)`);
  check(Object.values(per).every((s) => s.size >= 5), `each spot has several possible species (${Object.entries(per).map(([k, s]) => `${k} ${s.size}`).join(', ')})`);
  const caught = new Set(Object.values(per).flatMap((s) => [...s]));
  check(caught.size === fd.FISH.length, `all ${fd.FISH.length} valley species can actually be caught somewhere (${caught.size})`);
  // --- the sky's arithmetic against known events
  const jd = (y, m, d, h) => astro.julian(y, m, d, h);
  check(astro.moonPos(jd(2026, 1, 3, 12)).illum > 0.97 && astro.moonPos(jd(2026, 1, 18, 12)).illum < 0.03, 'the Moon: full on 3 Jan 2026, new on 18 Jan 2026');
  check(astro.planetGeo('jupiter', jd(2026, 1, 10, 0)).elong > 175, 'Jupiter is at opposition around 10 Jan 2026');
  check(Math.abs(astro.saturnRingTilt(jd(2025, 3, 23, 12))) < 1, "Saturn's rings are edge-on on 23 Mar 2025");
  let antares = -90; for (let h = 0; h < 24; h += 0.5) antares = Math.max(antares, astro.toHorizon(16.49, -26.43, jd(2027, 1, 16, h)).alt);
  const pol = astro.toHorizon(2.53, 89.26, jd(2027, 1, 16, 20)).alt;
  check(antares < 0 && Math.abs(pol - astro.OBSERVER.lat) < 1.2, `from 68.4°N Antares never rises (highest ${antares.toFixed(1)}°) and Polaris stands at about the latitude (${pol.toFixed(1)}°)`);
  check(myths.MYTH_LINES.length >= 2 && myths.MYTH_LINES.every((l) => l.chapters.every((c) => c.tale.length && c.sky.length && c.skysrc.length) && l.src.length), 'two myth lines, every chapter with a tale, a sky page and sources');

  // --- in the page
  const b = await launch({ size: [1280, 800] });
  try {
    // an old save, from before this round: its progress and Choco's bond stay, the new tables start empty
    await b.goto(`${BASE}/package.json`);
    await b.eval(`localStorage.setItem('aurora-vale-db', JSON.stringify({ v: 1, t: 1700000000000, settings: { quality: 'low' }, game: { woven: ['cas', 'lyr'], stage: 2, best: 900 }, cat: { bond: 33, marks: ['hello'] }, story: { log: ['r:1'] } }))`);
    await b.goto(`${BASE}/?auto=view&debug=1&cloud=0&hour=7&season=summer&seed=4`);
    await b.waitFor('window.__av && __av.started()', 60000, 'the scene to start');
    await sleep(1500);
    const old = await b.eval(`({ bond: __av.store.get('cat.bond'), marks: __av.store.get('cat.marks', []).join(), woven: __av.store.get('game.woven', []).join(), stage: __av.store.get('game.stage'), seen: __av.store.get('fish.seen', []).length, obs: __av.store.get('sky.obs', []).length, myth: __av.store.get('sky.myth', []).length, mode: __av.store.get('fish.mode') })`);
    check(old.bond === 33 && old.marks === 'hello' && old.woven === 'cas,lyr' && old.stage === 2 && old.seen === 0 && old.obs === 0 && old.myth === 0 && old.mode === 'relaxed', `an old save keeps Choco and the star game, the new tables start empty (${JSON.stringify(old)})`);

    // --- fishing: the states, cancelling, the record written once
    const S = (k) => b.eval(`__av.fishing.state.${k}`);
    await b.eval(`(() => { const s = __av.fishing.spots[0]; __av.walker.on = true; __av.walker.x = s.x; __av.walker.z = s.z + 0.4; })()`);
    await sleep(900);
    check(await b.eval('__av.actKind()') === 'fish', 'on the bank the button offers fishing');
    await b.eval('__av.startFishing()'); await sleep(1200);
    await b.eval('__av.view.pitch = __av.view.pitchT = 30'); await sleep(400);
    const why = await b.eval('__av.fishing.cast()');
    check(await S('state') === 'aim' && why !== '', `looking at the sky, the cast is refused with a reason ("${why}")`);
    await b.eval('__av.view.pitch = __av.view.pitchT = -24'); await sleep(500);
    check(await b.eval('__av.fishing.cast()') === '' && await S('state') === 'cast', 'looking at the water, the float flies');
    await sleep(1300);
    check(await S('state') === 'wait', 'the float lands and you wait');
    const early = await b.eval('__av.fishing.strike()');
    check(await S('state') === 'wait' && /sớm/.test(early), 'striking before the float goes under only says so; nothing is lost');
    // walking off mid-fight puts everything away and records nothing
    await b.eval('__av.fishing.state.biteAt = __av.fishing.state.t'); await sleep(200);
    await b.eval('__av.fishing.strike()'); await sleep(200);
    check(await S('state') === 'hooked', 'a strike in time hooks the fish');
    await b.eval('__av.stopFishing()'); await sleep(900);
    check(await S('state') === 'off' && await b.eval('__av.walker.on') && (await b.eval(`__av.store.get('fish.count', 0)`)) === 0, 'leaving with a fish on: the rod is put away, you can walk, nothing is recorded');
    // a fish that gets away (manual play, too much tension) is not recorded either
    await b.eval('__av.startFishing()'); await sleep(700);
    await b.eval('__av.fishUI && __av.fishing.setMode("manual"); __av.view.pitch = __av.view.pitchT = -24'); await sleep(400);
    await b.eval('__av.fishing.cast()'); await sleep(1300);
    await b.eval('__av.fishing.state.biteAt = __av.fishing.state.t'); await sleep(200);
    await b.eval('__av.fishing.strike()'); await sleep(100);
    await b.eval('__av.fishing.state.over = 5; __av.fishing.state.tension = 1.4'); await sleep(400);
    check(['retrieve', 'aim'].includes(await S('state')) && (await b.eval(`__av.store.get('fish.count', 0)`)) === 0, 'in manual play a fish can slip the hook: it swims off, nothing is recorded, nothing is lost');
    await sleep(800);
    // a landed fish: recorded once, however often the buttons are pressed
    await b.eval('__av.fishing.setMode("relaxed"); __av.view.pitch = __av.view.pitchT = -24'); await sleep(300);
    await b.eval('__av.fishing.cast()'); await sleep(1300);
    await b.eval('__av.fishing.state.biteAt = __av.fishing.state.t'); await sleep(200);
    await b.eval('__av.fishing.strike(); __av.fishing.reel(true)');
    await b.waitFor('__av.fishing.state.state === "landed"', 60000, 'the fish to be landed');
    await b.eval('__av.fishing.reel(false)');
    const fid = await b.eval('__av.fishing.state.catch.fish.id');
    for (let i = 0; i < 5; i++) { await b.eval('__av.fishing.release(); document.getElementById("actBtn").click()'); }
    await sleep(3500);
    const rec = await b.eval(`({ count: __av.store.get('fish.count'), seen: __av.store.get('fish.seen', []), first: __av.store.get('fish.first', []), best: __av.store.get('fish.best', []), log: __av.store.get('story.log', []).filter((x) => x.startsWith('a:')) })`);
    check(rec.count === 1 && rec.seen.length === 1 && rec.seen[0] === fid && rec.first.length === 1 && rec.first[0].startsWith(fid + '|') && rec.best.length === 1 && rec.log.length === 1, `a landed ${fid} is written once: seen, first catch, best size, one diary line (${JSON.stringify(rec)})`);
    check(await S('state') === 'aim' && !(await b.eval('!!__av.fishing.group.children.find((c) => c.userData && c.userData.fish)')), 'released: the fish swims off and is removed; you are ready to cast again');
    await b.eval(`dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`); await sleep(700);
    check(await S('state') === 'off' && await b.eval('__av.walker.on'), 'Esc puts the rod away');

    // --- the fish book
    await b.eval(`document.getElementById('qJournal').click()`); await sleep(300);
    await b.eval(`document.getElementById('tab-fish').click()`); await sleep(1500);
    const book = await b.eval(`({ tiles: document.querySelectorAll('#fishBook .fb-tile').length, caught: document.querySelectorAll('#fishBook .fb-tile.caught').length, extra: document.querySelectorAll('#fishBook .fb-tile.extra').length })`);
    check(book.tiles === 26 && book.caught === 1 && book.extra === 8, `the book lists 26 species, the one you caught in colour, 8 reference pages (${JSON.stringify(book)})`);
    await b.eval(`(() => { const i = document.querySelector('.fb-search'); i.value = 'zzzz'; i.dispatchEvent(new Event('input')); })()`); await sleep(200);
    check(await b.eval(`!document.querySelector('.fb-empty').classList.contains('hidden') && document.querySelectorAll('#fishBook .fb-tile').length === 0`), 'a search with no match says so');
    const walkBefore = await b.eval('__av.walker.x');
    await b.eval(`(() => { const i = document.querySelector('.fb-search'); i.focus(); })()`);
    await b.hold('w', 300);
    check(Math.abs((await b.eval('__av.walker.x')) - walkBefore) < 1e-6 && await b.eval('document.querySelector(".fb-search") === document.activeElement'), 'typing in the search does not walk');
    await b.eval(`(() => { const i = document.querySelector('.fb-search'); i.value = 'hồi'; i.dispatchEvent(new Event('input')); document.querySelector('#fishBook .fb-tile').click(); })()`); await sleep(1200);
    check(await b.eval(`!!document.querySelector('#fishBook .fb-stage canvas') && /FishBase/.test(document.getElementById('fishBook').textContent)`), 'a species page has its turning model and its sources');
    await b.eval(`dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`); await sleep(300);
    check(await b.eval(`document.getElementById('journal').classList.contains('hidden')`), 'Esc closes the journal');

    // --- the telescope (the clock is held while you look, the Moon is recorded once)
    await b.goto(`${BASE}/?auto=view&debug=1&cloud=0&season=winter&time=night`);
    await b.waitFor('window.__av && __av.started()', 60000, 'the scene to start');
    await sleep(1200);
    await b.eval(`__av.store.set('settings.flow', true)`);
    await b.eval(`(() => { __av.walker.on = true; __av.walker.x = -2; __av.walker.z = 105.6; })()`); await sleep(900);
    check(await b.eval('__av.actKind()') === 'scope', 'beside the telescope the button offers a look through it');
    await b.click('#actBtn'); await sleep(500);
    const h0 = await b.eval('__av.clock.hour');
    await b.eval(`(() => { const s = __av.scope.state; s.target = 'moon'; document.querySelector('.scope-select').value = 'moon'; document.querySelectorAll('.scope-row')[1].children[1].click(); document.querySelector('.scope-side > button.chip').click(); })()`);
    await sleep(4500);
    check(Math.abs((await b.eval('__av.clock.hour')) - h0) < 1e-6, 'the valley clock does not move while you look through the telescope');
    const obs = await b.eval(`__av.store.get('sky.obs', [])`);
    await sleep(2500);
    check(obs.join() === 'moon' && (await b.eval(`__av.store.get('sky.obs', []).length`)) === 1 && (await b.eval(`__av.store.get('story.log', []).filter((x) => x === 'o:moon').length`)) === 1, `the Moon, centred and sharp, is recorded once (${obs})`);
    await b.eval(`dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`); await sleep(100);
    await b.eval(`dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`); await sleep(400);
    check(!(await b.eval('__av.scope.active')) && !(await b.eval(`document.body.classList.contains('scoping')`)), 'Esc leaves the telescope (the card first)');

    // --- the solar-system model: opened and closed many times, the page does not grow
    await b.eval('__av.openOrrery()'); await sleep(250); await b.eval(`dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`); await sleep(150);   // its info panel is filled once
    const yaw0 = await b.eval('__av.view.yawT'), nodes0 = await b.eval('document.getElementsByTagName("*").length'), hour0 = await b.eval('__av.clock.hour');
    for (let i = 0; i < 12; i++) { await b.eval('__av.openOrrery()'); await sleep(250); await b.eval(`dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`); await sleep(150); }
    const nodes1 = await b.eval('document.getElementsByTagName("*").length');
    check(nodes1 === nodes0 && Math.abs((await b.eval('__av.view.yawT')) - yaw0) < 1e-6 && Math.abs((await b.eval('__av.clock.hour')) - hour0) < 1e-6, `the model opened and closed 12 times: the page does not grow (${nodes0} → ${nodes1} elements), your view and the clock are as they were`);

    // --- a myth chapter: recorded once, the classic stage untouched, back to the valley after
    const stage0 = await b.eval('__av.game.stage');
    const weave = `(() => { const g = __av.game, c = g.current; const order = [0], seen = new Set([0]); while (order.length < c.lit.length) for (const k of [...order]) for (const j of c.def.adj[k]) if (!seen.has(j)) { seen.add(j); order.push(j); } for (const k of order) { g.charge = 9; g._lightNode(c, k); } })()`;
    for (let i = 0; i < 2; i++) { await b.eval(`__av.startMythChapter('orion', 0)`); await sleep(600); await b.eval(weave); await sleep(600); await b.eval(`document.querySelector('.myth-done .chip').click()`); await sleep(400); }
    const my = await b.eval(`({ myth: __av.store.get('sky.myth', []), log: __av.store.get('story.log', []).filter((x) => x === 'y:orion0').length, stage: __av.game.stage, mode: document.body.classList.contains('view'), cur: String(__av.game.myth) })`);
    check(my.myth.join() === 'orion:0' && my.log === 1 && my.stage === stage0 && my.mode && my.cur === 'null', `a myth chapter woven twice is recorded once; the star game's own progress is untouched; "Về trại" returns to the valley (${JSON.stringify(my)})`);

    // --- export and import carry the new tables
    const exported = await b.eval('__av.store.export()');
    const back = JSON.parse(exported);
    check(back.fish && back.sky && back.sky.obs.includes('moon') && back.sky.myth.includes('orion:0') && back.cat.bond === 33, 'the backup file carries the fish, the sky and Choco');
    check(!(await b.eval(`__av.store.import('{"v":1,"fish":{"seen":"oops"}}') && __av.store.get('fish.seen', []).length > 0`)), 'a malformed fish table in an imported file is cleaned, not trusted');
    check(!b.logs.some((l) => /error|exception/i.test(l)), `no console errors${b.logs.filter((l) => /error|exception/i.test(l)).slice(0, 3).map((l) => '\n    ' + l).join('')}`);
  } finally { await b.close(); }
}

// The menu (menu.js, menucontent.js): every old control still reachable and working, nothing
// reaching the world while it is open, keyboard and focus, search, guiding without starting.
async function menuCheck() {
  const b = await launch({ size: [1280, 800] });
  try {
    await b.goto(`${BASE}/?auto=view&debug=1&cloud=0&hour=10&season=summer&x=0&z=6`);
    await b.waitFor('window.__av && __av.started()', 60000, 'the scene to start');
    await sleep(1500);
    // the inventory: every control of the old dock and HUD is inside the menu or its popovers now
    const ids = ['timeSlider', 'autoDay', 'seasonChips', 'moods', 'timelapse', 'conBtn', 'lampBtn', 'qualityChips', 'priorityChips', 'lensBtn', 'bloomBtn', 'swayBtn', 'tourBtn', 'volume', 'dockMute', 'optFish', 'optScope', 'optWeave', 'tagBtn', 'cloudStatus', 'telemetryBtn', 'resetPic', 'resetSound', 'resetHelp', 'storyCardBtn'];
    const where = await b.eval(`(${JSON.stringify(ids)}).map((id) => { const e = document.getElementById(id); return id + ':' + (e ? (e.closest('#menu') ? 'menu' : e.closest('.m-pop') ? 'pop' : 'other') : 'missing'); })`);
    check(where.every((w) => /:(menu|pop)$/.test(w)), `every old setting lives in the menu or a popover (${where.filter((w) => !/:(menu|pop)$/.test(w)).join(', ') || 'all there'})`);
    check(await b.eval(`['qTime', 'qJournal', 'qExplore', 'qFriends', 'qMore', 'soundBtn', 'fsBtn', 'hideBtn', 'segPlay', 'segView'].every((id) => document.getElementById(id))`), 'the quick bar\'s five entries and the corner buttons are all there');
    // a moved control still works where it is now
    const lens0 = await b.eval(`__av.store.get('settings.lens')`);
    await b.eval(`document.getElementById('qMore').click()`); await sleep(300);
    await b.eval(`document.getElementById('mset-picture').click(); document.getElementById('lensBtn').click()`); await sleep(200);
    check((await b.eval(`__av.store.get('settings.lens')`)) === !lens0, 'a moved control still does its job (Xoá phông, from inside the menu)');
    await b.eval(`document.getElementById('lensBtn').click()`);
    // nothing reaches the world while the menu is open
    const x0 = await b.eval('__av.walker.x + "," + __av.walker.z');
    await b.hold('w', 500);
    check((await b.eval('__av.walker.x + "," + __av.walker.z')) === x0, 'holding W while the menu is open does not walk');
    check(await b.eval(`getComputedStyle(document.getElementById('actBtn')).visibility === 'hidden' || document.getElementById('actBtn').classList.contains('hidden')`), 'the in-scene action button is hidden while the menu is open');
    // Esc closes it and gives the focus back to what opened it
    await b.eval(`document.getElementById('menu').querySelector('.menu-close').click()`); await sleep(200);
    await b.eval(`document.getElementById('qExplore').focus(); document.getElementById('qExplore').click()`); await sleep(300);
    await b.eval(`dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`); await sleep(200);
    check(await b.eval(`document.getElementById('menu').classList.contains('hidden') && document.activeElement && document.activeElement.id === 'qExplore'`), 'Esc closes the menu and the focus returns to "Khám phá"');
    // Tab stays inside the dialog
    await b.eval(`document.getElementById('qExplore').click()`); await sleep(300);
    const trapped = await b.eval(`(() => { const p = document.querySelector('.menu-panel'); const f = [...p.querySelectorAll('button, input, select, a[href]')].filter((x) => !x.disabled && x.offsetParent !== null); f[f.length - 1].focus(); document.getElementById('menu').dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })); return document.activeElement === f[0]; })()`);
    check(trapped, 'Tab from the last control comes back to the first (focus stays in the menu)');
    // search: accents optional, the best match first, an empty state with a way out
    const search = async (q) => { await b.eval(`(() => { const i = document.querySelector('.menu-search input'); i.value = ${JSON.stringify(q)}; i.dispatchEvent(new Event('input')); })()`); await sleep(150); return b.eval(`[...document.querySelectorAll('.menu-res b')].map((x) => x.textContent)`); };
    const r1 = await search('ca'), r2 = await search('kinh'), r3 = await search('am luong'), r4 = await search('zzzz');
    check(r1[0] === 'Câu cá' && r2.includes('Kính thiên văn') && r3.includes('Âm lượng') && !r4.length && await b.eval(`!!document.querySelector('.menu-empty button')`), `search without accents: "ca" → ${r1[0]}, "kinh" → ${r2[0]}, "am luong" → ${r3[0]}; nothing found says so, with a button to clear`);
    await b.eval(`document.querySelector('.menu-empty button').click()`); await sleep(100);
    // guiding to a fishing spot sets the compass and does not start fishing
    await b.eval(`document.getElementById('mtab-fish').click()`); await sleep(200);
    await b.eval(`document.querySelector('#mpane-fish .m-btn.primary').click()`); await sleep(300);
    check(await b.eval(`/Ghềnh suối/.test(document.getElementById('guideText').textContent) && !__av.fishing.active && document.getElementById('menu').classList.contains('hidden')`), '"Dẫn đường" to a fishing spot points the compass there and starts nothing');
    // opened and closed many times: the page does not grow
    await b.eval(`document.getElementById('qTime').click(); document.getElementById('qTime').click()`);   // the clock panel is filled on its first opening
    const n0 = await b.eval('document.getElementsByTagName("*").length');
    const secs = ['overview', 'camp', 'fish', 'sky', 'book', 'settings'];
    for (let i = 0; i < 20; i++) await b.eval(`document.getElementById('qExplore').click(); document.getElementById('mtab-${secs[i % 6]}').click(); document.querySelector('.menu-close').click(); document.getElementById('qTime').click(); document.getElementById('qTime').click()`);
    await sleep(300);
    const n1 = await b.eval('document.getElementsByTagName("*").length');
    check(Math.abs(n1 - n0) <= 2 && await b.eval('document.querySelectorAll(".m-pop").length') === 2, `20 openings of the menu and the clock panel: the page stays the same size (${n0} → ${n1} elements)`);
    // winter: fishing says why it cannot be done, and its button is off
    await b.goto(`${BASE}/?auto=view&debug=1&cloud=0&hour=12&season=winter`);
    await b.waitFor('window.__av && __av.started()', 60000, 'the scene to start');
    await sleep(1500);
    await b.eval(`document.getElementById('qExplore').click()`); await sleep(300);
    await b.eval(`document.getElementById('mtab-fish').click()`); await sleep(200);
    check(await b.eval(`/đóng băng/.test(document.getElementById('mpane-fish').textContent) && [...document.querySelectorAll('#mpane-fish .m-list .m-btn')].every((x) => x.disabled && x.title)`), 'in winter the fishing group says the water is frozen and its buttons are off, with the reason');
    // the interface size is a display setting: applied and kept
    await b.eval(`document.getElementById('mtab-settings').click(); document.getElementById('mset-help').click(); [...document.querySelectorAll('#mpane-settings .chip')].find((x) => x.textContent === 'Lớn').click()`); await sleep(200);
    check(await b.eval(`__av.store.get('settings.uiScale') === 1.12 && getComputedStyle(document.documentElement).getPropertyValue('--ui-zoom').trim() === '1.12'`), 'the interface text size can be raised (kept per device)');
    await b.eval(`[...document.querySelectorAll('#mpane-settings .chip')].find((x) => x.textContent === 'Vừa').click()`);
    check(!b.logs.some((l) => /error|exception/i.test(l)), `no console errors${b.logs.filter((l) => /error|exception/i.test(l)).slice(0, 3).map((l) => '\n    ' + l).join('')}`);
  } finally { await b.close(); }
}

const run = { audio, walk, story, cat: catCheck, world: worldCheck, acts: actsCheck, menu: menuCheck, party: () => party(process.argv[3]), fps: () => fps(process.argv[3]) }[what];
if (!run) { console.log('usage: node tools/check.mjs audio | walk | story | cat | world | acts | menu | party [png] | fps [query]'); process.exit(2); }
run().then(() => { if (fail.length) { console.log(`\n${fail.length} check(s) failed`); process.exit(1); } }, (e) => { console.error(String(e && e.stack || e)); process.exit(1); });
