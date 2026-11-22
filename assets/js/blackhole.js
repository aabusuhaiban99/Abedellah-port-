/* Gargantua: a ray-marched black hole with gravitational lensing.
   Light bends around the hole (Schwarzschild photon paths, in units of the
   event-horizon radius), crosses a turbulent accretion disk in the y = 0 plane,
   and escapes to a procedural starfield. Written in GLSL ES 1.0 so it runs in
   raw WebGL (main page) and in three.js RawShaderMaterial (the theater). */

export const BH_VERT = `
attribute vec3 position;
varying vec2 vUv;
void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

export function bhFrag(steps = 120, linear = false) {
  return `
precision highp float;
#define STEPS ${steps}
uniform vec2 uRes;
uniform float uTime;
uniform vec3 uCamPos;
uniform mat3 uCamRot;
uniform float uFov;
uniform float uExposure;
uniform float uStars;

float h31(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n2(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * n2(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }

vec3 starfield(vec3 d) {
  vec3 col = vec3(0.0);
  for (int l = 0; l < 3; l++) {
    float sc = l == 0 ? 42.0 : (l == 1 ? 95.0 : 190.0);
    vec3 p = d * sc, id = floor(p), f = fract(p) - 0.5;
    float h = h31(id + float(l) * 13.1);
    if (h > 0.9) {
      vec3 o = vec3(h31(id + 1.3), h31(id + 2.7), h31(id + 5.1)) - 0.5;
      float r = length(f - o * 0.7);
      float b = pow((h - 0.9) / 0.1, 2.0) * (l == 0 ? 2.2 : (l == 1 ? 1.1 : 0.6));
      vec3 tint = mix(vec3(1.0, 0.86, 0.7), vec3(0.75, 0.85, 1.0), h31(id + 9.0));
      col += tint * b * smoothstep(0.09, 0.0, r);
    }
  }
  float band = exp(-pow(d.y * 2.2 - 0.25 * sin(d.x * 3.0), 2.0) * 3.0);
  col += (vec3(0.30, 0.16, 0.07) * fbm(d.xz * 4.0 + d.y) + vec3(0.05, 0.07, 0.11) * fbm(d.zx * 7.0)) * band * 0.07;
  return col * uStars;
}

vec3 disk(float r, float phi, float t) {
  float rin = 2.6, rout = 12.5;
  float x = (r - rin) / (rout - rin);
  float a = phi + t * 0.9 * pow(rin / r, 1.5);
  float turb = fbm(vec2(r * 1.4, a * 3.0 / 3.14159 * 4.0));
  float lanes = fbm(vec2(r * 6.0 - t * 0.2, a * 1.5));
  float dens = smoothstep(0.0, 0.05, x) * smoothstep(1.0, 0.35, x) * (0.35 + 1.0 * turb) * (0.55 + 0.7 * lanes);
  float temp = pow(clamp(1.0 - x, 0.0, 1.0), 2.4);
  vec3 c = mix(vec3(0.85, 0.24, 0.04), vec3(1.0, 0.62, 0.22), smoothstep(0.02, 0.45, temp));
  c = mix(c, vec3(1.0, 0.93, 0.80), smoothstep(0.45, 1.0, temp));
  return c * dens * (0.7 + 3.4 * temp);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  vec3 v = normalize(uCamRot * vec3(uv * uFov, -1.0));
  vec3 p = uCamPos;
  vec3 hv = cross(p, v); float h2 = dot(hv, hv);
  vec3 col = vec3(0.0); float alpha = 0.0; float minR = 1e3;
  for (int i = 0; i < STEPS; i++) {
    float r = length(p);
    minR = min(minR, r);
    if (r < 1.0) { alpha = 1.0; break; }
    float dt = clamp(0.065 * r, 0.015, 1.5);
    vec3 pp = p;
    v += -1.5 * h2 * p / pow(r, 5.0) * dt;
    p += v * dt;
    if (pp.y * p.y < 0.0) {
      vec3 q = mix(pp, p, pp.y / (pp.y - p.y));
      float rq = length(q.xz);
      if (rq > 2.6 && rq < 12.5) {
        vec3 e = disk(rq, atan(q.z, q.x), uTime);
        vec3 orb = normalize(vec3(-q.z, 0.0, q.x));
        e *= 1.0 + 0.55 * dot(orb, normalize(v));
        float a = clamp(dot(e, vec3(0.3)) * 0.55, 0.0, 0.96);
        col += (1.0 - alpha) * e;
        alpha += (1.0 - alpha) * a;
        if (alpha > 0.985) break;
      }
    }
    if (r > 70.0) break;
  }
  if (alpha < 1.0) col += (1.0 - alpha) * starfield(normalize(v));
  col += vec3(1.0, 0.55, 0.22) * 0.03 / (1.0 + pow(max(minR - 1.45, 0.0), 2.0) * 1.5) * (1.0 - alpha);
  col *= uExposure;
  ${linear ? "gl_FragColor = vec4(col, 1.0);" : `
  col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14);
  gl_FragColor = vec4(pow(clamp(col, 0.0, 1.0), vec3(1.0 / 2.2)), 1.0);`}
}`;
}

/* Camera basis (column-major 3x3) looking from `pos` at the origin, with roll. */
export function bhCamera(dist, incl, azim, roll = 0) {
  const pos = [dist * Math.cos(incl) * Math.sin(azim), dist * Math.sin(incl), dist * Math.cos(incl) * Math.cos(azim)];
  const f = norm([-pos[0], -pos[1], -pos[2]]);
  let up = [Math.sin(roll), Math.cos(roll), 0];
  const r = norm(cross(f, up)); up = cross(r, f);
  return { pos, rot: [r[0], r[1], r[2], up[0], up[1], up[2], -f[0], -f[1], -f[2]] };
}
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

/* Stand-alone renderer for the main page portal card (raw WebGL, no three.js). */
export function mountBlackHole(canvas, opt = {}) {
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "high-performance" });
  if (!gl) return null;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.warn(gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, BH_VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, bhFrag(opt.steps || 96, false)));
  gl.linkProgram(prog); gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "position"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0);
  const U = n => gl.getUniformLocation(prog, n);
  const u = { res: U("uRes"), time: U("uTime"), pos: U("uCamPos"), rot: U("uCamRot"), fov: U("uFov"), exp: U("uExposure"), stars: U("uStars") };
  let running = false, raf = 0, t0 = performance.now(), mx = 0, my = 0, tx = 0, ty = 0;
  const scale = opt.scale || 0.5;
  function size() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = Math.max(2, Math.round(w * scale)); canvas.height = Math.max(2, Math.round(h * scale));
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  size(); addEventListener("resize", size);
  canvas.parentElement.addEventListener("pointermove", e => {
    const r = canvas.getBoundingClientRect(); tx = (e.clientX - r.left) / r.width - 0.5; ty = (e.clientY - r.top) / r.height - 0.5;
  });
  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const t = (now - t0) / 1000;
    mx += (tx - mx) * 0.05; my += (ty - my) * 0.05;
    const c = bhCamera(opt.dist || 24, 0.12 + my * 0.12, 0.35 + t * 0.02 + mx * 0.35, -0.06);
    gl.uniform2f(u.res, canvas.width, canvas.height);
    gl.uniform1f(u.time, t);
    gl.uniform3fv(u.pos, c.pos);
    gl.uniformMatrix3fv(u.rot, false, c.rot);
    gl.uniform1f(u.fov, opt.fov || 0.95);
    gl.uniform1f(u.exp, opt.exposure || 1.0);
    gl.uniform1f(u.stars, 1.0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  return {
    start() { if (!running) { running = true; raf = requestAnimationFrame(frame); } },
    stop() { running = false; cancelAnimationFrame(raf); },
    still() { running = true; frame(performance.now()); running = false; }
  };
}
