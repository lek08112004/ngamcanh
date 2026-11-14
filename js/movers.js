// Shadows of things that move: the corgi and the walking companions.
// The sun's shadow map is static (redrawn only when the sun has moved), so anything that walks
// about cannot be in it. These get a small map of their own instead: an orthographic depth
// render from the sun, 22 m across, centred on the viewer, redrawn every frame but only with
// the few meshes that move in it (a dog and a handful of capsule figures). The ground, grass
// and flower shaders read it in `moverShadow()` (shaders/light.js), multiplied into the sun.
// Not used on `low` (no shadow maps there at all).
import * as THREE from 'three';

export class MoverShadow {
  constructor(renderer, light, size = 1024, span = 11) {
    this.renderer = renderer;
    this.u = light;
    this.span = span;
    this.size = size;
    this.rt = new THREE.WebGLRenderTarget(size, size, { depthBuffer: true, depthTexture: new THREE.DepthTexture(size, size) });
    this.rt.texture.generateMipmaps = false;
    this.cam = new THREE.OrthographicCamera(-span, span, span, -span, 1, 70);
    this.mat = new THREE.MeshBasicMaterial({ colorWrite: false });
    this.roots = [];
    this._bias = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    this._r = new THREE.Vector3();
    this._up = new THREE.Vector3();
    this._c = new THREE.Vector3();
    this._mats = [];
    light.uMoverTexel.value = 1 / size;
  }
  /** centre: where the viewer stands; sun: unit vector toward the sun; on: whether the sun is up at all */
  render(centre, sun, on) {
    const u = this.u;
    const near = on && this.roots.some((r) => r.visible && Math.hypot(r.position.x - centre.x, r.position.z - centre.z) < this.span * 0.92);
    if (!near) { u.uMoverOn.value = 0; return; }
    const c = this.cam;
    c.position.copy(centre).addScaledVector(sun, 35);
    c.up.set(0, 1, 0);
    c.lookAt(centre);
    c.updateMatrixWorld();
    // keep the map's texels fixed on the ground as the viewer walks, or the edges shimmer
    const T = (2 * this.span) / this.size;
    this._r.setFromMatrixColumn(c.matrixWorld, 0);
    this._up.setFromMatrixColumn(c.matrixWorld, 1);
    const a = centre.dot(this._r), b = centre.dot(this._up);
    c.position.addScaledVector(this._r, Math.round(a / T) * T - a).addScaledVector(this._up, Math.round(b / T) * T - b);
    c.updateMatrixWorld();
    c.matrixWorldInverse.copy(c.matrixWorld).invert();
    // draw only depth, only the movers
    const mats = this._mats;
    mats.length = 0;
    for (const r of this.roots) r.traverse((o) => { if (o.isMesh) { mats.push(o, o.material); o.material = this.mat; } });
    const rr = this.renderer, prevTarget = rr.getRenderTarget(), prevClear = rr.autoClear;
    rr.setRenderTarget(this.rt);
    rr.autoClear = false;
    rr.clear(true, true, false);
    for (const r of this.roots) if (r.visible) rr.render(r, c);
    rr.setRenderTarget(prevTarget);
    rr.autoClear = prevClear;
    for (let i = 0; i < mats.length; i += 2) mats[i].material = mats[i + 1];
    u.uMoverMatrix.value.multiplyMatrices(this._bias, c.projectionMatrix).multiply(c.matrixWorldInverse);
    u.uMoverMap.value = this.rt.depthTexture;
    u.uMoverOn.value = 1;
  }
}
