import { Loader } from "@/loaders/Loader";
import type { onLoadCallback, onProgressCallback, onErrorCallback } from "@/loaders/Loader";
import { type LoadingManager } from "./LoadingManager";
import { Cache } from "./Cache";
import { createElementNS } from "@/utils";

interface ILoaderErrorHandlers {
  onLoad: onLoadCallback;
  onError: onErrorCallback;
}

const _loading: WeakMap<any, ILoaderErrorHandlers[]> = new WeakMap();

export class ImageLoader extends Loader {
  constructor(manager?: LoadingManager | undefined) {
    super(manager);
  }

  public override load(
    url: string,
    onLoad: onLoadCallback,
    onProgress: onProgressCallback,
    onError: onErrorCallback
  ): HTMLImageElement {
    if (this.path !== undefined) url = `${this.path}${url}`;
    url = this.manager.resolveURL(url);

    const cached = Cache.get<HTMLImageElement>(`image:${url}`);
    if (cached !== undefined) {
      let arr = _loading.get(cached);
      if (arr === undefined) {
        arr = [];
        _loading.set(cached, arr);
      }
      arr.push({ onLoad, onError });
      return cached;
    }
    const image = new Image();
    image.crossOrigin = this.crossOrigin;
    image.referrerPolicy = "no-referrer";

    const onImageLoad = (): void => {
      removeEventListeners();
      if (onLoad) onLoad(image);

      const callbacks = _loading.get(image);
      callbacks?.forEach(({ onLoad }) => onLoad && onLoad(image));

      _loading.delete(image);
      this.manager.itemEnd(url);
    };

    const onImageError = (event: ErrorEvent): void => {
      removeEventListeners();
      if (onError) onError(event);
      Cache.remove(`image:${url}`);

      const callbacks = _loading.get(image);
      callbacks?.forEach(({ onError }) => onError && onError(event));
      _loading.delete(image);
      this.manager.itemError(url);
      this.manager.itemEnd(url);
    };

    const removeEventListeners = (): void => {
      image.removeEventListener("load", onImageLoad);
      image.removeEventListener("error", onImageError);
    };

    image.addEventListener("load", onImageLoad);
    image.addEventListener("error", onImageError);

    if (url.slice(0, 5) !== "data:") {
      if (this.crossOrigin !== undefined) image.crossOrigin = this.crossOrigin;
    }

    Cache.add(`image:${url}`, image);
    this.manager.itemsStart(url);
    image.src = url;
    return image;
  }
}
