// A little name card that floats over an animal in the scene (Choco's), as an HTML overlay.
//
// Why HTML and not a sprite: the text stays sharp at any pixel ratio, it costs no draw call, it
// is not in a saved photo (the photo is the canvas only), and zen mode hides it with CSS like the
// rest of the interface. It never takes the pointer, and screen readers skip it (the name is in
// the action button instead).
//
// The anchor is eased in world space, more slowly up and down than across, so the card follows
// the animal as it walks but does not bob with every nod of its head; its opacity is eased too,
// so it fades in and out instead of blinking at a distance threshold. Styles are written only
// when what they would say has changed.
import * as THREE from 'three';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function createNameTag(el) {
  const sub = el.querySelector('.pet-tag-sub');
  const anchor = new THREE.Vector3(), p = new THREE.Vector3();
  const tag = { alpha: 0, placed: false, text: '', css: '', op: '' };
  /**
   * at: world point above the head; want: 0..1 how visible it should be (distance, focus...);
   * line: the small second line ('' for none); dt: seconds since the last frame
   */
  tag.update = (at, want, line, dt, camera, w, h) => {
    if (!tag.placed || (want <= 0.001 && tag.alpha < 0.01)) { anchor.copy(at); tag.placed = true; }
    anchor.x += (at.x - anchor.x) * (1 - Math.exp(-dt * 9));
    anchor.z += (at.z - anchor.z) * (1 - Math.exp(-dt * 9));
    anchor.y += (at.y - anchor.y) * (1 - Math.exp(-dt * 3.5));
    p.copy(anchor).project(camera);
    // off the screen or behind you: nothing to show (fading out near the edges)
    const edge = clamp((1.04 - Math.max(Math.abs(p.x), Math.abs(p.y))) / 0.12, 0, 1);
    const target = p.z < 1 && p.z > -1 ? want * edge : 0;
    tag.alpha += (target - tag.alpha) * (1 - Math.exp(-dt * 7));
    if (tag.alpha < 0.01) {
      if (tag.op !== 'none') { tag.op = 'none'; el.style.display = 'none'; }
      return;
    }
    if (tag.op === 'none' || !tag.op) el.style.display = '';
    const op = tag.alpha.toFixed(2);
    if (op !== tag.op) { tag.op = op; el.style.opacity = op; }
    if (line !== tag.text) {
      tag.text = line;
      sub.textContent = line;
      el.classList.toggle('has-sub', !!line);
    }
    const x = Math.round((p.x * 0.5 + 0.5) * w * 2) / 2, y = Math.round((-p.y * 0.5 + 0.5) * h * 2) / 2;
    const css = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
    if (css !== tag.css) { tag.css = css; el.style.transform = css; }
  };
  tag.hide = () => { tag.alpha = 0; if (tag.op !== 'none') { tag.op = 'none'; el.style.display = 'none'; } };
  return tag;
}
