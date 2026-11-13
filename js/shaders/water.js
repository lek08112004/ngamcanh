// Stream surface. Ripples drift downstream; the surface mirrors the sky (gradient,
// aurora, sun glitter) by fresnel, and where you look down into it you see the pebbled
// bed, tinted by depth and, on a sunny morning, crossed by caustics.
// Requires commonGLSL + auroraGLSL, and the includer's uSunDir / uSunCol uniforms.
export const waterGLSL = /* glsl */ `
vec3 skyReflect(vec3 r){
  float el = max(r.y, 0.0);
  vec3 c = mix(vec3(0.020, 0.055, 0.080), vec3(0.006, 0.012, 0.034), pow(el, 0.55));
  c += aurora(r, uAurTime, 8, 0.5) * 1.15;
  c += uGlow * exp(-el * 9.0) * 0.30 * uAurora;
  vec3 dayc = mix(vec3(0.46, 0.68, 0.94), vec3(0.04, 0.17, 0.60), pow(el, 0.55));
  dayc += vec3(1.00, 0.78, 0.60) * exp(-el * 9.0) * 0.14;
  return mix(c, dayc, uDay);
}
float waterH(vec2 p, float t){
  // the stream runs roughly north (-z); small waves ride on a slow swell
  float h = vnoise(p * vec2(1.1, 0.75) + vec2(t * 0.10, t * 0.42)) * 0.55;
  h += vnoise(p * vec2(2.9, 2.1) + vec2(-t * 0.21, t * 0.74)) * 0.28;
  h += vnoise(p * vec2(7.1, 5.3) + vec2(t * 0.33, t * 1.15)) * 0.12;
  return h;
}
// depth: 0 at the bank .. 1 mid-stream; bed: lit colour of the stream bed; vis: sun visibility
vec3 waterColor(vec3 wp, vec3 viewDir, float t, float depth, vec3 bed, float vis){
  vec2 uv = wp.xz;
  float e = 0.07;
  float h0 = waterH(uv, t);
  vec2 g = vec2(waterH(uv + vec2(e, 0.0), t) - h0, waterH(uv + vec2(0.0, e), t) - h0) / e;
  float calm = mix(0.55, 1.0, depth);                    // quieter in the shallows
  vec3 n = normalize(vec3(-g.x * 0.085 * calm, 1.0, -g.y * 0.085 * calm));
  float cosv = max(dot(-viewDir, n), 0.0);
  float fres = 0.02 + 0.98 * pow(1.0 - cosv, 5.0);
  vec3 r = reflect(viewDir, n);
  r.y = abs(r.y);
  r = normalize(r);
  vec3 sky = skyReflect(r);

  // looking down through the water: the bed, darker and greener with depth
  vec3 absorb = exp(-vec3(1.9, 0.75, 0.62) * (0.25 + depth * 1.4));
  vec2 buv = uv + n.xz * 0.6 * depth;                  // refraction wobble
  float c1 = 1.0 - abs(2.0 * vnoise(buv * 2.3 + vec2(t * 0.20, t * 0.31)) - 1.0);
  float c2 = 1.0 - abs(2.0 * vnoise(buv * 3.1 - vec2(t * 0.17, -t * 0.26) + 5.0) - 1.0);
  float caustic = pow(c1 * c2, 3.0) * 2.4;
  vec3 under = bed * absorb * (1.0 + caustic * uDay * vis * (1.0 - 0.6 * depth));
  under += vec3(0.004, 0.012, 0.014) * (1.0 + 4.0 * uDay);

  vec3 col = mix(under, sky, fres);
  // sun glitter on the wave faces, starlight glints at night
  float sunSpec = pow(max(dot(r, uSunDir), 0.0), 420.0) * 26.0 + pow(max(dot(r, uSunDir), 0.0), 40.0) * 0.35;
  col += uSunCol * sunSpec * vis * 0.35;
  float glint = pow(vnoise(uv * 15.0 + vec2(t * 0.9, -t * 0.6)), 24.0) * (0.4 + 0.6 * fres);
  col += glint * vec3(0.7, 0.9, 1.0) * 1.6 * (1.0 - uDay);
  // a thin line of foam and wet shine where water meets the bank
  float foam = smoothstep(0.16, 0.0, depth) * smoothstep(0.35, 0.75, vnoise(uv * 5.0 + vec2(0.0, t * 0.5)));
  col = mix(col, vec3(0.75, 0.80, 0.82) * (uAmb + uSunCol * 0.5 * vis), foam * 0.55);
  return col;
}
`;
