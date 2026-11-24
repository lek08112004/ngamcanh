// Developer tool: frame time of a set of fixed scenes, measured on the real graphics card,
// interleaved between two copies of the site (A and B), so that a change can be judged
// against what came before under the same conditions.
//
//   node tools/perf.mjs [rounds] [A url] [B url]
//
// Defaults: 3 rounds, A = http://127.0.0.1:8766 (a copy of the previous tree), B = :8765.
// Env: ONLY=cabin-day,garden-walk  measures just those scenes
//      VSYNC=1                     keep the display's frame cap (default: lifted, so frame time
//                                  is the work, not the screen's refresh)
//      Q=medium                    tier (default high)
//      PROBE=1                     also measure B at half resolution: if the frame time halves,
//                                  the scene is bound by pixels (fill), if not by vertices or CPU
// Prints, per scene and copy: mean, median, p95, p99 frame time, the main-thread time of a frame
// (from the frame's start to the end of the page's own frame callback: JS, WebGL submission and any
// wait for the GPU), and where the page has ?debug=1 diagnostics (__av.diag), the JS logic alone and
// the time spent handing draws to WebGL,
// draw calls, triangles and render passes per frame, frames over 100 ms during the 3.5 s warm-up,
// and once per copy the GPU, viewport, pixel ratio and drawing-buffer size.
import { launch, sleep } from './drive.mjs';

const rounds = Number(process.argv[2]) || 3;
const A = process.argv[3] || 'http://127.0.0.1:8766';
const B = process.argv[4] || 'http://127.0.0.1:8765';
const TIER = process.env.Q || 'high';
const SCENES = [
  { id: 'camp-day', q: 'hour=10.5&season=summer&x=2&z=7&yaw=-15&pitch=-8', js: '' },
  { id: 'camp-night', q: 'hour=22.5&season=spring&x=2&z=7&yaw=-15&pitch=6&mood=emerald', js: '' },
  // walking down the flower walk towards the rose arch (W held all through the measurement)
  { id: 'garden-walk', q: 'hour=11&season=spring&x=6&z=10.5&yaw=90&pitch=-6', js: '', walk: true },
  // Choco a metre and a half in front of you on a summer morning
  { id: 'cat-near', q: 'hour=10.5&season=summer&x=-1&z=-1.5&yaw=-120&pitch=-14',
    js: '__av.cat.hold("sit"); __av.cat.place(-2.3, -2.3, 1.0, "sit", 99); __av.corgi.hold("sit"); __av.corgi.place(-6, 3, 0, "sit", 99)' },
  // Choco and Bơ side by side, seen from three metres
  { id: 'cat+dog', q: 'hour=10.5&season=summer&x=0.5&z=0&yaw=-130&pitch=-10',
    js: '__av.cat.hold("loaf"); __av.cat.place(-1.6, -2.0, 1.0, "loaf", 99); __av.corgi.hold("sit"); __av.corgi.place(-2.3, -1.4, 1.0, "sit", 99)' },
  { id: 'winter-day', q: 'hour=11&season=winter&x=6.2&z=-2.6&yaw=-30&pitch=-6', js: '' },
  { id: 'winter-night', q: 'hour=22.5&season=winter&x=6.2&z=-8.6&yaw=-60&pitch=-6', js: '' },
  { id: 'cabin-day', q: 'hour=11&room=1&x=-9.5&z=-10', js: '' },
  { id: 'cabin-night', q: 'hour=22.5&room=1&x=-9.5&z=-10', js: '' },
];
if (process.env.ONLY) SCENES.splice(0, SCENES.length, ...SCENES.filter((s) => process.env.ONLY.split(',').includes(s.id)));

// counts what each renderer.render call drew (three.js resets info at the start of each call)
const HOOK = `(() => { const r = __av.renderer; if (r.__acc) return; const acc = r.__acc = { calls: 0, tris: 0, passes: 0 };
  const orig = r.render.bind(r); r.render = (s, c) => { orig(s, c); acc.calls += r.info.render.calls; acc.tris += r.info.render.triangles; acc.passes++; }; })()`;
const MEASURE = `new Promise((res) => { const acc = __av.renderer.__acc; const d = [], cpu = []; let last = performance.now(), t0 = last, n = 0;
  acc.calls = acc.tris = acc.passes = 0;
  const dg = __av.diag; const js = [], draw = [];
  const tick = (t) => { cpu.push(performance.now() - t); if (dg) { js.push(dg.js); draw.push(dg.draw); } d.push(t - last); last = t; n++;
    if (t - t0 < 7000) requestAnimationFrame(tick); else res({ d: d.slice(5), cpu: cpu.slice(5), js: js.slice(5), draw: draw.slice(5), calls: acc.calls / n, tris: acc.tris / n, passes: acc.passes / n }); };
  requestAnimationFrame(tick); })`;
async function measure(b, base, sc, half) {
  // XA / XB: extra address parameters for one copy (e.g. XA=acts=0 to A/B one tree against itself)
  const extra = base === A ? (process.env.XA || '') : (process.env.XB || '');   // (give A and B different hosts, e.g. 127.0.0.1 and localhost, to A/B one tree)
  await b.goto(`${base}/?auto=view&q=${TIER}&debug=1&cloud=0&${sc.q}${extra ? '&' + extra : ''}`);
  await b.waitFor('window.__av && __av.started()', 60000, 'the scene to start');
  // frames over 50 ms in the first 3.5 s (shader compiles, first uploads)
  await b.eval(`(() => { window.__hitch = []; let last = performance.now(); const t0 = last; const f = (t) => { if (t - last > 100) __hitch.push(Math.round(t - last)); last = t; if (t - t0 < 3500) requestAnimationFrame(f); }; requestAnimationFrame(f); })()`);
  if (sc.js) await b.eval(sc.js);
  if (half) await b.eval('__av.setPixelRatio(0.5 * devicePixelRatio)');
  await b.eval(HOOK);
  await sleep(3500);
  const hitch = await b.eval('window.__hitch');
  if (sc.walk) await b.key('keyDown', 'w');
  const m = await b.eval(MEASURE);
  if (sc.walk) await b.key('keyUp', 'w');
  m.hitch = hitch;
  m.mem = await b.eval('({ geo: __av.renderer.info.memory.geometries, tex: __av.renderer.info.memory.textures, prog: (__av.renderer.info.programs || []).length, heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : 0 })');
  return m;
}
const mean = (arr) => arr.reduce((a, x) => a + x, 0) / arr.length;
const pct = (arr, p) => { const s = [...arr].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const sd = (arr) => { const m = mean(arr); return Math.sqrt(mean(arr.map((x) => (x - m) ** 2))); };

const b = await launch({ size: [1920, 1080], gpu: true, vsync: process.env.VSYNC === '1' });
const all = {};
try {
  const env = {};
  const runs = [['A', A], ['B', B]];
  for (let r = 0; r < rounds; r++) {
    for (const sc of SCENES) {
      for (const [name, base] of r % 2 ? [...runs].reverse() : runs) {
        const m = await measure(b, base, sc);
        if (!env[name]) env[name] = await b.eval('__av.gpu() + " · viewport " + innerWidth + "x" + innerHeight + " · dpr " + devicePixelRatio + " · buffer " + __av.renderer.domElement.width + "x" + __av.renderer.domElement.height + " · tier " + __av.tier');
        const k = `${sc.id} ${name}`;
        const e = (all[k] ||= { js: [], draw: [], d: [], cpu: [], means: [], calls: 0, tris: 0, passes: 0, hitch: [], mem: null });
        e.d.push(...m.d); e.cpu.push(...m.cpu); e.js.push(...m.js); e.draw.push(...m.draw); e.means.push(mean(m.d));
        e.calls = m.calls; e.tris = m.tris; e.passes = m.passes; e.hitch.push(m.hitch.length); e.mem = m.mem;
        console.log(`round ${r + 1} ${sc.id.padEnd(13)} ${name}: mean ${mean(m.d).toFixed(2)} ms, median ${pct(m.d, 0.5).toFixed(2)}, p95 ${pct(m.d, 0.95).toFixed(2)}, cpu ${pct(m.cpu, 0.5).toFixed(2)} ms${m.js.length ? `, js ${pct(m.js, 0.5).toFixed(2)} draw ${pct(m.draw, 0.5).toFixed(2)}` : ''}, ${Math.round(m.calls)} calls, ${(m.tris / 1e6).toFixed(2)} M tris, ${m.passes.toFixed(1)} passes, warm-up hitches ${JSON.stringify(m.hitch)}`);
      }
      if (process.env.PROBE === '1' && r === 0) {
        const h = await measure(b, B, sc, true);
        all[`${sc.id} half`] = { d: h.d };
        console.log(`        ${sc.id.padEnd(13)} B at half resolution: median ${pct(h.d, 0.5).toFixed(2)} ms`);
      }
    }
  }
  console.log(`\nA: ${env.A}\nB: ${env.B}\nvsync ${process.env.VSYNC === '1' ? 'on (display cap)' : 'off (uncapped)'}, ${rounds} rounds, tier ${TIER}; % = B vs A`);
  console.log('scene          copy   mean median    p95    p99  cpu50  js50  js95 draw50 run-sd  calls  Mtris  pass  hitch  geo/tex/prog heapMB');
  for (const sc of SCENES) {
    for (const name of ['A', 'B']) {
      const x = all[`${sc.id} ${name}`];
      const f = (v) => v.toFixed(2).padStart(6);
      let line = `${(name === 'A' ? sc.id : '').padEnd(14)} ${name}   ${f(mean(x.d))} ${f(pct(x.d, 0.5))} ${f(pct(x.d, 0.95))} ${f(pct(x.d, 0.99))} ${f(pct(x.cpu, 0.5))} ${x.js.length ? f(pct(x.js, 0.5)) + ' ' + f(pct(x.js, 0.95)) + ' ' + f(pct(x.draw, 0.5)) : '     -      -      -'} ${f(sd(x.means))} ${String(Math.round(x.calls)).padStart(6)} ${(x.tris / 1e6).toFixed(2).padStart(6)} ${x.passes.toFixed(1).padStart(5)} ${String(x.hitch.join('/')).padStart(6)}  ${x.mem.geo}/${x.mem.tex}/${x.mem.prog} ${x.mem.heap}`;
      if (name === 'B') {
        const a = all[`${sc.id} A`];
        line += `   mean ${((mean(x.d) / mean(a.d) - 1) * 100).toFixed(1)}%  median ${((pct(x.d, 0.5) / pct(a.d, 0.5) - 1) * 100).toFixed(1)}%  p95 ${((pct(x.d, 0.95) / pct(a.d, 0.95) - 1) * 100).toFixed(1)}%`;
      }
      console.log(line);
    }
    const h = all[`${sc.id} half`];
    if (h) console.log(`${''.padEnd(14)} B at half resolution: median ${pct(h.d, 0.5).toFixed(2)} ms (${(pct(h.d, 0.5) / pct(all[`${sc.id} B`].d, 0.5) * 100).toFixed(0)}% of full)`);
  }
} finally { await b.close(); }
