import type { Hex } from "@/core";
import type { Texture } from "@/textures/Texture";

export interface IMaterialProps {
  color?: Hex;
  map?: Texture;
  doubleSided?: boolean;
}

export abstract class Material {
  public color: Hex;
  public map?: Texture;
  public doubleSided: boolean;
  constructor(props: IMaterialProps = {}) {
    this.color = props.color || 0xffffff;
    this.map = props.map || undefined;
    this.doubleSided = props.doubleSided || false;
  }
  public dispose?(): void;
}
