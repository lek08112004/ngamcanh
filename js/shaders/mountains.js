import { commonGLSL } from './common.js';
import { lightGLSL } from './light.js';

// The fjells around the valley are real geometry (a ring of terrain, see world.js).
// Rock, forest and snow are chosen from height and slope; light comes from the same
// sun, sky and aurora as everything else, then fades into the air with distance.
export const mountainVertex = /* glsl */ `
attribute float aRise;      // height above the valley floor
varying vec3 vWorld;
varying vec3 vNormal;
varying float vRise;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vNormal = normal;
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
varying vec3 vWorld;
varying vec3 vNormal;
varying float vRise;
${commonGLSL}
${lightGLSL}
void main(){
  vec3 n = normalize(vNormal);
  float slope = 1.0 - n.y;
  vec2 xz = vWorld.xz;
  float grain = fbm2(xz * 0.045);
  float fine = vnoise(xz * 0.35);

  // forest on the lower, gentler ground; bare rock above and on cliffs; snow on high shoulders
  vec3 forest = mix(vec3(0.018, 0.060, 0.030), vec3(0.045, 0.105, 0.040), grain);
  vec3 rock = mix(vec3(0.060, 0.058, 0.060), vec3(0.165, 0.150, 0.135), fine * 0.6 + grain * 0.4);
  vec3 snow = vec3(0.78, 0.82, 0.88);
  float tree = (1.0 - smoothstep(80.0, 150.0, vRise + grain * 50.0)) * (1.0 - smoothstep(0.34, 0.60, slope));
  vec3 albedo = mix(rock, forest, tree);
  float snowLine = smoothstep(185.0, 245.0, vRise + (grain - 0.5) * 80.0) * (1.0 - smoothstep(0.40, 0.62, slope));
  albedo = mix(albedo, snow, snowLine);
  // strata on steep faces
  albedo *= 1.0 - 0.18 * smoothstep(0.35, 0.7, slope) * (0.5 + 0.5 * sin(vWorld.y * 0.32 + grain * 9.0));

  float diff = max(dot(n, uSunDir), 0.0);
  float sky = 0.55 + 0.45 * n.y;
  vec3 aur = uAuroraTint * (0.25 + 0.9 * max(dot(n, normalize(vec3(-0.2, 0.55, -0.8))), 0.0));
  vec3 light = uAmb * sky + uSunCol * diff * cloudShade(xz, uTime) + aur;
  vec3 col = albedo * light;

  // aerial perspective
  float dist = length(cameraPosition - vWorld);
  float air = 1.0 - exp(-dist * mix(0.0017, 0.00042, uDay));
  col = mix(col, uFogColor * mix(1.0, 0.92, uDay), air);
  gl_FragColor = vec4(col, 1.0);
}
`;
