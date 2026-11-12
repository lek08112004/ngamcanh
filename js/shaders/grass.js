// Instanced grass blades + wildflower points, both swayed in the vertex shader.
// The grass is one square tile of blades that wraps around the walker, so the
// meadow is endless; the ground height and the clearings are evaluated on the GPU.
import { curvesGLSL } from './terrain.js';
import { CABIN, CAMP, GARDEN } from '../layout.js';
export const GRASS_R = 56;
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
attribute vec3 aOffset;
attribute vec4 aParams;   // x: height, y: yaw, z: seed, w: width
varying float vH;
varying float vSeed;
varying vec3 vWorld;
${windGLSL}
${curvesGLSL}
const float R = ${GRASS_R.toFixed(1)};
// 0 = bare ground, 1 = full-height meadow
float grassFactor(vec2 w){
  vec2 d = w - vec2(${CABIN.x.toFixed(2)}, ${CABIN.z.toFixed(2)});
  float lx = ${Math.cos(CABIN.yaw).toFixed(5)} * d.x - ${Math.sin(CABIN.yaw).toFixed(5)} * d.y;
  float lz = ${Math.sin(CABIN.yaw).toFixed(5)} * d.x + ${Math.cos(CABIN.yaw).toFixed(5)} * d.y;
  if (abs(lx) < 2.7 && lz > -3.6 && lz < 6.0) return 0.0;
  float dF = distance(w, vec2(${CAMP.fire.x.toFixed(2)}, ${CAMP.fire.z.toFixed(2)}));
  float dT = distance(w, vec2(${CAMP.tent.x.toFixed(2)}, ${CAMP.tent.z.toFixed(2)}));
  if (dF < 1.9 || dT < 2.3) return 0.0;
  if (w.y < -30.0 && abs(w.x - streamX(w.y)) < streamW(w.y) + 0.2) return 0.0;
  float f = 0.28 + 0.72 * min(smoothstep(2.2, 7.7, dF), smoothstep(2.6, 6.1, dT));
  f *= 0.46 + 0.54 * smoothstep(58.0, 72.0, distance(w, vec2(0.0, 8.0)));
  vec2 g = abs(w - vec2(${GARDEN.x.toFixed(1)}, ${GARDEN.z.toFixed(1)})) - vec2(${GARDEN.hx.toFixed(1)}, ${GARDEN.hz.toFixed(1)});
  if (max(g.x, g.y) < 0.0) f *= 0.5;
  // keep the gravel walks clear
  vec2 gc = w - vec2(${GARDEN.x.toFixed(1)}, ${GARDEN.z.toFixed(1)});
  float gr = length(gc);
  if (abs(gr - 2.75) < 0.8 || abs(gr - 7.0) < 0.85 || (gr < 7.4 && min(abs(gc.x), abs(gc.y)) < 0.8)) return 0.0;
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
  hs *= (1.0 + far * 0.5) * (1.0 - smoothstep(R * 0.80, R * 0.98, len)) * grassFactor(w);
  ws *= 1.0 + far * 2.0;
  if (hs < 0.02) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  base = vec3(w.x, terrainH(w) - 0.03, w.y);
#endif
  float c = cos(aParams.y);
  float s = sin(aParams.y);
  float px = position.x * ws;
  vec3 p = vec3(c * px, h * hs, s * px);
  float k = h * h * hs;
  p.xz += windBend(base.xz, aParams.z, uTime) * k;
  p.xz += vec2(c, s).yx * (aParams.z - 0.5) * 0.5 * k;
  p.y -= 0.12 * k * h;
  vec3 world = base + p;
  vH = h;
  vSeed = aParams.z;
  vWorld = world;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`;

export const grassFragment = /* glsl */ `
uniform vec3 uAuroraTint;
uniform vec3 uAmb;
uniform vec3 uSunCol;
uniform float uDay;
uniform vec3 uCabinLight;
uniform vec4 uFireLight;
uniform vec3 uFogColor;
uniform float uFogDensity;
varying float vH;
varying float vSeed;
varying vec3 vWorld;
void main(){
  vec3 root = vec3(0.006, 0.020, 0.008);
  vec3 tip = mix(vec3(0.050, 0.100, 0.036), vec3(0.120, 0.125, 0.055), vSeed * vSeed);
  vec3 albedo = mix(root, tip, vH * vH) * (0.45 + 0.9 * fract(vSeed * 7.31));
  vec3 light = uAmb * 0.88 * (0.3 + 0.7 * vH) + uAuroraTint * (0.12 + 0.85 * vH * vH) + uSunCol * (0.22 + 0.78 * vH);
  vec3 col = albedo * light;
  vec3 lc = uCabinLight - vWorld;
  float below = smoothstep(-0.2, 0.6, uCabinLight.y - vWorld.y);
  col += albedo * vec3(1.0, 0.52, 0.16) * below * (1.0 - 0.9 * uDay) * 30.0 / (1.0 + dot(lc, lc) * 0.55);
  vec3 lf = uFireLight.xyz - vWorld;
  col += albedo * vec3(1.0, 0.44, 0.12) * uFireLight.w * (1.0 - 0.6 * uDay) * (0.4 + 0.6 * vH) * 12.0 / (1.0 + dot(lf, lf) * 0.45);
  float dist = length(cameraPosition - vWorld);
  float fog = 1.0 - exp(-dist * dist * uFogDensity * uFogDensity);
  col = mix(col, uFogColor, fog);
  gl_FragColor = vec4(col, 1.0);
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

export const flowerVertex = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
uniform float uScale;
attribute vec3 aColor;
attribute vec2 aInfo;     // x: stem height, y: seed
varying vec3 vColor;
${windGLSL}
void main(){
  vec3 world = position;
  world.xz += windBend(position.xz, aInfo.y, uTime) * aInfo.x;
  world.y += aInfo.x * 0.92;
  vColor = aColor;
  vec4 mv = viewMatrix * vec4(world, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(uScale * uPixelRatio * (0.07 + 0.05 * aInfo.y) / -mv.z, 1.0, 11.0);
}
`;

export const flowerFragment = /* glsl */ `
uniform vec3 uAuroraTint;
uniform vec3 uAmb;
uniform vec3 uSunCol;
varying vec3 vColor;
void main(){
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float r = length(p);
  if (r > 1.0) discard;
  float petals = 0.75 + 0.25 * cos(atan(p.y, p.x) * 5.0);
  if (r > petals) discard;
  vec3 col = vColor * (uAmb * 0.6 + uAuroraTint * 0.55 + uSunCol * 0.32);
  col = mix(col, vec3(0.08, 0.06, 0.015), smoothstep(0.32, 0.0, r));
  gl_FragColor = vec4(col, 1.0);
}
`;
