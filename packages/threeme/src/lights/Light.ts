import type { Hex } from "@/core";
import { Object3D } from "@/objects";

export abstract class Light extends Object3D {
  constructor(
    public color: Hex = 0xffffff,
    public intensity: number = 1.0
  ) {
    super();
  }
}
