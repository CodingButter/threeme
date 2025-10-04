export class Texture {
  public source: any = new Uint8Array([0, 0, 255, 255]); // opaque blue;
  public target: number = WebGL2RenderingContext.TEXTURE_2D;
  public level: number = 0;
  public internalFormat: number = WebGL2RenderingContext.RGBA;
  public width: number = 1;
  public height: number = 1;
  public border: number = 0;
  public sourceFormat: number = WebGL2RenderingContext.RGBA;
  public sourceType: number = WebGL2RenderingContext.UNSIGNED_BYTE;
  public onUpdate: (() => void) | null = null;
  public needsUpdate: boolean = false;
  public wrapS: number = WebGL2RenderingContext.CLAMP_TO_EDGE;
  public wrapT: number = WebGL2RenderingContext.CLAMP_TO_EDGE;
  public minFilter: number = WebGL2RenderingContext.LINEAR;
  public magFilter: number = WebGL2RenderingContext.LINEAR;
}
