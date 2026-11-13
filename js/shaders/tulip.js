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
attribute vec2 aInfo;     // x: 0 leaf/stem, 1 petal, 2 seed disc; y: how much it opens
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
  vec3 p = position;
  float open = mix(0.40, 1.0 + 0.18 * aParams.z, uDay);
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
  bool petal = vKind > 0.5 && vKind < 1.5;
  bool disc = vKind > 1.5;

  // per-pixel outline: petals swell from a narrow claw to a rounded tip, leaves taper to a point
  float alpha = 1.0;
  if (au > 0.001) {
    float w = petal
      ? mix(0.30, 1.0, smoothstep(0.0, 0.32, v)) * sqrt(max(1.0 - pow(max(v - 0.58, 0.0) / 0.42, 2.0), 0.0))
      : mix(0.25, 1.0, smoothstep(0.0, 0.25, v)) * pow(max(1.0 - v, 0.0), 0.55);
    if (petal) w *= 1.0 + 0.045 * sin(v * 31.0 + vSeed * 40.0) * smoothstep(0.35, 1.0, v);   // ruffled rim
    alpha = 1.0 - smoothstep(w - 0.10, w, au);
    if (alpha < 0.02) discard;
  }

  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 L = uSunDir;
  float vBump = 0.0;

  vec3 albedo;
  float thin = 0.0;                       // how much light passes through
  if (petal) {
    float grad = mix(0.50, 1.12, smoothstep(0.0, 0.9, v));
    albedo = vCol * 0.31 * grad;
    albedo = mix(albedo, vec3(dot(albedo, vec3(0.33))) * vec3(1.0, 0.97, 0.90), 0.08);
    albedo = mix(albedo * 0.30 + vec3(0.03, 0.035, 0.0), albedo, smoothstep(0.0, 0.22, v));   // deep throat
    float veins = cos(u * 19.0 + sin(v * 7.0 + vSeed * 20.0) * 0.6);
    albedo *= 0.93 + 0.07 * veins * smoothstep(0.15, 0.7, v);
    albedo *= 1.0 - 0.16 * exp(-u * u * 40.0) * (1.0 - v);                                    // centre crease
    albedo += vCol * 0.05 * smoothstep(0.55, 1.0, au);                                        // paler rim
    float mott = fnoise(vec2(u * 5.0 + vSeed * 30.0, v * 9.0));
    float streak = fnoise(vec2(u * 26.0 + vSeed * 17.0, v * 2.2));
    albedo *= 0.86 + 0.20 * mott + 0.10 * (streak - 0.5) * smoothstep(0.1, 0.8, v);
    // veins catch the light on one side: nudge the normal across the petal
    vBump = -sin(u * 19.0 + sin(v * 7.0 + vSeed * 20.0) * 0.6) * 0.22 * smoothstep(0.15, 0.7, v);
    thin = 0.75;
  } else if (disc) {
    albedo = mix(vec3(0.050, 0.028, 0.008), vec3(0.20, 0.12, 0.025), v);
  } else {
    albedo = mix(vec3(0.016, 0.050, 0.018), vec3(0.055, 0.135, 0.040), clamp(v * 0.8 + vSeed * 0.25, 0.0, 1.0));
    albedo += vec3(0.020, 0.040, 0.008) * exp(-u * u * 70.0) * step(0.001, au);               // midrib
    thin = 0.45;
  }

  // tilt the normal sideways along the veins (cheap bump)
  N = normalize(N + normalize(cross(N, vec3(0.0, 1.0, 0.001))) * vBump);
  float nl = dot(N, L);
  float diff = clamp(nl * 0.62 + 0.38, 0.0, 1.0);
  float through = pow(clamp(-nl, 0.0, 1.0), 1.4) * thin;
  float sky = 0.55 + 0.45 * N.y;
  float ao = mix(0.50, 1.0, smoothstep(0.0, 0.55, vY));           // darker down among the stems
  vec3 light = uAmb * sky * ao
    + uSunCol * (diff * 0.95 + through * 0.85) * ao * vVis
    + uAuroraTint * (0.25 + 0.65 * max(N.y, 0.0));
  vec3 col = albedo * light;
  // soft sheen where the waxy surface catches the sun
  vec3 H = normalize(L + V);
  col += uSunCol * pow(max(dot(N, H), 0.0), 26.0) * 0.045 * (petal ? 1.0 : 0.6) * vVis;
  if (petal) col *= mix(0.55, 1.0, uDay);                          // colours sleep at night

  vec3 lc = uCabinLight - vWorld;
  col += albedo * vec3(1.0, 0.52, 0.16) * (1.0 - 0.9 * uDay) * 26.0 / (1.0 + dot(lc, lc) * 0.55);
  vec3 lf = uFireLight.xyz - vWorld;
  col += albedo * vec3(1.0, 0.44, 0.12) * uFireLight.w * (1.0 - 0.6 * uDay) * 11.0 / (1.0 + dot(lf, lf) * 0.45);

  float dist = length(cameraPosition - vWorld);
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
