// The sky as computed (not the painted sky of the valley). One source for the telescope, the
// solar-system model and the observing log. No three.js here.
//
// THE CONVENTION (shown in the UI): the valley's own sky is scenery (its stars are placed for the
// view, its constellations arranged to fit the screen; see game.js). The telescope and the model
// instead use a stated observing place and night:
//   - place: 68.4° N, 23.6° E (near Enontekiö, Finnish Lapland, the place the valley's fish list
//     comes from); north is -Z in the world, azimuth is measured from north toward east;
//   - night: one representative date per season of the game (SKY_NIGHTS), at the valley clock's
//     hour taken as local civil time (UTC+2 in winter, UTC+3 in summer time). The game's day of
//     sixteen minutes and its one-season-per-dawn are not astronomical time: each season simply
//     looks at "its" night.
// Methods and their accuracy (good enough to point a small telescope, not an ephemeris):
//   - sidereal time: IAU 1982 GMST expression (as in Meeus, Astronomical Algorithms, ch. 12);
//   - Sun: the Astronomical Almanac's low-precision formulae (about 0.01°);
//   - Moon: the Astronomical Almanac's low-precision series (about 0.3° in longitude, 0.2° in
//     latitude); phase from the Sun-Moon elongation;
//   - planets: Keplerian elements and rates of Standish (JPL, "Approximate Positions of the
//     Planets", table 1, valid 1800-2050; errors of arc-minutes for the inner planets, up to
//     ~10' for Jupiter and Saturn);
//   - stars and deep-sky objects: J2000 positions checked against their Wikipedia infoboxes
//     (November 2026); precession to 2026 (~0.35°) is ignored.
const DEG = Math.PI / 180;
const sin = (d) => Math.sin(d * DEG), cos = (d) => Math.cos(d * DEG);
const wrap360 = (x) => ((x % 360) + 360) % 360;

export const OBSERVER = { lat: 68.4, lon: 23.6, name: 'gần Enontekiö, Lapland (68,4°B 23,6°Đ)' };
// the night each season of the game looks at (local dates; the hour comes from the valley clock)
export const SKY_NIGHTS = [
  { y: 2026, m: 3, d: 20, tz: 2, label: 'đêm 20/3/2026' },    // spring: equinox
  { y: 2026, m: 8, d: 24, tz: 3, label: 'đêm 24/8/2026' },    // summer: the first dark nights after the midnight sun
  { y: 2026, m: 10, d: 25, tz: 2, label: 'đêm 25/10/2026' },  // autumn (after the clocks go back)
  { y: 2027, m: 1, d: 16, tz: 2, label: 'đêm 16/1/2027' },    // winter (after the polar night)
];

/** Julian date of a UTC calendar date and fractional hour (Gregorian, Meeus ch. 7) */
export function julian(y, m, d, hUT) {
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5 + hUT / 24;
}
/** the Julian date of the season's night at a local clock hour (an hour before 12 belongs to the next morning) */
export function nightJD(season, hour) {
  const n = SKY_NIGHTS[season] || SKY_NIGHTS[0];
  const next = hour < 12 ? 1 : 0;
  return julian(n.y, n.m, n.d + next, hour - n.tz);
}
/** Greenwich mean sidereal time in degrees */
export function gmst(jd) {
  const T = (jd - 2451545.0) / 36525;
  return wrap360(280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T - T * T * T / 38710000);
}
const OBL = 23.4393;               // obliquity of the ecliptic, J2000 (degrees)
/** ecliptic (lon, lat) to equatorial (ra hours, dec degrees) */
export function eclToEq(lon, lat, eps = OBL) {
  const x = cos(lat) * cos(lon), y = cos(lat) * sin(lon), z = sin(lat);
  const ye = y * cos(eps) - z * sin(eps), ze = y * sin(eps) + z * cos(eps);
  return { ra: wrap360(Math.atan2(ye, x) / DEG) / 15, dec: Math.asin(Math.max(-1, Math.min(1, ze))) / DEG };
}
/** equatorial to the observer's horizon: { alt, az } in degrees, az from north toward east */
export function toHorizon(ra, dec, jd, obs = OBSERVER) {
  const H = wrap360(gmst(jd) + obs.lon - ra * 15);
  const alt = Math.asin(sin(obs.lat) * sin(dec) + cos(obs.lat) * cos(dec) * cos(H)) / DEG;
  const az = wrap360(Math.atan2(-cos(dec) * sin(H), cos(obs.lat) * sin(dec) - sin(obs.lat) * cos(dec) * cos(H)) / DEG);
  return { alt, az };
}
/** the Sun, geocentric: ecliptic longitude (deg), distance (AU) */
export function sunPos(jd) {
  const n = jd - 2451545.0;
  const L = wrap360(280.460 + 0.9856474 * n), g = wrap360(357.528 + 0.9856003 * n);
  const lon = wrap360(L + 1.915 * sin(g) + 0.020 * sin(2 * g));
  const R = 1.00014 - 0.01671 * cos(g) - 0.00014 * cos(2 * g);
  return { lon, lat: 0, dist: R, ...eclToEq(lon, 0) };
}
/** the Moon, geocentric (Astronomical Almanac low-precision): lon, lat (deg), dist (km), phase */
export function moonPos(jd) {
  const T = (jd - 2451545.0) / 36525;
  const lon = wrap360(218.32 + 481267.881 * T
    + 6.29 * sin(135.0 + 477198.87 * T) - 1.27 * sin(259.3 - 413335.36 * T)
    + 0.66 * sin(235.7 + 890534.22 * T) + 0.21 * sin(269.9 + 954397.74 * T)
    - 0.19 * sin(357.5 + 35999.05 * T) - 0.11 * sin(186.5 + 966404.03 * T));
  const lat = 5.13 * sin(93.3 + 483202.02 * T) + 0.28 * sin(228.2 + 960400.89 * T)
    - 0.28 * sin(318.3 + 6003.15 * T) - 0.17 * sin(217.6 - 407332.21 * T);
  const par = 0.9508 + 0.0518 * cos(135.0 + 477198.87 * T) + 0.0095 * cos(259.3 - 413335.36 * T)
    + 0.0078 * cos(235.7 + 890534.22 * T) + 0.0028 * cos(269.9 + 954397.74 * T);
  const dist = 6378.14 / sin(par);
  const sun = sunPos(jd);
  // elongation and illuminated fraction (phase angle ~ 180° - elongation for the Moon)
  const elong = Math.acos(cos(lat) * cos(lon - sun.lon)) / DEG;
  const illum = (1 + cos(180 - elong)) / 2;                // phase angle ~ 180° - elongation
  const waxing = wrap360(lon - sun.lon) < 180;
  return { lon, lat, dist, elong, illum, waxing, ...eclToEq(lon, lat) };
}

/* ---------- planets: Standish, JPL, table 1 (1800-2050): a, e, I, L, long.peri, long.node and rates per century */
const EL = {
  mercury: [[0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593], [0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081]],
  venus: [[0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255], [0.00000390, -0.00004107, -0.00078890, 58517.81538729, 0.00268329, -0.27769418]],
  earth: [[1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0], [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0]],
  mars: [[1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891], [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343]],
  jupiter: [[5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909], [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106]],
  saturn: [[9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448], [-0.00125060, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794]],
  uranus: [[19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.95427630, 74.01692503], [-0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589]],
  neptune: [[30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574], [0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664]],
};
export const PLANET_IDS = Object.keys(EL);
/** heliocentric ecliptic position (AU, J2000 ecliptic): { x, y, z } */
export function helio(id, jd) {
  const T = (jd - 2451545.0) / 36525;
  const [e0, r] = EL[id];
  const a = e0[0] + r[0] * T, e = e0[1] + r[1] * T, I = e0[2] + r[2] * T;
  const L = e0[3] + r[3] * T, wbar = e0[4] + r[4] * T, node = e0[5] + r[5] * T;
  const w = wbar - node;
  let M = wrap360(L - wbar); if (M > 180) M -= 360;
  // Kepler's equation, in degrees (Standish's own iteration)
  const eStar = e / DEG;
  let E = M + eStar * sin(M);
  for (let i = 0; i < 8; i++) { const dM = M - (E - eStar * sin(E)); const dE = dM / (1 - e * cos(E)); E += dE; if (Math.abs(dE) < 1e-7) break; }
  const xp = a * (cos(E) - e), yp = a * Math.sqrt(1 - e * e) * sin(E);
  const x = (cos(w) * cos(node) - sin(w) * sin(node) * cos(I)) * xp + (-sin(w) * cos(node) - cos(w) * sin(node) * cos(I)) * yp;
  const y = (cos(w) * sin(node) + sin(w) * cos(node) * cos(I)) * xp + (-sin(w) * sin(node) + cos(w) * cos(node) * cos(I)) * yp;
  const z = (sin(w) * sin(I)) * xp + (cos(w) * sin(I)) * yp;
  return { x, y, z };
}
/** a planet seen from the Earth: ra, dec, distance (AU), phase angle, elongation from the Sun */
export function planetGeo(id, jd) {
  const p = helio(id, jd), E = helio('earth', jd);
  const x = p.x - E.x, y = p.y - E.y, z = p.z - E.z;
  const dist = Math.hypot(x, y, z);
  const lon = wrap360(Math.atan2(y, x) / DEG), lat = Math.asin(z / dist) / DEG;
  const r = Math.hypot(p.x, p.y, p.z), R = Math.hypot(E.x, E.y, E.z);
  const elong = Math.acos(Math.max(-1, Math.min(1, (R * R + dist * dist - r * r) / (2 * R * dist)))) / DEG;
  return { lon, lat, dist, elong, ...eclToEq(lon, lat) };
}

/* ---------- planet facts (NASA NSSDCA Planetary Fact Sheet, mean values) ---------- */
export const BODY = {
  sun: { vi: 'Mặt Trời', r: 695700, color: '#ffd27a' },
  mercury: { vi: 'Sao Thuỷ', r: 2439.7, a: 0.387, period: '88 ngày', day: '176 ngày (Mặt Trời mọc tới mọc)', tilt: 0.03, color: '#9c948a', moons: 0 },
  venus: { vi: 'Sao Kim', r: 6051.8, a: 0.723, period: '224,7 ngày', day: 'quay ngược, 243 ngày một vòng', tilt: 177.4, color: '#e8d6a4', moons: 0 },
  earth: { vi: 'Trái Đất', r: 6371.0, a: 1.0, period: '365,26 ngày', day: '24 giờ', tilt: 23.44, color: '#4a7ab8', moons: 1 },
  mars: { vi: 'Sao Hoả', r: 3389.5, a: 1.524, period: '687 ngày', day: '24 giờ 40 phút', tilt: 25.19, color: '#c8653a', moons: 2 },
  jupiter: { vi: 'Sao Mộc', r: 69911, a: 5.203, period: '11,86 năm', day: '9 giờ 56 phút', tilt: 3.13, color: '#d8b48a', moons: '95 (đã công nhận, tính tới 2023)' },
  saturn: { vi: 'Sao Thổ', r: 58232, a: 9.537, period: '29,4 năm', day: '10 giờ 33 phút', tilt: 26.73, color: '#e2cc94', moons: 'hơn 140 (tính tới 2025)' },
  uranus: { vi: 'Sao Thiên Vương', r: 25362, a: 19.19, period: '84 năm', day: 'quay ngược, 17 giờ 14 phút', tilt: 97.77, color: '#a8d8e0', moons: 28 },
  neptune: { vi: 'Sao Hải Vương', r: 24622, a: 30.07, period: '164,8 năm', day: '16 giờ 6 phút', tilt: 28.32, color: '#5a7ad8', moons: 16 },
  moon: { vi: 'Mặt Trăng', r: 1737.4, color: '#cfcbc0' },
};
export const AU_KM = 149597870.7;

/* ---------- what the telescope can be pointed at ---------- */
// kind: moon | planet | double | cluster | nebula | galaxy. ra hours, dec degrees (J2000).
// mag: visual magnitude; size: apparent size in arc-minutes (for extended objects).
export const TARGETS = [
  { id: 'moon', vi: 'Mặt Trăng', kind: 'moon', group: 'Mặt Trăng' },
  { id: 'jupiter', vi: 'Sao Mộc và bốn vệ tinh Galileo', kind: 'planet', group: 'Hành tinh', planet: 'jupiter' },
  { id: 'saturn', vi: 'Sao Thổ', kind: 'planet', group: 'Hành tinh', planet: 'saturn' },
  { id: 'mars', vi: 'Sao Hoả', kind: 'planet', group: 'Hành tinh', planet: 'mars' },
  { id: 'albireo', vi: 'Albireo (β Thiên Nga)', kind: 'double', group: 'Sao đôi', ra: 19.512, dec: 27.96, mag: 3.1, sep: 35.3, pa: 54, comp: { mag: 5.1, col: '#8fb4ff' }, col: '#ffcf8a' },
  { id: 'mizar', vi: 'Mizar và Alcor (Bắc Đẩu)', kind: 'double', group: 'Sao đôi', ra: 13.399, dec: 54.93, mag: 2.2, sep: 14.4, pa: 152, comp: { mag: 3.9, col: '#f4f6ff' }, col: '#f2f4ff', wide: { mag: 4.0, sepArcmin: 11.8, pa: 71 } },
  { id: 'pleiades', vi: 'Tua Rua (M45, Pleiades)', kind: 'cluster', group: 'Cụm sao', ra: 3.777, dec: 24.12, mag: 1.6, size: 110 },
  { id: 'double', vi: 'Cụm sao đôi Perseus (NGC 869 và 884)', kind: 'cluster', group: 'Cụm sao', ra: 2.32, dec: 57.13, mag: 4.3, size: 60 },
  { id: 'm31', vi: 'Thiên hà Andromeda (M31)', kind: 'galaxy', group: 'Thiên hà', ra: 0.712, dec: 41.27, mag: 3.4, size: 178 },
  { id: 'm42', vi: 'Tinh vân Lạp Hộ (M42)', kind: 'nebula', group: 'Tinh vân', ra: 5.588, dec: -5.39, mag: 4.0, size: 65 },
  { id: 'm57', vi: 'Tinh vân Chiếc Nhẫn (M57)', kind: 'nebula', group: 'Tinh vân', ra: 18.893, dec: 33.03, mag: 8.8, size: 1.4 },
];

/** where a target is in the sky of this season's night at this hour */
export function locate(t, jd) {
  if (t.kind === 'moon') { const m = moonPos(jd); return { ...toHorizon(m.ra, m.dec, jd), ra: m.ra, dec: m.dec, moon: m }; }
  if (t.kind === 'planet') { const p = planetGeo(t.planet, jd); return { ...toHorizon(p.ra, p.dec, jd), ra: p.ra, dec: p.dec, planet: p }; }
  return { ...toHorizon(t.ra, t.dec, jd), ra: t.ra, dec: t.dec };
}
/** the Sun's altitude: is it dark enough to observe? */
export function sunAlt(jd) { const s = sunPos(jd); return toHorizon(s.ra, s.dec, jd).alt; }
export function darkness(jd) {
  const a = sunAlt(jd);
  return a > -0.8 ? 'Ban ngày' : a > -6 ? 'Hoàng hôn dân sự' : a > -12 ? 'Hoàng hôn hàng hải' : a > -18 ? 'Hoàng hôn thiên văn' : 'Đêm tối hẳn';
}
/**
 * Saturn's ring opening as seen from the Earth, B in degrees (Meeus, Astronomical Algorithms ch. 45,
 * the first steps only): near 0 the rings are edge-on (they were on 23 March 2025).
 */
export function saturnRingTilt(jd) {
  const T = (jd - 2451545.0) / 36525;
  const i = 28.075216 - 0.012998 * T + 0.000004 * T * T;
  const node = 169.508470 + 1.394681 * T + 0.000412 * T * T;
  const p = planetGeo('saturn', jd);
  return Math.asin(sin(i) * cos(p.lat) * sin(p.lon - node) - cos(i) * sin(p.lat)) / DEG;
}
/**
 * Jupiter's four Galilean moons: apparent offset east-west from the planet's centre, in Jupiter
 * radii (Meeus ch. 44, the low-accuracy method: good to a fraction of a radius; north-south
 * offsets are ignored). Positive x is toward the west of the sky.
 */
export function galilean(jd) {
  const d = jd - 2451545.0;
  const V = 172.74 + 0.00111588 * d, M = 357.529 + 0.9856003 * d;
  const N = 20.020 + 0.0830853 * d + 0.329 * sin(V), J = 66.115 + 0.9025179 * d - 0.329 * sin(V);
  const A = 1.915 * sin(M) + 0.020 * sin(2 * M), B = 5.555 * sin(N) + 0.168 * sin(2 * N);
  const K = J + A - B;
  const R = 1.00014 - 0.01671 * cos(M) - 0.00014 * cos(2 * M);
  const r = 5.20872 - 0.25208 * cos(N) - 0.00611 * cos(2 * N);
  const D = Math.sqrt(r * r + R * R - 2 * r * R * cos(K));
  const psi = Math.asin(R / D * sin(K)) / DEG;
  const t = d - D / 173;
  const u = [163.8069 + 203.4058646 * t, 358.4140 + 101.2916335 * t, 5.7176 + 50.2345180 * t, 224.8092 + 21.4879800 * t].map((x) => x + psi - B);
  const rad = [5.9057, 9.3966, 14.9883, 26.3627];
  const names = ['Io', 'Europa', 'Ganymede', 'Callisto'];
  return u.map((ui, k) => ({ name: names[k], x: rad[k] * sin(ui), behind: cos(ui) < 0 }));
}
/** apparent diameter of a planet in arc-seconds */
export function planetSize(id, distAU) { return 2 * Math.atan(BODY[id].r / (distAU * AU_KM)) / DEG * 3600; }
