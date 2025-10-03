// at top of src/cameras/Camera.ts
import { mat4, quat, type ReadonlyVec3 } from "gl-matrix";

import { Object3D } from "@/objects/Object3D";

export abstract class Camera extends Object3D {
  public projectionMatrix = mat4.create();
  public viewMatrix = mat4.create();
  public matrixWorldInverse = mat4.create();

  abstract updateProjectionMatrix(): void;

  public updateViewMatrix(): void {
    mat4.invert(this.matrixWorldInverse, this.worldMatrix);
    mat4.copy(this.viewMatrix, this.matrixWorldInverse);
  }
}
