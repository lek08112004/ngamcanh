// Developer tool: hitches (long frames) right after things that happen for the first time in a
// visit: the first step into the cabin, the first close look at the flowers, coming up to Choco
// (its fur shells), a change of season, the first snowfall, the star game. Each of these can make
// three.js build new shader programs on the spot, which shows as a stall.
//
//   node tools/hitch.mjs [url]       (default http://127.0.0.1:8765, tier from Q=, default high)
//
// Prints, per event, the longest frame and the frames over 50 ms in the 3 s after it, and the
// number of shader programs before and after (renderer.info.programs).
import { launch, sleep } from './drive.mjs';

const BASE = process.argv[2] || 'http://127.0.0.1:8765';
const TIER = process.env.Q || 'high';
const EVENTS = [
  ['into the cabin', '__av.enterRoom()'],
  ['out of the cabin', '__av.leaveRoom()'],
  ['to the flowers (close-up models)', '__av.walker.on = false; __av.camTarget.set(18, __av.terrainH(18, 11.5) + 1.2, 11.5); __av.camBase.copy(__av.camTarget); __av.view.yaw = __av.view.yawT = 90; __av.view.pitch = __av.view.pitchT = -35'],
  ['to Choco (fur shells)', '__av.cat.hold("sit"); __av.cat.place(-2.3, -2.3, 1.0, "sit", 99); __av.camTarget.set(-1.2, __av.terrainH(-1.2, -1.6) + 1.0, -1.6); __av.camBase.copy(__av.camTarget); __av.view.yaw = __av.view.yawT = -120; __av.view.pitch = __av.view.pitchT = -25'],
  ['to winter', '__av.clock.setSeason ? __av.clock.setSeason("winter") : (__av.clock.season = 3)'],
  ['to night', '__av.clock.auto = false; __av.clock.hour = 22.5'],
];
const b = await launch({ size: [1600, 900], gpu: true });
try {
  await b.goto(`${BASE}/?auto=view&q=${TIER}&debug=1&cloud=0&hour=10.5&season=spring&x=2&z=7&yaw=-15&pitch=-8`);
  await b.waitFor('window.__av && __av.started()', 60000, 'start');
  await sleep(4000);
  // the page builds its shaders in the background after the first frame (warmShaders in main.js)
  try { await b.waitFor('!__av.warm || /done|failed/.test(__av.warm())', 30000, 'the shader warm-up'); } catch (e) { console.log(e.message); }
  console.log(await b.eval('__av.gpu()'), TIER, 'warm-up:', await b.eval('__av.warm ? __av.warm() : "none"'));
  for (const [name, js] of EVENTS) {
    const p0 = await b.eval('(__av.renderer.info.programs || []).length');
    const r = await b.eval(`new Promise((res) => { const long = []; let last = performance.now(); const t0 = last;
      ${js};
      const f = (t) => { const d = t - last; last = t; if (d > 50) long.push(Math.round(d)); if (t - t0 < 3000) requestAnimationFrame(f); else res(long); };
      requestAnimationFrame(f); })`);
    const p1 = await b.eval('(__av.renderer.info.programs || []).length');
    console.log(`${name.padEnd(34)} longest ${r.length ? Math.max(...r) : 0} ms, frames over 50 ms ${JSON.stringify(r)}, programs ${p0} -> ${p1}`);
    await sleep(1500);
  }
  const errs = b.logs.filter((l) => /error|EXCEPTION/i.test(l));
  if (errs.length) console.log(errs.join('\n'));
} finally { await b.close(); }
