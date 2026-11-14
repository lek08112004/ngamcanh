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
  float d = dot(textureLod(uShadowMap, uv, 0.0), vec4(5.9371e-8, 1.51990e-5, 3.89099e-3, 0.99609375));
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
// four taps blended by where the point falls between texels: a shadow edge becomes a ramp,
// not the staircase (and the soft square blotches) of the map's grid
float shadowBilinear(vec2 uv, float z){
  float T = uShadowTexel;
  vec2 st = uv / T - 0.5;
  vec2 f = fract(st);
  vec2 b = (floor(st) + 0.5) * T;
  float s00 = shadowTap(b, z), s10 = shadowTap(b + vec2(T, 0.0), z);
  float s01 = shadowTap(b + vec2(0.0, T), z), s11 = shadowTap(b + vec2(T, T), z);
  return mix(mix(s00, s10, f.x), mix(s01, s11, f.x), f.y);
}
float shadowDepth(vec2 uv){ return dot(textureLod(uShadowMap, uv, 0.0), vec4(5.9371e-8, 1.51990e-5, 3.89099e-3, 0.99609375)); }
float sunShadowSoftMap(vec3 w){
  if (uShadowOn < 0.5) return 1.0;
  vec3 p = shadowCoord(w);
  if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0 || p.z > 1.0) return 1.0;
  float T = uShadowTexel;
  // 1. look round for whatever is between this point and the sun, and how far above it is
  float zb = 0.0, nb = 0.0;
  for (int k = 0; k < 5; k++) {
    vec2 o = k == 0 ? vec2(0.0) : vec2(cos(float(k) * 1.5708 + 0.4), sin(float(k) * 1.5708 + 0.4)) * T * 4.0;
    float d = shadowDepth(p.xy + o);
    if (d < p.z - 0.0006) { zb += d; nb += 1.0; }
  }
  if (nb < 0.5) return 1.0;                         // open sky: most of the meadow stops here
  zb /= nb;
  // 2. the further the caster is above the ground the softer its edge (the sun is a disc, and
  // light through leaves makes round dapples, not the squares of the map). The depth range of
  // the sun's shadow camera is 340 m.
  float gap = (p.z - zb) * 340.0;
  float r = T * clamp(1.1 + gap * 1.15, 1.1, 5.0);
  float s = 0.0;
  for (int k = 0; k < 8; k++) {
    float a = float(k) * 0.7854 + 0.3;
    vec2 o = vec2(cos(a), sin(a)) * r * (k - (k / 2) * 2 == 0 ? 1.0 : 0.55);
    s += shadowBilinear(p.xy + o, p.z);
  }
  return s * 0.125;
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
