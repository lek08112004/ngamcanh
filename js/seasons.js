// The valley's calendar and clock: four seasons, one continuous day, and what each one
// means for the light and for what is growing. Pure data and a small state machine:
// nothing here touches the renderer, so it can be read on its own.

/* ---------- seasons ---------- */
// `flower` is the season's signature bloom; `grow` says how much of each planting is up
// (0 = nothing above ground, 1 = full size). Index order everywhere: spring, summer, autumn, winter.
export const SEASONS = [
  { id: 'spring', name: 'Mùa xuân', flower: 'tulip', line: 'Tulip, thuỷ tiên vàng và lan dạ hương trước trại, anh đào nở trong vườn' },
  { id: 'summer', name: 'Mùa hạ', flower: 'sunflower', line: 'Hướng dương quay mặt đón nắng; oải hương viền luống, anh túc đỏ và hoa cánh bướm' },
  { id: 'autumn', name: 'Mùa thu', flower: 'daisy', line: 'Cúc hoạ mi, hoa cánh bướm và cúc vàng trước trại; lá anh đào chuyển đỏ' },
  { id: 'winter', name: 'Mùa đông', flower: 'camellia', line: 'Hoa trà đỏ giữa vườn tuyết; thạch nam hồng và hoa giọt tuyết nhú lên trước trại' },
];
export const GROW = {
  //                 spring summer autumn winter
  bedTulip:          [1.00, 0.00, 0.00, 0.00],   // the stripes in front of the camp…
  bedLavender:       [0.00, 1.00, 0.00, 0.00],   // …are replanted every season
  bedDaisy:          [0.00, 0.00, 1.00, 0.00],
  bedDaffodil:       [1.00, 0.00, 0.00, 0.00],
  bedMuscari:        [1.00, 0.00, 0.00, 0.00],
  bedPoppy:          [0.00, 1.00, 0.00, 0.00],
  bedCosmos:         [0.00, 1.00, 1.00, 0.00],   // cosmos flowers from midsummer into autumn
  bedMum:            [0.00, 0.00, 1.00, 0.00],
  bedSnowdrop:       [0.00, 0.00, 0.00, 1.00],
  bedHeather:        [0.00, 0.00, 0.00, 1.00],   // winter heath, in flower through the snow
  bedShrub:          [1.00, 1.00, 1.00, 1.00],   // clipped evergreens among the beds, all year
  // the flower walk to the rose arch (flora.js): the same kinds, the same seasons
  gTulip:            [1.00, 0.00, 0.00, 0.00],
  gDaffodil:         [1.00, 0.00, 0.00, 0.00],
  gMuscari:          [1.00, 0.00, 0.00, 0.00],
  gLavender:         [0.00, 1.00, 0.00, 0.00],
  gPoppy:            [0.00, 1.00, 0.00, 0.00],
  gCosmos:           [0.00, 1.00, 1.00, 0.00],
  gDaisy:            [0.00, 0.00, 1.00, 0.00],
  gMum:              [0.00, 0.00, 1.00, 0.00],
  gSnowdrop:         [0.00, 0.00, 0.00, 1.00],
  gHeather:          [0.00, 0.00, 0.00, 1.00],
  gShrub:            [1.00, 1.00, 1.00, 1.00],   // clipped box at the ends of the garden bench
  gFallen:           [1.00, 0.00, 0.00, 0.00],   // cherry petals lying on the ground, spring only
  ring:              [0.80, 1.00, 0.72, 0.86],   // roses round the middle tree; camellias in winter
  lavender:          [0.50, 1.00, 0.55, 0.00],   // the lavender block in the garden
  sunflower:         [0.00, 1.00, 0.00, 0.00],
  border:            [0.75, 0.85, 1.00, 0.00],   // daisy edging along the walks
  crown:             [1.00, 1.00, 1.00, 0.00],   // blossom or leaves on the cherry trees
};
// The beds in front of the camp are ribbons 3.6 m wide that wind a little on their way down
// toward the valley (bedWarp; the ground shader draws the same curve). They are not planted
// in one-colour stripes: each season's kinds grow in drifts, the way a planted border is laid
// out. A low kind edges the bed, broken here and there; the middle of the bed carries the
// taller kinds in long patches. Which tall kind a patch is depends on the ground: the bottom
// of the slope toward the stream is damp, the top by the camp and the fence is dry and sunny.
export const BED_STRIPE = 3.6;
/** how far a bed has wandered sideways at z (mirrored in GLSL: bedWarp in shaders/terrain.js) */
export const bedWarp = (z) => 1.25 * Math.sin(z * 0.093 + 0.6) + 0.55 * Math.sin(z * 0.231 + 2.1);
/** the bed a point belongs to */
export const bedAt = (x, z = 0) => Math.floor((x + bedWarp(z) + 1000) / BED_STRIPE);
/** 0 at the edge of a bed .. 1 down its middle (negative in the grass aisle between beds) */
export function bedMiddle(x, z) {
  const u = (x + bedWarp(z) + 1000) / BED_STRIPE;
  const f = u - Math.floor(u);
  if (f < 0.13) return -1;
  return 1 - Math.abs(f - 0.565) / 0.435;
}
// a small value noise, enough to lay out drifts (deterministic: the same in every visit)
const hash2 = (x, y) => { const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); };
export function driftNoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy), b = hash2(ix + 1, iy), c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
/** 0 dry and sunny (top of the slope, by the camp) .. 1 damp (down toward the stream) */
export const bedWet = (x, z) => Math.min(1, Math.max(0, (-z - 14) / 34 + (driftNoise(x * 0.05 + 3, z * 0.05) - 0.5) * 0.5));
// Per season: the low edging kind, then the tall kinds of the middle with how much each likes
// damp ground (0 dry .. 1 wet).
export const BED_PLAN = [
  { edge: 'muscari', body: [['tulip', 0.35], ['daffodil', 0.80]] },
  { edge: 'lavender', body: [['poppy', 0.15], ['cosmos', 0.70]] },
  { edge: 'mum', body: [['daisy', 0.30], ['cosmos', 0.75]] },
  { edge: 'heather', body: [['heather', 0.10], ['snowdrop', 0.85]] },
];
/** which kind grows at a point of the beds in season 0..3 ('' in the aisles) */
export function bedFlowerAt(season, x, z) {
  const mid = bedMiddle(x, z);
  if (mid < 0) return '';
  const plan = BED_PLAN[season];
  const bed = bedAt(x, z);
  // the edging: a band along both sides of the bed, but it comes and goes in long runs
  const run = driftNoise(z * 0.16 + bed * 7.3, bed * 1.7);
  if (mid < 0.30 + 0.12 * run && run > 0.32) return plan.edge;
  // the middle: long patches (about 6 m along the bed, the width of the bed across), each
  // one kind, the kind leaning toward what the ground suits
  const patch = driftNoise(x * 0.20 + 11, z * 0.14 + bed * 3.1);
  const wet = bedWet(x, z);
  let best = plan.body[0][0], bestScore = -1e9;
  plan.body.forEach(([kind, likes], i) => {
    const score = -Math.abs(wet - likes) + (i === 0 ? patch - 0.5 : 0.5 - patch) * 0.9;
    if (score > bestScore) { bestScore = score; best = kind; }
  });
  return best;
}
/** a stable number 0..1 for the patch a point is in: the colour of a drift of tulips */
// (a drift is a stretch of the bed 3.5 to 7 m long, its ends ragged; within it one colour)
export function patchTone(x, z) {
  const bed = bedAt(x, z);
  const k = Math.floor((z + bed * 2.3) / 5.2 + (driftNoise(x * 0.9, z * 0.7) - 0.5) * 0.7);
  return hash2(bed * 1.31 + 0.5, k * 0.77 + 0.25);
}
// How each season tints the light: [sun r,g,b multipliers], [sky-light r,g,b multipliers]
export const SEASON_LIGHT = [
  [[1.00, 1.00, 1.00], [1.00, 1.00, 1.00]],
  [[1.04, 1.00, 0.94], [0.98, 1.00, 1.02]],
  [[1.06, 0.93, 0.80], [1.00, 0.96, 0.90]],
  [[0.94, 0.97, 1.04], [1.12, 1.14, 1.18]],     // snow throws light back up
];

/* ---------- the day ---------- */
// Time is one number, the hour (0..24), and everything else follows from it: where the sun
// stands, how much daylight there is (`day`: drives stars, lamps, flower opening) and how far
// the sky has turned to sunrise or sunset colours (`dusk`). North is -z, east is +x.
export const DAY_SECONDS = 960;          // a whole day and night when time runs by itself: sixteen minutes
export const SUNRISE = 5.6, SUNSET = 18.7;
//                hour  day   dusk
const SKY_KEYS = [
  [0.0, 0.00, 0.00],
  [4.8, 0.00, 0.00],
  [5.6, 0.30, 0.75],     // first light
  [6.3, 0.70, 0.95],     // sunrise
  [7.6, 1.00, 0.22],
  [9.0, 1.00, 0.00],
  [15.6, 1.00, 0.00],
  [17.2, 0.94, 0.50],    // the golden hour
  [18.2, 0.70, 1.00],    // sunset
  [19.0, 0.30, 0.75],
  [19.8, 0.00, 0.00],
  [24.0, 0.00, 0.00],
];
const smooth = (t) => t * t * (3 - 2 * t);
/** daylight and sunset colour at an hour: writes {day, dusk}, each 0..1, into `out` */
export function skyAt(hour, out = {}) {
  let i = 1;
  while (i < SKY_KEYS.length - 1 && SKY_KEYS[i][0] <= hour) i++;
  const a = SKY_KEYS[i - 1], b = SKY_KEYS[i];
  const t = smooth(Math.min(1, Math.max(0, (hour - a[0]) / (b[0] - a[0]))));
  out.day = a[1] + (b[1] - a[1]) * t;
  out.dusk = a[2] + (b[2] - a[2]) * t;
  return out;
}
/** Unit vector toward the sun at an hour: up in the east, over the south, down in the north-west.
 *  Below the horizon it is held just above it: the light is off by then, and the shadow
 *  camera still needs a direction. */
export function sunAt(hour, out = [0, 0, 0]) {
  let s = (hour - SUNRISE) / (SUNSET - SUNRISE);
  // after sunset it waits where it set; in the small hours it moves round to the east
  if (s < 0 || s > 1) s = hour > 12 ? 1 : (hour > 2.4 ? 0 : 1);
  const az = (10 + 225 * s) * Math.PI / 180;
  const el = Math.max(Math.sin(Math.PI * s) * 52, 5.5) * Math.PI / 180;
  out[0] = Math.cos(az) * Math.cos(el);
  out[1] = Math.sin(el);
  out[2] = Math.sin(az) * Math.cos(el);
  return out;
}
// The named parts of the day, in order. `id` is the coarse phase the rest of the code asks about.
export const PARTS = [
  { from: 4.8, id: 'day', name: 'Bình minh', line: 'Trời hửng phía đông — sương còn trên cỏ, hoa bắt đầu mở cánh' },
  { from: 6.8, id: 'day', name: 'Buổi sáng', line: 'Nắng lên khỏi dãy núi — hoa mở cánh đón nắng' },
  { from: 11.0, id: 'day', name: 'Buổi trưa', line: 'Mặt trời đứng cao phía nam, bóng ngắn lại' },
  { from: 13.5, id: 'day', name: 'Buổi chiều', line: 'Nắng ngả dần sang tây, bóng cây dài ra' },
  { from: 17.0, id: 'dusk', name: 'Hoàng hôn', line: 'Mặt trời xuống sau dãy núi phía tây bắc' },
  { from: 19.6, id: 'night', name: 'Ban đêm', line: 'Màn đêm buông xuống — chờ sao lên và cực quang kéo màn' },
];
export function partAt(hour) {
  let part = PARTS[PARTS.length - 1];
  for (const p of PARTS) if (hour >= p.from) part = p;
  return part;
}
/** "07:30" */
export function clockText(hour) {
  const m = Math.floor((((hour % 24) + 24) % 24) * 60 + 0.5) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
// The three moments you can jump to (the N key, links, companions). `sun` is where the sun
// stands then; the mountains bake their light for the first two.
export const PHASES = [
  { id: 'day', name: 'Buổi sáng', hour: 9.0 },
  { id: 'dusk', name: 'Hoàng hôn', hour: 18.0 },
  { id: 'night', name: 'Ban đêm', hour: 22.5 },
].map((p) => ({ ...p, sun: sunAt(p.id === 'dusk' ? 17.6 : 9.0) }));

const idx = (list, id) => Math.max(0, list.findIndex((x) => x.id === id));
const wrap = (h) => ((h % 24) + 24) % 24;

export class WorldClock {
  /** @param {{season?: string, hour?: number, auto?: boolean}} start */
  constructor(start = {}) {
    this.seasonIndex = idx(SEASONS, start.season);
    this.hour = wrap(Number.isFinite(start.hour) ? start.hour : 9);
    this.auto = !!start.auto;
    this.hold = false;                                 // true while something wants the sky left alone (the star game)
    this.target = null;                                // an hour being swept to after a jump
    this.sweep = 0;                                    // hours per second while sweeping
    // what is actually shown eases toward the chosen season
    this.weights = [0, 0, 0, 0];                       // season blend, sums to 1
    this.weights[this.seasonIndex] = 1;
    this.day = 0;
    this.dusk = 0;
    this.sun = [0, 1, 0];
    this.part = partAt(this.hour);
    this.onPart = () => {};                            // (part, byItself) when the named part of the day changes
    this.onSeason = () => {};                          // (season, byItself)
    this.read();
  }

  get season() { return SEASONS[this.seasonIndex]; }
  /** the coarse phase: day | dusk | night */
  get phase() { return PHASES[idx(PHASES, this.part.id)]; }

  read() {
    skyAt(this.hour, this);
    sunAt(this.hour, this.sun);
  }

  /** put the clock at an hour at once (the slider) */
  setHour(hour, byItself = false) {
    this.hour = wrap(hour);
    this.target = null;
    this.read();
    this.checkPart(byItself);
  }

  /** run the clock forward to one of the three moments: a few seconds of time-lapse */
  setPhase(id) {
    if (this.part.id === id && this.target === null) return;
    this.target = PHASES[idx(PHASES, id)].hour;
    this.sweep = Math.max(1.2, wrap(this.target - this.hour)) / 3.5;
  }

  setSeason(id, byItself = false) {
    const i = idx(SEASONS, id);
    if (i === this.seasonIndex) return;
    this.seasonIndex = i;
    this.onSeason(this.season, byItself);
  }

  /** jump on to the next of the three moments */
  nextPhase() {
    const now = this.target === null ? this.part.id : PHASES.find((p) => p.hour === this.target).id;
    this.setPhase(PHASES[(idx(PHASES, now) + 1) % PHASES.length].id);
  }

  checkPart(byItself) {
    const part = partAt(this.hour);
    if (part === this.part) return;
    this.part = part;
    this.onPart(part, byItself);
  }

  /** how much of a planting is above ground right now */
  grow(kind) {
    const g = GROW[kind], w = this.weights;
    return g[0] * w[0] + g[1] * w[1] + g[2] * w[2] + g[3] * w[3];
  }

  update(dt) {
    if (this.target !== null) {
      const left = wrap(this.target - this.hour), step = this.sweep * dt;
      if (step >= left) { this.hour = this.target; this.target = null; } else this.hour = wrap(this.hour + step);
      this.read();
      this.checkPart(false);
    } else if (this.auto && !this.hold) {
      const before = this.hour;
      this.hour = wrap(this.hour + dt * 24 / DAY_SECONDS);
      // a new dawn: with the clock running by itself, the year moves on too
      if (before < PARTS[0].from && this.hour >= PARTS[0].from) this.setSeason(SEASONS[(this.seasonIndex + 1) % SEASONS.length].id, true);
      this.read();
      this.checkPart(true);
    }
    // a season turns over in about five seconds
    const k = Math.min(1, dt / 5);
    let sum = 0;
    for (let i = 0; i < 4; i++) {
      const want = i === this.seasonIndex ? 1 : 0;
      this.weights[i] += Math.min(k, Math.max(-k, want - this.weights[i]));
      sum += this.weights[i];
    }
    for (let i = 0; i < 4; i++) this.weights[i] /= sum || 1;
  }
}
