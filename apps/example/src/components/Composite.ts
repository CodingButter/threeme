import { Object3D, Mesh } from "@acme/threeme";

export class Composite extends Object3D {
  constructor(public components: Mesh[] = []) {
    super();
    for (const comp of components) {
      this.add(comp);
    }
  }
}
