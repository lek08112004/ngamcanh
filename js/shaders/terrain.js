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
// ---- the meadow, described once for the ground and for every grass blade ----
float chash(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float cnoise(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(chash(i), chash(i + vec2(1.0, 0.0)), f.x), mix(chash(i + vec2(0.0, 1.0)), chash(i + vec2(1.0, 1.0)), f.x), f.y);
}
// colour of the grass at a spot: lush hollows, sun-dried rises, dark clover
vec3 meadowColor(vec2 p, float y){
  float big = cnoise(p * 0.035) * 0.6 + cnoise(p * 0.081 + 5.0) * 0.4;
  float pat = cnoise(p * 0.07 + 31.0) * 0.6 + cnoise(p * 0.19 + 7.0) * 0.4;
  vec3 c = mix(vec3(0.030, 0.064, 0.018), vec3(0.068, 0.100, 0.028), big);
  float dry = clamp(smoothstep(0.46, 0.74, pat) * 0.85 + smoothstep(9.0, 30.0, y) * 0.40, 0.0, 1.0);
  c = mix(c, vec3(0.110, 0.112, 0.044), dry * 0.66);
  float clover = smoothstep(0.60, 0.80, cnoise(p * 0.11 + 53.0));
  return mix(c, vec3(0.024, 0.058, 0.022), clover * 0.6);
}
// 0..1 where bare rock breaks through the turf (kept away from the camp and the flower beds)
float rockMask(vec2 p){
  float keep = max(smoothstep(-64.0, -86.0, p.y), max(smoothstep(38.0, 60.0, p.y), smoothstep(112.0, 134.0, abs(p.x))));
  if (keep <= 0.0) return 0.0;
  float n = cnoise(p * 0.045 + 90.0) * 0.50 + cnoise(p * 0.13 + 40.0) * 0.30 + cnoise(p * 0.43 + 13.0) * 0.20;
  return smoothstep(0.66, 0.72, n) * keep;
}
// 0..1 inside the tilled tulip beds (same stripes as createTulips in flora.js)
float tulipBed(vec2 p){
  float d = 8.0 - p.y;
  if (d < 4.5 || d > 50.0) return 0.0;
  float edge = 9.0 + d * 1.55 - abs(p.x);
  if (edge < 0.0) return 0.0;
  if (p.x > 10.5 && p.y > -7.0) return 0.0;
  float lane = fract((p.x + 1000.0) / 3.6);
  float bed = smoothstep(0.13, 0.18, lane) * smoothstep(1.0, 0.96, lane);
  bed *= smoothstep(50.0, 16.0, d) * smoothstep(4.5, 6.5, d) * smoothstep(0.0, 3.0, edge);
  bed *= smoothstep(6.0, 8.5, distance(p, vec2(${(CABIN.x + 0.86).toFixed(2)}, ${(CABIN.z + 0.68).toFixed(2)})));
  bed *= smoothstep(3.6, 5.2, distance(p, vec2(${CAMP.fire.x.toFixed(2)}, ${CAMP.fire.z.toFixed(2)})));
  bed *= smoothstep(2.3, 3.6, distance(p, vec2(${CAMP.tent.x.toFixed(2)}, ${CAMP.tent.z.toFixed(2)})));
  return bed * smoothstep(3.2, 4.6, distance(p, vec2(0.0, 8.0)));
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
uniform float uGrassFar;   // how far out real blades are drawn
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

  // ---- the meadow: same colour function the blades use, so sparse grass never shows a seam
  vec3 base = meadowColor(xz, vWorld.y);
  float hRel = 0.0;          // relief finer than the mesh, in metres
  float clump = 0.5;
  float fibre = 0.5;
  float lB = 0.0;
  // detail fades out once it is smaller than a pixel: nothing shimmers in the distance
  float px = max(length(dFdx(xz)), length(dFdy(xz)));
  float lR = 1.0 - smoothstep(0.35, 1.5, px);
#if TERRAIN_Q > 0
  float lA = 1.0 - smoothstep(1.2, 5.0, px);
  lB = 1.0 - smoothstep(0.10, 0.45, px);
  float lC = 1.0 - smoothstep(0.012, 0.05, px);
  float hum = fbm2(xz * 0.16 + 3.0);
  clump = mix(0.5, vnoise(xz * 1.7 + 9.0), lB);
  vec2 rq = mat2(0.8, -0.6, 0.6, 0.8) * xz;
  fibre = mix(0.5, vnoise(rq * vec2(46.0, 11.0)) * 0.6 + vnoise(xz * vec2(9.0, 41.0) + 3.0) * 0.4, lC);
  hRel = hum * 0.60 * lA + clump * 0.07 * lB;
#endif
  // near you the ground is the dim thatch between the blades; far off it stands for the whole sward
  float near = 1.0 - smoothstep(uGrassFar * 0.30, uGrassFar, dist);
  vec3 albedo = base * mix(1.04, 0.60, near);
  albedo *= (0.80 + 0.40 * clump) * (0.80 + 0.40 * fibre);
  float grassAmt = 1.0;

  // a dusting of far-off wildflowers by day
  float speck = step(0.90, vnoise(xz * 1.9 + 7.0)) * smoothstep(120.0, 30.0, dist) * smoothstep(8.0, 30.0, dist);
  vec3 bloomCol = mix(vec3(0.95, 0.85, 0.30), vec3(0.90, 0.45, 0.70), step(0.5, vnoise(xz * 0.31)));
  albedo = mix(albedo, bloomCol * 0.16, speck * 0.55 * uDay);

  // thin seams of bare earth where the turf has slipped
  float vn = 1.0 - abs(2.0 * vnoise(xz * 0.05 + 70.0) - 1.0);
  float vein = smoothstep(0.93, 0.985, vn) * smoothstep(0.45, 0.70, fbm2(xz * 0.02 + 8.0));
  albedo = mix(albedo, vec3(0.092, 0.066, 0.042) * (0.7 + 0.6 * clump), vein * 0.8);
  hRel -= vein * 0.14;
  grassAmt *= 1.0 - vein * 0.8;

  // bedrock breaking through on the hillsides
  float rk = rockMask(xz);
  if (rk > 0.0) {
    float rn = mix(0.5, fbm2(xz * 0.55 + 20.0), lR);
    float ledge = smoothstep(0.35, 0.75, rk + (rn - 0.5) * 0.9 + (clump - 0.5) * 0.3);
    float crack = pow(1.0 - abs(2.0 * vnoise(xz * 1.4 + rn * 2.0) - 1.0), 6.0) * lR;
    vec3 rockC = mix(vec3(0.040, 0.039, 0.040), vec3(0.150, 0.138, 0.122), rn);
    rockC = mix(rockC, vec3(0.090, 0.098, 0.044), smoothstep(0.50, 0.8, vnoise(xz * 0.9 + 4.0)) * 0.6 * lR);   // lichen
    rockC = mix(rockC, base * 0.8, mix(0.3, smoothstep(0.50, 0.72, vnoise(xz * 0.63 + 31.0)) * 0.75, lR));   // moss creeping over
    rockC *= 1.0 - 0.5 * crack * lB;
    albedo = mix(albedo, rockC, ledge);
    hRel += ledge * (0.25 + rn * 0.65 - crack * 0.10 * lB);
    grassAmt *= 1.0 - ledge;
  }

  // tilled earth between the tulip rows
  float bed = tulipBed(xz);
  if (bed > 0.0) {
    float row = 0.5 + 0.5 * cos(xz.x * 14.27997);
    vec3 soil = vec3(0.060, 0.041, 0.028) * (0.70 + 0.60 * vnoise(xz * 7.0)) * (0.72 + 0.56 * row);
    albedo = mix(albedo, soil, bed * 0.80);
    hRel += row * 0.07 * bed * lB;
    grassAmt *= 1.0 - bed * 0.8;
  }

  float gp = gardenPath(xz) * (0.75 + 0.25 * vnoise(xz * 9.0));
  // gravel: two grids of pebbles laid across each other, so no lattice shows up close
  float gv = vnoise(mat2(0.8, -0.6, 0.6, 0.8) * xz * 27.0) * 0.55 + vnoise(mat2(0.6, 0.8, -0.8, 0.6) * xz * 41.0 + 7.0) * 0.45;
  vec3 gravel = mix(vec3(0.13, 0.115, 0.095), vec3(0.34, 0.31, 0.26), gv) * (0.85 + 0.3 * vnoise(xz * 2.3));
  albedo = mix(albedo, gravel, gp * 0.92);
  grassAmt *= 1.0 - gp;
  // soft grounding under the cabin and the tent (the cast shadows do the rest by day)
  float sh = exp(-dot(xz - CABIN_XZ, xz - CABIN_XZ) / 26.0) * 0.50 + exp(-dot(xz - TENT_XZ, xz - TENT_XZ) / 7.0) * 0.45;
  albedo *= 1.0 - sh * mix(1.0, 0.45, uDay);

  // faint trail
  float pm = smoothstep(1.5, 0.5, abs(vWorld.x - pathX(vWorld.z)));
  pm *= smoothstep(-34.0, -50.0, vWorld.z) * smoothstep(-330.0, -200.0, vWorld.z);
  pm *= 0.55 + 0.45 * vnoise(xz * 0.8);
  albedo = mix(albedo, vec3(0.115, 0.090, 0.060) * (0.75 + 0.5 * clump), pm * 0.85);
  grassAmt *= 1.0 - pm * 0.8;

  // stream: pebbled banks, then water
  float sw = streamW(vWorld.z);
  float sd = abs(vWorld.x - streamX(vWorld.z));
  float zm = smoothstep(-24.0, -36.0, vWorld.z);
  float wm = smoothstep(sw, sw - 0.30, sd) * zm;
  float bank = smoothstep(sw + 1.7, sw + 0.25, sd + (clump - 0.5) * 0.9) * zm;
  float peb = vnoise(xz * 5.5) * 0.6 + vnoise(xz * 13.0 + 2.0) * 0.4;
  vec3 pebble = mix(vec3(0.075, 0.068, 0.058), vec3(0.230, 0.210, 0.180), peb);
  pebble *= mix(1.0, 0.55, smoothstep(sw + 0.9, sw, sd));          // wet near the waterline
  albedo = mix(albedo, pebble, bank);
  hRel += peb * 0.05 * bank * lB - bank * 0.05;
  grassAmt *= 1.0 - bank;

  // ---- light
  vec3 nb = n;
#if TERRAIN_Q > 0
  {
    vec3 dpx = dFdx(vWorld), dpy = dFdy(vWorld);
    float hx = dFdx(hRel), hy = dFdy(hRel);
    vec3 r1 = cross(dpy, n), r2 = cross(n, dpx);
    float det = dot(dpx, r1);
    vec3 grad = sign(det) * (hx * r1 + hy * r2);
    nb = normalize(abs(det) * n - grad);
  }
#endif
  vec3 L = normalize(vec3(-0.2, 0.55, -0.8));       // the aurora, a broad light ahead of the viewer
  float diff = max(dot(nb, L), 0.0);
  float vis = sunShadowSoft(vWorld) * cloudShade(xz, uTime);
  float ndl = max(dot(nb, uSunDir), 0.0);
  vec3 light = uAmb * (0.5 + 0.5 * nb.y) + uAuroraTint * (0.30 + 1.2 * diff) + uSunCol * (0.05 + 0.95 * ndl) * vis;
  vec3 col = albedo * light;
  // looking toward the sun the sward glows: light passes through the blades
  float back = pow(max(dot(viewDir, uSunDir), 0.0), 2.0);
  col += albedo * uSunCol * vec3(0.90, 1.00, 0.42) * (0.10 + 0.45 * back) * vis * grassAmt * (1.0 - near * 0.5);

  // amber spill from the cabin
  vec3 lc = uCabinLight - vWorld;
  float ld = dot(lc, lc);
  col += albedo * vec3(1.0, 0.52, 0.16) * (1.0 - 0.9 * uDay) * 26.0 / (1.0 + ld * 0.55);

  // campfire
  vec3 lf = uFireLight.xyz - vWorld;
  col += albedo * vec3(1.0, 0.44, 0.12) * uFireLight.w * (1.0 - 0.6 * uDay) * 9.0 / (1.0 + dot(lf, lf) * 0.45);
  // trampled, scorched earth around the fire ring
  col *= mix(0.45, 1.0, smoothstep(0.5, 1.7, length(lf.xz)));

  if (wm > 0.001) {
    float depth = clamp((sw - sd) / 1.5, 0.0, 1.0);
    vec3 bedLit = pebble * 1.3 * (uAmb * 0.8 + uAuroraTint * 0.4 + uSunCol * 0.55 * vis);
    col = mix(col, waterColor(vWorld, viewDir, uTime, depth, bedLit, vis), wm);
  }

  float fog = 1.0 - exp(-dist * dist * uFogDensity * uFogDensity);
  col = mix(col, uFogColor, fog);
  gl_FragColor = vec4(col, 1.0);
}
`;
