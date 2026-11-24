// Final display-space pass: soft vignette + animated film grain.
// With TONE_AND_OUTPUT = 1 it is also the output pass: it reads the HDR buffer straight after the
// bloom, maps it with the same ACES filmic curve and exposure three's OutputPass uses, encodes it
// to sRGB, and then grades it, all in one full-screen pass instead of two (one read and one write
// of a 1.9-megapixel half-float buffer fewer every frame). Each neighbour of the sharpen is mapped
// the same way, so it works in display space as before.
export const FinalShader = {
  name: 'FinalShader',
  defines: { TONE_AND_OUTPUT: 1 },
  uniforms: {
    uExposure: { value: 1 },
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uGrain: { value: 0.012 },
    uVignette: { value: 0.55 },
    uDay: { value: 0 },
    uTexel: { value: null },
    uSharp: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main(){
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uGrain;
    uniform float uVignette;
    uniform float uDay;
    uniform vec2 uTexel;
    uniform float uSharp;
    uniform float uExposure;
    varying vec2 vUv;
    // three.js r160's ACESFilmicToneMapping and sRGBTransferOETF, under our own names
    vec3 rrtOdt(vec3 v){
      vec3 a = v * (v + 0.0245786) - 0.000090537;
      vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
      return a / b;
    }
    vec3 toDisplay(vec3 c){
    #if TONE_AND_OUTPUT == 1
      const mat3 inM = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
      const mat3 outM = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
      c *= uExposure / 0.6;
      c = clamp(outM * rrtOdt(inM * c), 0.0, 1.0);
      return mix(pow(c, vec3(0.41666)) * 1.055 - vec3(0.055), c * 12.92, vec3(lessThanEqual(c, vec3(0.0031308))));
    #else
      return c;
    #endif
    }
    vec3 fetch(vec2 uv){ return toDisplay(texture2D(tDiffuse, uv).rgb); }
    float hash(vec2 p){
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }
    void main(){
      vec4 c = vec4(fetch(vUv), 1.0);
      if (uSharp > 0.0) {
        // unsharp mask: push each pixel away from the average of its neighbours, gently,
        // and never past them (no halos round bright edges)
        vec3 n1 = fetch(vUv + vec2(uTexel.x, 0.0)), n2 = fetch(vUv - vec2(uTexel.x, 0.0));
        vec3 n3 = fetch(vUv + vec2(0.0, uTexel.y)), n4 = fetch(vUv - vec2(0.0, uTexel.y));
        vec3 lo = min(c.rgb, min(min(n1, n2), min(n3, n4))), hi = max(c.rgb, max(max(n1, n2), max(n3, n4)));
        c.rgb = clamp(c.rgb + (c.rgb - (n1 + n2 + n3 + n4) * 0.25) * uSharp, lo, hi);
      }
      vec2 q = vUv - 0.5;
      float v = smoothstep(0.95, 0.30, length(q * vec2(1.05, 1.25)));
      // The grade. Night wants rich colour and deep contrast for the aurora; daylight wants
      // restraint, or the meadow turns to poster paint: less saturation, a gentler curve,
      // a lighter vignette, and a faint split tone (cool shadows, warm highlights).
      float l0 = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      c.rgb = mix(vec3(l0), c.rgb, mix(1.26, 1.06, uDay));
      c.rgb = clamp(c.rgb, 0.0, 1.0);
      c.rgb = mix(c.rgb, c.rgb * c.rgb * (3.0 - 2.0 * c.rgb), mix(0.62, 0.40, uDay));
      float l1 = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      c.rgb *= mix(vec3(1.0), mix(vec3(0.965, 0.99, 1.045), vec3(1.035, 1.005, 0.955), smoothstep(0.15, 0.75, l1)), uDay);
      c.rgb = max(c.rgb - 0.010, 0.0) * 1.012;
      c.rgb *= mix(1.0 - uVignette * mix(1.0, 0.62, uDay), 1.0, v);
      float luma = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      float g = hash(gl_FragCoord.xy + fract(uTime * 7.31) * 913.0) - 0.5;
      c.rgb += g * uGrain * (1.0 - 0.6 * luma);
      gl_FragColor = vec4(max(c.rgb, 0.0), 1.0);
    }
  `,
};

// Additive glow sprites used by the minigame (dust, firefly, nodes, sparks).
export const glowVertex = /* glsl */ `
uniform float uPixelRatio;
attribute vec3 aColor;
attribute float aSize;
attribute float aAlpha;
varying vec3 vColor;
varying float vAlpha;
void main(){
  vColor = aColor;
  vAlpha = aAlpha;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uPixelRatio;
}
`;

export const glowFragment = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main(){
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(p, p);
  float core = exp(-r2 * 14.0);
  float halo = exp(-r2 * 3.2) * 0.35;
  float spike = exp(-abs(p.x) * 14.0) * exp(-abs(p.y) * 2.6) + exp(-abs(p.y) * 14.0) * exp(-abs(p.x) * 2.6);
  float a = (core + halo + spike * 0.18) * vAlpha * smoothstep(1.0, 0.7, r2);
  gl_FragColor = vec4(vColor * a, 1.0);
}
`;

// Foreground lens blur. The camera is focused out in the landscape, so anything
// closer than the focus distance melts into soft discs the way it does through a
// real lens, while the valley, the fjells and the stars stay sharp.
export const LensShader = {
  name: 'LensShader',
  uniforms: {
    tDiffuse: { value: null },
    tDepth: { value: null },
    uTexel: { value: null },
    uNear: { value: 0.1 },
    uFar: { value: 4000 },
    uFocus: { value: 11 },
    uAperture: { value: 0.22 },
    uMaxBlur: { value: 12 },
    uTaps: { value: 22 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main(){
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform sampler2D tDepth;
    uniform vec2 uTexel;
    uniform float uNear;
    uniform float uFar;
    uniform float uFocus;
    uniform float uAperture;
    uniform float uMaxBlur;
    uniform float uTaps;
    varying vec2 vUv;
    float viewZ(vec2 uv){
      float z = texture2D(tDepth, uv).x * 2.0 - 1.0;
      return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear));
    }
    // blur radius in pixels for something at distance z
    float coc(float z){
      return clamp(uAperture * max(uFocus - z, 0.0) / max(z, 0.25), 0.0, 1.0) * uMaxBlur;
    }
    void main(){
      vec3 c0 = texture2D(tDiffuse, vUv).rgb;
      float r0 = coc(viewZ(vUv));
      vec3 acc = c0;
      float wsum = 1.0;
      // 22 taps on a golden-angle spiral; a tap counts when its own blur disc reaches this pixel
      for (int i = 1; i <= 22; i++) {
        float fi = float(i);
        if (fi > uTaps) break;
        float rad = sqrt(fi / uTaps) * uMaxBlur;
        float ang = fi * 2.39996323;
        vec2 uv = vUv + vec2(cos(ang), sin(ang)) * rad * uTexel;
        float rs = max(coc(viewZ(uv)), r0);
        float w = smoothstep(rad - 1.5, rad + 0.5, rs);
        acc += texture2D(tDiffuse, uv).rgb * w;
        wsum += w;
      }
      gl_FragColor = vec4(acc / wsum, 1.0);
    }
  `,
};
