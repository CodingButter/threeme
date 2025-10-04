import { DefaultLoadingManager, type LoadingManager } from "./LoadingManager";

export type onLoadCallback = (data: any) => void;
export type onProgressCallback = (event: ProgressEvent) => void;
export type onErrorCallback = (error: ErrorEvent) => void;
export type RequestHeadersRecord = Record<string, string>;

export abstract class Loader {
  public static DEFAUlt_MATERIAL_NAME = "__DEFAULT";
  protected crossOrigin: "anonymous" | "use-credentials" | "" = "anonymous";
  protected withCredentials: boolean = false;
  protected path: string = "";
  protected resourcePath: string = "";
  protected requestHeader: RequestHeadersRecord = {};
  constructor(protected manager: LoadingManager = DefaultLoadingManager) {}

  /* abstract */
  protected load(
    url: string,
    onLoad: onLoadCallback,
    onProgress: onProgressCallback,
    onError: onErrorCallback
  ): any {
    throw new Error("Method not implemented.");
  }

  protected loadAsync(url: string, onProgress: onProgressCallback): Promise<any> {
    return new Promise((resolve: any, reject: onErrorCallback) => {
      this.load(url, resolve as onLoadCallback, onProgress, reject);
    });
  }

  /* abstract */
  protected parse(data: any): any | void {
    throw new Error("Method not implemented.");
  }

  public setCrossOrigin(crossOrigin: "anonymous" | "use-credentials" | ""): Loader {
    this.crossOrigin = crossOrigin;
    return this;
  }
  public setWithCredentials(value: boolean): Loader {
    this.withCredentials = value;
    return this;
  }

  public setPath(value: string): Loader {
    this.path = value;
    return this;
  }

  public setResourcePath(value: string): Loader {
    this.resourcePath = value;
    return this;
  }

  public setRequestHeader(value: RequestHeadersRecord): Loader {
    this.requestHeader = value;
    return this;
  }
}
