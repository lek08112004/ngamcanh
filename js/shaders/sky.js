import { commonGLSL } from './common.js';
import { auroraGLSL } from './aurora.js';
import { milkyWayGLSL } from './milkyway.js';

export const skyVertex = /* glsl */ `
varying vec3 vDir;
void main(){
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const skyFragment = /* glsl */ `
uniform float uTime;
uniform float uFrame;
uniform int uSteps;        // aurora slices (quality ladder)
uniform mat3 uSkyRot;      // celestial rotation (time-lapse)
uniform float uStarGain;
uniform vec3 uSunDir;
uniform vec3 uGalN;
uniform vec3 uGalC;
uniform vec4 uMetHead;     // xyz: head direction, w: intensity
uniform vec3 uMetTail;
uniform vec3 uMetColor;
varying vec3 vDir;
${commonGLSL}
${auroraGLSL}
${milkyWayGLSL}

vec3 meteor(vec3 d){
  if (uMetHead.w <= 0.001) return vec3(0.0);
  vec3 pa = d - uMetTail;
  vec3 ba = uMetHead.xyz - uMetTail;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  float dist = length(pa - ba * h);
  float trail = exp(-dist * dist / (0.0011 * 0.0011)) * h * h * h;
  float soft = exp(-dist * dist / (0.006 * 0.006)) * h * h * 0.10;
  float hd = length(d - uMetHead.xyz);
  float head = exp(-hd * hd / (0.0035 * 0.0035));
  return (uMetColor * (trail * 2.2 + soft) + vec3(1.0, 0.97, 0.9) * head * 3.0) * uMetHead.w;
}

vec3 nightSky(vec3 d){
  float el = max(d.y, 0.0);
  vec3 ds = uSkyRot * d;                           // direction in the rotating star frame

  // night gradient + airglow
  vec3 col = mix(vec3(0.010, 0.042, 0.062), vec3(0.003, 0.008, 0.030), pow(el, 0.5));
  col += vec3(0.010, 0.006, 0.030) * (1.0 - el) * 0.5;

  float dens;
  vec3 mw = milkyWay(ds, dens);
  col += mw * 0.50 * uStarGain;

  float boost = 1.0 + 2.2 * clamp(dens, 0.0, 1.5);
  vec3 stars = starLayer(ds, 150.0, 0.24 * boost, 0.11, uTime);
  stars += starLayer(ds, 260.0, 0.13 * boost, 0.20, uTime * 0.7) * 0.6;
  float ext = smoothstep(0.0, 0.16, d.y);          // atmospheric extinction
  col += stars * (0.35 + 0.65 * ext) * 1.5 * uStarGain;

  // a sub-step jitter hides residual slice contours without visible grain
  float jit = 0.5 + (hash21(gl_FragCoord.xy + uFrame * vec2(37.0, 17.0)) - 0.5) * 0.85;
  vec3 au = aurora(d, uAurTime, uSteps, jit);
  col += au;

  // horizon glow fed by the aurora
  float az = smoothstep(-0.4, 0.9, dot(normalize(d.xz + vec2(1e-5)), normalize(vec2(-0.15, -1.0))));
  col += uGlow * exp(-el * 11.0) * (0.25 + 0.75 * az) * 0.42 * uAurora;
  col += (uGlow * 0.35 + vec3(0.03, 0.08, 0.08)) * exp(-el * 5.0) * 0.30 * uAurora;

  // low clouds: dark bodies, undersides lit by aurora
  float cm = cloudMask(d, uTime);
  vec3 cloudCol = vec3(0.012, 0.020, 0.032)
    + (uGlow * 0.22 + au * 0.10) * uAurora * smoothstep(0.30, 0.04, d.y);
  col = mix(col, cloudCol, cm * 0.93);

  col += meteor(d);
  return col;
}

// Clear spring morning: deep blue overhead, milky warm horizon, low sun, fair-weather clouds.
vec3 daySky(vec3 d){
  float el = max(d.y, 0.0);
  vec3 col = mix(vec3(0.40, 0.66, 0.95), vec3(0.020, 0.13, 0.58), pow(el, 0.55));
  float sd = max(dot(d, uSunDir), 0.0);
  col += vec3(1.00, 0.72, 0.42) * pow(sd, 12.0) * 0.26;
  col += vec3(1.00, 0.86, 0.66) * pow(sd, 90.0) * 0.8;
  col += vec3(1.00, 0.78, 0.60) * exp(-el * 9.0) * 0.14;
  if (d.y > 0.0) {
    vec2 p = d.xz / (d.y + 0.22) * 0.9 + vec2(uTime * 0.006, 0.0);
    float c = fbm2(p * 0.8 + vec2(2.0, 5.0));
    float c2 = fbm2(p * 2.6 + vec2(9.0, 1.0));
    float m = smoothstep(0.57, 0.80, c * 0.72 + c2 * 0.28) * smoothstep(0.0, 0.10, d.y);
    vec3 cc = mix(vec3(0.62, 0.66, 0.80), vec3(1.0, 0.99, 0.96), smoothstep(0.58, 0.84, c * 0.72 + c2 * 0.28)) * (0.95 + 0.30 * pow(sd, 4.0));
    col = mix(col, cc, m * 0.92);
    col += vec3(1.0, 0.95, 0.85) * smoothstep(0.99930, 0.99972, sd) * 9.0 * (1.0 - m);
  }
  return col;
}

void main(){
  vec3 d = normalize(vDir);
  if (d.y < -0.08) {
    gl_FragColor = vec4(mix(vec3(0.004, 0.010, 0.014), vec3(0.34, 0.54, 0.82), uDay), 1.0);
    return;
  }
  vec3 col = vec3(0.0);
  if (uDay < 0.995) col = nightSky(d);
  if (uDay > 0.005) col = mix(col, daySky(d), uDay);
  // the blush of dawn and dusk while one turns into the other
  float sd = max(dot(normalize(d.xz + vec2(1e-5)), normalize(uSunDir.xz)), 0.0);
  col += vec3(1.0, 0.42, 0.22) * exp(-max(d.y, 0.0) * 5.0) * (0.35 + 0.65 * sd) * uDay * (1.0 - uDay) * 2.2;
  gl_FragColor = vec4(col, 1.0);
}
`;

// Bright foreground stars rendered as points (twinkle + colour temperature).
export const starPointsVertex = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
uniform float uStarGain;
uniform float uZoom;
attribute float aSize;
attribute float aPhase;
attribute vec3 aColor;
varying vec3 vColor;
varying float vFade;
${commonGLSL}
void main(){
  vec3 d = normalize((modelMatrix * vec4(position, 0.0)).xyz);
  float tw = 0.72 + 0.28 * sin(uTime * (1.0 + aPhase * 2.6) + aPhase * 50.0);
  vColor = aColor * tw * uStarGain;
  vFade = (1.0 - 0.95 * cloudMask(d, uTime)) * smoothstep(0.0, 0.12, d.y);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uPixelRatio * (0.85 + 0.3 * tw) * uZoom;
}
`;

export const starPointsFragment = /* glsl */ `
varying vec3 vColor;
varying float vFade;
void main(){
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(p, p);
  float core = exp(-r2 * 22.0);
  float halo = exp(-r2 * 5.0) * 0.14;
  float spike = exp(-abs(p.x) * 16.0) * exp(-abs(p.y) * 3.0) + exp(-abs(p.y) * 16.0) * exp(-abs(p.x) * 3.0);
  float a = (core + halo + spike * 0.05) * vFade;
  gl_FragColor = vec4(vColor * a, 1.0);
}
`;
