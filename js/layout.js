// Where things stand in the world. Shared by the scene builders and by shaders
// (which bake these numbers in), so it must not import anything.
export const CABIN = { x: -13, z: -14, yaw: 0.9 };
export const CAMP = { fire: { x: 4.6, z: -4.2 }, tent: { x: 9.8, z: -7.4, yaw: -1.03 } };
// The flower garden on the plateau east of the camp: centre and half-extents.
export const GARDEN = { x: 31, z: 12, hx: 19, hz: 17 };
// How far you may wander from the camp.
export const BOUNDS = { minX: -150, maxX: 150, minZ: -200, maxZ: 130 };
