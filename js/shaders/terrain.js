import { commonGLSL } from './common.js';
import { auroraGLSL } from './aurora.js';
import { waterGLSL } from './water.js';
import { CABIN, CAMP, GARDEN } from '../layout.js';
import { lightGLSL } from './light.js';

// Curves shared (by formula) with js/world.js — keep both in sync.
export const curvesGLSL = /* glsl */ `
float streamX(float z){
  return 4.0 + 9.0 * sin(z * 0.028 + 0.4) + 3.0 * sin(z * 0.071 + 2.0) + 70.0 * exp(min((z + 18.0) * 0.11, 6.0));
}
float streamW(float z){
  float d = (z + 95.0) / 14.0;
  return 2.6 + 1.1 * sin(z * 0.05 + 1.0) + 5.0 * exp(-d * d);
}
float pathX(float z){
  return 24.0 + 12.0 * sin(z * 0.024 + 2.2) + 4.0 * sin(z * 0.063 + 0.5);
}
float sat01(float t){ return smoothstep(0.0, 1.0, t); }
float terrainH(vec2 p){
  float x = p.x;
  float z = p.y;
  float r = 1.2 * sin(x * 0.031 + 1.3) * cos(z * 0.027 - 0.4)
    + 0.7 * sin(x * 0.058 + z * 0.043 + 2.0)
    + 0.3 * sin(x * 0.13 - 0.7) * sin(z * 0.11 + 0.5);
  float hill = 9.5 * sat01((z + 58.0) / 62.0);
  float side = 18.0 * sat01((abs(x - 4.0) - 55.0) / 130.0);
  float far = 16.0 * sat01((-z - 170.0) / 220.0);
  float back = 12.0 * sat01((z - 45.0) / 110.0);
  float dv = abs(x - streamX(z));
  float level = sat01((dv - 2.0) / 14.0);
  float inValley = 1.0 - sat01((z + 50.0) / 25.0);
  r *= 1.0 - inValley * (1.0 - level);
  return r + hill + side + far + back - 0.6 * inValley * (1.0 - level);
}
`;

export const terrainVertex = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vNormal = normal;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

export const terrainFragment = /* glsl */ `
uniform float uTime;
uniform vec3 uAuroraTint;
uniform vec3 uAmb;
uniform vec3 uSunCol;
uniform vec3 uSunDir;
uniform vec3 uCabinLight;
uniform vec4 uFireLight;    // xyz: campfire position, w: flickering level
uniform vec3 uFogColor;
uniform float uFogDensity;
varying vec3 vWorld;
varying vec3 vNormal;
${commonGLSL}
${lightGLSL}
${auroraGLSL}
${waterGLSL}
${curvesGLSL}
const vec2 CABIN_XZ = vec2(${CABIN.x.toFixed(2)}, ${CABIN.z.toFixed(2)});
const vec2 TENT_XZ = vec2(${CAMP.tent.x.toFixed(2)}, ${CAMP.tent.z.toFixed(2)});
const vec2 GARDEN_XZ = vec2(${GARDEN.x.toFixed(2)}, ${GARDEN.z.toFixed(2)});
float segDist(vec2 p, vec2 a, vec2 b){
  vec2 pa = p - a, ba = b - a;
  return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0));
}
// 1 on the garden's gravel walks
float gardenPath(vec2 p){
  vec2 g = p - GARDEN_XZ;
  float r = length(g);
  float ring = 1.0 - smoothstep(0.55, 0.85, abs(r - 2.75));
  ring = max(ring, 1.0 - smoothstep(0.6, 0.9, abs(r - 7.0)));
  float cross = (1.0 - smoothstep(0.55, 0.85, min(abs(g.x), abs(g.y)))) * step(r, 7.4);
  float walk = 1.0 - smoothstep(0.7, 1.0, segDist(p, vec2(3.0, 9.5), GARDEN_XZ - vec2(7.0, 0.0)));
  return max(max(ring, cross), walk);
}

void main(){
  vec3 n = normalize(vNormal);
  vec3 toCam = cameraPosition - vWorld;
  float dist = length(toCam);
  vec3 viewDir = -toCam / dist;
  vec2 xz = vWorld.xz;

  // meadow albedo: patchy greens, drier tufts, fine grain near the camera
  float big = fbm2(xz * 0.035);
  float mid = fbm2(xz * 0.22 + 13.0);
  float fine = vnoise(xz * 4.0) * smoothstep(60.0, 5.0, dist);
  vec3 albedo = mix(vec3(0.020, 0.060, 0.024), vec3(0.070, 0.120, 0.038), big);
  albedo = mix(albedo, vec3(0.095, 0.105, 0.045), smoothstep(0.55, 0.85, mid) * 0.5);
  albedo *= 0.75 + 0.5 * fine;
  albedo *= 1.0 + 0.7 * uDay;
  // sun-bleached and clover patches, and a dusting of far-off wildflowers by day
  float patch2 = fbm2(xz * 0.07 + 31.0);
  albedo = mix(albedo, albedo * vec3(1.35, 1.18, 0.62), smoothstep(0.55, 0.80, patch2) * 0.45 * uDay);
  float speck = step(0.90, vnoise(xz * 1.9 + 7.0)) * smoothstep(120.0, 30.0, dist) * smoothstep(8.0, 30.0, dist);
  vec3 bloomCol = mix(vec3(0.95, 0.85, 0.30), vec3(0.90, 0.45, 0.70), step(0.5, vnoise(xz * 0.31)));
  albedo = mix(albedo, bloomCol * 0.16, speck * 0.55 * uDay);
  float gp = gardenPath(xz) * (0.75 + 0.25 * vnoise(xz * 9.0));
  albedo = mix(albedo, vec3(0.30, 0.26, 0.20) * (0.8 + 0.4 * vnoise(xz * 22.0)), gp * 0.9);
  // soft grounding shadows under the cabin and the tent
  float sh = exp(-dot(xz - CABIN_XZ, xz - CABIN_XZ) / 26.0) * 0.50 + exp(-dot(xz - TENT_XZ, xz - TENT_XZ) / 7.0) * 0.45;
  albedo *= 1.0 - sh;

  // faint trail
  float pm = smoothstep(1.5, 0.5, abs(vWorld.x - pathX(vWorld.z)));
  pm *= smoothstep(-34.0, -50.0, vWorld.z) * smoothstep(-330.0, -200.0, vWorld.z);
  pm *= 0.55 + 0.45 * vnoise(xz * 0.8);
  albedo = mix(albedo, vec3(0.105, 0.085, 0.060), pm * 0.8);

  // light: sky ambient + aurora as a broad area light ahead of the viewer
  vec3 L = normalize(vec3(-0.2, 0.55, -0.8));
  float diff = max(dot(n, L), 0.0);
  float sky = 0.5 + 0.5 * n.y;
  vec3 light = uAmb * sky + uAuroraTint * (0.30 + 1.2 * diff) + uSunCol * (0.10 + 0.90 * max(dot(n, uSunDir), 0.0)) * sunShadowSoft(vWorld) * cloudShade(xz, uTime);
  vec3 col = albedo * light;

  // amber spill from the cabin
  vec3 lc = uCabinLight - vWorld;
  float ld = dot(lc, lc);
  col += albedo * vec3(1.0, 0.52, 0.16) * (1.0 - 0.9 * uDay) * 26.0 / (1.0 + ld * 0.55);

  // campfire
  vec3 lf = uFireLight.xyz - vWorld;
  col += albedo * vec3(1.0, 0.44, 0.12) * uFireLight.w * (1.0 - 0.6 * uDay) * 9.0 / (1.0 + dot(lf, lf) * 0.45);
  // trampled, scorched earth around the fire ring
  col *= mix(0.45, 1.0, smoothstep(0.5, 1.7, length(lf.xz)));

  // stream
  float sw = streamW(vWorld.z);
  float sd = abs(vWorld.x - streamX(vWorld.z));
  float zm = smoothstep(-24.0, -36.0, vWorld.z);
  float wm = smoothstep(sw, sw - 0.45, sd) * zm;
  col *= mix(1.0, 0.45, smoothstep(sw + 1.6, sw, sd) * zm);
  if (wm > 0.001) {
    col = mix(col, waterColor(vWorld, viewDir, uTime), wm);
  }

  float fog = 1.0 - exp(-dist * dist * uFogDensity * uFogDensity);
  col = mix(col, uFogColor, fog);
  gl_FragColor = vec4(col, 1.0);
}
`;
