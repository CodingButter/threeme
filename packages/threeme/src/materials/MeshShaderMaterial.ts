import type { Hex } from "@/core";
import { Material, type IMaterialProps } from "./Material";
import type { FragmentShader, VertexShader } from "@/shaders";

export interface IMeshShaderMaterialProps extends IMaterialProps {
  fragmentShader: FragmentShader;
  vertexShader: VertexShader;
}

export class MeshShaderMaterial extends Material {
  public fragmentShader: FragmentShader;
  public vertexShader: VertexShader;
  constructor(props: IMeshShaderMaterialProps) {
    const { fragmentShader, vertexShader, ...rest } = props;
    super(rest);
    this.fragmentShader = fragmentShader;
    this.vertexShader = vertexShader;
  }
}
