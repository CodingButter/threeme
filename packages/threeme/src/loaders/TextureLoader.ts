import {
  Loader,
  type onErrorCallback,
  type onLoadCallback,
  type onProgressCallback,
} from "@/loaders/Loader";
import { ImageLoader } from "@/loaders/ImageLoader";
import { Texture } from "@/textures/Texture";
import type { ProgressInfo } from "@/utils/BetterFetch";

export class TextureLoader extends Loader {
  public texture: Texture = new Texture();
  constructor(url: string) {
    super();
    this.url = url;
  }

  public static load(url: string): Texture {
    const textureLoader = new TextureLoader(url);
    return textureLoader.load(
      url,
      () => {},
      () => {},
      () => {}
    );
  }

  public override load(
    url: string,
    onLoad: onLoadCallback,
    onProgress: onProgressCallback,
    onError: onErrorCallback
  ): Texture {
    url = url || this.url;
    const loader = new ImageLoader();
    loader.load(
      url,
      (image) => {
        this.onLoad(image);
        if (onLoad) onLoad(this.texture);
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
    return this.texture;
  }

  private onLoad(image: HTMLImageElement | HTMLVideoElement) {
    this.texture.source = image;
    this.texture.width = image.width;
    this.texture.height = image.height;
    this.texture.needsUpdate = true;
    if (this.texture.onUpdate) this.texture.onUpdate();
  }

  private onError(event: ErrorEvent) {
    console.error("An error happened while loading texture.");
  }
}
