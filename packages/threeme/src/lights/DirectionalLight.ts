import { vec3, quat, mat4 } from "gl-matrix";
import { Light } from "@/lights/Light";

const _q = quat.create();

export class DirectionalLight extends Light {
  getWorldDirection(out: vec3): vec3 {
    mat4.getRotation(_q, this.worldMatrix);
    const localForwardNegZ = vec3.fromValues(0, 0, -1);
    vec3.transformQuat(out, localForwardNegZ, _q);
    return vec3.normalize(out, out);
  }
}
