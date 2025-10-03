import { vec3, quat, mat4, type ReadonlyVec3 } from "gl-matrix";

const _qTmp = quat.create();
const _axisN = vec3.create();

function isAncestor(node: Object3D, maybeAncestor: Object3D): boolean {
  for (let p = node.parent; p; p = p.parent) {
    if (p === maybeAncestor) return true;
  }
  return false;
}

const _mWorld = mat4.create();
const _invParent = mat4.create();
const _worldPos = vec3.create();

export class Object3D {
  public parent: Object3D | null = null;
  readonly children: Object3D[] = [];

  public position = vec3.create();
  public rotation = quat.create();
  public scale = vec3.fromValues(1, 1, 1);

  public matrix = mat4.create();
  public worldMatrix = mat4.create();

  public updateMatrix(): void {
    mat4.fromRotationTranslationScale(this.matrix, this.rotation, this.position, this.scale);
  }

  public updateWorldMatrix(parentWorldMatrix?: mat4): void {
    this.updateMatrix();
    if (parentWorldMatrix) {
      mat4.multiply(this.worldMatrix, parentWorldMatrix, this.matrix);
    } else {
      mat4.copy(this.worldMatrix, this.matrix);
    }

    for (const child of this.children) {
      child.updateWorldMatrix(this.worldMatrix);
    }
  }

  add(child: Object3D): void {
    if (child === this)
      throw new Error("Object3D.add: object can't be added as a child of itself.");
    if (isAncestor(this, child))
      throw new Error("Object3D.add: object can't be added as a child of one of its descendants.");
    if (this.children.includes(child)) return;
    if (child.parent) child.parent.remove(child);

    this.children.push(child);
    child.parent = this;
  }

  remove(child: Object3D): void {
    const i = this.children.indexOf(child);
    if (i === -1) return;
    this.children.splice;
    child.parent = null;
  }

  /**
   * Rotate this object so its local -Z axis points at `target` (world coords).
   * Matches common camera/light convention. If your mesh uses +Z forward,
   * call an extra 180° Y-rotation after this.
   */
  lookAt(target: ReadonlyVec3, up: ReadonlyVec3 = [0, 1, 0]): void {
    // Compute our world-space position (robust even with a parent)
    if (this.parent) {
      // parent.worldMatrix should be reasonably up to date
      // worldPos = parentWorld * localPosition (as a point)
      vec3.transformMat4(_worldPos, this.position as ReadonlyVec3, this.parent.worldMatrix);
    } else {
      vec3.copy(_worldPos, this.position as ReadonlyVec3);
    }

    // Build a world-space orientation matrix that faces `target`
    mat4.targetTo(_mWorld, _worldPos, target, up);

    // Convert that world orientation into a local rotation
    if (this.parent) {
      mat4.invert(_invParent, this.parent.worldMatrix);
      mat4.multiply(_mWorld, _invParent, _mWorld); // local = parent^-1 * world
    }

    // Extract just the rotation into our quaternion
    mat4.getRotation(this.rotation as quat, _mWorld);

    // Keep local matrix consistent if you need it immediately
    this.updateMatrix();
  }

  /** Rotate around the local X axis by radians. */
  rotateX(rad: number): void {
    quat.rotateX(this.rotation, this.rotation, rad);
    this.updateMatrix();
  }

  /** Rotate around the local Y axis by radians. */
  rotateY(rad: number): void {
    quat.rotateY(this.rotation, this.rotation, rad);
    this.updateMatrix();
  }

  /** Rotate around the local Z axis by radians. */
  rotateZ(rad: number): void {
    quat.rotateZ(this.rotation, this.rotation, rad);
    this.updateMatrix();
  }

  /**
   * Rotate around an arbitrary axis by radians.
   * - space='local': append to current orientation (object space)
   * - space='world': prepend so the rotation is in world axes
   */
  rotateOnAxis(axis: ReadonlyVec3, rad: number, space: "local" | "world" = "local"): void {
    vec3.normalize(_axisN, axis as any);
    quat.setAxisAngle(_qTmp, _axisN, rad);
    if (space === "local") {
      // local: current * delta
      quat.mul(this.rotation, this.rotation, _qTmp);
    } else {
      // world: delta * current
      quat.mul(this.rotation, _qTmp, this.rotation);
    }
    this.updateMatrix();
  }

  /** Simple Euler (XYZ order) in radians. Handy for quick setups. */
  setRotationEulerXYZ(x: number, y: number, z: number): void {
    quat.identity(this.rotation);
    quat.rotateX(this.rotation, this.rotation, x);
    quat.rotateY(this.rotation, this.rotation, y);
    quat.rotateZ(this.rotation, this.rotation, z);
    this.updateMatrix();
  }
}
