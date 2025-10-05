import {
  Loader,
  type onErrorCallback,
  type onLoadCallback,
  type onProgressCallback,
} from "@/loaders/Loader";
import { DataLoader } from "@/loaders/";
import { FragmentShader, Shader, VertexShader } from "@/shaders";
import type { BetterResponse, ProgressInfo } from "@/utils/BetterFetch";

export type Shaders = VertexShader | FragmentShader;

export class ShaderLoader extends Loader {
  public shader: Shaders;
  constructor(url: string, type: "vertex" | "fragment") {
    super();
    this.url = url;
    if (type === "vertex") {
      this.shader = new VertexShader();
    } else {
      this.shader = new FragmentShader();
    }
  }

  public static load(
    url: string,
    type: "vertex" | "fragment",
    onProgress: onProgressCallback
  ): Shaders {
    const shaderLoader = new ShaderLoader(url, type);
    return shaderLoader.load(
      url,
      () => {},
      onProgress,
      () => {}
    );
  }

  public override load(
    url: string,
    onLoad: onLoadCallback,
    onProgress: onProgressCallback,
    onError: onErrorCallback
  ): Shaders {
    url = url || this.url;
    const loader = new DataLoader();
    loader.load(
      url,
      (response) => {
        this.onLoad(response);
        if (onLoad) onLoad(this.shader);
      },
      (progress: ProgressInfo) => {
        this.onProgress(progress);
        if (onProgress) onProgress(progress);
      },
      (event: ErrorEvent) => {
        this.onError(event);
        if (onError) onError(event);
      }
    );
    return this.shader;
  }

  private async onLoad(response: BetterResponse) {
    this.shader.source = await response.text();
    this.shader.needsUpdate = true;
    if (this.shader.onUpdate) this.shader.onUpdate();
  }

  private onError(event: ErrorEvent) {
    console.error("An error happened while loading texture.");
  }
}
