import { Loader } from "@/loaders/Loader";
import type { onLoadCallback, onProgressCallback, onErrorCallback } from "@/loaders/Loader";
import { type LoadingManager } from "./LoadingManager";
import { Cache } from "./Cache";
import { RemoteFile } from "@/utils";
import type { BetterResponse } from "@/utils/BetterFetch";

interface ILoaderErrorHandlers {
  onLoad: onLoadCallback;
  onError: onErrorCallback;
}

const _loading: WeakMap<any, ILoaderErrorHandlers[]> = new WeakMap();

export class DataLoader extends Loader {
  constructor(manager?: LoadingManager | undefined) {
    super(manager);
  }

  public override load(
    url: string,
    onLoad: onLoadCallback,
    onProgress: onProgressCallback,
    onError: onErrorCallback
  ): void {
    if (this.path !== undefined) url = `${this.path}${url}`;
    url = this.manager.resolveURL(url);

    const cached = Cache.get<any>(`data:${url}`);
    if (cached !== undefined) {
      let arr = _loading.get(cached);
      if (arr === undefined) {
        arr = [];
        _loading.set(cached, arr);
      }
      arr.push({ onLoad, onError });
      return cached;
    }
    let remoteFile = new RemoteFile();
    remoteFile.crossOrigin = this.crossOrigin;
    remoteFile.referrerPolicy = this.referrerPolicy;

    const onResponse = async (response: BetterResponse): Promise<void> => {
      removeEventListeners();
      const dataResponse = response;
      if (onLoad) onLoad(dataResponse);

      const callbacks = _loading.get(remoteFile);
      callbacks?.forEach(({ onLoad }) => onLoad && onLoad(dataResponse));

      _loading.delete(remoteFile);
      this.manager.itemEnd(url);
    };

    const onImageError = (event: ErrorEvent): void => {
      removeEventListeners();
      if (onError) onError(event);
      Cache.remove(`data:${url}`);

      const callbacks = _loading.get(remoteFile);
      callbacks?.forEach(({ onError }) => onError && onError(event));
      _loading.delete(remoteFile);
      this.manager.itemError(url);
      this.manager.itemEnd(url);
    };

    const removeEventListeners = (): void => {
      remoteFile.removeEventListener("load", onResponse);
      remoteFile.removeEventListener("error", onImageError);
      remoteFile.removeEventListener("progress", onProgress);
    };

    remoteFile.addEventListener("load", onResponse);
    remoteFile.addEventListener("error", onImageError);
    remoteFile.addEventListener("progress", onProgress);

    if (url.slice(0, 5) !== "data:") {
      if (this.crossOrigin !== undefined) remoteFile.crossOrigin = this.crossOrigin;
    }

    Cache.add(`data:${url}`, remoteFile);
    this.manager.itemsStart(url);
    remoteFile.src = url;
  }
}
