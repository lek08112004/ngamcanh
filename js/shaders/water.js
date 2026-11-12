// Stream surface: rippled normal, fresnel reflection of the night sky
// (gradient + aurora) and star glints. Requires commonGLSL + auroraGLSL.
export const waterGLSL = /* glsl */ `
vec3 skyReflect(vec3 r){
  float el = max(r.y, 0.0);
  vec3 c = mix(vec3(0.020, 0.055, 0.080), vec3(0.006, 0.012, 0.034), pow(el, 0.55));
  c += aurora(r, uAurTime, 8, 0.5) * 1.15;
  c += uGlow * exp(-el * 9.0) * 0.30 * uAurora;
  vec3 dayc = mix(vec3(0.40, 0.66, 0.95), vec3(0.03, 0.15, 0.58), pow(el, 0.55));
  return mix(c, dayc, uDay);
}

vec3 waterColor(vec3 wp, vec3 viewDir, float t){
  vec2 uv = wp.xz;
  float n1 = vnoise(uv * 1.6 + vec2(t * 0.35, t * 0.22));
  float n2 = vnoise(uv * 3.7 - vec2(t * 0.50, -t * 0.31));
  float n3 = vnoise(uv * 0.6 + vec2(-t * 0.12, t * 0.08));
  vec3 n = normalize(vec3(
    (n1 - 0.5) * 0.20 + (n2 - 0.5) * 0.10 + (n3 - 0.5) * 0.12,
    1.0,
    (n2 - 0.5) * 0.20 + (n1 - 0.5) * 0.10));
  vec3 r = reflect(viewDir, n);
  r.y = abs(r.y);
  vec3 sky = skyReflect(normalize(r));
  float fres = 0.45 + 0.55 * pow(1.0 - max(dot(-viewDir, n), 0.0), 3.0);
  float glint = pow(vnoise(uv * 13.0 + vec2(t * 0.9, -t * 0.6)), 14.0);
  return sky * fres + vec3(0.003, 0.010, 0.014) + glint * mix(vec3(0.7, 0.9, 1.0) * 0.9, vec3(1.6, 1.5, 1.3), uDay);
}
`;
