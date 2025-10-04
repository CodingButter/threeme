import type { Hex } from "@/core";
import { Material, type IMaterialProps } from "./Material";

export class MeshLambertMaterial extends Material {
  constructor(props: IMaterialProps) {
    super(props);
  }
}
