// utils/transform.ts
import { mat4, vec3, quat } from "gl-matrix";
import { Object3D } from "@acme/threeme/objects";
import { Camera } from "@acme/threeme/cameras";

const _m = mat4.create();
const _invParent = mat4.create();
const _objWorldPos = vec3.create();
const _camWorldPos = vec3.create();

/** Rotate obj so its +Z (or whatever your shader expects) faces the camera. */
export function faceCamera(
  obj: Object3D,
  camera: Camera,
  up: readonly [number, number, number] = [0, 1, 0]
) {
  // Make sure world matrices are current before calling this (render() already does)
  mat4.getTranslation(_objWorldPos, obj.worldMatrix);
  mat4.getTranslation(_camWorldPos, camera.worldMatrix);

  // Build a world-space "look at camera" orientation at the object's position
  mat4.targetTo(_m, _objWorldPos, _camWorldPos, up);

  // If the object has a parent with rotation, convert that world rotation back to local
  if (obj.parent) {
    mat4.invert(_invParent, obj.parent.worldMatrix);
    mat4.multiply(_m, _invParent, _m); // local = parent^-1 * world
  }

  // Extract just the rotation into the object's quaternion
  mat4.getRotation(obj.rotation as quat, _m);

  // If you want the object to keep its own scale/position, leave them as-is.
  // The next updateMatrix() will compose TRS again.
}
