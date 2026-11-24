// Developer tool: what each part of the picture costs. For a few fixed scenes, the frame time
// (display cap lifted) with everything on, then with one part switched off at a time, on the
// real graphics card. The difference is roughly that part's cost in that view (parts overlap:
// hiding the grass also saves the ground under it from being drawn twice, and so on).
//
//   node tools/costs.mjs [url]      (default http://127.0.0.1:8765; Q=medium for another tier)
//
// Parts: lens blur, bloom, the final grade pass, grass, flower beds + garden, the sky dome
// (aurora and stars), the mountains, the terrain (ground and water), the movers' shadow map,
// and half resolution (how much of the frame is pixel work at all).
import { launch, sleep } from './drive.mjs';

const BASE = process.argv[2] || 'http://127.0.0.1:8765';
const TIER = process.env.Q || 'high';
const SCENES = [
  ['camp-day', 'hour=10.5&season=summer&x=2&z=7&yaw=-15&pitch=-8'],
  ['camp-night', 'hour=22.5&season=spring&x=2&z=7&yaw=-15&pitch=6&mood=emerald'],
  ['garden', 'hour=11&season=spring&x=22&z=12&yaw=90&pitch=-8'],
  ['winter-day', 'hour=11&season=winter&x=6.2&z=-2.6&yaw=-30&pitch=-6'],
];
const PARTS = [
  ['lens', 'p.lensPass.enabled = false', 'p.lensPass.enabled = true'],
  ['bloom', 'p.bloom.enabled = false', 'p.bloom.enabled = true'],
  ['final grade', 'p.finalPass.uniforms.uSharp.value = 0; p.finalPass.enabled = false; p.lensPass.renderToScreen = false', 'p.finalPass.enabled = true'],
  ['grass', 'p.grass.visible = false', 'p.grass.visible = true'],
  ['flowers', 'p.beds.visible = false; p.garden.visible = false', 'p.beds.visible = true; p.garden.visible = true'],
  ['sky', 'p.sky.visible = false; p.starPoints.visible = false', 'p.sky.visible = true; p.starPoints.visible = true'],
  ['mountains', 'p.mountainsMesh.visible = false', 'p.mountainsMesh.visible = true'],
  ['terrain', 'p.terrainMesh.visible = false', 'p.terrainMesh.visible = true'],
  ['half res', '__av.setPixelRatio(0.5 * devicePixelRatio)', '__av.setPixelRatio(devicePixelRatio)'],
];
const MEASURE = `new Promise((res) => { const d = []; let last = performance.now(); const t0 = last;
  const tick = (t) => { d.push(t - last); last = t; if (t - t0 < 3500) requestAnimationFrame(tick); else { d.splice(0, 5); d.sort((a, b) => a - b); res(d[Math.floor(d.length / 2)]); } };
  requestAnimationFrame(tick); })`;

const b = await launch({ size: [1920, 1080], gpu: true, vsync: false });
try {
  for (const [id, q] of SCENES) {
    await b.goto(`${BASE}/?auto=view&q=${TIER}&debug=1&cloud=0&${q}`);
    await b.waitFor('window.__av && __av.started()', 60000, 'start');
    await sleep(4500);
    await b.eval('window.p = __av.parts(); __av.adapt().wait = 1e9');     // the quality ladder keeps still while we measure
    const all = [];
    for (let k = 0; k < 2; k++) all.push(await b.eval(MEASURE));
    const full = Math.min(...all);
    const rows = [];
    for (const [name, off, on] of PARTS) {
      await b.eval(off); await sleep(600);
      const t = await b.eval(MEASURE);
      await b.eval(on); await sleep(600);
      rows.push(`${name.padEnd(12)} ${t.toFixed(2).padStart(6)} ms   saves ${(full - t).toFixed(2).padStart(6)} ms (${((full - t) / full * 100).toFixed(0).padStart(3)}%)`);
    }
    console.log(`\n${id}: everything on, median ${full.toFixed(2)} ms   (${await b.eval('__av.gpu()')}, ${await b.eval('innerWidth + "x" + innerHeight')}, ${TIER})`);
    for (const r of rows) console.log('  ' + r);
  }
} finally { await b.close(); }
