import { commonGLSL } from './common.js';
import { lightGLSL } from './light.js';

// The fjells around the valley are real geometry (a ring of terrain, see world.js).
// Their smooth normal, hollows (occlusion) and the long shadows of the low morning sun
// are baked once into a small map when the page loads, so the faces never look faceted.
// On top of that the shader carves rock detail whose fineness follows the size of a
// pixel on the mountainside: strata and cracks appear as you zoom in, and cost nothing
// when the range is far away.
export const mountainVertex = /* glsl */ `
attribute float aRise;      // height above the valley floor
varying vec3 vWorld;
varying float vRise;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vRise = aRise;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

export const mountainFragment = /* glsl */ `
uniform float uTime;
uniform float uDay;
uniform vec3 uAmb;
uniform vec3 uSunCol;
uniform vec3 uSunDir;
uniform vec3 uAuroraTint;
uniform vec3 uFogColor;
uniform sampler2D uMtnMap;  // rg: normal.xz, b: occlusion, a: baked sun visibility
uniform vec4 uMtnRect;      // xy: min corner (world xz), zw: 1 / size
varying vec3 vWorld;
varying float vRise;
${commonGLSL}
${lightGLSL}
float ridged(vec2 p){ return 1.0 - abs(2.0 * vnoise(p) - 1.0); }
void main(){
  vec2 xz = vWorld.xz;
  vec4 m = texture2D(uMtnMap, (xz - uMtnRect.xy) * uMtnRect.zw);
  vec3 n = vec3(m.x * 2.0 - 1.0, 0.0, m.y * 2.0 - 1.0);
  n.y = sqrt(max(1.0 - dot(n.xz, n.xz), 0.03));
  n = normalize(n);
  float ao = m.z;
  float lit = m.w;
  vec3 toCam = cameraPosition - vWorld;
  float dist = length(toCam);
  float slope = 1.0 - n.y;

  float big = vnoise(xz * 0.011) * 0.65 + vnoise(xz * 0.027 + 4.0) * 0.35;
  float mid = fbm2(xz * 0.045 + 7.0);

  // size of a pixel on the mountainside, in metres: detail finer than this is averaged out
  float px = max(length(dFdx(vWorld)), length(dFdy(vWorld)));
  float lT = 1.0 - smoothstep(0.30, 1.3, px);

  // ---- what grows where
  float treeN = vnoise(xz * 0.021 + 3.0) * 0.62 + vnoise(xz * 0.055 + 9.0) * 0.38;
  float crowns = vnoise(xz * 0.17) * 0.6 + vnoise(xz * 0.41 + 5.0) * 0.4;
  float treeline = 104.0 + 80.0 * treeN - 30.0 * (1.0 - ao);
  float forest = (1.0 - smoothstep(treeline - 40.0, treeline + 14.0, vRise)) * (1.0 - smoothstep(0.36, 0.72, slope + (mid - 0.5) * 0.3));
  forest *= smoothstep(2.0, 20.0, vRise - 16.0 * treeN + 8.0);
  float fine = mix(0.5, vnoise(xz * 0.9 + 11.0) * 0.55 + vnoise(xz * 2.1 + 3.0) * 0.45, lT);   // single trees
  forest = smoothstep(0.20, 0.70, forest + (crowns - 0.5) * 0.34 + (fine - 0.5) * 0.30);
  float snowLine = 218.0 + (big - 0.5) * 90.0;
  float snow = smoothstep(snowLine - 22.0, snowLine + 34.0, vRise + (mid - 0.5) * 46.0) * (1.0 - smoothstep(0.40, 0.62, slope));
  // old snow lingers in the hollows a little below the line
  snow = max(snow, smoothstep(snowLine - 80.0, snowLine - 20.0, vRise) * smoothstep(0.46, 0.24, ao) * (1.0 - smoothstep(0.45, 0.7, slope)) * smoothstep(0.42, 0.62, mid));
  float meadow = (1.0 - smoothstep(0.30, 0.56, slope + (mid - 0.5) * 0.24)) * (1.0 - smoothstep(150.0, 240.0, vRise + big * 70.0));

  // ---- rock relief, finer as a pixel covers less of the mountainside
  float h = 0.0;
  float rockTone = mid;
  float crack = 0.0;
  float cliff = smoothstep(0.22, 0.55, slope);
  // gullies: noise stretched tall, so on a cliff it reads as streaks running down the face
  float gully = vnoise3(vec3(xz * 0.15, vWorld.y * 0.022 + big * 2.0));
#if MTN_Q > 0
  float l1 = 1.0 - smoothstep(0.8, 3.2, px);
  float l2 = 1.0 - smoothstep(0.12, 0.55, px);
  float d1 = ridged(xz * 0.11 + mid * 1.5);
  // tilted beds of rock, not level contours
  float bedY = dot(vWorld, vec3(0.045, 0.085, 0.030)) + mid * 1.6 + big * 3.0;
  float strata = smoothstep(0.2, 0.8, 0.5 + 0.5 * sin(bedY * 6.2831853));
  h = mid * 7.0 + gully * 5.0 * cliff + d1 * 2.4 * l1 + strata * 1.6 * cliff * l1;
  rockTone = mid * 0.34 + gully * 0.40 * cliff + d1 * 0.20 * l1 + strata * 0.22 * cliff - 0.06;
#if MTN_Q > 1
  float d2 = vnoise(vec2(xz.x * 0.83 + xz.y * 0.31, vWorld.y * 1.25 + xz.y * 0.47));
  crack = pow(ridged(xz * 0.31 + vec2(mid * 2.2, vWorld.y * 0.13)), 7.0) * l2;
  h += d2 * 0.30 * l2;
  rockTone += (d2 - 0.5) * 0.20 * l2;
#endif
  h += (crowns * 1.5 + fine * 3.5 * l1) * forest;
#else
  rockTone = mid * 0.5 + gully * 0.3 * cliff;
#endif

  // ---- colour
  vec3 rock = mix(vec3(0.026, 0.025, 0.026), vec3(0.128, 0.114, 0.098), clamp(rockTone, 0.0, 1.0));
  rock *= mix(vec3(1.10, 0.97, 0.84), vec3(0.88, 0.95, 1.05), big);          // warm and cold beds
  rock *= 1.0 - 0.35 * crack;
  rock = mix(rock, vec3(0.085, 0.090, 0.046), smoothstep(0.50, 0.8, treeN) * (1.0 - slope) * 0.55);   // lichen
  vec3 turf = mix(vec3(0.052, 0.078, 0.024), vec3(0.105, 0.092, 0.042), clamp(vRise / 190.0 + (mid - 0.5) * 0.7, 0.0, 1.0));
  turf *= 0.8 + 0.4 * gully;
  vec3 spruce = mix(vec3(0.010, 0.024, 0.012), vec3(0.030, 0.058, 0.021), smoothstep(0.2, 0.8, crowns * 0.35 + fine * 0.65)) * (0.8 + 0.4 * treeN);
  vec3 albedo = mix(rock, turf, meadow);
  albedo = mix(albedo, spruce, forest);
  albedo = mix(albedo, vec3(0.74, 0.79, 0.86), snow);

  // ---- light
  vec3 nb = n;
#if MTN_Q > 0
  {
    vec3 dpx = dFdx(vWorld), dpy = dFdy(vWorld);
    float hx = dFdx(h), hy = dFdy(h);
    vec3 r1 = cross(dpy, n), r2 = cross(n, dpx);
    float det = dot(dpx, r1);
    vec3 grad = sign(det) * (hx * r1 + hy * r2);
    float amt = (1.0 - 0.85 * snow) * (1.0 - 0.5 * meadow * (1.0 - forest));
    nb = normalize(abs(det) * n - grad * 1.0 * amt);
  }
#endif
  float diff = max(dot(nb, uSunDir), 0.0);
  float occ = mix(0.42, 1.0, ao);
  vec3 ambC = mix(uAmb, vec3(dot(uAmb, vec3(0.3333))), 0.4 * uDay);   // shade on a far hillside is greyer than the sky overhead
  vec3 skyL = ambC * (0.42 + 0.58 * nb.y) * occ;
  vec3 bounce = uSunCol * vec3(0.30, 0.27, 0.18) * 0.16 * (1.0 - 0.6 * nb.y) * occ;   // light thrown back up by sunlit ground
  vec3 aur = uAuroraTint * (0.22 + 0.9 * max(dot(nb, normalize(vec3(-0.2, 0.55, -0.8))), 0.0)) * occ;
  vec3 light = skyL + bounce + uSunCol * diff * lit * cloudShade(xz, uTime) + aur;
  vec3 col = albedo * light;
  // sunlit snow glints a little toward the sun
  vec3 V = toCam / dist;
  col += uSunCol * snow * lit * pow(max(dot(nb, normalize(uSunDir + V)), 0.0), 24.0) * 0.10;

  // ---- aerial perspective: distance washes the range toward the colour of the air
  float air = 1.0 - exp(-dist * mix(0.0017, 0.00048, uDay));
  float toSun = pow(max(dot(-V, uSunDir), 0.0), 4.0);
  vec3 haze = mix(uFogColor, uFogColor * 1.08 + vec3(0.30, 0.19, 0.06) * toSun, uDay);
  col = mix(col, haze, air);
  gl_FragColor = vec4(col, 1.0);
}
`;
