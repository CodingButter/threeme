import { Object3D } from "@/objects/Object3D";
import type { Material } from "@/materials/Material";
export class Mesh<G = any, M extends Material = Material> extends Object3D {
  constructor(
    public geometry: G,
    public material: M
  ) {
    super();
  }
}
