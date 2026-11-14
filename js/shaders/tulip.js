// Flower shader. Every petal and leaf is a smooth curved strip carrying UVs:
// the silhouette (rounded petal tip, pointed leaf) is cut per pixel, so no polygon
// edges show; the surface gets a throat-to-rim gradient, veins, wrap lighting,
// and light glowing through the petal when the sun is behind it.
import { lightGLSL } from './light.js';

const windGLSL = /* glsl */ `
// A gust runs across the bed as a wave, but no two stems answer it at the same instant: a
// tall thin one is late and swings far, a stiff short one hardly moves. Each stem has its
// own stiffness (how late and how much) and its own natural sway, so the bed ripples
// instead of nodding all together.
vec2 windBend(vec2 wp, float seed, float t){
  float lag = fract(seed * 17.31) * 1.1;
  float stiff = 0.65 + 0.70 * fract(seed * 5.77);
  float gust = sin(wp.x * 0.12 + (t - lag) * 0.9 + sin(wp.y * 0.10 + t * 0.3) * 2.0) * 0.5 + 0.5;
  float swell = sin(wp.x * 0.031 - wp.y * 0.045 + t * 0.35) * 0.5 + 0.5;
  float own = 1.7 + 1.5 * fract(seed * 9.13);
  float flutter = sin(t * own + seed * 40.0 + wp.x * 1.7) * (0.035 + 0.05 * gust);
  vec2 dir = normalize(vec2(0.86, 0.38) + vec2(0.0, (fract(seed * 3.3) - 0.5) * 0.5));
  return dir * (0.06 + 0.26 * gust * (0.4 + 0.6 * swell)) / stiff + vec2(-0.38, 0.86) * flutter * 0.6 + vec2(0.86, 0.38) * flutter;
}
`;

export const tulipVertex = /* glsl */ `
uniform float uTime;
uniform float uDay;
uniform float uGrow;      // 0 = not up this season .. 1 = full size
uniform vec4 uTint;       // rgb + amount: recolours the petals (roses become winter camellias)
uniform vec3 uSunDir;
attribute vec3 aOffset;
attribute vec3 aParams;   // x: height, y: yaw, z: seed
attribute vec3 aColor;
attribute vec2 aInfo;     // x: 0 leaf/stem, 1 tulip petal, 2 seed disc, 3 rose petal, 4 ray petal, 5 yellow disc; y: how much it opens
attribute vec2 aUv;       // x: across the petal (-1..1, 0 = no cut-out), y: base to tip
varying vec3 vCol;
varying vec3 vN;
varying vec3 vWorld;
varying vec2 vUv;
varying float vKind;
varying float vY;
varying float vSeed;
varying float vVis;
${windGLSL}
${lightGLSL}
void main(){
  if (uGrow < 0.03) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
#ifdef LOD_NEAR
  if (distance(aOffset.xz, cameraPosition.xz) > LOD_NEAR) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
#endif
#ifdef LOD_FAR
  if (distance(aOffset.xz, cameraPosition.xz) <= LOD_FAR) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
#endif
  vec3 p = position;
  // most blooms stay goblets by day; one here and there has opened wide to the sun
  float open = mix(0.42, 0.80 + 0.55 * aParams.z * aParams.z * aParams.z, uDay);
  // and no bloom opens evenly: one side of the cup spreads further than the other
  float lop = 1.0 + 0.16 * sin(atan(position.z, position.x) * 2.0 + aParams.z * 25.0) + 0.08 * sin(atan(position.z, position.x) * 3.0 + aParams.z * 61.0);
  p.xz *= mix(1.0, open * lop, aInfo.y);
  float c = cos(aParams.y);
  float s = sin(aParams.y);
  float size = aParams.x * uGrow;
  p = vec3(c * p.x - s * p.z, p.y, s * p.x + c * p.z) * size;
  vN = vec3(c * normal.x - s * normal.z, normal.y, s * normal.x + c * normal.z);
  float k = position.y * position.y * size;
  // No two stems stand alike: each leans its own way and curves as it rises (most a little,
  // one in a few a lot), and each nods to its own slow rhythm on top of the wind.
  float la = aParams.z * 37.0;
  vec2 lean = vec2(cos(la), sin(la));
  float much = fract(aParams.z * 13.7);
  vec2 bend = windBend(aOffset.xz, aParams.z, uTime)
    + lean * (0.05 + 0.34 * much * much)
    + lean.yx * vec2(1.0, -1.0) * (sin(uTime * (0.6 + fract(aParams.z * 7.0)) + aParams.z * 30.0) * 0.024 + (fract(aParams.z * 5.3) - 0.5) * 0.16);
  // The stem is a curve, and whatever grows on it turns with it: a point out to one side of
  // the axis is carried down or up by the slope of the stem at its height, so a bloom on a
  // leaning stem faces the way the stem leans instead of staying level.
  vec2 slope = bend * 2.0 * position.y;
  p.y -= dot(p.xz, slope) + 0.5 * dot(bend, bend) * k * position.y;
  p.xz += bend * k;
  vN = normalize(vN + vec3(slope.x, 0.0, slope.y) * vN.y - vec3(0.0, dot(vN.xz, slope), 0.0));
  if (aInfo.x > 0.5) p += vec3(normal.x, 0.0, normal.z) * sin(uTime * 2.3 + aParams.z * 50.0 + position.y * 26.0) * 0.0022 * aUv.y * size;
  vec3 world = aOffset + p;
  vCol = aInfo.x > 2.5 && aInfo.x < 3.5 ? mix(aColor, uTint.rgb, uTint.a) : aColor;
  vUv = aUv;
  vKind = aInfo.x;
  vY = position.y;
  vSeed = aParams.z;
#ifdef DEPTH_ONLY
  vVis = 1.0;
#else
  // flowers stand in the shadow map themselves: look from just sunward of this point, so a
  // petal is shaded by its neighbours and by the cabin, not by itself
  vVis = sunShadow(world + uSunDir * 0.16) * cloudShade(aOffset.xz, uTime);
#endif
  vWorld = world;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`;

export const tulipFragment = /* glsl */ `
uniform float uTime;
uniform float uDay;
uniform vec3 uAmb;
uniform vec3 uSunCol;
uniform vec3 uSunDir;
uniform vec3 uAuroraTint;
uniform vec3 uCabinLight;
uniform vec4 uFireLight;
uniform vec3 uFogColor;
uniform float uFogDensity;
varying vec3 vCol;
varying vec3 vN;
varying vec3 vWorld;
varying vec2 vUv;
varying float vKind;
varying float vY;
varying float vSeed;
varying float vVis;
float fhash(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float fnoise(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(fhash(i), fhash(i + vec2(1.0, 0.0)), f.x), mix(fhash(i + vec2(0.0, 1.0)), fhash(i + vec2(1.0, 1.0)), f.x), f.y);
}
void main(){
  float u = vUv.x;
  float v = vUv.y;
  float au = abs(u);
  bool rose = vKind > 2.5 && vKind < 3.5;
  bool ray = vKind > 3.5 && vKind < 4.5;
  bool petal = (vKind > 0.5 && vKind < 1.5) || rose || ray;
  bool disc = (vKind > 1.5 && vKind < 2.5) || vKind > 4.5;

  // per-pixel outline: tulip petals swell from a narrow claw to a rounded tip, rose petals are
  // broad with a blunt, slightly notched lip, leaves taper to a point
  float alpha = 1.0;
  if (au > 0.001 && !disc) {
    float w;
    if (ray) {
      // the strap of a sunflower or daisy ray: parallel-sided, then drawn to a point
      w = mix(0.50, 1.0, smoothstep(0.0, 0.25, v)) * sqrt(max(1.0 - pow(max(v - 0.42, 0.0) / 0.58, 1.7), 0.0));
    } else if (rose) {
      w = mix(0.50, 1.0, smoothstep(0.0, 0.22, v)) * sqrt(max(1.0 - pow(max(v - 0.74, 0.0) / 0.26, 2.2), 0.0));
      w *= 1.0 - 0.10 * exp(-u * u * 18.0) * smoothstep(0.80, 1.0, v);                        // the notch at the lip
      w *= 1.0 + 0.030 * sin(v * 23.0 + vSeed * 40.0) * smoothstep(0.4, 1.0, v);
    } else if (petal) {
      w = mix(0.30, 1.0, smoothstep(0.0, 0.32, v)) * sqrt(max(1.0 - pow(max(v - 0.58, 0.0) / 0.42, 2.0), 0.0));
      w *= 1.0 + 0.045 * sin(v * 31.0 + vSeed * 40.0) * smoothstep(0.35, 1.0, v);            // ruffled rim
    } else {
      w = mix(0.25, 1.0, smoothstep(0.0, 0.25, v)) * pow(max(1.0 - v, 0.0), 0.55);
    }
    // the cut is as crisp as the pixels allow: razor-edged close up, soft only far away
    float ew = clamp(fwidth(au) * 1.6, 0.006, 0.10);
    alpha = 1.0 - smoothstep(w - ew, w, au);
    if (alpha < 0.02) discard;
  }

  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  vec3 toCam = cameraPosition - vWorld;
  float dist = length(toCam);
  vec3 V = toCam / dist;
  vec3 L = uSunDir;
  float vBump = 0.0;
  float closeUp = 1.0 - smoothstep(2.5, 7.0, dist);        // fine surface detail only where it can be seen

  vec3 albedo;
  float thin = 0.0;                       // how much light passes through
  if (ray) {
    // warm and deep at the base, clear toward the tip, with the two long folds every ray has
    albedo = vCol * vec3(0.25, 0.23, 0.25) * mix(vec3(0.86, 0.60, 0.40), vec3(1.0), smoothstep(0.0, 0.6, v));
    float fold = exp(-pow((au - 0.36) * 9.0, 2.0));
    albedo *= 1.0 - 0.13 * fold * (1.0 - 0.5 * v);
    albedo *= 0.94 + 0.10 * fnoise(vec2(u * 3.0 + vSeed * 30.0, v * 4.0));
    vBump = sign(u) * (fold * 0.30 - exp(-u * u * 30.0) * 0.12);
    thin = 0.40;
  } else if (rose) {
    // velvet: deep colour in the heart, paling toward the lip, hardly any veining
    float grad = mix(0.42, 1.10, smoothstep(0.0, 0.95, v));
    albedo = vCol * 0.30 * grad;
    albedo = mix(albedo * 0.35, albedo, smoothstep(0.0, 0.30, v));
    float veins = cos(u * 11.0 + sin(v * 5.0 + vSeed * 20.0) * 0.9);
    albedo *= 0.992 + 0.008 * veins * smoothstep(0.2, 0.8, v);
    albedo += vCol * 0.045 * smoothstep(0.80, 1.0, v);
    float mott = fnoise(vec2(u * 4.0 + vSeed * 30.0, v * 6.0));
    albedo *= 0.95 + 0.08 * mott;
    // the heart of the bloom holds a warmer, deeper tone than the open lips
    albedo = mix(albedo * vec3(1.06, 0.94, 0.86), albedo, smoothstep(0.0, 0.7, v));
    vBump = -sin(u * 11.0 + sin(v * 5.0 + vSeed * 20.0) * 0.9) * 0.04 * smoothstep(0.2, 0.8, v);
    thin = 0.55;
  } else if (petal) {
    // a tulip tepal: satin, deepest in colour low down, a pale blotch at the very base,
    // fine parallel veins running to the tip, the rim thin enough to glow
    float grad = mix(0.62, 1.06, smoothstep(0.05, 0.95, v));
    albedo = vCol * 0.30 * grad;
    vec3 blotch = mix(vec3(0.16, 0.15, 0.05), vec3(0.20, 0.19, 0.15), vSeed);
    albedo = mix(blotch, albedo, smoothstep(0.02, 0.20, v + 0.04 * sin(u * 9.0)));
    float vp = u * 44.0 + sin(v * 5.0 + vSeed * 20.0) * 0.5;
    float fineVeins = cos(vp);
    albedo *= 1.0 - 0.06 * (0.5 - 0.5 * fineVeins) * smoothstep(0.1, 0.5, v) * (0.3 + 0.7 * closeUp) * (1.0 - smoothstep(0.3, 0.8, fwidth(vp)));
    albedo *= 1.0 - 0.10 * exp(-u * u * 60.0) * (1.0 - v * 0.6);                              // midrib groove
    float mott = fnoise(vec2(u * 3.0 + vSeed * 30.0, v * 5.0));
    albedo *= 0.92 + 0.14 * mott;
    // some varieties are feathered: a paler flame licking up from the base
    float flame = step(0.80, fract(vSeed * 5.37)) * smoothstep(0.55, 0.15, au + 0.25 * fnoise(vec2(u * 6.0, v * 14.0 + vSeed * 9.0))) * smoothstep(0.9, 0.2, v);
    albedo = mix(albedo, albedo * 0.5 + vec3(0.20, 0.17, 0.10), flame * 0.55);
    albedo += vCol * 0.035 * smoothstep(0.75, 1.0, max(au, v));                               // paler, thinner rim
    vBump = -sin(vp) * 0.07 * closeUp * smoothstep(0.1, 0.5, v);
    vBump += exp(-u * u * 60.0) * sign(u) * 0.22 * (1.0 - v * 0.6);
    thin = 0.70 + 0.25 * smoothstep(0.6, 1.0, au);
  } else if (disc) {
    // the seed head: hundreds of florets on two families of spirals crossing each other
    // (21 one way, 34 the other), dark and tight at the centre, open and dusted with
    // pollen in a ring toward the rim
    float r = length(vUv);
    float a = atan(vUv.y, vUv.x);
    float lr = log(max(r, 0.03));
    float seeds = sin(a * 21.0 + lr * 34.0) * sin(a * 34.0 - lr * 21.0);
    // each floret is a soft bump, not a square: no checkerboard
    float floret = smoothstep(-0.9, 0.9, seeds) * (0.55 + 0.45 * closeUp) + 0.5 * (0.45 - 0.45 * closeUp);
    if (vKind > 4.5) {
      albedo = mix(vec3(0.20, 0.13, 0.012), vec3(0.42, 0.33, 0.035), floret) * (0.7 + 0.5 * r);
    } else {
      vec3 heart = mix(vec3(0.050, 0.060, 0.016), vec3(0.090, 0.085, 0.022), floret);          // unopened, greenish
      vec3 body = mix(vec3(0.018, 0.011, 0.005), vec3(0.085, 0.048, 0.016), floret);
      vec3 ring = mix(vec3(0.075, 0.042, 0.010), vec3(0.200, 0.118, 0.022), floret);            // florets in bloom
      albedo = mix(heart, body, smoothstep(0.10, 0.30, r));
      albedo = mix(albedo, ring, smoothstep(0.55, 0.78, r) * (1.0 - smoothstep(0.92, 1.0, r)));
    }
    vBump = (floret - 0.5) * 0.5 * closeUp;
  } else {
    // glaucous green, with the faint grey bloom such leaves carry
    albedo = mix(vec3(0.018, 0.050, 0.024), vec3(0.058, 0.128, 0.058), clamp(v * 0.8 + vSeed * 0.25, 0.0, 1.0));
    albedo = mix(albedo, vec3(0.085, 0.115, 0.095), 0.22 * fnoise(vec2(u * 2.0 + vSeed * 7.0, v * 3.0)));
    albedo += vec3(0.020, 0.040, 0.008) * exp(-u * u * 70.0) * step(0.001, au);               // midrib
    float lv = sin(au * 30.0 - v * 22.0);                                                     // side veins sweeping to the tip
    albedo *= 1.0 - 0.11 * lv * closeUp * step(0.001, au) * (1.0 - smoothstep(0.5, 1.2, fwidth(au * 30.0 - v * 22.0)));
    vBump = lv * 0.12 * closeUp * sign(u) * step(0.001, au);
    thin = 0.45;
  }

  // tilt the normal sideways along the veins (cheap bump)
  N = normalize(N + normalize(cross(N, vec3(0.0, 1.0, 0.001))) * vBump);
  float nl = dot(N, L);
  float diff = clamp(nl * 0.72 + 0.28, 0.0, 1.0);
  float through = pow(clamp(-nl, 0.0, 1.0), 1.4) * thin;
  float sky = 0.55 + 0.45 * N.y;
  float ao = mix(0.42, 1.0, smoothstep(0.0, 0.55, vY));           // darker down among the stems
  if (rose) ao *= mix(0.45, 1.0, smoothstep(0.0, 0.6, v));        // and deep between the petals
  else if (petal) ao *= mix(0.62, 1.0, smoothstep(0.0, 0.55, v)); // the shaded well of the cup
  vec3 light = uAmb * sky * ao
    + uSunCol * (diff * 0.95 + through * 0.85) * ao * vVis
    + uAuroraTint * (0.25 + 0.65 * max(N.y, 0.0));
  vec3 col = albedo * light;
  // soft sheen where the waxy surface catches the sun; a rose is velvet and glows at grazing angles instead
  vec3 H = normalize(L + V);
  float nh = max(dot(N, H), 0.0);
  // satin: a broad soft sheen with a tighter glint inside it
  col += uSunCol * (pow(nh, 9.0) * 0.030 + pow(nh, 48.0) * 0.050) * (rose ? 0.25 : 1.0) * (petal ? 1.0 : 0.7) * vVis;
  if (rose) col += albedo * (uAmb + uSunCol * 0.5 * vVis) * pow(1.0 - abs(dot(N, V)), 2.5) * 0.9;

  // morning dew: a few beads sitting on petals and leaves, each a tiny lens with one glint
  if (uDay > 0.01 && closeUp > 0.01 && !disc && au > 0.001) {
    vec2 cell = vec2(u * 3.2, v * (petal ? 11.0 : 15.0)) + vSeed * 13.0;
    vec2 id = floor(cell);
    float pick = fhash(id + 3.7);
    if (pick > 0.90) {
      vec2 c = vec2(0.3 + 0.4 * fhash(id), 0.3 + 0.4 * fhash(id + 9.1));
      vec2 q = fract(cell) - c;
      float rr = 0.10 + 0.13 * fhash(id + 5.3);
      float dd = length(q) / rr;
      float bead = (1.0 - smoothstep(0.82, 1.0, dd)) * closeUp * uDay;
      // darker toward the sun side, a bright crescent on the far side where it focuses the light
      float lens = mix(0.78, 1.30, smoothstep(-0.7, 0.9, q.y / rr));
      float tw = 0.75 + 0.25 * sin(uTime * 1.3 + pick * 60.0);
      vec2 gq = (q - vec2(-0.32, 0.36) * rr) / rr;
      float glint = exp(-dot(gq, gq) * 60.0) * tw;
      col = mix(col, col * lens, bead);
      col += (uSunCol * vVis + uAmb) * glint * bead * 0.8;
    }
  }
  if (petal) col *= mix(0.55, 1.0, uDay);                          // colours sleep at night

  vec3 lc = uCabinLight - vWorld;
  col += albedo * vec3(1.0, 0.52, 0.16) * (1.0 - 0.9 * uDay) * 26.0 / (1.0 + dot(lc, lc) * 0.55);
  vec3 lf = uFireLight.xyz - vWorld;
  col += albedo * vec3(1.0, 0.44, 0.12) * uFireLight.w * (1.0 - 0.6 * uDay) * 11.0 / (1.0 + dot(lf, lf) * 0.45);

  float fog = 1.0 - exp(-dist * dist * uFogDensity * uFogDensity);
  col = mix(col, uFogColor, fog);
  gl_FragColor = vec4(col, alpha);
}
`;

// What a flower writes into the sun's shadow map: its depth, cut to the same outlines.
export const flowerDepthFragment = /* glsl */ `
#include <packing>
varying vec2 vUv;
varying float vKind;
void main(){
  float au = abs(vUv.x);
  float v = vUv.y;
  bool disc = (vKind > 1.5 && vKind < 2.5) || vKind > 4.5;
  if (au > 0.001 && !disc) {
    float w;
    if (vKind > 3.5) w = mix(0.50, 1.0, smoothstep(0.0, 0.25, v)) * sqrt(max(1.0 - pow(max(v - 0.42, 0.0) / 0.58, 1.7), 0.0));
    else if (vKind > 2.5) w = mix(0.50, 1.0, smoothstep(0.0, 0.22, v)) * sqrt(max(1.0 - pow(max(v - 0.74, 0.0) / 0.26, 2.2), 0.0));
    else if (vKind > 0.5) w = mix(0.30, 1.0, smoothstep(0.0, 0.32, v)) * sqrt(max(1.0 - pow(max(v - 0.58, 0.0) / 0.42, 2.0), 0.0));
    else w = mix(0.25, 1.0, smoothstep(0.0, 0.25, v)) * pow(max(1.0 - v, 0.0), 0.55);
    if (au > w) discard;
  }
  gl_FragColor = packDepthToRGBA(gl_FragCoord.z);
}
`;

// Butterflies over the beds by day: a point each, its two wings drawn and beaten in the shader.
export const butterflyVertex = /* glsl */ `
uniform float uTime;
uniform float uDay;
uniform float uPixelRatio;
uniform float uScale;
attribute vec4 aSeed;     // phase, speed, range, height
attribute vec3 aColor;
varying vec3 vColor;
varying float vFlap;
varying float vA;
void main(){
  float t = uTime * (0.25 + aSeed.y * 0.35) + aSeed.x * 40.0;
  // a wandering loop that never quite repeats, with the little hops of a butterfly's flight
  vec3 p = position;
  p.x += (sin(t) + 0.5 * sin(t * 2.3 + 1.0)) * aSeed.z;
  p.z += (cos(t * 0.8) + 0.5 * sin(t * 1.9 + 2.0)) * aSeed.z;
  p.y += 0.25 * sin(t * 1.7) + 0.06 * sin(uTime * 9.0 + aSeed.x * 20.0) + aSeed.w;
  // it settles on a flower now and then, wings slowly opening and closing
  float rest = smoothstep(0.80, 0.90, sin(t * 0.37 + aSeed.x * 9.0));
  p.y -= rest * (0.25 * sin(t * 1.7) + aSeed.w * 0.6);
  vFlap = abs(sin(uTime * mix(17.0, 2.2, rest) + aSeed.x * 30.0));
  vColor = aColor;
  vA = uDay;
  vec4 mv = viewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uDay < 0.05 ? 0.0 : clamp(uScale * uPixelRatio * 0.085 / -mv.z, 1.5, 46.0);
}
`;
export const butterflyFragment = /* glsl */ `
uniform vec3 uAmb;
uniform vec3 uSunCol;
varying vec3 vColor;
varying float vFlap;
varying float vA;
void main(){
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float open = 0.22 + 0.78 * vFlap;                 // wings seen folding toward edge-on
  vec2 q = vec2(abs(p.x) / open, p.y);
  if (q.x > 1.0) discard;
  // fore wing and hind wing as two overlapping lobes on each side of a thin body
  float fore = length((q - vec2(0.50, -0.22)) * vec2(1.0, 1.25));
  float hind = length((q - vec2(0.40, 0.38)) * vec2(1.25, 1.35));
  float wing = min(fore - 0.50, hind - 0.40);
  float body = max(abs(p.x) - 0.05, abs(p.y) - 0.55);
  if (wing > 0.0 && body > 0.0) discard;
  vec3 col = vColor * (0.55 + 0.45 * smoothstep(-0.35, 0.0, wing));     // paler toward the body
  col = mix(col, vec3(0.03, 0.025, 0.02), smoothstep(-0.07, 0.0, wing)); // dark margin
  if (body <= 0.0) col = vec3(0.03, 0.025, 0.02);
  gl_FragColor = vec4(col * (uAmb + uSunCol * 0.45) * vA, 1.0);
}
`;

// Blossom and foliage cards. A cherry crown is thousands of small quads, each a spray of
// flowers (or leaves), hung along the twigs. A card is not turned at random: it faces mostly
// outward from the middle of its crown (aNrm), as real sprays turn to the light, and every
// spray is drawn as two cards crossing, so from any side there is no gap to see through.
// uLeaf slides the spray from blossom to leaf as spring turns to summer.
export const cardVertex = /* glsl */ `
uniform float uTime;
uniform float uScale;      // 0 in winter: bare branches
uniform float uLeaf;
attribute vec3 aOffset;
attribute vec4 aSeed;     // x: spin, y: size, z: tone, w: tilt
attribute float aShade;   // 0 deep inside the crown .. 1 out in the light
attribute vec3 aNrm;      // which way the spray faces (outward from the crown), or zero
varying vec2 vUv;
varying float vTone;
varying float vShade;
varying vec3 vWorld;
varying vec3 vN;
void main(){
  if (uScale < 0.03) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  float a = aSeed.x * 6.2831853;
  float tilt = (aSeed.w - 0.5) * 2.2;
  vec3 n0 = vec3(sin(a) * sin(tilt), cos(tilt), -cos(a) * sin(tilt));
  vec3 N = normalize(n0 + aNrm * 1.4);
  vec3 ref = abs(N.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 ax = normalize(cross(ref, N));
  vec3 ay = cross(N, ax);
  // turned in its own plane, so the flowers on neighbouring cards never line up
  float r = aSeed.z * 6.2831853;
  vec3 bx = ax * cos(r) + ay * sin(r), by = ay * cos(r) - ax * sin(r);
  vec3 p = (bx * position.x + by * position.y) * aSeed.y * uScale * (1.0 + 0.75 * uLeaf);   // leaves are bigger than flowers
  // the whole bough breathes with the wind, the sprays shiver on top of it, each on its own beat
  float bough = sin(uTime * 0.7 + aOffset.x * 0.35 + aOffset.z * 0.27);
  float shiver = sin(uTime * (2.0 + aSeed.w * 1.1) + aOffset.x * 3.1 + aSeed.z * 20.0);
  vec3 world = aOffset + p + vec3(bough * 0.050 + shiver * 0.012, shiver * 0.010, bough * 0.030);
  vUv = position.xy * 2.0;
  vTone = aSeed.z;
  vShade = aShade;
  vWorld = world;
  vN = N;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`;

export const cardFragment = /* glsl */ `
uniform float uLeaf;       // 0 blossom .. 1 foliage
uniform vec3 uColA;        // the season's two tones for this crown
uniform vec3 uColB;
uniform vec3 uAmb;
uniform vec3 uSunCol;
uniform vec3 uSunDir;
uniform vec3 uAuroraTint;
uniform vec3 uFogColor;
uniform float uFogDensity;
varying vec2 vUv;
varying float vTone;
varying float vShade;
varying vec3 vWorld;
varying vec3 vN;
float chash(float n){ return fract(sin(n * 91.3458) * 47453.5453); }
// One cherry flower: five petals, each notched at the tip, no two alike. Each petal has its
// own length and width, the flower is seen a little from the side (squashed), and the edge is
// cut as wide as a pixel, so a flower far off is a soft dot and not a jagged one.
// x: coverage, y: 0 at the heart .. 1 at the rim
vec2 flower(vec2 p, float r0, float rot, float seed){
  float sq = 0.72 + 0.28 * chash(seed + 3.1);
  float ca = cos(seed * 7.0), sa = sin(seed * 7.0);
  p = vec2(ca * p.x - sa * p.y, sa * p.x + ca * p.y);
  p.y /= sq;
  float r = length(p) / r0;
  float a = atan(p.y, p.x) + rot;
  float k = a * 0.795775 + 0.5;
  float idx = mod(floor(k), 5.0);
  float seg = abs(fract(k) - 0.5) * 2.0;      // 0 along a petal's middle, 1 between petals
  float len = 0.86 + 0.24 * chash(seed * 13.0 + idx);
  float wid = 0.85 + 0.30 * chash(seed * 7.0 + idx + 2.0);
  float s2 = min(seg / wid, 1.0);
  float rim = (0.40 + 0.60 * sqrt(max(1.0 - s2 * s2, 0.0))) * (1.0 - 0.14 * exp(-seg * seg * 40.0)) * len;
  float ew = clamp(fwidth(r) * 1.2, 0.02, 0.35);
  return vec2(1.0 - smoothstep(rim - ew, rim + ew * 0.3, r), r / max(rim, 0.01));
}
float leaf(vec2 p, float ang, float len){
  float c = cos(ang), s = sin(ang);
  vec2 q = vec2(c * p.x + s * p.y, -s * p.x + c * p.y);
  float t = q.x / len;
  if (t < 0.0 || t > 1.0) return 0.0;
  float w = 0.20 * sin(t * 3.14159) * (1.0 - 0.4 * t);
  float ew = clamp(fwidth(q.y) * 1.2, 0.01, 0.12);
  float vein = sin(t * 26.0 - abs(q.y) * 40.0);
  return (1.0 - smoothstep(w - ew, w + ew * 0.3, abs(q.y))) * (0.82 + 0.18 * smoothstep(0.0, 0.03, abs(q.y))) * (0.94 + 0.06 * vein);   // a darker midrib, faint side veins
}
void main(){
  vec2 p = vUv;
  float mLeaf = 0.0, mFlower = 0.0;
  vec3 leafCol = mix(uColA, uColB, vTone);
  vec3 flowerCol = leafCol;
  if (uLeaf > 0.01) {
    mLeaf = max(max(leaf(p + vec2(0.55, 0.1), 0.3, 0.9), leaf(p + vec2(0.1, 0.5), 1.5, 0.85)), leaf(p + vec2(0.2, -0.1), -0.9, 0.8));
  }
  if (uLeaf < 0.99) {
    // three flowers, sometimes four, placed a little differently on every card; flowers deep
    // in the crown are smaller, their petals not yet fully spread
    float sz = 0.84 + 0.16 * vShade;
    vec2 j = vec2(chash(vTone * 17.0), chash(vTone * 29.0)) - 0.5;
    vec2 c1 = p - vec2(-0.38, 0.30) - j * 0.16, c2 = p - vec2(0.40, 0.20) + j.yx * 0.16, c3 = p - vec2(0.02, -0.42) + j * 0.12;
    vec2 c4 = p - vec2(-0.48, -0.40) - j.yx * 0.10;
    vec2 f1 = flower(c1, 0.52 * sz, vTone * 6.0, vTone * 11.0 + 1.0);
    vec2 f2 = flower(c2, 0.48 * sz, vTone * 9.0 + 1.0, vTone * 11.0 + 2.0);
    vec2 f3 = flower(c3, 0.50 * sz, vTone * 4.0 + 2.0, vTone * 11.0 + 3.0);
    vec2 f = f1.x > f2.x ? f1 : f2;
    f = f3.x > f.x ? f3 : f;
    float d2 = min(min(dot(c1, c1), dot(c2, c2)), dot(c3, c3));
    if (chash(vTone * 41.0) > 0.55) {
      vec2 f4 = flower(c4, 0.30 * sz, vTone * 3.0, vTone * 11.0 + 4.0);      // a half-open one
      f = f4.x > f.x ? f4 : f;
      d2 = min(d2, dot(c4, c4) * 2.5);
    }
    mFlower = f.x;
    // near-white at the rim, a blush toward the heart, a ring of gold-tipped stamens
    vec3 rimCol = mix(uColB, vec3(0.86, 0.80, 0.82), 0.12);
    flowerCol = mix(mix(uColA, uColB, 0.3) * vec3(1.05, 0.70, 0.80), rimCol, smoothstep(0.05, 0.60, f.y));
    flowerCol *= 0.86 + 0.14 * smoothstep(0.0, 0.5, f.x);                 // petal edges sit a shade darker
    flowerCol *= 0.95 + 0.05 * sin(f.y * 30.0 + atan(p.y, p.x) * 3.0);     // fine veins running out to the rim
    flowerCol = mix(flowerCol, vec3(0.56, 0.22, 0.32), exp(-d2 * 150.0) * 0.55);
    flowerCol = mix(flowerCol, vec3(0.80, 0.62, 0.30), smoothstep(0.006, 0.002, abs(d2 - 0.012)) * 0.30);
  }
  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  vec3 toCam = cameraPosition - vWorld;
  float dist = length(toCam);
  vec3 V = toCam / dist;
  // a card seen edge-on would smear its flowers into streaks: it fades out, and the card
  // crossing it (which faces you there) carries the spray instead
  float m = mix(mFlower, mLeaf, uLeaf) * smoothstep(0.10, 0.32, abs(dot(N, V)));
  if (m < 0.03) discard;
  vec3 albedo = mix(flowerCol, leafCol * (0.80 + 0.20 * mLeaf), uLeaf);
  float nl = dot(N, uSunDir);
  // petals are thin: lit from behind they glow almost as much as from the front
  float lightAmt = clamp(nl * 0.5 + 0.5, 0.0, 1.0) + pow(clamp(-nl, 0.0, 1.0), 1.5) * 0.75;
  // deep in the crown little sky and less sun get through, and what does is filtered
  // green-brown by the twigs and the flowers in front
  float occ = 0.34 + 0.66 * vShade;
  vec3 inner = mix(vec3(0.80, 0.86, 0.80), vec3(1.0), vShade);
  vec3 col = albedo * inner * (uAmb * 0.95 * occ + uSunCol * lightAmt * 0.58 * occ * occ + uAuroraTint * 0.7);
  // looking up toward the sun through the crown, the outer petals glow warm pink
  float toward = pow(max(dot(-V, uSunDir), 0.0), 3.0);
  col += albedo * uSunCol * vec3(1.0, 0.78, 0.82) * toward * (0.35 - 0.20 * uLeaf) * vShade * vShade;
  col = mix(col, uFogColor, 1.0 - exp(-dist * dist * uFogDensity * uFogDensity));
  gl_FragColor = vec4(col, m);
}
`;

// What drifts down from the cherry trees: petals in spring, leaves in autumn. Each is a
// point that tumbles as it falls, seen edge-on half the time.
export const petalVertex = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
uniform float uScale;
uniform float uAmount;
attribute vec4 aSeed;
varying float vA;
varying float vSpin;
varying float vTone;
void main(){
  float life = fract(uTime * (0.040 + aSeed.y * 0.045) + aSeed.x);
  vec3 p = position;
  p.y -= life * (4.2 + aSeed.w);
  p.x += sin(life * 7.0 + aSeed.z * 30.0) * 0.7 + life * 2.0;
  p.z += cos(life * 5.0 + aSeed.w * 30.0) * 0.7 + life * 0.8;
  vA = smoothstep(0.0, 0.06, life) * (1.0 - smoothstep(0.88, 1.0, life)) * step(aSeed.z, uAmount);
  vSpin = uTime * (1.5 + aSeed.y * 3.0) + aSeed.x * 40.0;
  vTone = aSeed.w;
  vec4 mv = viewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = vA < 0.02 ? 0.0 : clamp(uScale * uPixelRatio * 0.060 / -mv.z, 1.0, 22.0);
}
`;
export const petalFragment = /* glsl */ `
uniform vec3 uColA;
uniform vec3 uColB;
uniform vec3 uAmb;
uniform vec3 uSunCol;
uniform vec3 uAuroraTint;
varying float vA;
varying float vSpin;
varying float vTone;
void main(){
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float c = cos(vSpin), s = sin(vSpin);
  q = vec2(c * q.x + s * q.y, -s * q.x + c * q.y);
  q.y /= 0.25 + 0.75 * abs(sin(vSpin * 0.63));          // turning over as it falls
  // a petal: an ellipse with a notch
  float r = length(q * vec2(1.0, 0.75));
  if (r > 1.0 - 0.25 * exp(-q.x * q.x * 20.0) * step(0.0, q.y) || vA < 0.02) discard;
  vec3 col = mix(uColA, uColB, vTone) * (uAmb + uSunCol * 0.6 + uAuroraTint);
  gl_FragColor = vec4(col, 1.0);
}
`;
