import type { Hex } from "@/core";
import { Light } from "@/lights/Light";

export class PointLight extends Light {
  readonly type = "PointLight";
  private distance: number;
  private decay: number;
  constructor(color: Hex, intensity: number, distance: number, decay: number) {
    super(color, intensity);
    this.distance = distance;
    this.decay = decay;
  }
}
