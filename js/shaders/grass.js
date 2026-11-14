// Instanced grass blades + wildflower points, both swayed in the vertex shader.
// The grass is one square tile of blades that wraps around the walker, so the
// meadow is endless; the ground height and the clearings are evaluated on the GPU.
import { curvesGLSL } from './terrain.js';
import { CABIN, CAMP, GARDEN } from '../layout.js';
import { lightGLSL } from './light.js';
const windGLSL = /* glsl */ `
vec2 windBend(vec2 wp, float seed, float t){
  float gust = sin(wp.x * 0.12 + t * 0.9 + sin(wp.y * 0.10 + t * 0.3) * 2.0) * 0.5 + 0.5;
  float swell = sin(wp.x * 0.031 - wp.y * 0.045 + t * 0.35) * 0.5 + 0.5;
  float flutter = sin(t * 3.1 + seed * 40.0 + wp.x * 1.7) * 0.07;
  float amt = 0.10 + 0.42 * gust * (0.4 + 0.6 * swell) + flutter;
  return vec2(0.86, 0.38) * amt;
}
`;

export const grassVertex = /* glsl */ `
uniform float uTime;
uniform vec3 uPlayer;
#ifdef GRASS_SELF
uniform vec3 uSunDirV;
#endif
attribute vec3 aOffset;
attribute vec4 aParams;   // x: height, y: yaw, z: seed, w: width
varying float vH;
varying float vSeed;
varying float vAcross;
varying float vVis;
varying float vHead;
varying vec3 vWorld;
varying vec3 vBase;
varying vec3 vN;
varying float vClump;
${windGLSL}
${curvesGLSL}
${lightGLSL}
// The meadow is drawn as nested tiles of blades that wrap around the walker: a dense
// tile of fine blades underfoot, the main tile, and a wide tile of coarse tufts that
// carries the grass out toward the hills. Each material sets its own radius.
const float R = GRASS_R;
// 0 = bare ground, 1 = full-height meadow
float grassFactor(vec2 w){
  vec2 d = w - vec2(${CABIN.x.toFixed(2)}, ${CABIN.z.toFixed(2)});
  float lx = ${Math.cos(CABIN.yaw).toFixed(5)} * d.x - ${Math.sin(CABIN.yaw).toFixed(5)} * d.y;
  float lz = ${Math.sin(CABIN.yaw).toFixed(5)} * d.x + ${Math.cos(CABIN.yaw).toFixed(5)} * d.y;
  if (abs(lx) < 2.7 && lz > -3.6 && lz < 6.0) return 0.0;
  float dF = distance(w, vec2(${CAMP.fire.x.toFixed(2)}, ${CAMP.fire.z.toFixed(2)}));
  float dT = distance(w, vec2(${CAMP.tent.x.toFixed(2)}, ${CAMP.tent.z.toFixed(2)}));
  if (dF < 1.9 || dT < 2.3) return 0.0;
  if (w.y < -30.0) {
    // nothing grows in the water or on the pebbles beside it
    float sd = abs(w.x - streamX(w.y)) - streamW(w.y);
    if (sd < 0.5) return 0.0;
  }
  float f = 0.28 + 0.72 * min(smoothstep(2.2, 7.7, dF), smoothstep(2.6, 6.1, dT));
  f *= 0.46 + 0.54 * smoothstep(58.0, 72.0, distance(w, vec2(0.0, 8.0)));
  vec2 g = abs(w - vec2(${GARDEN.x.toFixed(1)}, ${GARDEN.z.toFixed(1)})) - vec2(${GARDEN.hx.toFixed(1)}, ${GARDEN.hz.toFixed(1)});
  if (max(g.x, g.y) < 0.0) f *= 0.5;
  // keep the gravel walks clear
  vec2 gc = w - vec2(${GARDEN.x.toFixed(1)}, ${GARDEN.z.toFixed(1)});
  float gr = length(gc);
  if (abs(gr - 2.75) < 0.8 || abs(gr - 7.0) < 0.85 || (gr < 7.4 && min(abs(gc.x), abs(gc.y)) < 0.8)) return 0.0;
  // weeds only between the tulip rows; none on bare rock
  f *= 1.0 - 0.72 * tulipBed(w);
  f *= 1.0 - smoothstep(0.25, 0.6, rockMask(w));
  // the meadow grows tall and uneven: long where it is lush, cropped where it has dried
  f *= 0.70 + 0.60 * cnoise(w * 0.09 + 17.0);
  return f;
}
void main(){
  float h = position.y;
  float hs = aParams.x;
  float ws = aParams.w;
  vec3 base = aOffset;
#ifndef STATIC
  vec2 rel = mod(aOffset.xz - uPlayer.xz + R, 2.0 * R) - R;
  vec2 w = uPlayer.xz + rel;
  float len = length(rel);
  float far = clamp(len / R, 0.0, 1.0);
  float keep = 1.0 - smoothstep(R * 0.80, R * 0.98, len);
#ifdef GRASS_IN
  keep *= smoothstep(GRASS_IN * 0.55, GRASS_IN, len);
#endif
  if (keep < 0.02) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  hs *= (1.0 + far * GRASS_GROW) * keep * grassFactor(w);
  ws *= 1.0 + far * GRASS_WIDEN;
  if (hs < 0.02) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  base = vec3(w.x, terrainH(w) - 0.03, w.y);
  vBase = meadowColor(w, base.y);
#else
  vBase = meadowColor(aOffset.xz * 3.0, 0.0);
#endif
  // Grass grows in clumps a hand or two across and in patches a few metres wide: blades of
  // one clump share their height, their lean and their tint. Without this every blade is
  // its own dice roll and from above the meadow looks like an even pile carpet.
#ifndef STATIC
  vec2 cw = w;
#else
  vec2 cw = aOffset.xz * 3.0;
#endif
  float clump = cnoise(cw * 1.6 + 7.0);
  float meadowPatch = cnoise(cw * 0.34 + 21.0);
  hs *= 0.62 + 0.55 * clump + 0.25 * (meadowPatch - 0.5);
  vec2 clumpLean = (vec2(cnoise(cw * 0.9 + 3.0), cnoise(cw * 0.9 + 41.0)) - 0.5) * 0.9;
  vClump = clump * 0.6 + meadowPatch * 0.4;
  // in winter the grass is beaten down and only its tips show through the snow
  hs *= 1.0 - 0.58 * uSeason.w;
  float c = cos(aParams.y);
  float s = sin(aParams.y);
  vec2 across = vec2(c, s);
  vec2 facing = vec2(-s, c);
  // one blade in a dozen is a flowering stem: thin, taller, with a seed head at the top
#ifdef GRASS_HEADS
  float head = step(0.915, fract(aParams.z * 9.17)) * (1.0 - uSeason.w);
#else
  float head = 0.0;          // far tufts are too coarse to carry seed heads
#endif
  hs *= 1.0 + 0.55 * head;
  // each instance is a card four blade-widths across; the fragment shader cuts three
  // slender blades (or two and a flowering stalk) out of it
  float px = position.x * ws * 4.0;
  // every blade arcs over under its own weight, each to its own degree
  float arc = (0.22 + 0.55 * fract(aParams.z * 3.71)) * (1.0 - 0.6 * head);
  float k = h * h * hs;
  vec3 p = vec3(across.x * px, h * hs, across.y * px);
  p.xz += facing * arc * k;
  vec2 wind = windBend(base.xz, aParams.z, uTime) + clumpLean * 0.35;
  p.xz += wind * k * (1.0 + 0.5 * head);
  float bent = arc + dot(wind, facing);
  p.y -= (0.10 + 0.30 * abs(bent)) * k * h;
  vec3 world = base + p;
  // the surface normal leans back as the blade arcs forward; that is what makes a gust
  // run across the meadow as a band of light
  vN = normalize(vec3(facing.x, 0.55 + 1.6 * abs(bent) * h, facing.y) * vec3(1.0 - h * 0.5, 1.0, 1.0 - h * 0.5));
  vH = h;
  vSeed = aParams.z;
  vAcross = position.x * 2.0;
  vHead = head;
  vVis = sunShadowLite(base + vec3(0.0, 0.25, 0.0)) * cloudShade(base.xz, uTime);
#ifdef GRASS_SELF
  // the clumps between a blade and the sun shade its lower part (blades are not in the shadow
  // map: this reads the same clump field that sets their heights, a little way toward the sun)
  {
    vec2 sd = normalize(uSunDirV.xz + vec2(1e-5));
    float fall = clamp(0.30 / max(uSunDirV.y, 0.12), 0.0, 2.5);
    float up = cnoise((cw + sd * fall * 0.4) * 1.6 + 7.0);
    vVis *= 1.0 - 0.62 * smoothstep(0.25, 0.80, up) * (1.0 - h) * (1.0 - 0.6 * uSeason.w);
  }
#endif
  vWorld = world;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`;

export const grassFragment = /* glsl */ `
uniform vec3 uAuroraTint;
uniform vec3 uAmb;
uniform vec3 uSunCol;
uniform vec3 uSunDir;
uniform float uDay;
uniform vec4 uSeason;
uniform vec3 uCabinLight;
uniform vec4 uFireLight;
uniform vec4 uLampLight;
uniform vec3 uFogColor;
uniform float uFogDensity;
varying float vH;
varying float vSeed;
varying float vAcross;
varying float vVis;
varying float vHead;
varying vec3 vWorld;
varying vec3 vBase;
varying vec3 vN;
varying float vClump;
void main(){
  // ---- three blades cut from the card: each its own height, lean, width and tint
  float bestD = -1.0, bAcross = 0.0, bTone = 0.5, bU = 0.0, bHead = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float r1 = fract(vSeed * (13.7 + 7.3 * fi) + 0.37 * fi);
    float r2 = fract(vSeed * (29.1 + 11.9 * fi) + 0.11 * fi);
    bool mid = i == 1;
    float top = mid ? 1.0 : mix(0.55 + 0.40 * r1, 0.34 + 0.22 * r1, vHead);
    float u = vH / top;
    float c = (fi - 1.0) * 0.56 + (r2 - 0.5) * 0.14 + (r1 - 0.5) * 0.30 * u * u;
    float hw = 0.24 * (0.75 + 0.5 * r2) * (1.0 - 0.35 * u) * sqrt(max(1.0 - u * u, 0.0));
    float hd = 0.0;
    if (mid && vHead > 0.5) {
      // the flowering stem: a wire that swells into a feathery head
      float sw = exp(-pow((vH - 0.80) * 5.0, 2.0)) * (1.0 - smoothstep(0.93, 1.0, vH));
      hw = 0.045 + 0.17 * sw * (0.75 + 0.25 * sin(vH * 90.0));
      hd = 1.0;
    }
    float d = hw - abs(vAcross - c);
    if (d > bestD) { bestD = d; bAcross = clamp((vAcross - c) / max(hw, 0.02), -1.0, 1.0); bTone = r2; bU = u; bHead = hd; }
  }
  float aa = max(fwidth(vAcross), 0.0001);
  float cover = clamp(bestD / aa + 0.5, 0.0, 1.0);
#ifdef A2C
  if (cover < 0.04) discard;
#else
  if (cover < 0.5) discard;
  cover = 1.0;
#endif
  // the blade takes the colour of its patch of meadow: dark at the root, lighter and
  // yellower toward the tip, and now and then a blade that has dried to straw
  float tone = (0.70 + 0.60 * fract(vSeed * 7.31)) * (0.86 + 0.28 * bTone) * (0.82 + 0.36 * vClump);
  vec3 tip = mix(vBase * 1.50, vBase * vec3(2.0, 1.65, 1.05) + vec3(0.014, 0.010, 0.0), vSeed * vSeed * vSeed * vSeed);
  float up = clamp(0.35 * vH + 0.65 * bU, 0.0, 1.0);     // how far up its own blade this point is
  vec3 albedo = mix(vBase * 0.30, tip, up) * tone;
  // some clumps are a little yellower, some bluer: a patchwork you see from the hill
  albedo *= mix(vec3(0.92, 1.0, 1.06), vec3(1.10, 1.02, 0.84), smoothstep(0.35, 0.75, vClump));
  // seed heads are buff and feathery
  float inHead = bHead * smoothstep(0.62, 0.78, vH);
  albedo = mix(albedo, vec3(0.120, 0.098, 0.050) * (0.8 + 0.4 * fract(vSeed * 31.0)), inHead * 0.85);
  // hoar frost on what still stands in winter
  albedo = mix(albedo, vec3(0.58, 0.63, 0.70), uSeason.w * smoothstep(0.15, 0.9, vH) * 0.85);

  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  vec3 toCam = cameraPosition - vWorld;
  float dist = length(toCam);
  vec3 V = toCam / dist;
  float nl = dot(N, uSunDir);
  float wrap = clamp(nl * 0.5 + 0.5, 0.0, 1.0);
  float through = pow(clamp(-nl, 0.0, 1.0), 1.5);          // sun shining through the blade from behind
  vec3 light = uAmb * 0.88 * (0.3 + 0.7 * vH) * mix(vec3(1.0), vec3(0.84, 0.91, 1.06), (1.0 - vVis) * uDay) + uAuroraTint * (0.12 + 0.85 * vH * vH)
    + uSunCol * (0.16 + 0.84 * vH) * (0.25 + 0.75 * wrap) * vVis;
  // a blade is a shallow V: darker along the midrib, brighter at one edge
  float rib = 1.0 - 0.30 * exp(-bAcross * bAcross * 7.0) * (1.0 - bHead);
  float side = 0.84 + 0.26 * bAcross * (bTone - 0.5) * 2.0;
  // each blade is turned a little differently on its root, so the three do not shade as one sheet
  N = normalize(N + vec3(N.z, 0.0, -N.x) * (bTone - 0.5) * 1.1 + vec3(0.0, (bTone - 0.5) * 0.5, 0.0));
  vec3 col = albedo * light * rib * side;
  float back = pow(max(dot(-V, uSunDir), 0.0), 2.0);
  col += albedo * uSunCol * vec3(0.9, 1.0, 0.45) * (0.10 + 0.50 * back + 0.45 * through) * vH * vH * vVis;
  // the waxy upper face glints where it tips toward the light
  col += uSunCol * pow(max(dot(N, normalize(uSunDir + V)), 0.0), 22.0) * 0.045 * vH * vVis * (1.0 - bHead);
  vec3 lc = uCabinLight - vWorld;
  float below = smoothstep(-0.2, 0.6, uCabinLight.y - vWorld.y);
  col += albedo * vec3(1.0, 0.52, 0.16) * below * (1.0 - 0.9 * uDay) * 30.0 / (1.0 + dot(lc, lc) * 0.55);
  vec3 lf = uFireLight.xyz - vWorld;
  col += albedo * vec3(1.0, 0.44, 0.12) * uFireLight.w * (1.0 - 0.6 * uDay) * (0.4 + 0.6 * vH) * 12.0 / (1.0 + dot(lf, lf) * 0.45);
  vec3 ll = uLampLight.xyz - vWorld;                                     // the bench lantern: a small warm pool
  col += albedo * vec3(1.0, 0.62, 0.26) * uLampLight.w * (0.5 + 0.5 * vH) * 4.0 / (1.0 + dot(ll, ll) * 1.6);
  float fog = 1.0 - exp(-dist * dist * uFogDensity * uFogDensity);
  col = mix(col, uFogColor, fog);
  gl_FragColor = vec4(col, cover);
}
`;

// Ambient fireflies drifting above the meadow.
export const fireflyVertex = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
uniform float uScale;
uniform float uDay;
attribute vec4 aSeed;     // phase, speed, radius, blink
varying float vA;
void main(){
  float t = uTime * aSeed.y + aSeed.x * 6.283;
  vec3 p = position + vec3(sin(t) * aSeed.z, sin(t * 1.7 + aSeed.x * 9.0) * 0.35, cos(t * 0.8 + aSeed.w * 5.0) * aSeed.z);
  vA = pow(0.5 + 0.5 * sin(uTime * (0.6 + aSeed.w) + aSeed.x * 20.0), 3.0) * (1.0 - uDay);
  vec4 mv = viewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(uScale * uPixelRatio * 0.24 / -mv.z, 1.5, 28.0);
}
`;

export const fireflyFragment = /* glsl */ `
varying float vA;
void main(){
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(p, p);
  float a = (exp(-r2 * 12.0) + exp(-r2 * 3.0) * 0.28) * vA;
  gl_FragColor = vec4(vec3(0.78, 1.0, 0.36) * 1.7 * a, 1.0);
}
`;
