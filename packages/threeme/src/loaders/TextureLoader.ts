import { Loader } from "@/loaders/Loader";
import { ImageLoader } from "@/loaders/ImageLoader";
import { Texture } from "@/textures/Texture";

export class TextureLoader extends Loader {
  public texture: Texture = new Texture();
  constructor(public url: string) {
    super();
  }

  public static load(url: string): Texture {
    const textureLoader = new TextureLoader(url);
    return textureLoader.load();
  }

  public override load(): Texture {
    const loader = new ImageLoader();
    loader.load(
      this.url,
      this.onLoad.bind(this),
      this.onProgress.bind(this),
      this.onError.bind(this)
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

  private onProgress(event: ProgressEvent) {}

  private onError(event: ErrorEvent) {
    console.error("An error happened while loading texture.");
  }
}
