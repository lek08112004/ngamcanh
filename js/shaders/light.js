// Sunlight visibility shared by the ground, the grass and the flowers:
//  - sunShadow: the static shadow map cast by the cabin, tent, fence, trees…
//    (redrawn only when the sun has moved a little or a season changes the plantings)
//  - cloudShade: slow cloud shadows drifting across the valley
// Works in vertex and fragment shaders. Expects `uniform float uTime` from the includer.
export const lightGLSL = /* glsl */ `
uniform sampler2D uShadowMap;
uniform mat4 uShadowMatrix;
uniform float uShadowOn;
uniform float uShadowTexel;
uniform float uSunReach;     // 0 once the sun has gone behind the ridge: the valley floor is in its shade, the peaks are not
float lhash(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float lnoise(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(lhash(i), lhash(i + vec2(1.0, 0.0)), f.x), mix(lhash(i + vec2(0.0, 1.0)), lhash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float shadowTap(vec2 uv, float z){
  // three.js packs shadow depth into RGBA
  float d = dot(texture2D(uShadowMap, uv), vec4(5.9371e-8, 1.51990e-5, 3.89099e-3, 0.99609375));
  return step(z - 0.0006, d);
}
vec3 shadowCoord(vec3 w){
  vec4 sc = uShadowMatrix * vec4(w, 1.0);
  return sc.xyz / sc.w;
}
float sunShadowMap(vec3 w){
  if (uShadowOn < 0.5) return 1.0;
  vec3 p = shadowCoord(w);
  if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0 || p.z > 1.0) return 1.0;
  return shadowTap(p.xy, p.z);
}
float sunShadow(vec3 w){ return sunShadowMap(w) * uSunReach; }
float sunShadowSoftMap(vec3 w){
  if (uShadowOn < 0.5) return 1.0;
  vec3 p = shadowCoord(w);
  if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0 || p.z > 1.0) return 1.0;
  // nine taps on a small disc: the edge of a shadow is a soft ramp, not a staircase
  float t = uShadowTexel * 1.5;
  float s = shadowTap(p.xy, p.z) * 2.0;
  s += shadowTap(p.xy + vec2(t, 0.0), p.z) + shadowTap(p.xy + vec2(-t, 0.0), p.z);
  s += shadowTap(p.xy + vec2(0.0, t), p.z) + shadowTap(p.xy + vec2(0.0, -t), p.z);
  s += (shadowTap(p.xy + vec2(t, t) * 1.4, p.z) + shadowTap(p.xy + vec2(-t, t) * 1.4, p.z)
      + shadowTap(p.xy + vec2(t, -t) * 1.4, p.z) + shadowTap(p.xy + vec2(-t, -t) * 1.4, p.z)) * 0.75;
  return s / 9.0;
}
float sunShadowSoft(vec3 w){ return sunShadowSoftMap(w) * uSunReach; }
// 1 inside the area the shadow map covers, 0 outside
float shadowCover(vec3 w){
  if (uShadowOn < 0.5) return 0.0;
  vec3 p = shadowCoord(w);
  return (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0 || p.z > 1.0) ? 0.0 : 1.0;
}
float cloudShade(vec2 xz, float t){
  vec2 q = xz * 0.0065 + vec2(t * 0.0042, t * 0.0016);
  float n = lnoise(q) * 0.62 + lnoise(q * 2.3 + 7.0) * 0.38;
  return 1.0 - 0.40 * smoothstep(0.50, 0.70, n);
}
`;
