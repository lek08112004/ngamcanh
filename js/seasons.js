// The valley's calendar and clock: four seasons, three times of day, and what each one
// means for the light and for what is growing. Pure data and a small state machine:
// nothing here touches the renderer, so it can be read on its own.

/* ---------- seasons ---------- */
// `flower` is the season's signature bloom; `grow` says how much of each planting is up
// (0 = nothing above ground, 1 = full size). Index order everywhere: spring, summer, autumn, winter.
export const SEASONS = [
  { id: 'spring', name: 'Mùa xuân', flower: 'tulip', line: 'Mùa tulip: những luống màu trước trại, anh đào nở trong vườn' },
  { id: 'summer', name: 'Mùa hạ', flower: 'sunflower', line: 'Mùa hướng dương: cả ruộng quay mặt đón nắng, oải hương tím trước trại' },
  { id: 'autumn', name: 'Mùa thu', flower: 'daisy', line: 'Mùa cúc hoạ mi: luống trắng trước trại, lá anh đào chuyển đỏ' },
  { id: 'winter', name: 'Mùa đông', flower: 'camellia', line: 'Mùa hoa trà: đỏ thắm giữa vườn tuyết, cành anh đào trơ trụi' },
];
export const GROW = {
  //                 spring summer autumn winter
  bedTulip:          [1.00, 0.00, 0.00, 0.00],   // the stripes in front of the camp…
  bedLavender:       [0.00, 1.00, 0.00, 0.00],   // …are replanted every season
  bedDaisy:          [0.00, 0.00, 1.00, 0.00],
  ring:              [0.80, 1.00, 0.72, 0.86],   // roses round the middle tree; camellias in winter
  lavender:          [0.50, 1.00, 0.55, 0.00],   // the lavender block in the garden
  sunflower:         [0.00, 1.00, 0.00, 0.00],
  border:            [0.75, 0.85, 1.00, 0.00],   // daisy edging along the walks
  crown:             [1.00, 1.00, 1.00, 0.00],   // blossom or leaves on the cherry trees
};
// How each season tints the light: [sun r,g,b multipliers], [sky-light r,g,b multipliers]
export const SEASON_LIGHT = [
  [[1.00, 1.00, 1.00], [1.00, 1.00, 1.00]],
  [[1.04, 1.00, 0.94], [0.98, 1.00, 1.02]],
  [[1.06, 0.93, 0.80], [1.00, 0.96, 0.90]],
  [[0.94, 0.97, 1.04], [1.12, 1.14, 1.18]],     // snow throws light back up
];

/* ---------- times of day ---------- */
// `day` is how much daylight there is (drives stars, lamps, flower opening); `dusk` turns the
// sky and the light to sunset. `sun` is where the sun stands (north is -z, east is +x).
export const PHASES = [
  { id: 'day', name: 'Buổi sáng', day: 1.0, dusk: 0, sun: [0.52, 0.46, 0.72], line: 'Trời sáng dần — hoa mở cánh đón nắng' },
  { id: 'dusk', name: 'Hoàng hôn', day: 0.70, dusk: 1, sun: [-0.74, 0.25, -0.62], line: 'Mặt trời xuống sau dãy núi phía tây bắc' },
  { id: 'night', name: 'Ban đêm', day: 0.0, dusk: 0, sun: [0.52, 0.46, 0.72], line: 'Màn đêm buông xuống — chờ cực quang lên' },
];
// With "Ngày tự trôi" on, a whole day takes about ten minutes, and each new morning is the
// next season: a year in forty minutes.
export const PHASE_SECONDS = { day: 240, dusk: 110, night: 250 };

const idx = (list, id) => Math.max(0, list.findIndex((x) => x.id === id));

export class WorldClock {
  /** @param {{season?: string, phase?: string, auto?: boolean}} start */
  constructor(start = {}) {
    this.seasonIndex = idx(SEASONS, start.season);
    this.phaseIndex = idx(PHASES, start.phase);
    this.auto = !!start.auto;
    this.elapsed = 0;                                  // seconds spent in the current phase
    // what is actually shown eases toward the chosen season and time
    this.weights = [0, 0, 0, 0];                       // season blend, sums to 1
    this.weights[this.seasonIndex] = 1;
    this.day = PHASES[this.phaseIndex].day;
    this.dusk = PHASES[this.phaseIndex].dusk;
    this.onPhase = () => {};                           // (phase, byItself)
    this.onSeason = () => {};                          // (season, byItself)
  }

  get season() { return SEASONS[this.seasonIndex]; }
  get phase() { return PHASES[this.phaseIndex]; }

  setPhase(id, byItself = false) {
    const i = idx(PHASES, id);
    if (i === this.phaseIndex) return;
    this.phaseIndex = i;
    this.elapsed = 0;
    this.onPhase(this.phase, byItself);
  }

  setSeason(id, byItself = false) {
    const i = idx(SEASONS, id);
    if (i === this.seasonIndex) return;
    this.seasonIndex = i;
    this.onSeason(this.season, byItself);
  }

  nextPhase(byItself = false) {
    const next = PHASES[(this.phaseIndex + 1) % PHASES.length];
    // a new morning: with the clock running by itself, the year moves on too
    if (byItself && next.id === 'day') this.setSeason(SEASONS[(this.seasonIndex + 1) % SEASONS.length].id, true);
    this.setPhase(next.id, byItself);
  }

  /** how far through the current phase we are, 0..1 (only meaningful when auto) */
  get progress() { return Math.min(1, this.elapsed / PHASE_SECONDS[this.phase.id]); }

  /** how much of a planting is above ground right now */
  grow(kind) {
    const g = GROW[kind], w = this.weights;
    return g[0] * w[0] + g[1] * w[1] + g[2] * w[2] + g[3] * w[3];
  }

  update(dt) {
    if (this.auto) {
      this.elapsed += dt;
      if (this.elapsed >= PHASE_SECONDS[this.phase.id]) this.nextPhase(true);
    }
    // time of day turns over in about six seconds, a season in about five
    const p = this.phase, step = dt / 6;
    this.day += Math.min(step, Math.max(-step, p.day - this.day));
    this.dusk += Math.min(step * 1.4, Math.max(-step * 1.4, p.dusk - this.dusk));
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
