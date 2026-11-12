// Milky Way band with volumetric-looking dust lanes and coloured nebulae,
// plus procedural star fields. Requires commonGLSL.
// Expects `uniform vec3 uGalN; uniform vec3 uGalC;` (band normal, core direction).
export const milkyWayGLSL = /* glsl */ `
vec3 milkyWay(vec3 d, out float dens){
  dens = 0.0;
  float b = dot(d, uGalN);
  if (abs(b) > 0.62) return vec3(0.0);
  vec3 inPlane = normalize(d - b * uGalN);
  float cl = dot(inPlane, uGalC);
  float core = smoothstep(-0.35, 1.0, cl);
  float width = mix(0.060, 0.135, core * core);

  vec3 q = d * 3.0;
  float warp = fbm3(q * 1.3, 3);
  float bw = b + (warp - 0.5) * 0.09;
  float band = exp(-bw * bw / (width * width));
  float bulge = exp(-(1.0 - cl) * 8.0) * exp(-b * b / 0.035);
  if (band < 0.004 && bulge < 0.004) return vec3(0.0);

  float clouds = fbm3(q * 3.4 + warp * 1.8, 5);
  float detail = fbm3(q * 11.0 + vec3(3.0, 1.0, 6.0), 3);
  float cl3 = clouds * clouds * (0.55 + 0.9 * detail);
  float d0 = band * (0.16 + 2.1 * cl3) * (0.22 + 1.1 * core * core);
  dens = d0 + bulge * 0.9 * (0.6 + 0.8 * detail);

  // dust lanes: dark filaments hugging the mid-plane
  float dn = fbm3(q * 5.2 + vec3(5.2, 1.3, 8.1) + warp * 2.2, 4);
  float fil = 1.0 - abs(2.0 * fbm3(q * 9.3 + vec3(2.0, 9.0, 4.0), 3) - 1.0);
  float lane = smoothstep(0.34, 0.68, dn * 0.7 + fil * 0.3);
  lane *= exp(-pow((bw + 0.012) / (width * 0.62), 2.0));

  vec3 warm   = vec3(1.00, 0.60, 0.32);
  vec3 cool   = vec3(0.40, 0.52, 1.00);
  vec3 mag    = vec3(1.00, 0.18, 0.52);
  vec3 teal   = vec3(0.18, 0.82, 0.74);
  vec3 purple = vec3(0.44, 0.22, 0.92);

  vec3 col = mix(cool, warm, clamp(core * core * 1.25 + bulge, 0.0, 1.0));
  float neb = fbm3(q * 3.1 + vec3(11.0, 3.0, 7.0), 3);
  col = mix(col, mag, smoothstep(0.36, 0.74, neb) * 0.70);
  col = mix(col, teal, smoothstep(0.56, 0.78, 1.0 - neb) * 0.18 * (1.0 - core));
  col = mix(col, purple, (1.0 - band) * 0.7);
  col *= dens;
  col *= 1.0 - 0.86 * lane;
  // warm rim where dust thins out
  col += warm * vec3(1.0, 0.55, 0.35) * lane * (1.0 - lane) * band * 0.25;
  // emission nebula knots
  float knot = smoothstep(0.62, 0.92, fbm3(q * 6.0 + vec3(1.0, 17.0, 3.0), 3)) * band;
  col += mag * knot * 0.35;
  return col;
}

vec3 starLayer(vec3 d, float scale, float density, float radius, float t){
  vec3 p = d * scale;
  vec3 id = floor(p);
  vec3 f = fract(p);
  vec3 h = hash33(id);
  float present = step(1.0 - density, hash31(id + 17.0));
  vec3 pos = 0.5 + (h - 0.5) * 0.6;
  float dist = length(f - pos);
  float mag = pow(hash31(id + 3.7), 5.0);
  float tw = 0.78 + 0.22 * sin(t * (1.2 + h.y * 3.5) + h.z * 40.0);
  float core = 1.0 - smoothstep(0.0, radius * (0.6 + mag), dist);
  float temp = hash31(id + 9.1);
  vec3 c = mix(vec3(0.58, 0.74, 1.0), vec3(1.0), smoothstep(0.0, 0.45, temp));
  c = mix(c, vec3(1.0, 0.80, 0.52), smoothstep(0.62, 1.0, temp));
  return c * core * core * (0.22 + 2.8 * mag) * tw * present;
}
`;
