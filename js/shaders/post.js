// Final display-space pass: soft vignette + animated film grain.
export const FinalShader = {
  name: 'FinalShader',
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uGrain: { value: 0.012 },
    uVignette: { value: 0.55 },
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
    varying vec2 vUv;
    float hash(vec2 p){
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 q = vUv - 0.5;
      float v = smoothstep(0.95, 0.30, length(q * vec2(1.05, 1.25)));
      // gentle grade: a touch more colour and a soft S-curve
      float l0 = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      c.rgb = mix(vec3(l0), c.rgb, 1.26);
      c.rgb = clamp(c.rgb, 0.0, 1.0);
      c.rgb = mix(c.rgb, c.rgb * c.rgb * (3.0 - 2.0 * c.rgb), 0.62);
      c.rgb = max(c.rgb - 0.010, 0.0) * 1.012;
      c.rgb *= mix(1.0 - uVignette, 1.0, v);
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
