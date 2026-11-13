import { commonGLSL } from './common.js';

// Campfire: a camera-facing flame card and looping ember points.
export const flameVertex = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const flameFragment = /* glsl */ `
uniform float uTime;
uniform float uFire;      // 0.3 (embers) .. 1.0 (roaring)
varying vec2 vUv;
${commonGLSL}
void main(){
  float x = (vUv.x - 0.5) * 2.0;
  float y = vUv.y;
  float n = fbm2(vec2(x * 2.2, y * 2.6 - uTime * 2.4));
  float n2 = vnoise(vec2(x * 5.0 + 3.0, y * 6.0 - uTime * 4.2));
  float h = 0.42 + 0.56 * uFire;
  float width = max((1.0 - y / h) * (0.50 + 0.25 * uFire), 0.001);
  float lick = x + (n - 0.5) * 0.9 * y;
  float shape = clamp(1.0 - abs(lick) / width, 0.0, 1.0);
  float f = shape * (1.0 - smoothstep(h * 0.25, h, y + (n2 - 0.5) * 0.25));
  f *= smoothstep(0.0, 0.05, y);
  f = pow(f, 1.25);
  vec3 col = mix(vec3(1.0, 0.22, 0.03), vec3(1.0, 0.70, 0.22), f);
  col = mix(col, vec3(1.0, 0.95, 0.80), smoothstep(0.72, 1.0, f));
  gl_FragColor = vec4(col * f * (1.5 + 1.5 * uFire), 1.0);
}
`;

export const emberVertex = /* glsl */ `
uniform float uTime;
uniform float uFire;
uniform float uPixelRatio;
uniform float uScale;
attribute vec4 aSeed;
varying float vA;
void main(){
  float life = fract(uTime * (0.16 + aSeed.y * 0.22) + aSeed.x);
  vec3 p = position;
  p.x += sin(life * 9.0 + aSeed.z * 20.0) * 0.22 * life + (aSeed.z - 0.5) * 1.1 * life;
  p.z += cos(life * 7.0 + aSeed.w * 20.0) * 0.22 * life + (aSeed.y - 0.5) * 0.8 * life;
  p.y += life * (2.0 + 2.8 * aSeed.w) * (0.55 + 0.7 * uFire);
  vA = (1.0 - life) * smoothstep(0.0, 0.08, life) * step(aSeed.w, 0.2 + 0.8 * uFire);
  vec4 mv = viewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(uScale * uPixelRatio * 0.07 / -mv.z, 1.0, 9.0);
}
`;

export const emberFragment = /* glsl */ `
varying float vA;
void main(){
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float a = exp(-dot(p, p) * 5.0) * vA;
  gl_FragColor = vec4(vec3(1.0, 0.48, 0.12) * 2.6 * a, 1.0);
}
`;

// Wood smoke from the cabin chimney: a few soft puffs that rise, drift and thin out.
export const smokeVertex = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
uniform float uScale;
attribute vec4 aSeed;
varying float vA;
void main(){
  float life = fract(uTime * (0.045 + aSeed.y * 0.025) + aSeed.x);
  vec3 p = position;
  p.y += life * 4.2;
  p.x += life * life * 4.5 + sin(life * 5.0 + aSeed.z * 9.0) * 0.5 * life;
  p.z += life * 1.2 + cos(life * 4.0 + aSeed.w * 9.0) * 0.30 * life;
  vA = smoothstep(0.0, 0.12, life) * pow(1.0 - life, 1.6);
  vec4 mv = viewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(uScale * uPixelRatio * (0.5 + 3.0 * life) / -mv.z, 2.0, 140.0);
}
`;

export const smokeFragment = /* glsl */ `
uniform vec3 uAmb;
uniform vec3 uSunCol;
varying float vA;
void main(){
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float a = exp(-dot(q, q) * 3.2) * vA * 0.17;
  if (a < 0.004) discard;
  gl_FragColor = vec4((uAmb * 0.8 + uSunCol * 0.14) * 0.8, a);
}
`;
