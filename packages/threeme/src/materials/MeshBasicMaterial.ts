import type { Hex } from "@/core";
import { Material } from "./Material";

// materials/MeshBasicMaterial.ts
export class MeshBasicMaterial extends Material {
  constructor(
    public color: number = 0xffffff,
    doubleSided = false
  ) {
    super(doubleSided);
  }
}
