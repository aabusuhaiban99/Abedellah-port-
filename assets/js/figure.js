/* The 3D figure: a rigged Ready Player Me avatar (from the three.js examples),
   restyled in code to match Abedellah: charcoal suit cut at jacket length, white shirt,
   warm skin, short dark hair with a fade. Animated with a Mixamo idle clip, plus
   procedural head and spine turns so he looks at whichever screen is in focus. */
import * as THREE from "three";

const C = {
  suit: new THREE.Color("#1a1b20"), trouser: new THREE.Color("#16171b"), shirt: new THREE.Color("#ece8e1"),
  skin: new THREE.Color("#c48a68"), hair: new THREE.Color("#120d0a"), shoe: new THREE.Color("#0c0c0d")
};
const MODE = { Wolf3D_Outfit_Top: 0, Wolf3D_Outfit_Bottom: 1, Wolf3D_Outfit_Footwear: 2, Wolf3D_Body: 3, Wolf3D_Head: 4 };
const HIDE = new Set(["Wolf3D_Headwear", "Wolf3D_Beard"]);

function restyle(mat, mode) {
  const m = mat.clone();
  m.roughness = [0.82, 0.8, 0.32, 0.55, 0.55][mode];
  m.metalness = 0;
  if (m.isMeshStandardMaterial && !m.isMeshPhysicalMaterial) m.envMapIntensity = 0.4;
  m.onBeforeCompile = sh => {
    sh.uniforms.uMode = { value: mode };
    for (const k in C) sh.uniforms["c_" + k] = { value: C[k] };
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vBind;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvBind = position;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>
        varying vec3 vBind; uniform int uMode;
        uniform vec3 c_suit, c_trouser, c_shirt, c_skin, c_hair, c_shoe;
        float h31(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7)))*43758.5453); }
        float n3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
          return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),
                     mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z); }`)
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\n        roughnessFactor = mix(roughnessFactor, 0.92, hairAmt);")
      .replace("#include <map_fragment>", `#include <map_fragment>
        vec3 tx = diffuseColor.rgb; float hairAmt = 0.0;
        float lum = dot(tx, vec3(.2126,.7152,.0722));
        float sat = max(tx.r,max(tx.g,tx.b)) - min(tx.r,min(tx.g,tx.b));
        if (uMode == 0) {
          if (vBind.y < 0.80) discard;                                  // cut the tailcoat to jacket length
          float shirt = smoothstep(0.30, 0.55, lum) * (1.0 - smoothstep(0.06, 0.16, sat));
          vec3 suit = c_suit * clamp(0.55 + lum * 2.2, 0.5, 1.6);
          diffuseColor.rgb = mix(suit, c_shirt * (0.8 + 0.25 * lum), shirt);
        } else if (uMode == 1) {
          diffuseColor.rgb = c_trouser * clamp(0.55 + lum * 2.2, 0.5, 1.6);
        } else if (uMode == 2) {
          diffuseColor.rgb = c_shoe * (0.7 + lum * 1.5);
        } else {
          vec3 skin = c_skin * clamp(lum * 2.4, 0.35, 1.35);
          diffuseColor.rgb = skin;
          if (uMode == 4) {
            float zf = clamp((vBind.z + 0.09) / 0.23, 0.0, 1.0);         // 0 back of head, 1 forehead
            float hairline = mix(1.612, 1.788, smoothstep(0.0, 1.0, zf));
            float side = smoothstep(0.068, 0.092, abs(vBind.x));
            hairline += side * 0.045 * (1.0 - smoothstep(0.75, 1.0, zf));   // shorter at the sides: a fade
            float hairMask = smoothstep(hairline - 0.006, hairline + 0.012, vBind.y);
            float fade = mix(1.0, 0.55, side * (1.0 - smoothstep(1.70, 1.76, vBind.y)));
            float strands = 0.75 + 0.5 * n3(vBind * vec3(420., 90., 420.));
            vec3 hair = c_hair * strands;
            diffuseColor.rgb = mix(skin, mix(skin * 0.55, hair, fade), hairMask);
            hairAmt = hairMask;
            // short beard and goatee along the jaw and chin
            float jaw = smoothstep(1.67, 1.61, vBind.y) * smoothstep(0.02, 0.07, vBind.z) * (1.0 - smoothstep(1.56, 1.585, vBind.y) * 0.0);
            diffuseColor.rgb = mix(diffuseColor.rgb, c_hair * 1.4, jaw * 0.75);
          }
        }`);
  };
  return m;
}

export class Figure {
  constructor(gltf) {
    this.root = gltf.scene;
    this.root.traverse(o => {
      if (!o.isMesh) return;
      if (HIDE.has(o.name)) { o.visible = false; return; }
      if (o.name in MODE) o.material = restyle(o.material, MODE[o.name]);
      o.frustumCulled = false; o.castShadow = true;
    });
    this.bones = {};
    this.root.traverse(o => { if (o.isBone) this.bones[o.name] = o; });
    this._q = new THREE.Quaternion(); this._p = new THREE.Quaternion(); this._r = new THREE.Quaternion();
    this.X = new THREE.Vector3(1, 0, 0); this.Y = new THREE.Vector3(0, 1, 0); this.Z = new THREE.Vector3(0, 0, 1);
    // Relax the A-pose: arms down by the sides, elbows slightly bent, shoulders settled.
    this.root.updateMatrixWorld(true);
    const b = this.bones;
    this.rot(b.LeftArm, this.Z, -0.68); this.rot(b.RightArm, this.Z, 0.68);
    this.rot(b.LeftArm, this.X, -0.06); this.rot(b.RightArm, this.X, -0.06);
    this.rot(b.LeftForeArm, this.X, -0.22); this.rot(b.RightForeArm, this.X, -0.22);
    this.rot(b.LeftForeArm, this.Y, -0.9); this.rot(b.RightForeArm, this.Y, 0.9);
    this.rot(b.LeftHand, this.Z, -0.12); this.rot(b.RightHand, this.Z, 0.12);
    this.posed = ["Hips", "Spine", "Spine1", "Spine2", "Neck", "Head", "LeftShoulder", "RightShoulder"].map(n => b[n]).filter(Boolean);
    this.rest = this.posed.map(x => x.quaternion.clone());
    this.yaw = 0; this.pitch = 0; this.tYaw = 0; this.tPitch = 0.05; this.t = Math.random() * 10; this.nodT = 0;
  }
  /* Rotate a bone about an axis given in the model's own space (before the root is turned). */
  rot(bone, axis, angle) {
    if (!bone || !angle) return;
    const rootQ = this.root.getWorldQuaternion(this._r);
    bone.parent.getWorldQuaternion(this._p);
    const dW = this._q.setFromAxisAngle(axis, angle).premultiply(rootQ).multiply(rootQ.clone().invert());
    const inv = this._p.clone().invert();
    bone.quaternion.premultiply(inv.multiply(dW).multiply(this._p));
    bone.updateMatrixWorld(true);
  }
  lookAt(worldPoint) {
    const head = new THREE.Vector3(); this.bones.Head.getWorldPosition(head);
    const d = worldPoint.clone().sub(head);
    const inv = this.root.getWorldQuaternion(new THREE.Quaternion()).invert();
    d.applyQuaternion(inv);
    this.tYaw = Math.max(-1.2, Math.min(1.2, Math.atan2(d.x, d.z)));
    this.tPitch = Math.max(-0.28, Math.min(0.45, Math.atan2(d.y, Math.hypot(d.x, d.z))));
  }
  relax() { this.tYaw = 0; this.tPitch = 0.05; }
  nod() { this.nodT = 1.3; }
  update(dt) {
    this.t += dt;
    const t = this.t, b = this.bones;
    this.posed.forEach((x, i) => x.quaternion.copy(this.rest[i]));
    this.root.updateMatrixWorld(true);
    const k = 1 - Math.pow(0.0035, dt);
    this.yaw += (this.tYaw - this.yaw) * k;
    this.pitch += (this.tPitch - this.pitch) * k;
    const breath = Math.sin(t * 1.45), shift = Math.sin(t * 0.42), micro = Math.sin(t * 0.83) * Math.sin(t * 0.31);
    let nod = 0;
    if (this.nodT > 0) { this.nodT = Math.max(0, this.nodT - dt); const u = 1.3 - this.nodT; nod = Math.sin(u * 8.5) * 0.11 * Math.min(1, this.nodT * 1.6); }
    // weight shift through the hips, countered by the spine
    this.rot(b.Hips, this.Z, shift * 0.018);
    this.rot(b.Spine, this.Z, -shift * 0.014);
    // breathing
    this.rot(b.Spine1, this.X, -breath * 0.010);
    this.rot(b.Spine2, this.X, -breath * 0.012);
    this.rot(b.LeftShoulder, this.Z, breath * 0.012); this.rot(b.RightShoulder, this.Z, -breath * 0.012);
    // turn toward the screen in focus, shared down the spine
    const share = [["Spine", 0.14, 0.05], ["Spine1", 0.16, 0.08], ["Spine2", 0.2, 0.12], ["Neck", 0.22, 0.3], ["Head", 0.28, 0.45]];
    for (const [n, fy, fp] of share) {
      this.rot(b[n], this.Y, this.yaw * fy + (n === "Head" ? micro * 0.03 : 0));
      this.rot(b[n], this.X, -this.pitch * fp + (n === "Head" ? nod : 0));
    }
  }
}
