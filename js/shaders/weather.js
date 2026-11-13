// Snowfall. A box of flakes that wraps around the walker, so it snows wherever you stand
// and costs the same wherever you go. Flakes fall at their own speeds and wander sideways.
export const SNOW_R = 22;
export const snowVertex = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
uniform float uScale;
uniform float uAmount;     // 0 .. 1: how hard it is snowing
uniform vec3 uPlayer;
attribute vec4 aSeed;      // phase, speed, drift, size
varying float vA;
const float R = ${SNOW_R.toFixed(1)};
void main(){
  vec3 p = position;
  p.y -= uTime * (0.9 + aSeed.y * 1.1);
  p.x += sin(uTime * 0.6 + aSeed.x * 40.0) * (0.3 + aSeed.z) + uTime * 0.55;
  p.z += cos(uTime * 0.5 + aSeed.x * 23.0) * (0.3 + aSeed.z) + uTime * 0.20;
  vec3 rel = mod(p - uPlayer + R, 2.0 * R) - R;
  vec3 world = uPlayer + vec3(rel.x, rel.y * 0.6 + 6.0, rel.z);
  vec4 mv = viewMatrix * vec4(world, 1.0);
  gl_Position = projectionMatrix * mv;
  vA = step(aSeed.x, uAmount) * (1.0 - smoothstep(R * 0.75, R, length(rel.xz)));
  gl_PointSize = vA < 0.01 ? 0.0 : clamp(uScale * uPixelRatio * (0.012 + 0.014 * aSeed.w) / -mv.z, 1.0, 14.0);
}
`;
export const snowFragment = /* glsl */ `
uniform vec3 uAmb;
uniform vec3 uSunCol;
uniform vec3 uGlow;        // warm lamplight and aurora at night
varying float vA;
void main(){
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float a = (1.0 - smoothstep(0.35, 1.0, length(q))) * vA;
  if (a < 0.02) discard;
  gl_FragColor = vec4((uAmb * 1.5 + uSunCol * 0.5 + uGlow) * 0.85, a * 0.9);
}
`;
