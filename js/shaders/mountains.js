import { commonGLSL } from './common.js';

// Distant fjells drawn on wide cylinders around the whole world (parallax layers).
// The ridge is sampled on a circle in noise space, so it closes on itself seamlessly.
export const mountainVertex = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const mountainFragment = /* glsl */ `
uniform float uSeed;
uniform float uFreq;
uniform vec3 uColor;
uniform vec3 uDayColor;
uniform float uDay;
uniform vec3 uAuroraTint;
varying vec2 vUv;
${commonGLSL}
float ridge(float a){
  vec2 c = vec2(cos(a), sin(a));
  float h = 0.0;
  float amp = 0.5;
  float f = uFreq * 0.42;
  for (int i = 0; i < 5; i++) {
    h += amp * vnoise(c * f + vec2(uSeed + float(i) * 3.1, uSeed * 1.7));
    amp *= 0.5;
    f *= 2.13;
  }
  return h;
}
void main(){
  float a = vUv.x * 6.2831853;
  float x = a * uFreq * 0.45;
  float r = ridge(a);
  // plateau shaping: flatten the summits like Nordic fjells
  float h = 0.22 + 0.72 * smoothstep(0.18, 0.80, r) * (0.82 + 0.18 * r);
  float alpha = smoothstep(h, h - 0.006, vUv.y);
  if (alpha < 0.002) discard;
  float depth = h - vUv.y;
  float tex = vnoise(vec2(x * 6.0, vUv.y * 22.0));
  float snow = smoothstep(0.62, 0.86, vnoise(vec2(x * 9.0 + 4.0, vUv.y * 34.0))) * smoothstep(0.22, 0.02, depth);

  // night: silhouettes rimmed by the aurora
  vec3 col = uColor * (0.75 + 0.5 * tex);
  col += uAuroraTint * 0.10 * smoothstep(0.16, 0.0, depth);
  col += vec3(0.030, 0.045, 0.060) * snow;
  col = mix(col, uColor * 1.6 + uAuroraTint * 0.04, smoothstep(0.30, 0.0, vUv.y) * 0.5);

  // day: slopes facing the sun are lit, snow on the high shoulders, haze at the foot
  float broad = vnoise(vec2(x * 1.6 + 9.0, vUv.y * 5.0));
  vec3 dc = uDayColor * (0.62 + 0.55 * broad) * (0.84 + 0.32 * tex);
  dc = mix(dc, dc * vec3(0.72, 0.95, 0.70), smoothstep(0.45, 0.10, vUv.y / h) * 0.55);   // forested lower slopes
  float cap = smoothstep(0.70, 0.86, h) * smoothstep(0.055, 0.0, depth) * (0.35 + 0.65 * tex);
  dc = mix(dc, vec3(0.88, 0.91, 0.97), clamp(cap + snow * 0.07, 0.0, 1.0));
  dc = mix(dc, vec3(0.30, 0.46, 0.70), smoothstep(0.26, 0.0, vUv.y) * 0.30);
  col = mix(col, dc, uDay);
  gl_FragColor = vec4(col, alpha);
}
`;
