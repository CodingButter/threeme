export abstract class Material {
  constructor(public doubleSided = false) {}
  public dispose?(): void;
}
