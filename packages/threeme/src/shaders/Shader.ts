export abstract class Shader {
  public type: "vertex" | "fragment" = "vertex";
  public source: string = "";
  public compiledSource: string = "";
  public needsUpdate: boolean = false;
  public onUpdate: (() => void) | null = null;

  protected abstract compileSource(gl: WebGL2RenderingContext | WebGLRenderingContext): void;
}
