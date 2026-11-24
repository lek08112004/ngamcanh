// Choco's mind: what the cat chooses to do, and why. (cat.js is the body.)
//
// It thinks at a fixed 8 beats a second, whatever the frame rate, with its own seeded random
// numbers, so the same seed gives the same cat on a fast machine and a slow one. Each thing it
// does is a small generator that runs over those beats (walk there, turn round, lie down, sleep
// until morning...). Some stretches are locked (a leap in the air, lying down, a stroke it has
// accepted): nothing it fancies on its own cuts into those.
//
// What moves it is a handful of inner drives, not survival bars: energy (rested or tired), the
// urge to play, the wish for company, a little thirst, and how much touch it welcomes right now
// (`tol`, which each stroke uses up and time gives back). They make some choices likelier than
// others; nothing is punished, nothing runs out, and none of it is shown as a number.
//
// The order of what wins: getting out of trouble (stuck, in the way of the fire or the stream)
// > finishing a movement it has started > its own limits and rest > something you offered it
// that it accepted > the rhythm of the day > wandering about.
//
// How well it knows you (`bond`, 0..100) only grows, slowly, and less for doing the same thing
// over and over; nothing is lost for being away. It changes how close it comes and what it
// offers (rubbing past you, following you a little, a slow blink, curling up by you at night),
// never whether you may stroke it. Seven moments are remembered once each (marks A-G).
const TICK = 0.125;
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const wrap = (a) => ((a + Math.PI) % TAU + TAU) % TAU - Math.PI;

/** 0: still getting to know you, 1: knows you, 2: trusts you */
export const bondLevel = (b) => (b < 12 ? 0 : b < 45 ? 1 : 2);

/** small, fast, seedable random numbers */
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// the moments it remembers (shown in the journal and the camp diary)
export const MARKS = {
  hello: 'Lời chào: bạn chìa tay, Choco ngửi ngón tay bạn rồi tự cọ má vào.',
  sun: 'Một khoảng nắng: bạn ngồi yên bên Choco đang nằm, chẳng ai cần làm gì.',
  play: 'Một cuộc chơi: Choco rình, vồ cuộn len, rồi nằm duỗi ra liếm chân như chưa có gì.',
  buddy: 'Bạn của Bơ: Choco chạm mũi chào Bơ rồi nằm xuống ngay cạnh nó.',
  place: 'Chỗ của Choco: bạn thấy nó dùng chỗ riêng của nó, cái ổ, căn chòi hay trụ cào.',
  reading: 'Đọc sách có bạn: Choco tự đi ra ghế đọc, nằm dưới chân bạn nghe lật trang.',
  night: 'Đêm yên: Choco chớp mắt thật chậm với bạn rồi cuộn tròn ngủ ngay bên cạnh.',
};
// the habits you can see it keep (each written down the first time you see it)
export const HABITS = {
  groom: 'Liếm chân rồi vuốt lên mặt, kỹ như rửa mặt buổi sáng.',
  yawn: 'Ngáp một cái thật to sau giấc ngủ, rồi vươn vai dài.',
  scratch: 'Cào trụ cào cạnh nhà gỗ, nhất là ngay sau khi thức dậy.',
  drink: 'Ra bát nước bên hông nhà, liếm từng ngụm nhỏ.',
  sun: 'Buổi sáng và xế chiều thì tìm chỗ nắng mà nằm.',
  shelter: 'Chui vào căn chòi nhỏ có rơm khi trời lạnh hay nắng gắt.',
  knead: 'Nhào nhào hai chân trước lên chỗ nằm trước khi cuộn tròn.',
  dogside: 'Nằm cạnh Bơ, sát vừa đủ để hai bộ lông chạm nhau.',
  firenap: 'Ban đêm ngủ bên lửa trại, chỗ ấm mà không quá nóng.',
  watch: 'Ngồi rất lâu nhìn luống hoa, đầu khẽ xoay theo thứ gì đó bay qua.',
  window: 'Trong nhà, ngồi dưới cửa sổ cuối phòng nhìn ra.',
  bed: 'Có cái ổ mây riêng dưới kệ sách trong nhà gỗ.',
  chair: 'Đêm lạnh thì chiếm cái chăn gấp trên ghế bập bênh.',
};

/**
 * env: { home: {x, z, r}, seed, bond, marks, habits,
 *   spots: { shelter, post, bowl, sunny: [[x, z]], bench: {x, z, yaw}, benchRoute: [[x, z]] },
 *   toy, onMark(id), onHabit(id), onBond(v), say(text), sound(kind, arg), onPlayEnd() }
 * ctx (each frame, from main.js through cat.update): as cat.js, plus { hour, winter, fire,
 *   sameSpace, seen, los, sitting, still (seconds), reading, safe(x, z) }
 */
export function createMind(cat, env) {
  const rnd = mulberry32(env.seed >>> 0);
  const R = (a, b) => a + (b - a) * rnd();
  const home = env.home, S = env.spots;
  const mind = {
    bond: clamp(env.bond || 0, 0, 100), marks: new Set(env.marks || []), habits: new Set(env.habits || []),
    needs: { energy: 0.7, play: 0.3, social: 0.4, thirst: 0.2 }, tol: 1,
    cur: null, lock: false, cool: Object.create(null), recent: [], places: [],
    reason: 'bắt đầu', clock: 0, acc: 0, playing: false,
    justWoke: 0, awayT: 60, sitNear: 0, nightClose: 0, declines: [], recentK: Object.create(null), gains: [],
    offerCool: Object.create(null), attnT: 0, lifted: 0,
  };
  let C = null;                               // the frame's context, fresh at every beat
  let dP = 99;                                // distance to you

  /* ---------- small helpers ---------- */
  const level = () => bondLevel(mind.bond);
  const awake = () => cat.state !== 'sleep';
  const at = (x, z) => Math.hypot(x - cat.x, z - cat.z);
  const free = (x, z) => (C.indoor ? true : cat.clear(C, x, z)) && (!C.safe || C.safe(x, z));
  const inRoom = (x, z) => (C.room ? C.room.confine(x, z, 0.22, true) : [x, z]);
  function spotNear(cx, cz, r0, r1, keepHome = true) {
    for (let i = 0; i < 16; i++) {
      const a = rnd() * TAU, r = r0 + (r1 - r0) * rnd();
      let x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      if (C.indoor) { [x, z] = inRoom(x, z); return [x, z]; }
      if (!free(x, z)) continue;
      if (keepHome && Math.hypot(x - home.x, z - home.z) > home.r + 2) continue;
      // not where it has just been
      if (mind.places.some(([px, pz]) => Math.hypot(px - x, pz - z) < 1.2)) continue;
      return [x, z];
    }
    return null;
  }
  const remember = (x, z) => { mind.places.push([x, z]); if (mind.places.length > 5) mind.places.shift(); };
  /** a habit counts as seen only when you are there to see it */
  const habit = (id) => { if (C.seen && !mind.habits.has(id)) { mind.habits.add(id); env.onHabit(id); } };
  const mark = (id) => { if (!mind.marks.has(id)) { mind.marks.add(id); env.onMark(id); } };
  /** how well it knows you grows by what you do together, less for doing one thing again and
   *  again (each kind's recent count halves every four minutes), and never by more than six
   *  points in any ten minutes */
  function gain(kind, v) {
    const rk = mind.recentK[kind] || 0;
    let g = v / (1 + rk);
    mind.recentK[kind] = rk + 1;
    const recent = mind.gains.reduce((s, x) => s + x.v, 0);
    g = Math.min(g, Math.max(0, 6 - recent));
    if (g <= 0.001) return;
    mind.gains.push({ t: mind.clock, v: g });
    mind.bond = Math.min(100, mind.bond + g);
    env.onBond(mind.bond);
  }

  /* ---------- the building blocks of a behaviour ---------- */
  function* wait(t) { for (let e = 0; e < t; e += TICK) yield; }
  function* hold(state, t) { cat.setState(state, 1e4); yield* wait(t); }
  /** walk there; true on arrival, false if the way could not be found */
  function* walk(x, z, run = 0) {
    if (C.indoor) [x, z] = inRoom(x, z);
    cat.setState('walk', 1e4);
    cat.goTo(x, z, run);
    while (cat.target || (cat.path && cat.path.length)) { if (cat.blocked) return false; yield; }
    remember(x, z);
    return !cat.blocked;
  }
  function* route(pts, run = 0) {
    cat.setState('walk', 1e4);
    cat.follow(pts, run);
    while (cat.target || (cat.path && cat.path.length)) { if (cat.blocked) return false; yield; }
    return !cat.blocked;
  }
  const face = (h) => { cat.heading = h; };
  const faceTo = (x, z) => { cat.heading = Math.atan2(x - cat.x, z - cat.z); };
  /** turning round once or twice where it means to lie down (locked: it does not stop half way) */
  function* curl() {
    mind.lock = true;
    cat.setState('curl', 1e4);
    cat.turnRate = (rnd() < 0.5 ? -1 : 1) * 2.9;
    yield* wait(R(1.6, 2.3));
    cat.turnRate = 0;
    mind.lock = false;
  }
  /** waking: a yawn, then a long stretch */
  function* wakeUp() {
    mind.lock = true;
    cat.setState('loaf', 1e4);
    yield* wait(0.6);
    cat.yawn();
    habit('yawn');
    yield* wait(1.9);
    cat.setState('stretch', 1e4);
    yield* wait(2.3);
    mind.lock = false;
    mind.justWoke = 90;
  }
  /** asleep: you walking close by does not always wake it; now and then it lifts its head */
  function* sleepWhile(cond) {
    cat.setState('sleep', 1e4);
    while (cond()) {
      if (dP < 1.2 && C.moving && mind.lifted <= 0 && C.sameSpace) {
        mind.lifted = 25;
        if (rnd() < 0.3) {
          cat.setState('loaf', 1e4);
          mind.attnT = 4;
          yield* wait(R(4, 7));
          cat.setState('sleep', 1e4);
        } else cat.twitch[rnd() < 0.5 ? 0 : 1] = 1;        // an ear turns toward you, that is all
      }
      yield;
    }
  }

  /* ---------- where it rests ---------- */
  const sunnyHour = () => !C.night && C.winter < 0.5 && ((C.hour > 6.5 && C.hour < 11) || (C.hour > 14 && C.hour < 17.5));
  const hotNoon = () => C.hour > 11.5 && C.hour < 15 && C.winter < 0.2 && C.season === 1;
  function restSpot() {
    if (C.winter > 0.5 || hotNoon()) return { x: S.shelter.x, z: S.shelter.z, kind: 'shelter' };
    if (sunnyHour()) {
      const list = S.sunny.filter(([x, z]) => free(x, z) && !mind.places.some(([px, pz]) => Math.hypot(px - x, pz - z) < 1));
      if (list.length) { const [x, z] = list[Math.floor(rnd() * list.length)]; return { x, z, kind: 'sun' }; }
    }
    const p = spotNear(home.x, home.z, 0.5, home.r);
    return p ? { x: p[0], z: p[1], kind: 'home' } : { x: cat.x, z: cat.z, kind: 'here' };
  }
  /** into the shelter from the front, then turn round to face out */
  function* intoShelter() {
    const fx = S.shelter.x + Math.sin(S.shelter.yaw) * 0.75, fz = S.shelter.z + Math.cos(S.shelter.yaw) * 0.75;
    if (!(yield* route([[fx, fz], [S.shelter.x, S.shelter.z]], 0))) return false;
    yield* curl();
    face(S.shelter.yaw);
    habit('shelter');
    if (C.seen && dP < 9) mark('place');
    return true;
  }

  /* ---------- what it does ---------- */
  // ok(): may it start now; score(): how much it wants to; run(): the doing. Forced ones (the
  // night, a reaction to you) have no score: they are started by the checks in step().
  const B = {
    nap: {
      out: true, min: 20, cool: 25,
      ok: () => !C.night && cat.state !== 'sleep',
      score: () => 3 * Math.pow(1 - mind.needs.energy, 1.5) * (C.hour > 11 && C.hour < 15 ? 1.5 : 1) * (mind.justWoke > 0 ? 0.1 : 1),
      why: () => `mệt (năng lượng ${mind.needs.energy.toFixed(2)})`,
      *run() {
        const s = restSpot();
        if (s.kind === 'shelter') { if (!(yield* intoShelter())) return; }
        else { if (!(yield* walk(s.x, s.z))) return; yield* curl(); if (s.kind === 'sun') habit('sun'); }
        const until = mind.clock + R(25, 70);
        yield* sleepWhile(() => mind.clock < until && !C.night);
        if (!C.night) yield* wakeUp();
      },
    },
    loaf: {
      out: true, min: 8, cool: 12,
      ok: () => !C.night,
      score: () => 0.8 * (1 - mind.needs.energy * 0.5),
      why: () => 'nghỉ một lát',
      *run() {
        const s = restSpot();
        if (s.kind === 'shelter') { if (!(yield* intoShelter())) return; }
        else if (!(yield* walk(s.x, s.z))) return;
        if (s.kind === 'sun') habit('sun');
        yield* hold('loaf', R(10, 25));
      },
    },
    sunbathe: {
      out: true, min: 12, cool: 60,
      ok: () => sunnyHour() && S.sunny.length > 0,
      score: () => 1.4 * (1 - mind.needs.energy * 0.4),
      why: () => `có nắng (${C.hour.toFixed(1)} h)`,
      *run() {
        const list = S.sunny.filter(([x, z]) => free(x, z));
        if (!list.length) return;
        const [x, z] = list[Math.floor(rnd() * list.length)];
        if (!(yield* walk(x, z))) return;
        yield* curl();
        habit('sun');
        yield* hold('loaf', R(8, 15));
        const until = mind.clock + R(15, 35);
        yield* sleepWhile(() => mind.clock < until && sunnyHour());
        if (!C.night) yield* wakeUp();
      },
    },
    groom: {
      min: 4, cool: 18, ok: () => awake(),
      score: () => 0.6 + (mind.justWoke > 0 ? 1.2 : 0),
      why: () => (mind.justWoke > 0 ? 'vừa ngủ dậy' : 'chải lông'),
      *run() { habit('groom'); yield* hold('groom', R(5, 9)); },
    },
    watch: {
      out: true, min: 6, cool: 20, ok: () => !C.night,
      score: () => 0.7 * (0.5 + mind.needs.play),
      why: () => 'nhìn luống hoa',
      *run() {
        // sits and follows something over the beds with its eyes (a moth, a petal: something)
        const a = rnd() * TAU, r = R(3, 6), cx = cat.x + Math.sin(a) * r, cz = cat.z + Math.cos(a) * r;
        faceTo(cx, cz);
        cat.setState('watch', 1e4);
        const t0 = mind.clock, len = R(8, 16);
        while (mind.clock - t0 < len) {
          const u = mind.clock - t0;
          cat.attend = { x: cx + Math.sin(u * 0.9) * 0.9 + Math.sin(u * 2.3) * 0.25, y: cat.y + 0.4 + 0.3 * Math.sin(u * 1.4) ** 2, z: cz + Math.cos(u * 0.7) * 0.6 };
          if (u > 3) habit('watch');
          yield;
        }
        cat.attend = null;
      },
    },
    wander: {
      out: true, min: 4, cool: 6, ok: () => !C.night,
      score: () => 0.6 * (0.4 + mind.needs.energy) * (C.hour > 13 && C.hour < 17.5 ? 1.7 : 1),
      why: () => (C.hour > 13 && C.hour < 17.5 ? 'đi một vòng buổi chiều' : 'đi dạo'),
      *run() {
        const n = C.hour > 13 && C.hour < 17.5 ? 2 + Math.floor(rnd() * 2) : 1;
        for (let i = 0; i < n; i++) {
          const p = spotNear(home.x, home.z, 0.5, home.r);
          if (!p || !(yield* walk(p[0], p[1]))) return;
          if (rnd() < 0.5) yield* hold('sniff', R(1.2, 2.2));
          else yield* hold('idle', R(1, 2.5));
        }
      },
    },
    drink: {
      out: true, min: 3, cool: 60,
      ok: () => !C.night && C.winter < 0.6 && mind.needs.thirst > 0.45,
      score: () => 2.5 * mind.needs.thirst,
      why: () => `khát (${mind.needs.thirst.toFixed(2)})`,
      *run() {
        if (!(yield* walk(S.bowl.standX, S.bowl.standZ))) return;
        face(S.bowl.face);
        habit('drink');
        yield* hold('drink', R(3.5, 5.5));
        mind.needs.thirst = 0;
      },
    },
    scratch: {
      out: true, min: 3, cool: 80, ok: () => !C.night,
      score: () => (mind.justWoke > 0 ? 2.2 : 0.25),
      why: () => (mind.justWoke > 0 ? 'vừa ngủ dậy, muốn cào' : 'mài vuốt'),
      *run() {
        if (!(yield* walk(S.post.standX, S.post.standZ))) return;
        face(S.post.face);
        mind.lock = true;
        yield* hold('scratch', R(2.8, 4));
        mind.lock = false;
        habit('scratch');
        if (C.seen && dP < 9) mark('place');
        yield* hold('sit', R(1, 2));
      },
    },
    shelter: {
      out: true, min: 15, cool: 90, ok: () => !C.night,
      score: () => (C.winter > 0.5 ? 2 : hotNoon() ? 1.2 : 0.3) * (1 - mind.needs.energy * 0.3),
      why: () => (C.winter > 0.5 ? 'trời lạnh' : hotNoon() ? 'trưa nắng gắt' : 'về chỗ riêng'),
      *run() {
        if (!(yield* intoShelter())) return;
        if (rnd() < 0.5) { habit('knead'); yield* hold('knead', R(2.5, 4)); }
        yield* hold('loaf', R(8, 15));
        const until = mind.clock + R(15, 40);
        yield* sleepWhile(() => mind.clock < until && !C.night);
        if (!C.night) yield* wakeUp();
      },
    },
    dog: {
      out: true, min: 8, cool: 70,
      ok: () => !C.night && C.buddy && C.buddy.speed < 0.5 && Math.hypot(C.buddy.x - home.x, C.buddy.z - home.z) < home.r + 3,
      score: () => 1.2 * (0.3 + mind.needs.social) * (C.hour > 17 && C.hour < 19.5 ? 2 : 1),
      why: () => (C.hour > 17 && C.hour < 19.5 ? 'chiều tối, tìm Bơ' : 'ghé Bơ'),
      *run() {
        const d = C.buddy;
        // to the dog's side, a little ahead of its shoulder, never on top of the spot it is on
        const s = rnd() < 0.5 ? 1 : -1;
        const tx = d.x + Math.cos(d.heading) * 0.55 * s + Math.sin(d.heading) * 0.25, tz = d.z - Math.sin(d.heading) * 0.55 * s + Math.cos(d.heading) * 0.25;
        if (!free(tx, tz) || !(yield* walk(tx, tz))) return;
        if (Math.hypot(d.x - cat.x, d.z - cat.z) > 1.2) return;           // it got up and went
        faceTo(d.x, d.z);
        cat.attend = { x: d.x + Math.sin(d.heading) * 0.3, y: cat.y + 0.3, z: d.z + Math.cos(d.heading) * 0.3 };
        yield* hold('sniff', 1.4);                                         // nose to nose
        cat.attend = null;
        habit('dogside');
        if (C.seen && dP < 12) mark('buddy');
        mind.needs.social *= 0.6;
        yield* hold(rnd() < 0.5 ? 'loaf' : 'sit', R(10, 20));
      },
    },
    come: {
      min: 10, cool: 40,
      ok: () => C.sameSpace && dP > 1.8 && dP < 14 && (C.sitting || C.still > 4) && awake() && !C.reading,
      score: () => (C.sitting ? 3 : 1) * (0.2 + mind.needs.social) * [0.6, 1, 1.3][level()] * (C.hour > 17 && C.hour < 19.5 ? 1.8 : 1),
      why: () => (C.sitting ? 'bạn đang ngồi' : 'bạn đứng yên gần đó'),
      *run() { yield* comeToYou(false); },
    },

    /* indoors */
    inBed: {
      inn: true, min: 15, cool: 30, ok: () => !cat.perch,
      score: () => 2 * (1 - mind.needs.energy) + 0.3,
      why: () => 'về ổ',
      *run() {
        if (!(yield* walk(C.room.catBed.x, C.room.catBed.z))) return;
        habit('bed');
        if (C.seen) mark('place');
        habit('knead');
        yield* hold('knead', R(2.5, 4.5));
        yield* curl();
        const until = mind.clock + R(25, 60);
        yield* sleepWhile(() => mind.clock < until && !C.night);
        if (!C.night) yield* wakeUp();
      },
    },
    inRug: {
      inn: true, min: 10, cool: 20, ok: () => !cat.perch,
      score: () => 1,
      why: () => 'nằm cạnh bếp lò',
      *run() {
        if (!(yield* walk(C.room.catSpot.x, C.room.catSpot.z))) return;
        faceTo(C.room.fire.x, C.room.fire.z);
        yield* hold('loaf', R(12, 30));
      },
    },
    inWindow: {
      inn: true, min: 8, cool: 50, ok: () => !cat.perch && !C.night,
      score: () => 0.8,
      why: () => 'ngồi dưới cửa sổ',
      *run() {
        const w = C.room.catWindow;
        if (!(yield* walk(w.x, w.z))) return;
        face(w.yaw);
        cat.attend = { x: w.x + Math.sin(w.yaw) * 2, y: cat.y + 1.1, z: w.z + Math.cos(w.yaw) * 2 };
        habit('window');
        yield* hold('watch', R(10, 25));
        cat.attend = null;
      },
    },
    inWander: {
      inn: true, min: 3, cool: 10, ok: () => !cat.perch,
      score: () => 0.4 * (0.5 + mind.needs.energy),
      why: () => 'đi loanh quanh trong nhà',
      *run() {
        const p = spotNear(cat.x, cat.z, 0.6, 2.2);
        if (!p || !(yield* walk(p[0], p[1]))) return;
        yield* hold(rnd() < 0.5 ? 'sniff' : 'sit', R(1.5, 3));
      },
    },
    perched: {
      inn: true, min: 10, cool: 0, ok: () => !!cat.perch,
      score: () => 5,
      why: () => 'nằm trên ghế bập bênh',
      *run() {
        habit('chair');
        if (C.night) { yield* sleepWhile(() => C.night); yield* wakeUp(); }
        else yield* hold(rnd() < 0.3 ? 'groom' : 'loaf', R(15, 40));
      },
    },
  };
  for (const id of ['groom']) B[id].any = true;

  /* ---------- the ones that are started for a reason, not chosen at leisure ---------- */
  function* night() {
    // where: the snowman's straw in winter (ctx.rest), the dog's side by the fire, or (fire out)
    // its own shelter more often than the porch
    const pick = () => {
      if (C.winter > 0.6) return { kind: 'straw' };
      if (C.fire > 0.06) return { kind: 'dog' };
      return rnd() < 0.7 ? { kind: 'shelter' } : { kind: 'dog' };
    };
    if (Math.hypot(cat.x - home.x, cat.z - home.z) > home.r + 4) yield* goHome();
    let place = pick(), fireWas = C.fire > 0.06, changeAt = 0;
    const where = () => (place.kind === 'dog' ? cat.besideDog(C) : place.kind === 'straw' ? cat.besideDog(C) : [S.shelter.x, S.shelter.z]);
    // (the way to the straw may go round the end of the snow bank first: each leg asks again where
    // to go, until it is there; if the way is blocked, near enough will do)
    for (let leg = 0; leg < 4; leg++) {
      if (place.kind === 'shelter') { if (!(yield* intoShelter())) place = { kind: 'dog' }; else break; }
      const [x, z] = where();
      if (at(x, z) < 0.5) break;
      if (!(yield* walk(x, z, at(x, z) > 6 ? 0.5 : 0)) && at(x, z) < 1.2) break;
    }
    if (place.kind !== 'shelter') { yield* curl(); if (C.buddy && at(C.buddy.x, C.buddy.z) < 1.3) face(C.buddy.heading); }
    yield* hold('loaf', R(5, 9));
    if (place.kind !== 'shelter' && C.fire > 0.06) habit('firenap');
    if (C.buddy && at(C.buddy.x, C.buddy.z) < 1.2) { habit('dogside'); if (C.seen) mark('buddy'); }
    cat.setState('sleep', 1e4);
    // asleep until morning; if the fire goes out (or comes back) for a while, or the dog has
    // moved, it gets up and settles again
    while (C.night) {
      const lit = C.fire > 0.06;
      if (lit === fireWas) changeAt = 0; else if (!changeAt) changeAt = mind.clock;
      if ((changeAt && mind.clock - changeAt > 20) || (place.kind !== 'shelter' && C.buddy && C.buddy.speed < 0.1 && (() => { const [x, z] = where(); return at(x, z) > 1.4; })())) {
        fireWas = lit; changeAt = 0; place = pick();
        if (place.kind === 'shelter') { if (!(yield* intoShelter())) place = { kind: 'dog' }; }
        if (place.kind !== 'shelter') { const [x, z] = where(); yield* walk(x, z); yield* curl(); }
        cat.setState('sleep', 1e4);
      }
      yield* sleepWhile(() => C.night && mind.clock % 4 > TICK);
      yield;
    }
    yield* wakeUp();
  }
  /** it comes over to you (its own idea, or because you called) and settles a little way off */
  function* comeToYou(greeting) {
    const lv = level();
    const near = [1.6, 1.05, 0.8][lv];
    const k = near / Math.max(dP, 0.1);
    let tx = C.px + (cat.x - C.px) * k, tz = C.pz + (cat.z - C.pz) * k;
    tx += (rnd() - 0.5) * 0.4; tz += (rnd() - 0.5) * 0.4;
    if (!free(tx, tz)) { const p = spotNear(tx, tz, 0.2, 0.8, false); if (!p) return; [tx, tz] = p; }
    cat.expr.tailUp = lv > 0 || greeting ? 1 : 0.4;
    const ok = yield* walk(tx, tz, greeting ? 0.3 : 0);
    cat.expr.tailUp = 0;
    if (!ok) return;
    faceTo(C.px, C.pz);
    if (greeting && rnd() < 0.5) cat.tiltHead(rnd() < 0.5 ? -1 : 1);
    if (greeting && rnd() < 0.35) env.sound('meow', true);
    mind.needs.social *= 0.5;
    const t0 = mind.clock, len = R(15, 40);
    cat.setState(rnd() < 0.5 || C.sitting ? 'loaf' : 'sit', 1e4);
    while (mind.clock - t0 < len) {
      if (dP > 5 || !C.sameSpace) break;                 // you went off
      yield;
    }
  }
  /** you came back after a while: it trots up with its tail high */
  function* greet() { yield* comeToYou(true); }
  /** it follows you a little way when you walk off (it trusts you) */
  function* follow() {
    const t0 = mind.clock, x0 = cat.x, z0 = cat.z;
    cat.expr.tailUp = 0.8;
    while (mind.clock - t0 < 15 && Math.hypot(cat.x - x0, cat.z - z0) < 10 && C.sameSpace && dP < 9) {
      if (Math.floor((mind.clock - t0) / TICK) % 4 === 0) {
        const k = 1.5 / Math.max(dP, 0.1);
        const tx = C.px + (cat.x - C.px) * k, tz = C.pz + (cat.z - C.pz) * k;
        if (dP > 1.9 && free(tx, tz)) { cat.setState('walk', 1e4); cat.goTo(tx, tz, dP > 4 ? 0.6 : 0.1); }
        else if (dP <= 1.9) cat.target = null;
      }
      yield;
    }
    cat.expr.tailUp = 0;
    cat.target = null;
    faceTo(C.px, C.pz);
    yield* hold('sit', R(3, 6));
  }
  /** you sat down on the garden bench with a book: it may come along the walk and lie at your feet */
  function* readBuddy() {
    const pts = S.benchRoute;
    let i0 = 0, best = 1e9;
    pts.forEach(([x, z], i) => { const d = at(x, z); if (d < best) { best = d; i0 = i; } });
    cat.expr.tailUp = 0.6;
    const ok = yield* route(pts.slice(i0), 0.35);
    cat.expr.tailUp = 0;
    if (!ok || !C.reading) { yield* goHome(); return; }
    face(S.bench.yaw + Math.PI * 0.5 + R(-0.4, 0.4));
    mark('reading');
    if (rnd() < 0.5) { habit('knead'); yield* hold('knead', R(2, 3.5)); }
    yield* curl();
    cat.setState('loaf', 1e4);
    let t = 0;
    while (C.reading) { t += TICK; if (t > 40 && cat.state !== 'sleep') cat.setState('sleep', 1e4); yield; }
    if (cat.state === 'sleep') yield* wakeUp();
    yield* wait(R(4, 12));
    yield* goHome();
  }
  /** back home from far off: along the walk when it is near it, else straight */
  function* goHome() {
    const pts = S.benchRoute;
    let i0 = 0, best = 1e9;
    pts.forEach(([x, z], i) => { const d = at(x, z); if (d < best) { best = d; i0 = i; } });
    if (best < 4) yield* route(pts.slice(0, i0 + 1).reverse(), 0.3);
    else yield* walk(home.x, home.z, 0.3);
  }
  /** it has had enough (of being stroked, of being followed): it goes a little way off */
  function* avoid() {
    cat.expr.away = 1;
    cat.expr.ear = 0.25;
    const k = 2.4 / Math.max(dP, 0.1);
    let tx = cat.x + (cat.x - C.px) * k, tz = cat.z + (cat.z - C.pz) * k;
    if (!free(tx, tz)) { const p = spotNear(cat.x, cat.z, 1.5, 3, false); if (p) [tx, tz] = p; }
    yield* walk(tx, tz, 0.25);
    faceTo(2 * cat.x - C.px, 2 * cat.z - C.pz);              // its back to you
    yield* hold(rnd() < 0.5 ? 'groom' : 'sit', R(6, 12));
    cat.expr.away = 0;
    cat.expr.ear = 0;
  }
  /** the dog came bustling up: step aside, ears back, and sit */
  function* yieldToDog() {
    const d = C.buddy;
    const s = ((cat.x - d.x) * Math.cos(d.heading) - (cat.z - d.z) * Math.sin(d.heading)) > 0 ? 1 : -1;
    const tx = cat.x + Math.cos(d.heading) * 1.1 * s, tz = cat.z - Math.sin(d.heading) * 1.1 * s;
    cat.expr.ear = 0.4;
    if (free(tx, tz)) yield* walk(tx, tz, 0.4);
    yield* hold('sit', R(2.5, 4));
    cat.expr.ear = 0;
  }
  /** stuck where it should not be (inside a rock's circle, at the water): out to the nearest clear spot */
  function* escape() {
    for (let r = 0.6; r < 4; r += 0.6) {
      for (let i = 0; i < 10; i++) {
        const a = rnd() * TAU, x = cat.x + Math.cos(a) * r, z = cat.z + Math.sin(a) * r;
        if (free(x, z)) { yield* walk(x, z, 0.2); return; }
      }
    }
    // nowhere at all: if you cannot see it, it may simply be somewhere better
    if (!C.seen) { const p = spotNear(home.x, home.z, 0, home.r); if (p) cat.place(p[0], p[1], cat.heading, 'sit', 4); }
  }
  /** curled up beside you on a quiet night (it trusts you, and you have done things together) */
  function* nightBeside() {
    yield* comeToYouNear(0.9);
    faceTo(C.px, C.pz);
    cat.setState('loaf', 1e4);
    yield* wait(1.2);
    cat.slowBlink();
    yield* wait(2.2);
    yield* curl();
    mark('night');
    gain('night', 2);
    yield* sleepWhile(() => C.night && dP < 4 && C.sameSpace);
    if (!C.night) yield* wakeUp();
  }
  function* comeToYouNear(r) {
    const k = r / Math.max(dP, 0.1);
    const tx = C.px + (cat.x - C.px) * k, tz = C.pz + (cat.z - C.pz) * k;
    if (free(tx, tz)) yield* walk(tx, tz);
  }

  /* ---------- the play session (with the ball of wool) ---------- */
  function* play(offered) {
    const toy = env.toy;
    mind.playing = true;
    let rounds = 2 + Math.floor(R(0, 2) + mind.needs.play * 2), hits = 0, stalks = 0;
    try {
      while (rounds-- > 0 && toy.active) {
        // watch it (until it has nearly stopped rolling)
        cat.setState('sit', 1e4);
        const tw = mind.clock;
        while (mind.clock - tw < R(0.8, 1.6) || (toy.speed() > 0.3 && mind.clock - tw < 3.5)) { cat.attend = { x: toy.x, y: cat.y + 0.03, z: toy.z }; yield; }
        // closer, then the stalk: belly low, slow, eyes on it
        if (at(toy.x, toy.z) > 1.3) {
          const k = 0.95 / at(toy.x, toy.z);
          if (!(yield* walk(toy.x + (cat.x - toy.x) * k, toy.z + (cat.z - toy.z) * k, 0.2))) break;
        }
        cat.setState('stalk', 1e4);
        const ts = mind.clock;
        while (at(toy.x, toy.z) > 0.48 && mind.clock - ts < 4.5) {
          const k = 0.42 / Math.max(at(toy.x, toy.z), 0.1);
          if (Math.floor((mind.clock - ts) / TICK) % 3 === 0) cat.goTo(toy.x + (cat.x - toy.x) * k, toy.z + (cat.z - toy.z) * k, 0);
          cat.attend = { x: toy.x, y: cat.y + 0.03, z: toy.z };
          yield;
        }
        cat.target = null;
        stalks++;
        // the wiggle, then the leap (locked: once in the air it lands)
        faceTo(toy.x, toy.z);
        cat.wiggle = 0.85;
        yield* wait(0.85);
        mind.lock = true;
        let landed = false;
        const dist = Math.max(0.12, at(toy.x, toy.z) - 0.05);
        faceTo(toy.x, toy.z);
        cat.pounce(dist, () => { landed = true; });
        while (!landed) yield;
        mind.lock = false;
        if (at(toy.x, toy.z) < 0.24) {
          const a = cat.heading + R(-0.7, 0.7), v = R(0.8, 1.4);
          toy.kick(Math.sin(a) * v, Math.cos(a) * v);
          env.sound('tap');
          hits++;
        }
        cat.setState('sit', 1e4);
        yield* wait(R(0.8, 1.5));
        mind.needs.play = Math.max(0, mind.needs.play - 0.2);
        mind.needs.energy = Math.max(0, mind.needs.energy - 0.05);
        if (mind.needs.energy < 0.2) break;
      }
      cat.attend = null;
      // and then, as if nothing had happened: a wash, a lie-down
      if (offered && C.seen) env.say('Choco nằm xuống liếm chân: chơi thế là đủ rồi.');
      yield* hold('groom', R(3, 5));
      if (hits > 0 && stalks > 0) { if (C.seen) mark('play'); gain('play', 2); }
      yield* hold('loaf', R(4, 8));
    } finally {
      mind.playing = false;
      cat.wiggle = 0;
      cat.attend = null;
      env.onPlayEnd();
    }
  }

  /* ---------- reactions to you ---------- */
  function* petted() {
    mind.lock = true;
    cat.wasAsleep = cat.state === 'loaf' || cat.state === 'sleep';
    cat.target = null; cat.path = null;
    cat.happy = 3.2; cat.petCount++;
    cat.setState('happy', 1e4);
    cat.expr.tailUp = cat.wasAsleep ? 0 : 1;
    yield* wait(3.2);
    cat.expr.tailUp = 0;
    cat.happy = 0;
    mind.lock = false;
    cat.setState(cat.wasAsleep ? 'loaf' : 'sit', 1e4);
    yield* wait(R(6, 12));
  }
  /** you went off (or through the door) in the middle of it: let it go */
  const gone = () => !C.sameSpace || dP > 4;
  function* sniffHand() {
    mind.lock = true;
    cat.target = null; cat.path = null;
    faceTo(C.px, C.pz);
    // your hand, held low a little in front of you
    const hx = C.px + (cat.x - C.px) * (0.45 / Math.max(dP, 0.1)), hz = C.pz + (cat.z - C.pz) * (0.45 / Math.max(dP, 0.1));
    if (dP > 1.0) {
      const k = 0.62 / Math.max(dP, 0.1);
      mind.lock = false;
      yield* walk(C.px + (cat.x - C.px) * k, C.pz + (cat.z - C.pz) * k, 0);
      if (gone()) return;
      mind.lock = true;
    }
    cat.attend = { x: hx, y: cat.y + 0.25, z: hz };
    cat.expr.ear = -0.25;
    yield* hold('sniff', 1.5);
    cat.setState('sit', 1e4);
    yield* wait(0.8);                                          // thinks it over
    cat.attend = null;
    cat.expr.ear = 0;
    mind.lock = false;
    if (gone()) return;
    const p = 0.35 + 0.22 * level() + 0.3 * mind.needs.social;
    if (mind.tol > 0.4 && rnd() < p) {
      yield* rub(() => { mark('hello'); gain('hand', 1.5); env.sound('purr', 2.5); });
    } else {
      gain('hand', 0.6);
      cat.tiltHead(rnd() < 0.5 ? -1 : 1);
      yield* hold('sit', R(4, 8));
    }
  }
  /** a rub along your legs: round you, leaning in, tail up (it never walks into you) */
  function* rub(done) {
    const a0 = Math.atan2(cat.x - C.px, cat.z - C.pz), s = rnd() < 0.5 ? 1 : -1, r = 0.58;
    const pts = [0.55, 1.1, 1.6].map((da) => [C.px + Math.sin(a0 + s * da) * r, C.pz + Math.cos(a0 + s * da) * r]).filter(([x, z]) => free(x, z));
    if (!pts.length) return;
    cat.expr.tailUp = 1;
    cat.setState('rub', 1e4);
    cat.follow(pts, 0);
    const t0 = mind.clock;
    while ((cat.target || (cat.path && cat.path.length)) && !cat.blocked && mind.clock - t0 < 6 && !gone()) {
      const side = Math.sin(Math.atan2(C.px - cat.x, C.pz - cat.z) - cat.heading);
      cat.lean = dP < 0.8 ? 0.9 * Math.sign(side) : 0;
      yield;
    }
    cat.lean = 0;
    cat.expr.tailUp = 0;
    if (gone()) { cat.target = null; cat.path = null; return; }
    if (done && !cat.blocked) done();
    faceTo(C.px, C.pz);
    yield* hold('sit', R(3, 6));
  }

  /** what you can offer it: 'pet' 'hand' 'call' 'blink' 'play'. Returns a line to show (or ''). */
  const RANGE = { pet: 1.75, hand: 2.4, call: 16, blink: 4.5, play: 4.5 };
  const COOL = { pet: 2.5, hand: 6, call: 4, blink: 5, play: 12 };
  mind.can = (kind) => {
    if (!C) return 'Chờ một chút';
    if (!C.sameSpace) return 'Choco không ở đây';
    if (dP > RANGE[kind]) return kind === 'call' ? 'Choco ở xa quá, không nghe thấy' : 'Lại gần Choco hơn một chút';
    if (kind === 'call' && !C.los) return 'Có gì đó chắn giữa bạn và Choco';
    if ((mind.offerCool[kind] || 0) > 0) return 'Chờ một chút';
    if (cat.pounceT > 0 || cat.state === 'curl') return 'Choco đang dở tay';
    if ((kind === 'hand' || kind === 'play' || kind === 'blink') && cat.state === 'sleep') return 'Choco đang ngủ';
    if (kind === 'play' && mind.playing) return 'Đang chơi rồi';
    return '';
  };
  function begin(id, gen, why) {
    if (mind.cur && mind.cur.gen) { try { mind.cur.gen.return(); } catch (e) { /* ignore */ } }
    cat.turnRate = 0; cat.lean = 0; cat.wiggle = 0; mind.lock = false;
    if (id !== 'play') cat.attend = null;
    mind.cur = { id, gen, t: 0, min: 0 };
    mind.reason = `${id}: ${why}`;
    mind.recent.push(id);
    if (mind.recent.length > 6) mind.recent.shift();
  }
  mind.offer = (kind) => {
    const no = mind.can(kind);
    if (no) return no;
    mind.offerCool[kind] = COOL[kind];
    const asleep = cat.state === 'sleep';
    if (!asleep) mind.attnT = 2.5;
    if (kind === 'pet') {
      if (asleep) {
        if (mind.tol > 0.5) { mind.tol -= 0.15; env.sound('purr', 2); gain('petSleep', 0.3); return 'Choco vẫn ngủ, chỉ khẽ rung tai rồi rừ rừ rất nhỏ'; }
        cat.twitch[0] = 1;
        return 'Choco cựa mình một chút rồi ngủ tiếp. Để nó ngủ nhé';
      }
      if (mind.tol >= 0.55) {
        mind.tol -= level() === 2 ? 0.16 : 0.22;
        mind.needs.social *= 0.7;
        begin('petted', petted(), 'được vuốt ve');
        env.sound('purr', 3.2);
        gain('pet', 1);
        return PET_LINES[cat.petCount % PET_LINES.length];
      }
      mind.declines.push(mind.clock);
      if (mind.tol >= 0.3) {
        mind.tol -= 0.2;
        cat.expr.away = 0.6;
        mind.awayT = 4;
        return 'Choco để bạn vuốt một cái, nhưng chóp đuôi bắt đầu phẩy phẩy';
      }
      cat.expr.away = 1;
      mind.awayT = 6;
      if (mind.declines.filter((t) => mind.clock - t < 40).length >= 2) begin('avoid', avoid(), 'muốn yên');
      return 'Choco quay đầu đi, chóp đuôi giật giật: nó muốn yên một lúc';
    }
    if (kind === 'hand') {
      if (mind.tol < 0.3) { cat.expr.away = 1; mind.awayT = 5; return 'Choco liếc tay bạn rồi nhìn đi chỗ khác. Lúc khác nhé'; }
      begin('hand', sniffHand(), 'bạn chìa tay');
      return 'Bạn chìa tay ra, thật chậm. Choco vươn cổ tới ngửi';
    }
    if (kind === 'call') {
      if (asleep) { cat.twitch[1] = 1; return 'Choco khẽ xoay tai về phía bạn nhưng vẫn ngủ'; }
      cat.tiltHead(rnd() < 0.5 ? -1 : 1);
      const willing = !mind.lock && mind.tol > 0.35 && !mind.playing && rnd() < 0.45 + 0.2 * level() + 0.3 * mind.needs.social;
      if (willing && dP > 1.8) {
        begin('call', comeToYou(true), 'bạn gọi');
        gain('call', 0.6);
        return 'Choco nghiêng đầu nghe, rồi đuôi dựng lên, đi về phía bạn';
      }
      return 'Choco quay đầu nhìn bạn, tai hướng về phía trước. Nó nghe rồi, nhưng chưa muốn đi';
    }
    if (kind === 'blink') {
      const calm = ['sit', 'loaf', 'idle', 'watch', 'knead', 'happy'].includes(cat.state);
      if (calm && C.seen && cat.expr.away < 0.5 && dP < 4.5) {
        mind.pendingBlink = 0.7;
        mind.tol = Math.min(1, mind.tol + 0.1);
        gain('blink', 1.2);
        return 'Bạn chớp mắt thật chậm với Choco. Nó nhìn bạn, rồi chớp lại, cũng chậm như thế';
      }
      return 'Choco đang mải chuyện khác, chưa thấy bạn chớp mắt';
    }
    if (kind === 'play') {
      env.throwToy();
      const keen = mind.needs.energy > 0.25 && mind.needs.play > 0.15 && mind.tol > 0.25 && !asleep;
      if (keen) { begin('play', play(true), 'bạn lăn cuộn len'); return 'Bạn lăn cuộn len ra. Choco hạ thấp người, mắt dán vào nó'; }
      return 'Choco liếc cuộn len một cái rồi lim dim. Để lúc khác';
    }
    return '';
  };

  /** a line under its name, from what it is really doing (empty when there is nothing to say) */
  mind.status = () => {
    if (mind.playing) return 'Đang chơi';
    if (cat.state === 'sleep') return 'Đang ngủ';
    if (cat.expr.away > 0.5 || (mind.cur && mind.cur.id === 'avoid')) return 'Muốn yên';
    if (mind.attnT > 0) return 'Tò mò';
    if (cat.state === 'loaf' && cat.lid > 0.3) return 'Lim dim';
    if (mind.needs.play > 0.65 && mind.needs.energy > 0.35 && !C?.night) return 'Muốn chơi';
    return '';
  };
  mind.level = level;

  /* ---------- the beat ---------- */
  function choose() {
    const inside = C.indoor;
    let total = 0;
    const opts = [];
    for (const [id, b] of Object.entries(B)) {
      if (inside ? !b.inn && !b.any : b.inn) continue;
      if ((mind.cool[id] || 0) > 0 || !b.ok()) continue;
      const rep = mind.recent.slice(-2).filter((x) => x === id).length;
      const s = Math.max(0, b.score()) * (rep === 2 ? 0.2 : rep === 1 ? 0.55 : 1);
      if (s <= 0) continue;
      opts.push([id, s]);
      total += s;
    }
    if (!opts.length) { begin('idle', (function* () { yield* hold('sit', R(2, 4)); })(), 'không có gì để làm'); return; }
    let r = rnd() * total, pick = opts[0][0];
    for (const [id, s] of opts) { r -= s; if (r <= 0) { pick = id; break; } }
    const b = B[pick];
    begin(pick, b.run(), `${b.why()} · ${opts.map(([id, s]) => `${id} ${s.toFixed(2)}`).join(', ')}`);
    mind.cur.min = b.min;
    mind.cool[pick] = b.cool;
  }
  function needsTick(dt) {
    const n = mind.needs, st = cat.state;
    if (st === 'sleep') n.energy += 0.012 * dt;
    else if (st === 'loaf') n.energy += 0.004 * dt;
    else if (st === 'walk' || st === 'stalk' || st === 'pounce') n.energy -= 0.004 * dt;
    else n.energy -= 0.0012 * dt;
    if (st !== 'sleep') n.play += 0.0025 * dt * (C.hour > 13 && C.hour < 19 ? 1.6 : 1);
    n.social += (C.sameSpace && dP < 2.5 ? -0.01 : 0.002) * dt;
    n.thirst += 0.0015 * dt;
    for (const k of Object.keys(n)) n[k] = clamp(n[k], 0, 1);
    mind.tol = Math.min(1, mind.tol + (dP < 2 ? 0.025 : 0.05) * dt);
    for (const k of Object.keys(mind.recentK)) mind.recentK[k] *= Math.pow(0.5, dt / 240);
    while (mind.gains.length && mind.clock - mind.gains[0].t > 600) mind.gains.shift();
    for (const k of Object.keys(mind.cool)) mind.cool[k] -= dt;
    for (const k of Object.keys(mind.offerCool)) mind.offerCool[k] -= dt;
    mind.justWoke = Math.max(0, mind.justWoke - dt);
    mind.lifted = Math.max(0, mind.lifted - dt);
    mind.attnT = Math.max(0, mind.attnT - dt);
    if (mind.awayT > 0) { mind.awayT -= dt; if (mind.awayT <= 0 && !(mind.cur && mind.cur.id === 'avoid')) cat.expr.away = 0; }
    if (mind.pendingBlink > 0) { mind.pendingBlink -= dt; if (mind.pendingBlink <= 0) cat.slowBlink(); }
    cat.attendYou = mind.attnT > 0 && C.sameSpace;
    mind.nightClose = Math.max(0, mind.nightClose - dt);
    cat.slowOk = level() >= 1;
    cat.expr.lid = cat.state === 'loaf' && mind.needs.energy < 0.35 ? 0.3 : 0;
  }
  // what has to happen now, whatever it was doing (null: nothing)
  function urgent() {
    const id = mind.cur ? mind.cur.id : '';
    if (!C.indoor && C.safe && !C.safe(cat.x, cat.z) && id !== 'escape') return ['escape', escape, 'đứng ở chỗ không nên ở'];
    if (mind.lock) return null;
    const d = C.buddy;
    if (!C.indoor && d && d.speed > 1.1 && at(d.x, d.z) < 1.3 && id !== 'yield' && id !== 'petted' && !(mind.cool.yield > 0)) { mind.cool.yield = 6; return ['yield', yieldToDog, 'Bơ chạy ào tới']; }
    if (['petted', 'hand', 'call', 'play', 'avoid', 'yield', 'escape'].includes(id)) return null;
    if (!C.indoor && C.reading && level() >= 1 && !(C.night && C.winter > 0.5) && id !== 'read' && cat.state !== 'sleep' && !(mind.cool.read > 0)) {
      mind.cool.read = 300;
      return ['read', readBuddy, 'bạn ngồi đọc sách ở ghế'];
    }
    if (id === 'read') return null;
    if (C.night && C.sameSpace && level() >= 1 && (mind.marks.size >= 2 || mind.bond >= 30) && dP < 3 && (C.sitting || C.still > 20) && id !== 'nightBeside' && !(mind.cool.nightBeside > 0)) {
      mind.cool.nightBeside = 600;
      return ['nightBeside', nightBeside, 'đêm yên, bạn ở ngay đây'];
    }
    if (id === 'nightBeside') return null;
    if (C.indoor) {
      if (C.night && !cat.perch && id !== 'inBed' && id !== 'asleep' && cat.state !== 'sleep') return ['inBed', B.inBed.run, 'đêm trong nhà'];
      return null;
    }
    if (C.night && id !== 'night') return ['night', night, 'đêm xuống'];
    if (!C.night && id === 'night') return null;
    if (Math.hypot(cat.x - home.x, cat.z - home.z) > home.r + 8 && id !== 'home') return ['home', goHome, 'đi xa nhà quá'];
    if (id === 'home') return null;
    // the rest are wishes, not needs: they wait until what it is doing has had its minimum time
    if (mind.cur && mind.cur.t < (mind.cur.min || 0)) return null;
    // you came back after a while
    if (mind.returned > 0 && C.sameSpace && awake() && id !== 'greet') {
      mind.returned = 0;
      if (level() > 0) return ['greet', greet, 'bạn quay lại'];
      mind.attnT = 3;                                         // still shy: it looks, and may come, slowly
      if (rnd() < 0.4) return ['greet', () => comeToYou(false), 'bạn quay lại (còn ngại)'];
    }
    // you walk off from beside it, and it trusts you
    if (level() === 2 && C.moving && dP > 3 && dP < 6 && mind.wasNear > 0 && awake() && !(mind.cool.follow > 0) && rnd() < 0.3) {
      mind.cool.follow = 120;
      return ['follow', follow, 'bạn đi, nó đi theo'];
    }
    if (env.toy.active && !mind.playing && mind.needs.play > 0.55 && mind.needs.energy > 0.3 && awake() && at(env.toy.x, env.toy.z) < 5) return ['play', () => play(false), 'cuộn len còn đó'];
    return null;
  }
  mind.awayT0 = 60;
  mind.returned = 0;
  mind.wasNear = 0;
  mind.companyT = 0;
  function step() {
    mind.clock += TICK;
    needsTick(TICK);
    // how long you have been away (for the greeting), and whether you were just beside it
    if (!C.sameSpace || dP > 12) mind.awayT0 += TICK;
    else if (dP < 8) { if (mind.awayT0 > 40) mind.returned = 4; mind.awayT0 = 0; }
    mind.returned = Math.max(0, mind.returned - TICK);
    mind.wasNear = dP < 2.5 ? 3 : Math.max(0, mind.wasNear - TICK);
    // a quiet while together: you sitting (or standing still) beside it while it rests, by day
    const resting = cat.state === 'loaf' || cat.state === 'sleep' || cat.state === 'sit';
    if ((C.sitting || C.still > 10) && dP < 2.6 && C.sameSpace && !C.night && resting) {
      if (C.sitting) { mind.sitNear += TICK; if (mind.sitNear > 25 && C.seen) mark('sun'); }
      mind.companyT += TICK;
      if (mind.companyT > 45) { mind.companyT = 0; gain('company', 0.6); }
    } else { mind.sitNear = 0; mind.companyT = 0; }
    if (cat.blocked && mind.cur) { mind.cool[mind.cur.id] = 30; cat.blocked = false; mind.lock = false; mind.cur.gen.return(); mind.cur = null; }
    const u = urgent();
    if (u) begin(u[0], u[1](), u[2]);
    if (!mind.cur) choose();
    mind.cur.t += TICK;
    const r = mind.cur.gen.next();
    if (r.done) mind.cur = null;
  }
  /** called by cat.update every frame */
  cat.brain = (dt, ctx, d, held) => {
    C = ctx; dP = ctx.sameSpace ? d : 99;
    if (held) return;
    mind.acc = Math.min(mind.acc + dt, 0.5);           // after a stall it does not try to catch up
    while (mind.acc >= TICK) { mind.acc -= TICK; step(); }
  };
  /** the room's door: called as you go in or out (the cat comes too only if it was near) */
  mind.moved = () => {
    if (mind.cur && mind.cur.gen) { try { mind.cur.gen.return(); } catch (e) { /* ignore */ } }
    mind.cur = null; mind.lock = false; mind.playing = false;
    cat.attend = null; cat.expr.away = 0; cat.expr.tailUp = 0; cat.expr.ear = 0;
    // put down asleep (in its basket, under the fade at the door): it sleeps on, it is not woken to be put to bed again
    if (cat.state === 'sleep' && C) {
      const until = mind.clock + R(30, 60);
      begin('asleep', (function* () { yield* sleepWhile(() => C.night || mind.clock < until); yield* wakeUp(); })(), 'đã ngủ sẵn');
    }
  };
  mind.debug = () => ({ reason: mind.reason, cur: mind.cur && mind.cur.id, state: cat.state, lock: mind.lock, needs: { ...mind.needs }, tol: mind.tol, bond: mind.bond, level: level(), marks: [...mind.marks], habits: [...mind.habits] });
  return mind;
}

const PET_LINES = [
  'Choco nheo mắt, dụi đầu vào tay bạn rồi rừ rừ khe khẽ',
  'Choco dựng thẳng đuôi, chóp đuôi run run, cọ má vào ngón tay bạn',
  'Choco nằm yên cho bạn vuốt, mắt khép hờ, tiếng rừ rừ đều như máy khâu',
  'Choco kêu “mrrr” một tiếng ngắn rồi ưỡn lưng theo bàn tay bạn',
];
