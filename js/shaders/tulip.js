// Flower shader. Every petal and leaf is a smooth curved strip carrying UVs:
// the silhouette (rounded petal tip, pointed leaf) is cut per pixel, so no polygon
// edges show; the surface gets a throat-to-rim gradient, veins, wrap lighting,
// and light glowing through the petal when the sun is behind it.
import { lightGLSL } from './light.js';

const windGLSL = /* glsl */ `
vec2 windBend(vec2 wp, float seed, float t){
  float gust = sin(wp.x * 0.12 + t * 0.9 + sin(wp.y * 0.10 + t * 0.3) * 2.0) * 0.5 + 0.5;
  float swell = sin(wp.x * 0.031 - wp.y * 0.045 + t * 0.35) * 0.5 + 0.5;
  float flutter = sin(t * 2.3 + seed * 40.0 + wp.x * 1.7) * 0.05;
  return vec2(0.86, 0.38) * (0.06 + 0.26 * gust * (0.4 + 0.6 * swell) + flutter);
}
`;

export const tulipVertex = /* glsl */ `
uniform float uTime;
uniform float uDay;
attribute vec3 aOffset;
attribute vec3 aParams;   // x: height, y: yaw, z: seed
attribute vec3 aColor;
attribute vec2 aInfo;     // x: 0 leaf/stem, 1 petal, 2 seed disc, 3 rose petal; y: how much it opens
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
#ifdef LOD_NEAR
  if (distance(aOffset.xz, cameraPosition.xz) > LOD_NEAR) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
#endif
#ifdef LOD_FAR
  if (distance(aOffset.xz, cameraPosition.xz) <= LOD_FAR) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
#endif
  vec3 p = position;
  // most blooms stay goblets by day; one here and there has opened wide to the sun
  float open = mix(0.42, 0.80 + 0.55 * aParams.z * aParams.z * aParams.z, uDay);
  p.xz *= mix(1.0, open, aInfo.y);
  float c = cos(aParams.y);
  float s = sin(aParams.y);
  p = vec3(c * p.x - s * p.z, p.y, s * p.x + c * p.z) * aParams.x;
  vN = vec3(c * normal.x - s * normal.z, normal.y, s * normal.x + c * normal.z);
  float k = position.y * position.y * aParams.x;
  p.xz += windBend(aOffset.xz, aParams.z, uTime) * k;
  vec3 world = aOffset + p;
  vCol = aColor;
  vUv = aUv;
  vKind = aInfo.x;
  vY = position.y;
  vSeed = aParams.z;
  vVis = sunShadow(aOffset + vec3(0.0, 0.35 * aParams.x, 0.0)) * cloudShade(aOffset.xz, uTime);
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
  bool rose = vKind > 2.5;
  bool petal = (vKind > 0.5 && vKind < 1.5) || rose;
  bool disc = vKind > 1.5 && vKind < 2.5;

  // per-pixel outline: tulip petals swell from a narrow claw to a rounded tip, rose petals are
  // broad with a blunt, slightly notched lip, leaves taper to a point
  float alpha = 1.0;
  if (au > 0.001) {
    float w;
    if (rose) {
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
  if (rose) {
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
    albedo *= 1.0 - 0.035 * (0.5 - 0.5 * fineVeins) * smoothstep(0.1, 0.5, v) * (0.4 + 0.6 * closeUp);
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
    albedo = mix(vec3(0.050, 0.028, 0.008), vec3(0.20, 0.12, 0.025), v);
  } else {
    // glaucous green, with the faint grey bloom such leaves carry
    albedo = mix(vec3(0.018, 0.050, 0.024), vec3(0.058, 0.128, 0.058), clamp(v * 0.8 + vSeed * 0.25, 0.0, 1.0));
    albedo = mix(albedo, vec3(0.085, 0.115, 0.095), 0.22 * fnoise(vec2(u * 2.0 + vSeed * 7.0, v * 3.0)));
    albedo += vec3(0.020, 0.040, 0.008) * exp(-u * u * 70.0) * step(0.001, au);               // midrib
    float lv = sin(au * 30.0 - v * 22.0);                                                     // side veins sweeping to the tip
    albedo *= 1.0 - 0.07 * lv * closeUp * step(0.001, au);
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

// Blossom and foliage cards: small quads, each showing a few five-petalled flowers
// (or leaves), with soft edges. Thousands of them make a tree crown.
export const cardVertex = /* glsl */ `
uniform float uTime;
attribute vec3 aOffset;
attribute vec4 aSeed;     // x: spin, y: size, z: tone, w: tilt
varying vec2 vUv;
varying float vTone;
varying vec3 vWorld;
varying vec3 vN;
void main(){
  float a = aSeed.x * 6.2831853;
  float tilt = (aSeed.w - 0.5) * 2.2;
  vec3 ax = vec3(cos(a), 0.0, sin(a));
  vec3 ay = vec3(-sin(a) * sin(tilt), cos(tilt), cos(a) * sin(tilt));
  vec3 p = (ax * position.x + ay * position.y) * aSeed.y;
  float sway = sin(uTime * 1.3 + aOffset.x * 0.8 + aSeed.z * 20.0) * 0.035;
  vec3 world = aOffset + p + vec3(sway, sway * 0.4, sway * 0.6);
  vUv = position.xy * 2.0;
  vTone = aSeed.z;
  vWorld = world;
  vN = normalize(cross(ax, ay));
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`;

export const cardFragment = /* glsl */ `
uniform float uLeaf;       // 0 blossom, 1 foliage
uniform vec3 uAmb;
uniform vec3 uSunCol;
uniform vec3 uSunDir;
uniform vec3 uAuroraTint;
uniform vec3 uFogColor;
uniform float uFogDensity;
varying vec2 vUv;
varying float vTone;
varying vec3 vWorld;
varying vec3 vN;
float flower(vec2 p, float r0, float rot){
  float r = length(p);
  float a = atan(p.y, p.x) + rot;
  float edge = r0 * (0.62 + 0.38 * abs(cos(a * 2.5)));
  return 1.0 - smoothstep(edge - 0.07, edge, r);
}
float leaf(vec2 p, float ang, float len){
  float c = cos(ang), s = sin(ang);
  vec2 q = vec2(c * p.x + s * p.y, -s * p.x + c * p.y);
  float t = q.x / len;
  if (t < 0.0 || t > 1.0) return 0.0;
  float w = 0.20 * sin(t * 3.14159) * (1.0 - 0.4 * t);
  return 1.0 - smoothstep(w - 0.05, w, abs(q.y));
}
void main(){
  vec2 p = vUv;
  float m;
  vec3 albedo;
  if (uLeaf > 0.5) {
    m = max(max(leaf(p + vec2(0.55, 0.1), 0.3, 0.9), leaf(p + vec2(0.1, 0.5), 1.5, 0.85)), leaf(p + vec2(0.2, -0.1), -0.9, 0.8));
    albedo = mix(vec3(0.020, 0.075, 0.022), vec3(0.060, 0.160, 0.040), vTone);
  } else {
    vec2 c1 = p - vec2(-0.38, 0.30), c2 = p - vec2(0.40, 0.20), c3 = p - vec2(0.02, -0.42);
    m = max(flower(c1, 0.50, vTone * 6.0), max(flower(c2, 0.46, vTone * 9.0 + 1.0), flower(c3, 0.48, vTone * 4.0 + 2.0)));
    float heart = exp(-min(min(dot(c1, c1), dot(c2, c2)), dot(c3, c3)) * 26.0);
    albedo = mix(vec3(0.62, 0.30, 0.42), vec3(0.80, 0.62, 0.68), vTone);
    albedo = mix(albedo, vec3(0.60, 0.10, 0.24), heart * 0.8);
  }
  if (m < 0.02) discard;
  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  float nl = dot(N, uSunDir);
  float lightAmt = clamp(nl * 0.5 + 0.5, 0.0, 1.0) + pow(clamp(-nl, 0.0, 1.0), 1.5) * 0.6;
  vec3 col = albedo * (uAmb * 0.9 + uSunCol * lightAmt * 0.55 + uAuroraTint * 0.7);
  float dist = length(cameraPosition - vWorld);
  col = mix(col, uFogColor, 1.0 - exp(-dist * dist * uFogDensity * uFogDensity));
  gl_FragColor = vec4(col, m);
}
`;
