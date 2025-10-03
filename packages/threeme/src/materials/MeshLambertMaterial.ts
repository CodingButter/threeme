import type { Hex } from "@/core";
import { Material } from "./Material";

export class MeshLambertMaterial extends Material {
  constructor(
    public color: Hex = 0xffffff,
    doubleSided = false
  ) {
    super(doubleSided);
  }
}
