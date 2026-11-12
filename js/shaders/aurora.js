// Volumetric aurora: a 2D curtain field extruded vertically and integrated
// along the view ray through a stack of altitude slices.
// Requires commonGLSL. Declares its own uniforms (see `shared.aurora` in main.js).
export const auroraGLSL = /* glsl */ `
uniform float uAurora;     // overall intensity
uniform float uAurTime;    // integrated animation time (speed varies per mood)
uniform float uAurTall;    // top altitude of the curtains
uniform vec3 uAurLow;      // colour at the lower hem
uniform vec3 uAurMid;      // colour of the body
uniform vec3 uAurHigh;     // colour of the crown
uniform vec3 uGlow;        // horizon glow
uniform float uDay;        // 0 night .. 1 morning
vec3 auroraPalette(float h, float m){
  vec3 c = mix(uAurLow, uAurLow * vec3(1.0, 1.0, 0.55) + vec3(0.42, 0.0, 0.0) * uAurLow.g, m * 0.55);
  c = mix(c, uAurMid, smoothstep(0.34, 0.74, h + (m - 0.5) * 0.40));
  c = mix(c, uAurHigh, smoothstep(0.78, 1.0, h));
  return c;
}

// x: curtain intensity, y: colour variation
// fp is how far the sample point moves between two neighbouring altitude slices.
// Ribbons and rays are widened to at least that footprint, so slices always overlap
// and the integral stays smooth without any dithering noise.
vec2 auroraField(vec2 p, float t, float fp){
  float w1 = vnoise(p * 0.45 + vec2(t * 0.021, 3.1));
  float w2 = vnoise(p * 0.45 + vec2(7.7, -t * 0.017));
  vec2 q = p + 0.9 * vec2(w1, w2);
  float n = vnoise(q * 0.55 + vec2(t * 0.013, 0.0));
  float tri = abs(fract(n * 3.0 + t * 0.004) * 2.0 - 1.0);
  float d = 1.0 - tri;
  float w = max(0.11, fp * 3.8);
  float band = exp(-d * d / (w * w)) * pow(0.11 / w, 0.75) + 0.035 * tri * tri;
  float rn = vnoise(vec2(q.x * 7.0 + q.y * 4.6, t * 0.22 + q.y * 1.4));
  float rays = mix(0.55, 0.10 + 0.90 * rn * rn * 1.9, clamp(1.0 - fp * 8.0, 0.0, 1.0));
  float act = smoothstep(0.28, 0.66, vnoise(p * 0.17 + vec2(-t * 0.008, 11.0)));
  return vec2(band * rays * act, w1);
}

vec3 aurora(vec3 rd, float t, int steps, float dither){
  if (rd.y < 0.005) return vec3(0.0);
  vec3 col = vec3(0.0);
  float fs = float(steps);
  float dH = (uAurTall - 1.0) / fs;
  float inv = 1.0 / (rd.y + 0.20);
  float fp = length(rd.xz) * dH * inv;
  for (int i = 0; i < 40; i++) {
    if (i >= steps) break;
    float fi = (float(i) + dither) / fs;
    float H = mix(1.0, uAurTall, fi);
    vec2 p = rd.xz * (H * inv);
    vec2 f = auroraField(p, t, fp);
    float prof = smoothstep(0.0, 0.12, fi) * (exp(-fi * 2.6) + 0.18 * exp(-fi * 0.9));
    col += auroraPalette(fi, f.y) * f.x * prof;
  }
  col *= 14.5 / fs;
  float bias = 0.45 + 0.55 * smoothstep(-0.3, 0.7, dot(normalize(rd.xz + vec2(1e-5)), normalize(vec2(-0.3, -1.0))));
  float horizon = smoothstep(0.005, 0.10, rd.y);
  // the display belongs to the northern horizon; overhead it thins out and leaves the stars alone
  float zenith = mix(1.0, 0.30, smoothstep(0.42, 0.92, rd.y));
  return col * bias * horizon * zenith * uAurora;
}
`;
