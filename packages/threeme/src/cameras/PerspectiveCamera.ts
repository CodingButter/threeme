import { mat4 } from "gl-matrix";
import { Camera } from "@/cameras/Camera";

export class PerspectiveCamera extends Camera {
  constructor(
    public fovDeg = 50,
    public aspect = 1,
    public near = 0.1,
    public far = 1000
  ) {
    super();
    this.updateProjectionMatrix();
  }

  public updateProjectionMatrix(): void {
    const fovRad = (this.fovDeg * Math.PI) / 180;
    mat4.perspective(this.projectionMatrix, fovRad, this.aspect, this.near, this.far);
  }

  setAspect(aspect: number): void {
    this.aspect = aspect;
    this.updateProjectionMatrix();
  }

  setFov(fovDeg: number): void {
    this.fovDeg = fovDeg;
    this.updateProjectionMatrix();
  }

  setClip(near: number, far: number): void {
    this.near = near;
    this.far = far;
    this.updateProjectionMatrix();
  }
}
