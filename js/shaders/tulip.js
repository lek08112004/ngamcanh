// Instanced tulips: stem, two leaves and a six-sided cup that opens by day
// and closes at night. Swayed by the same wind as the grass.
export const tulipVertex = /* glsl */ `
uniform float uTime;
uniform float uDay;
attribute vec3 aOffset;
attribute vec3 aParams;   // x: height, y: yaw, z: seed
attribute vec3 aColor;
attribute vec3 aInfo;     // x: 0 leaf / 1 petal, y: how much this vertex opens, z: shade
varying vec3 vCol;
varying float vShade;
varying float vKind;
varying vec3 vWorld;
vec2 windBend(vec2 wp, float seed, float t){
  float gust = sin(wp.x * 0.12 + t * 0.9 + sin(wp.y * 0.10 + t * 0.3) * 2.0) * 0.5 + 0.5;
  float swell = sin(wp.x * 0.031 - wp.y * 0.045 + t * 0.35) * 0.5 + 0.5;
  float flutter = sin(t * 2.3 + seed * 40.0 + wp.x * 1.7) * 0.05;
  return vec2(0.86, 0.38) * (0.06 + 0.26 * gust * (0.4 + 0.6 * swell) + flutter);
}
void main(){
  vec3 p = position;
  float open = mix(0.40, 1.0 + 0.18 * aParams.z, uDay);
  p.xz *= mix(1.0, open, aInfo.y);
  float c = cos(aParams.y);
  float s = sin(aParams.y);
  p = vec3(c * p.x - s * p.z, p.y, s * p.x + c * p.z) * aParams.x;
  float k = position.y * position.y * aParams.x;
  p.xz += windBend(aOffset.xz, aParams.z, uTime) * k;
  vec3 world = aOffset + p;
  vCol = aColor;
  vShade = aInfo.z;
  vKind = aInfo.x;
  vWorld = world;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`;

export const tulipFragment = /* glsl */ `
uniform float uDay;
uniform vec3 uAmb;
uniform vec3 uSunCol;
uniform vec3 uAuroraTint;
uniform vec3 uCabinLight;
uniform vec4 uFireLight;
uniform vec3 uFogColor;
uniform float uFogDensity;
varying vec3 vCol;
varying float vShade;
varying float vKind;
varying vec3 vWorld;
void main(){
  vec3 green = mix(vec3(0.018, 0.060, 0.022), vec3(0.060, 0.150, 0.045), vShade);
  // deep colour at the base of the cup, sunlit and slightly translucent toward the rim
  vec3 petal = vCol * (0.10 + 0.44 * vShade) + vec3(0.10, 0.07, 0.03) * vShade * vShade * vShade;
  if (!gl_FrontFacing) petal *= 0.45;
  petal *= mix(0.55, 1.0, uDay);          // colours sleep at night
  vec3 albedo = mix(green, petal, min(vKind, 1.0));
  // kind 2: the seed disc of sunflowers and daisies
  albedo = mix(albedo, vec3(0.22, 0.13, 0.03) * (0.5 + 0.9 * vShade), clamp(vKind - 1.0, 0.0, 1.0));
  vec3 light = uAmb * (0.45 + 0.55 * vShade)
    + uAuroraTint * (0.15 + 0.75 * vShade)
    + uSunCol * (0.30 + 0.70 * vShade);
  vec3 col = albedo * light;
  vec3 lc = uCabinLight - vWorld;
  col += albedo * vec3(1.0, 0.52, 0.16) * (1.0 - 0.9 * uDay) * 26.0 / (1.0 + dot(lc, lc) * 0.55);
  vec3 lf = uFireLight.xyz - vWorld;
  col += albedo * vec3(1.0, 0.44, 0.12) * uFireLight.w * (1.0 - 0.6 * uDay) * 11.0 / (1.0 + dot(lf, lf) * 0.45);
  float dist = length(cameraPosition - vWorld);
  float fog = 1.0 - exp(-dist * dist * uFogDensity * uFogDensity);
  col = mix(col, uFogColor, fog);
  gl_FragColor = vec4(col, 1.0);
}
`;
