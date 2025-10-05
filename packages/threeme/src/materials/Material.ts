import type { Hex } from "@/core";
import type { Texture } from "@/textures/Texture";

export interface IMaterialProps {
  color?: Hex;
  map?: Texture;
  doubleSided?: boolean;
  transparent?: boolean;
  opacity?: number;
  alphaTest?: number;
}

export abstract class Material {
  public color: Hex;
  public map?: Texture;
  public doubleSided: boolean;
  public transparent: boolean;
  public opacity: number;
  public alphaTest: number;
  constructor(props: IMaterialProps = {}) {
    this.color = props.color || 0xffffff;
    this.map = props.map || undefined;
    this.doubleSided = props.doubleSided || false;
    this.transparent = props.transparent || false;
    this.opacity = props.opacity !== undefined ? props.opacity : 1.0;
    this.alphaTest = props.alphaTest !== undefined ? props.alphaTest : 0.0;
  }
  public dispose?(): void;
}
