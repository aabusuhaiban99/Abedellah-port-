/* The Theater: a WebGL room of screens around a 3D figure, entered through Gargantua. */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { Figure } from "./figure.js";
import { BH_VERT, bhFrag, bhCamera } from "./blackhole.js";
import { buildScreenCanvases } from "./screens.js";
import { initUI } from "./theater-ui.js";

const { SCREENS, CATEGORIES } = window.PORTFOLIO;
const N = SCREENS.length, ROWS = 3, COLS = Math.ceil(N / ROWS), STEP = (Math.PI * 2) / COLS;
const mobile = matchMedia("(max-width: 760px), (pointer: coarse)").matches;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const Q = {
  dpr: Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.75),
  tex: mobile ? 640 : 1024, bhRT: mobile ? 384 : 640, bhSteps: mobile ? 84 : 110,
  dust: mobile ? 700 : 1800, stars: mobile ? 1400 : 2600
};
const GOLD = new THREE.Color("#ffb45c");
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = x => Math.min(1, Math.max(0, x));
const wrapPI = a => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };

const ui = initUI({
  onHoverIndex: i => { setHot(i); },
  onOpenFocus: i => focusScreen(i),
  onCloseFocus: () => unfocus(),
  onCategory: k => setCategory(k),
  onRotate: steps => { yawT += steps * STEP; idleAt = performance.now(); },
  onFaceIndex: i => { yawT = faceYaw(i); setHot(i); },
  onSkip: () => skipIntro(),
  onDetail: open => { detailOpen = open; },
  quality: Q
});

/* ---------------- Renderer ---------------- */
const canvas = document.getElementById("gl");
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance", stencil: false });
} catch (e) { ui.noWebGL(); throw e; }
renderer.setPixelRatio(Q.dpr);
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color("#020202");
const camera = new THREE.PerspectiveCamera(mobile ? 58 : 42, innerWidth / innerHeight, 0.1, 400);
const CAM = mobile
  ? { base: new THREE.Vector3(0, 2.25, 7.0), look: new THREE.Vector3(0, 2.75, -8), focus: new THREE.Vector3(0, 2.1, 4.6), focusLook: new THREE.Vector3(0, 2.75, -3) }
  : { base: new THREE.Vector3(0, 2.2, 5.4), look: new THREE.Vector3(0, 2.85, -8), focus: new THREE.Vector3(0, 2.1, 4.1), focusLook: new THREE.Vector3(0, 2.6, -3) };
camera.position.copy(CAM.base);

/* ---------------- Gargantua (intro + sky) ---------------- */
const quadGeo = new THREE.BufferGeometry();
quadGeo.setAttribute("position", new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
function bhMaterial(steps) {
  return new THREE.RawShaderMaterial({
    vertexShader: BH_VERT, fragmentShader: bhFrag(steps, true),
    uniforms: { uRes: { value: new THREE.Vector2() }, uTime: { value: 0 }, uCamPos: { value: new THREE.Vector3() },
      uCamRot: { value: new THREE.Matrix3() }, uFov: { value: 0.9 }, uExposure: { value: 1 }, uStars: { value: 1 } },
    depthTest: false, depthWrite: false
  });
}
const skyRT = new THREE.WebGLRenderTarget(Q.bhRT, Q.bhRT, { type: THREE.HalfFloatType });
const skyMat = bhMaterial(Q.bhSteps);
const skyScene = new THREE.Scene(); skyScene.add(new THREE.Mesh(quadGeo, skyMat));
skyMat.uniforms.uRes.value.set(Q.bhRT, Q.bhRT);
function setBH(mat, cam, fov, t, exposure, stars = 1) {
  mat.uniforms.uCamPos.value.fromArray(cam.pos);
  mat.uniforms.uCamRot.value.fromArray(cam.rot);
  mat.uniforms.uFov.value = fov; mat.uniforms.uTime.value = t; mat.uniforms.uExposure.value = exposure; mat.uniforms.uStars.value = stars;
}

/* The black hole hangs in the sky of the room. */
const skyPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(1, 1),
  new THREE.ShaderMaterial({
    uniforms: { map: { value: skyRT.texture }, uGain: { value: 1.0 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }",
    fragmentShader: `uniform sampler2D map; uniform float uGain; varying vec2 vUv;
      void main(){ vec3 c = texture2D(map, vUv).rgb * uGain; float m = smoothstep(0.5, 0.33, length(vUv - 0.5)); gl_FragColor = vec4(c, m); }`,
    transparent: true, depthWrite: false
  })
);
const SKY = mobile ? { pos: [0, 34, -90], size: 92 } : { pos: [0, 27, -95], size: 96 };
skyPlane.position.fromArray(SKY.pos); skyPlane.scale.setScalar(SKY.size); skyPlane.renderOrder = -3;
skyPlane.lookAt(0, 2, 6);
scene.add(skyPlane);

/* ---------------- Stars ---------------- */
{
  const g = new THREE.BufferGeometry(), n = Q.stars, pos = new Float32Array(n * 3), seed = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = 150;
    const y = Math.abs(u) * 0.95 + 0.02, s = Math.sqrt(1 - y * y);
    pos.set([Math.cos(th) * s * r, y * r - 8, Math.sin(th) * s * r], i * 3); seed[i] = Math.random();
  }
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPx: { value: Q.dpr } },
    vertexShader: `attribute float aSeed; uniform float uTime, uPx; varying float vA; varying float vS;
      void main(){ vS=aSeed; vA = 0.45 + 0.55*sin(uTime*(0.6+aSeed*1.7) + aSeed*40.0);
        gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); gl_PointSize = (aSeed > 0.985 ? 3.2 : 1.0 + aSeed*1.6) * uPx; }`,
    fragmentShader: `varying float vA; varying float vS; void main(){ float d = length(gl_PointCoord-0.5); if(d>0.5) discard;
      vec3 c = mix(vec3(1.0,0.86,0.68), vec3(0.75,0.85,1.0), step(0.7, vS)); gl_FragColor = vec4(c * vA * smoothstep(0.5,0.0,d) * 1.3, 1.0); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const pts = new THREE.Points(g, m); pts.renderOrder = -4; scene.add(pts); scene.userData.stars = m; scene.userData.starPts = pts;
}

/* ---------------- Tesseract: strings of light receding into the dark ---------------- */
const lattice = new THREE.Group(); scene.add(lattice);
{
  const P = [], S = [], K = [];
  const push = (a, b, seed, kind) => { P.push(...a, ...b); S.push(seed, seed); K.push(kind, kind); };
  for (const [rad, count] of [[13, 64], [17.5, 84], [24, 96]]) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + rad, x = Math.cos(a) * rad, z = Math.sin(a) * rad;
      push([x, -0.2, z], [x, 42, z], Math.random(), 0);
    }
    for (let h = 0; h <= 36; h += 4.5) {
      const seg = 160, s = Math.random();
      for (let i = 0; i < seg; i++) {
        const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
        push([Math.cos(a0) * rad, h, Math.sin(a0) * rad], [Math.cos(a1) * rad, h, Math.sin(a1) * rad], s, 1);
      }
    }
  }
  for (let h = 4.5; h <= 36; h += 4.5) for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    push([Math.cos(a) * 13, h, Math.sin(a) * 13], [Math.cos(a) * 24, h, Math.sin(a) * 24], Math.random(), 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute("aSeed", new THREE.Float32BufferAttribute(S, 1));
  g.setAttribute("aKind", new THREE.Float32BufferAttribute(K, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: GOLD.clone() }, uGain: { value: 0 } },
    vertexShader: `attribute float aSeed; attribute float aKind; varying vec3 vP; varying float vS; varying float vK;
      void main(){ vP = position; vS = aSeed; vK = aKind; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float uTime, uGain; uniform vec3 uColor; varying vec3 vP; varying float vS; varying float vK;
      void main(){
        float r = length(vP.xz);
        float fade = smoothstep(40.0, 6.0, vP.y) * smoothstep(-0.5, 2.0, vP.y + 1.5) * smoothstep(30.0, 12.0, r);
        float a = atan(vP.z, vP.x) / 6.2831853;
        float coord = vK < 0.5 ? vP.y * 0.045 : (vK < 1.5 ? a : r * 0.08);
        float pulse = smoothstep(0.035, 0.0, abs(fract(coord - uTime * (0.05 + vS * 0.06) + vS) - 0.5));
        vec3 c = uColor * (0.07 + pulse * 0.9) * fade * uGain;
        gl_FragColor = vec4(c, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  lattice.add(new THREE.LineSegments(g, m)); lattice.userData.mat = m;
}

/* ---------------- Warp streaks for the flight in ---------------- */
const warpMat = new THREE.ShaderMaterial({
  uniforms: { uLen: { value: 0 }, uGain: { value: 0 } },
  vertexShader: `attribute float aEnd; attribute float aSeed; uniform float uLen; varying float vA; varying float vS;
    void main(){ vec3 p = position; p.z += aEnd * uLen * (0.6 + aSeed * 0.8); vA = aEnd; vS = aSeed;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
  fragmentShader: `uniform float uGain; varying float vA; varying float vS;
    void main(){ vec3 c = mix(vec3(1.0, 0.78, 0.45), vec3(0.85, 0.9, 1.0), step(0.75, vS));
      gl_FragColor = vec4(c * (0.25 + 0.75 * (1.0 - vA)) * uGain * (0.5 + vS), 1.0); }`,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
});
{
  const n = mobile ? 1100 : 2200, P = new Float32Array(n * 6), E = new Float32Array(n * 2), S = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, r = 4 + Math.pow(Math.random(), 0.6) * 70, z = -140 + Math.random() * 620;
    const x = Math.cos(a) * r, y = 6 + Math.sin(a) * r * 0.8, sd = Math.random();
    P.set([x, y, z, x, y, z], i * 6); E.set([0, 1], i * 2); S.set([sd, sd], i * 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(P, 3)); g.setAttribute("aEnd", new THREE.BufferAttribute(E, 1)); g.setAttribute("aSeed", new THREE.BufferAttribute(S, 1));
  const w = new THREE.LineSegments(g, warpMat); w.frustumCulled = false; scene.add(w);
}

/* ---------------- Floor ---------------- */
const floorMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uGold: { value: GOLD.clone() }, uKey: { value: GOLD.clone() }, uGain: { value: 0 } },
  vertexShader: "varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }",
  fragmentShader: `uniform float uTime, uGain; uniform vec3 uGold, uKey; varying vec3 vW;
    float ring(float r, float R, float w){ return smoothstep(w, 0.0, abs(r - R)); }
    void main(){
      float r = length(vW.xz), a = atan(vW.z, vW.x);
      vec3 c = vec3(0.006, 0.005, 0.004);
      c += uGold * 0.32 * exp(-r * r * 0.9);
      c += uKey * 0.10 * exp(-r * r * 0.06);
      c += uGold * 0.22 * (ring(r, 1.35, 0.012) + ring(r, 3.6, 0.01) + ring(r, 6.0, 0.008) * 0.7);
      float dash = step(0.55, fract(a * 18.0 / 6.2831853 + uTime * 0.025));
      c += uGold * 0.4 * ring(r, 2.35, 0.014) * dash;
      float ticks = step(0.92, fract(a * 72.0 / 6.2831853)) * smoothstep(4.6, 4.4, r) * smoothstep(4.1, 4.3, r);
      c += uGold * 0.25 * ticks;
      c *= smoothstep(30.0, 7.0, r) * uGain;
      gl_FragColor = vec4(c, 1.0);
    }`,
  depthWrite: false
});
const floor = new THREE.Mesh(new THREE.CircleGeometry(32, 128).rotateX(-Math.PI / 2), floorMat);
floor.renderOrder = -2; scene.add(floor);
const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.75, 48).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
  vertexShader: "varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }",
  fragmentShader: "varying vec2 vUv; void main(){ float d=length(vUv-0.5)*2.0; gl_FragColor=vec4(0.,0.,0., smoothstep(1.0,0.0,d)*0.85); }",
  transparent: true, depthWrite: false
}));
shadow.position.y = 0.004; shadow.renderOrder = 2; scene.add(shadow);

/* Light shaft from above onto the figure */
const shaftMat = new THREE.ShaderMaterial({
  uniforms: { uColor: { value: GOLD.clone() }, uGain: { value: 0 } },
  vertexShader: `varying float vH; varying vec3 vN; varying vec3 vV;
    void main(){ vH = uv.y; vec4 w = modelMatrix*vec4(position,1.); vN = normalize(mat3(modelMatrix)*normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix*viewMatrix*w; }`,
  fragmentShader: `uniform vec3 uColor; uniform float uGain; varying float vH; varying vec3 vN; varying vec3 vV;
    void main(){ float f = pow(abs(dot(vN, vV)), 2.5); float h = smoothstep(0.0, 0.12, vH) * smoothstep(1.0, 0.35, vH);
      gl_FragColor = vec4(uColor * f * h * 0.035 * uGain, 1.0); }`,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
});
const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 2.1, 15, 64, 1, true), shaftMat);
shaft.position.set(0, 7.5, 0); scene.add(shaft);

/* Dust drifting through the light */
const dustMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uPx: { value: Q.dpr }, uGain: { value: 0 } },
  vertexShader: `attribute vec3 aSeed; uniform float uTime, uPx; varying float vA;
    void main(){
      vec3 p = position;
      float t = uTime * (0.02 + aSeed.x * 0.05);
      p.y = mod(p.y + t * 3.0, 9.0);
      p.x += sin(uTime * 0.2 + aSeed.y * 20.0) * 0.35;
      p.z += cos(uTime * 0.17 + aSeed.z * 20.0) * 0.35;
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      float r = length(p.xz);
      vA = (0.25 + 0.75 * smoothstep(3.0, 0.4, r)) * smoothstep(0.0, 0.8, p.y) * smoothstep(9.0, 7.0, p.y) * (0.5 + 0.5 * sin(uTime * 2.0 + aSeed.x * 50.0));
      gl_PointSize = (1.2 + aSeed.y * 2.4) * uPx * (6.0 / -mv.z);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `uniform float uGain; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard;
    gl_FragColor = vec4(vec3(1.0, 0.82, 0.6) * vA * smoothstep(0.5, 0.0, d) * 0.9 * uGain, 1.0); }`,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
});
{
  const n = Q.dust, pos = new Float32Array(n * 3), sd = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = Math.pow(Math.random(), 0.7) * 10, a = Math.random() * Math.PI * 2;
    pos.set([Math.cos(a) * r, Math.random() * 9, Math.sin(a) * r], i * 3);
    sd.set([Math.random(), Math.random(), Math.random()], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("aSeed", new THREE.BufferAttribute(sd, 3));
  scene.add(new THREE.Points(g, dustMat));
}

/* ---------------- Lights for the figure ---------------- */
scene.add(new THREE.HemisphereLight(0x3a2c1e, 0x000000, 0.55));
const keyLight = new THREE.SpotLight(0xffb45c, 70, 30, 0.42, 0.7, 1.6);
keyLight.position.set(0, 9, 1.2); keyLight.target.position.set(0, 0.8, 0); scene.add(keyLight, keyLight.target);
const rimLight = new THREE.DirectionalLight(0xffc27a, 2.2); rimLight.position.set(-2.5, 4, -6); scene.add(rimLight);
const rimLight2 = new THREE.DirectionalLight(0x9fd0ff, 1.0); rimLight2.position.set(3, 3, -5); scene.add(rimLight2);
const fillLight = new THREE.DirectionalLight(0xffe6c8, 0.55); fillLight.position.set(0.8, 3, 6); scene.add(fillLight);
const screenLight = new THREE.PointLight(0xffb45c, 0, 14, 1.4); screenLight.position.set(0, 3, -5); scene.add(screenLight);

/* ---------------- Screens ---------------- */
const ring = new THREE.Group(); scene.add(ring);
const mirrors = new THREE.Group(); scene.add(mirrors);
const R = mobile ? 7.4 : 8.2, SW = 3.0, SH = SW * 0.5625, ROWY = [4.95, 3.05, 1.15];
const screenGeo = new THREE.PlaneGeometry(SW, SH);
const SCREEN_VERT = `varying vec2 vUv; varying float vWy;
  void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vWy = w.y; gl_Position = projectionMatrix * viewMatrix * w; }`;
const SCREEN_FRAG = `uniform sampler2D map; uniform vec3 uColor; uniform float uHover, uFocus, uPower, uDim, uTime, uSeed, uMirror, uVis, uReady;
  varying vec2 vUv; varying float vWy;
  float sdBox(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
  void main(){
    vec2 p = (vUv - 0.5) * vec2(1.7778, 1.0);
    float d = sdBox(p, vec2(0.8889, 0.5), 0.028);
    if (d > 0.0) discard;
    vec3 col;
    if (!gl_FrontFacing) {
      col = vec3(0.012, 0.010, 0.009) + uColor * 0.06 * smoothstep(0.6, 0.0, length(p));
      col += uColor * smoothstep(-0.012, 0.0, d) * 1.4;
    } else {
      vec3 tex = uReady > 0.5 ? texture2D(map, vUv).rgb : vec3(0.02);
      col = tex * (1.0 + 0.2 * uHover + 0.05 * uFocus);
      float sweep = smoothstep(0.05, 0.0, abs(fract(uTime * 0.09 + uSeed) - (1.0 - vUv.y)));
      col += uColor * sweep * 0.07;
      col *= 0.965 + 0.035 * sin(vUv.y * 1100.0);
      col += vec3(1.0) * 0.03 * smoothstep(0.5, 0.0, abs(vUv.x * 0.8 - vUv.y + 0.25));
      float reveal = smoothstep(0.0, 0.015, uPower * 0.56 - abs(vUv.y - 0.5));
      float line = (1.0 - smoothstep(0.0, 0.006, abs(vUv.y - 0.5))) * step(0.001, uPower) * (1.0 - smoothstep(0.6, 1.0, uPower));
      col = col * reveal + uColor * line * 2.5;
      float edge = smoothstep(-0.014, 0.0, d);
      col = mix(col, uColor * (0.6 + 1.3 * uHover + 0.9 * uFocus), edge * (0.55 + 0.45 * max(uHover, uFocus)) * step(0.01, uPower));
    }
    col *= mix(0.16, 1.0, uDim) * uVis;
    if (uMirror > 0.5) { float f = smoothstep(-3.2, 0.0, vWy); col *= 0.2 * f * f; }
    gl_FragColor = vec4(col, 1.0);
  }`;

const slots = SCREENS.map((s, i) => {
  const color = new THREE.Color(CATEGORIES[s.cat].color);
  const uniforms = {
    map: { value: null }, uColor: { value: color }, uHover: { value: 0 }, uFocus: { value: 0 }, uPower: { value: 0 },
    uDim: { value: 1 }, uTime: { value: 0 }, uSeed: { value: Math.random() }, uMirror: { value: 0 }, uVis: { value: 1 }, uReady: { value: 0 }
  };
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: SCREEN_VERT, fragmentShader: SCREEN_FRAG, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(screenGeo, mat);
  const col = Math.floor(i / ROWS), row = i % ROWS, th = col * STEP;
  mesh.position.set(Math.sin(th) * R, ROWY[row], -Math.cos(th) * R);
  mesh.lookAt(0, ROWY[row], 0);
  mesh.rotateX([0.24, 0.1, -0.06][row]);
  mesh.userData = { i, th, home: { p: mesh.position.clone(), q: mesh.quaternion.clone() } };
  ring.add(mesh);
  const mmat = new THREE.ShaderMaterial({ uniforms: { ...uniforms, uMirror: { value: 1 } }, vertexShader: SCREEN_VERT, fragmentShader: SCREEN_FRAG,
    side: THREE.DoubleSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const mirror = new THREE.Mesh(screenGeo, mmat);
  mirror.matrixAutoUpdate = false; mirrors.add(mirror);
  return { s, i, mesh, mirror, u: uniforms, hover: 0, focus: 0, power: 0, powerAt: Infinity };
});
const REFLECT = new THREE.Matrix4().makeScale(1, -1, 1);

buildScreenCanvases(SCREENS, CATEGORIES, { width: Q.tex }).then(canvases => {
  canvases.forEach((c, i) => {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
    slots[i].u.map.value = t; slots[i].u.uReady.value = 1;
  });
  ready.screens = true;
});

/* ---------------- The figure ---------------- */
let figure = null;
new GLTFLoader().load("assets/models/figure.json", gltf => {
  figure = new Figure(gltf);
  figure.root.rotation.y = Math.PI;
  scene.add(figure.root);
  ready.figure = true;
}, undefined, () => { ready.figure = true; });

/* ---------------- Post-processing ---------------- */
const composer = new EffectComposer(renderer);
composer.setPixelRatio(Q.dpr);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.5, 0.5, 0.92);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const finalPass = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uFade: { value: 0 }, uLetter: { value: 0 }, uRes: { value: new THREE.Vector2(innerWidth, innerHeight) } },
  vertexShader: "varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }",
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uFade, uLetter; uniform vec2 uRes; varying vec2 vUv;
    void main(){
      vec2 d = vUv - 0.5; float k = dot(d, d) * 0.012;
      vec3 c = vec3(texture2D(tDiffuse, vUv + d * k).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - d * k).b);
      c *= mix(0.5, 1.0, smoothstep(0.95, 0.22, length(d * vec2(1.0, 1.25))));
      float n = fract(sin(dot(vUv * uRes + uTime * 61.0, vec2(12.9898, 78.233))) * 43758.5453);
      c += (n - 0.5) * 0.028;
      c *= step(abs(vUv.y - 0.5), 0.5 - uLetter) * uFade;
      gl_FragColor = vec4(c, 1.0);
    }`
});
composer.addPass(finalPass);

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
  finalPass.uniforms.uRes.value.set(innerWidth, innerHeight);
});

/* ---------------- Interaction ---------------- */
let yaw = 0, yawT = 0, vel = 0, hot = -1, focused = -1, catFilter = null, detailOpen = false;
let idleAt = performance.now();
const ptr = new THREE.Vector2(), ndc = new THREE.Vector2(), ray = new THREE.Raycaster();
let drag = null, moved = false;
const faceYaw = i => yaw + wrapPI(slots[i].mesh.userData.th - yaw);
const activeRoom = () => phase === "room" && !detailOpen;

canvas.addEventListener("pointerdown", e => {
  if (!activeRoom()) return;
  drag = { x: e.clientX, y0: yawT, t: performance.now(), lx: e.clientX }; moved = false;
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove", e => {
  ptr.set(e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5);
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  if (drag) {
    const dx = e.clientX - drag.x;
    if (Math.abs(dx) > 6) moved = true;
    if (moved && focused < 0) {
      yawT = drag.y0 - dx * (mobile ? 0.0062 : 0.0034);
      vel = -(e.clientX - drag.lx) * (mobile ? 0.0062 : 0.0034); drag.lx = e.clientX;
      idleAt = performance.now();
    }
  }
  pick();
});
canvas.addEventListener("pointerup", () => {
  if (drag && moved) { yawT += vel * 8; }
  if (drag && !moved) click();
  drag = null;
});
canvas.addEventListener("pointerleave", () => { if (!drag) { ptr.set(0, 0); if (focused < 0) setHot(-1); } });
addEventListener("wheel", e => {
  if (phase === "intro") { introT = Math.max(introT, introT + Math.min(1.2, Math.abs(e.deltaY) / 400)); return; }
  if (!activeRoom() || focused >= 0) return;
  e.preventDefault();
  yawT += (e.deltaY + e.deltaX) * 0.0016; idleAt = performance.now();
}, { passive: false });
addEventListener("touchmove", e => { if (phase === "intro") introT += 0.08; }, { passive: true });

function pick() {
  if (!activeRoom() || drag?.moved) return;
  ray.setFromCamera(ndc, camera);
  const targets = focused >= 0 ? [slots[focused].mesh] : slots.map(s => s.mesh);
  const hit = ray.intersectObjects(targets, false)[0];
  const i = hit ? hit.object.userData.i : -1;
  canvas.style.cursor = i >= 0 ? "pointer" : (focused >= 0 ? "default" : "grab");
  if (focused < 0) setHot(i);
}
function click() {
  if (!activeRoom()) return;
  ray.setFromCamera(ndc, camera);
  if (focused >= 0) {
    if (ray.intersectObject(slots[focused].mesh, false).length) ui.openDetail(focused);
    else unfocus();
    return;
  }
  const hit = ray.intersectObjects(slots.map(s => s.mesh), false)[0];
  if (hit) focusScreen(hit.object.userData.i);
}

function setHot(i) {
  if (hot === i) return;
  hot = i;
  ui.caption(i >= 0 ? i : null, focused >= 0 ? "focus" : "room", catFilter);
}
function setCategory(k) {
  catFilter = k;
  if (k) {
    const idx = slots.filter(s => s.s.cat === k).map(s => s.i);
    yawT = faceYaw(idx[Math.floor((idx.length - 1) / 2)]);
  }
  if (focused >= 0) unfocus();
  idleAt = performance.now();
}

/* Focus: the screen flies out of the ring, turns over and stops in front of the figure. */
let flight = null;
function focusScreen(i) {
  if (focused === i) { ui.openDetail(i); return; }
  if (focused >= 0) unfocus(true);
  focused = i;
  const sl = slots[i];
  yawT = faceYaw(i);
  scene.attach(sl.mesh);
  const from = { p: sl.mesh.position.clone(), q: sl.mesh.quaternion.clone(), s: 1 };
  const camTo = CAM.focus.clone();
  const target = mobile ? new THREE.Vector3(0, 3.0, 0.6) : new THREE.Vector3(0, 2.78, -1.2);
  const look = new THREE.Object3D(); look.position.copy(target); look.lookAt(camTo);
  flight = { i, t: 0, dur: reduce ? 0.01 : 1.15, from, to: { p: target, q: look.quaternion.clone(), s: mobile ? 0.62 : 1 }, dir: 1 };
  ui.caption(i, "focus", catFilter);
  setTimeout(() => figure && figure.nod(), reduce ? 0 : 900);
}
function unfocus(instant) {
  if (focused < 0) return;
  const sl = slots[focused];
  const home = new THREE.Object3D();
  home.position.copy(sl.mesh.userData.home.p); home.quaternion.copy(sl.mesh.userData.home.q);
  ring.add(home); home.updateMatrixWorld(true);
  const p = new THREE.Vector3(), q = new THREE.Quaternion();
  home.getWorldPosition(p); home.getWorldQuaternion(q); ring.remove(home);
  flight = { i: focused, t: 0, dur: instant || reduce ? 0.01 : 0.85, from: { p: sl.mesh.position.clone(), q: sl.mesh.quaternion.clone(), s: sl.mesh.scale.x },
    to: { p, q, s: 1 }, dir: -1 };
  focused = -1;
  ui.caption(hot >= 0 ? hot : null, "room", catFilter);
  idleAt = performance.now();
}
const spinQ = new THREE.Quaternion(), Yax = new THREE.Vector3(0, 1, 0);
function updateFlight(dt) {
  if (!flight) return;
  flight.t = Math.min(1, flight.t + dt / flight.dur);
  const e = ease(flight.t), m = slots[flight.i].mesh;
  m.position.lerpVectors(flight.from.p, flight.to.p, e);
  if (flight.dir > 0) m.position.y += Math.sin(e * Math.PI) * 0.6;
  m.quaternion.slerpQuaternions(flight.from.q, flight.to.q, e);
  m.quaternion.multiply(spinQ.setFromAxisAngle(Yax, (1 - e) * Math.PI * 2 * flight.dir));
  m.scale.setScalar(THREE.MathUtils.lerp(flight.from.s, flight.to.s, e));
  if (flight.t >= 1) {
    if (flight.dir < 0) {
      ring.attach(m);
      m.position.copy(m.userData.home.p); m.quaternion.copy(m.userData.home.q); m.scale.setScalar(1);
    }
    flight = null;
  }
}

/* ---------------- Intro timeline ---------------- */
let phase = (reduce || ui.startInRoom) ? "room" : "intro";
let introT = 0, roomT = 0;
const ready = { screens: false, figure: false };
const FLY = mobile ? 5.0 : 5.4, FAR = 430;
function skipIntro() { if (phase === "intro") introT = Math.max(introT, FLY - 0.5); }
if (phase === "room") { roomT = 3.4; ui.enterRoom(true); }

const SPEED = Math.max(1, +new URLSearchParams(location.search).get("speed") || 1);   // testing aid
let lastD = FAR;
/* The flight in: from deep space, at speed, straight into the room, easing to a stop behind the figure. */
function updateIntro(dt) {
  introT += dt * SPEED;
  const t = introT, u = clamp01(t / FLY);
  ui.introCopy(t);
  const p = 1 - Math.pow(1 - u, 4.2);
  const d = FAR * (1 - p);
  const speed = Math.max(0, (lastD - d) / Math.max(dt, 1e-3)); lastD = d;
  camera.position.set(Math.sin(t * 0.7) * 2.2 * (1 - p), CAM.base.y + 10 * Math.pow(1 - p, 1.5), CAM.base.z + d);
  camLook.copy(CAM.look); camLook.y += 3.5 * (1 - p);
  camera.lookAt(camLook);
  camera.rotateZ(0.09 * Math.pow(1 - p, 2) * Math.sin(t * 0.9 + 0.6));
  warpMat.uniforms.uLen.value = Math.min(46, speed * 0.05);
  warpMat.uniforms.uGain.value = clamp01(t / 0.5) * clamp01(speed / 35);
  roomT = t - (FLY - 2.3);
  if (u >= 1) { phase = "room"; warpMat.uniforms.uGain.value = 0; ui.enterRoom(false); }
}

/* ---------------- Main loop ---------------- */
const clock = new THREE.Clock();
let elapsed = 0, frame = 0, fpsAcc = 0, fpsN = 0, slowFor = 0;
const tmpV = new THREE.Vector3(), lookV = new THREE.Vector3(), camLook = CAM.look.clone();
const hoverColor = GOLD.clone();

renderer.setAnimationLoop(() => {
  const raw = clock.getDelta(), dt = Math.min(raw, 0.05);
  elapsed += dt; frame++;
  fpsAcc += raw; fpsN++;
  if (fpsAcc > 0.5) {
    const fps = fpsN / fpsAcc; ui.fps(fps);
    if (fps < 40 && phase === "room") slowFor += fpsAcc; else slowFor = 0;
    if (slowFor > 2 && renderer.getPixelRatio() > 0.75) {
      const pr = Math.max(0.75, renderer.getPixelRatio() - 0.25);
      renderer.setPixelRatio(pr); composer.setPixelRatio(pr); slowFor = 0;
    }
    fpsAcc = 0; fpsN = 0;
  }

  if (document.hidden) return;
  if (phase === "intro") updateIntro(dt); else roomT += dt;
  scene.userData.starPts.position.copy(camera.position);

  // Gargantua in the sky: refresh every other frame
  if (frame % 2 === 0 || roomT < 0.1) {
    setBH(skyMat, bhCamera(30, 0.095, 0.4 + elapsed * 0.01, -0.03), 0.95, elapsed, 1.0, 0.0);
    renderer.setRenderTarget(skyRT); renderer.render(skyScene, quadCam); renderer.setRenderTarget(null);
  }

  // room reveal
  const reveal = ease(clamp01(roomT / 2.6));
  finalPass.uniforms.uFade.value = phase === "intro" ? clamp01(introT / 0.9) : 1;
  finalPass.uniforms.uTime.value = elapsed;
  finalPass.uniforms.uLetter.value = phase === "intro" ? 0.085 * (1 - ease(clamp01((introT - FLY + 1.4) / 1.4))) : 0;
  lattice.userData.mat.uniforms.uGain.value = phase === "intro" ? 0.55 + 0.45 * clamp01(introT / FLY) : 1;
  floorMat.uniforms.uGain.value = ease(clamp01(roomT / 1.8));
  shaftMat.uniforms.uGain.value = ease(clamp01((roomT - 0.5) / 2.0));
  dustMat.uniforms.uGain.value = ease(clamp01((roomT - 0.8) / 2.0));
  skyPlane.material.uniforms.uGain.value = 0.42 * ease(clamp01(roomT / 3.0));
  [lattice.userData.mat, floorMat, dustMat, scene.userData.stars].forEach(m => (m.uniforms.uTime.value = elapsed));
  lattice.rotation.y = -yaw * 0.25 + elapsed * 0.004;

  // ring rotation with inertia and idle drift
  if (!drag && focused < 0 && !reduce && performance.now() - idleAt > 7000 && hot < 0) yawT += dt * 0.035;
  yaw = damp(yaw, yawT, 6, dt);
  ring.rotation.y = yaw;
  ring.updateMatrixWorld(true);

  // camera: dolly in on focus, follow the pointer (the intro flies it in)
  if (phase === "room") {
    const fK = focused >= 0 ? 1 : 0;
    tmpV.copy(fK ? CAM.focus : CAM.base);
    tmpV.x += ptr.x * (fK ? 0.18 : 0.45); tmpV.y += -ptr.y * 0.22;
    camera.position.x = damp(camera.position.x, tmpV.x, 3, dt);
    camera.position.y = damp(camera.position.y, tmpV.y, 3, dt);
    camera.position.z = damp(camera.position.z, tmpV.z, 3, dt);
    lookV.copy(fK ? CAM.focusLook : CAM.look);
    camLook.lerp(lookV, 1 - Math.exp(-4 * dt));
    camera.lookAt(camLook);
  }

  // screens: power on one by one, hover glow, dimming, visibility around the ring
  updateFlight(dt);
  slots.forEach(sl => {
    if (!isFinite(sl.powerAt)) {
      const col = Math.floor(sl.i / ROWS), off = Math.abs(wrapPI(sl.mesh.userData.th - yaw));
      sl.powerAt = 0.6 + off * 0.55 + (sl.i % ROWS) * 0.12;
    }
    sl.power = reduce ? 1 : clamp01((roomT - sl.powerAt) / 0.5);
    const isHot = (sl.i === hot && focused < 0) || sl.i === focused;
    sl.hover = damp(sl.hover, isHot ? 1 : 0, 8, dt);
    sl.focus = damp(sl.focus, sl.i === focused ? 1 : 0, 6, dt);
    const dimTo = (focused >= 0 && sl.i !== focused) || (catFilter && sl.s.cat !== catFilter) ? 0 : 1;
    sl.u.uDim.value = damp(sl.u.uDim.value, dimTo, 5, dt);
    const inRing = sl.mesh.parent === ring;
    const a = Math.abs(wrapPI(sl.mesh.userData.th - yaw));
    sl.u.uVis.value = inRing ? (a < 0.8 ? 1 : Math.max(0.1, 1 - (a - 0.8) / 1.2)) : 1;
    sl.mesh.visible = sl.mirror.visible = !inRing || a < 2.3;
    sl.u.uHover.value = sl.hover; sl.u.uFocus.value = sl.focus; sl.u.uPower.value = sl.power; sl.u.uTime.value = elapsed;
    sl.mesh.updateMatrixWorld();
    sl.mirror.matrix.multiplyMatrices(REFLECT, sl.mesh.matrixWorld);
    sl.mirror.matrixWorldNeedsUpdate = true;
  });

  // the figure looks at whatever has your attention
  const target = focused >= 0 ? focused : hot;
  if (figure) {
    if (target >= 0) { slots[target].mesh.getWorldPosition(tmpV); figure.lookAt(tmpV); }
    else figure.relax();
    figure.update(dt);
  }
  const want = target >= 0 ? slots[target].u.uColor.value : GOLD;
  hoverColor.lerp(want, 1 - Math.exp(-4 * dt));
  rimLight.color.copy(hoverColor).lerp(GOLD, 0.35);
  floorMat.uniforms.uKey.value.copy(hoverColor);
  if (target >= 0) { slots[target].mesh.getWorldPosition(tmpV); screenLight.position.lerp(tmpV, 1 - Math.exp(-6 * dt)); }
  screenLight.color.copy(hoverColor);
  screenLight.intensity = damp(screenLight.intensity, target >= 0 ? (focused >= 0 ? (mobile ? 14 : 24) : 22) : 8, 4, dt) * reveal;
  keyLight.intensity = 70 * reveal;

  composer.render(dt);
});
